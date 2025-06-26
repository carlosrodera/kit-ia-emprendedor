/**
 * Cliente de Supabase - Kit IA Emprendedor
 * Gestiona la conexión con Supabase usando chrome.storage para persistencia
 *
 * @module supabase-client
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';
import { logger } from './logger.js';

/**
 * Storage adapter personalizado para chrome.storage
 * Compatible con Supabase Auth
 */
class ChromeStorageAdapter {
  constructor() {
    this.storageKey = 'sb-auth-token';
  }

  /**
   * Obtiene el item del storage
   * @param {string} key - Clave a buscar
   * @returns {Promise<string|null>}
   */
  async getItem(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      logger.error('ChromeStorageAdapter getItem error:', error);
      return null;
    }
  }

  /**
   * Guarda un item en storage
   * @param {string} key - Clave
   * @param {string} value - Valor a guardar
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    try {
      // Verificar cuota antes de guardar
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default

      // Estimar tamaño del nuevo valor
      const estimatedSize = new Blob([value]).size;

      if (bytesInUse + estimatedSize > quota * 0.9) { // 90% de la cuota
        logger.warn('Storage quota nearly full, cleaning up...');
        await this.cleanup();
      }

      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      logger.error('ChromeStorageAdapter setItem error:', error);

      // Si es error de cuota, intentar limpiar y reintentar
      if (error.message?.includes('QUOTA')) {
        await this.cleanup();
        try {
          await chrome.storage.local.set({ [key]: value });
        } catch (retryError) {
          logger.error('Failed to save after cleanup:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Elimina un item del storage
   * @param {string} key - Clave a eliminar
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      logger.error('ChromeStorageAdapter removeItem error:', error);
    }
  }

  /**
   * Limpia datos antiguos del storage
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Obtener todas las claves
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = [];

      // Buscar tokens antiguos o expirados
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('sb-') && key !== this.storageKey) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        logger.info(`Cleaned up ${keysToRemove.length} old storage items`);
      }
    } catch (error) {
      logger.error('Storage cleanup error:', error);
    }
  }
}

/**
 * Clase principal del cliente de Supabase
 */
class SupabaseClient {
  constructor() {
    this.client = null;
    this.initialized = false;
    this.reconnectTimer = null;
    this.storageAdapter = new ChromeStorageAdapter();
  }

  /**
   * Inicializa el cliente de Supabase (lazy initialization)
   * @returns {Promise<Object>} Cliente de Supabase
   */
  async initialize() {
    if (this.initialized && this.client) {
      return this.client;
    }

    try {
      // Validar configuración
      if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        throw new Error('Supabase configuration is incomplete');
      }

      // Verificar que no sea el placeholder
      if (SUPABASE_CONFIG.anonKey === 'YOUR_ANON_KEY_HERE') {
        throw new Error('Please configure your Supabase anon key in config.js or environment variables');
      }

      // Crear cliente con configuración personalizada
      this.client = createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey,
        {
          auth: {
            ...SUPABASE_CONFIG.options.auth,
            storage: this.storageAdapter,
            storageKey: this.storageAdapter.storageKey,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false // En extensiones no hay URLs
          },
          global: {
            headers: {
              'X-Client-Info': 'kit-ia-emprendedor-extension'
            }
          },
          db: {
            schema: 'public'
          },
          realtime: {
            params: {
              eventsPerSecond: 10
            }
          }
        }
      );

      // Configurar listeners de autenticación
      this.setupAuthListeners();

      // Configurar auto-refresh
      this.setupAutoRefresh();

      // Configurar reconexión automática
      this.setupReconnection();

      this.initialized = true;
      logger.info('Supabase client initialized successfully');

      return this.client;
    } catch (error) {
      logger.error('Error initializing Supabase client:', error);
      throw error;
    }
  }

  /**
   * Configura los listeners de cambios de autenticación
   */
  setupAuthListeners() {
    if (!this.client) return;

    this.client.auth.onAuthStateChange((event, session) => {
      logger.info('Auth state changed:', event);

      switch (event) {
        case 'SIGNED_IN':
          logger.info('User signed in');
          this.handleSignIn(session);
          break;

        case 'SIGNED_OUT':
          logger.info('User signed out');
          this.handleSignOut();
          break;

        case 'TOKEN_REFRESHED':
          logger.info('Token refreshed successfully');
          break;

        case 'USER_UPDATED':
          logger.info('User data updated');
          break;

        case 'PASSWORD_RECOVERY':
          logger.info('Password recovery initiated');
          break;

        default:
          logger.debug('Auth event:', event);
      }
    });
  }

  /**
   * Configura el auto-refresh de tokens
   */
  setupAutoRefresh() {
    if (!this.client) return;

    // Verificar sesión cada 5 minutos
    setInterval(async () => {
      try {
        const { data: { session }, error } = await this.client.auth.getSession();

        if (error) {
          logger.error('Error checking session:', error);
          return;
        }

        if (session) {
          // Verificar si el token expira pronto (menos de 10 minutos)
          const expiresAt = session.expires_at * 1000; // Convertir a ms
          const now = Date.now();
          const timeUntilExpiry = expiresAt - now;

          if (timeUntilExpiry < 10 * 60 * 1000) { // 10 minutos
            logger.info('Token expiring soon, refreshing...');
            const { error: refreshError } = await this.client.auth.refreshSession();

            if (refreshError) {
              logger.error('Error refreshing token:', refreshError);
            } else {
              logger.info('Token refreshed successfully');
            }
          }
        }
      } catch (error) {
        logger.error('Error in auto-refresh:', error);
      }
    }, 5 * 60 * 1000); // 5 minutos
  }

  /**
   * Configura la reconexión automática
   */
  setupReconnection() {
    if (!this.client) return;

    // Detectar cuando se pierde la conexión
    window.addEventListener('online', () => {
      logger.info('Connection restored, reconnecting to Supabase...');
      this.reconnect();
    });

    window.addEventListener('offline', () => {
      logger.warn('Connection lost');
    });

    // Reconectar en caso de errores de red
    this.client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.stopReconnection();
      }
    });
  }

  /**
   * Intenta reconectar con Supabase
   */
  async reconnect() {
    try {
      if (!this.client) {
        await this.initialize();
        return;
      }

      // Verificar sesión actual
      const { data: { session }, error } = await this.client.auth.getSession();

      if (error) {
        logger.error('Reconnection error:', error);

        // Si hay error de red, reintentar
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          this.scheduleReconnection();
        }
        return;
      }

      if (session) {
        logger.info('Reconnected successfully');
        this.stopReconnection();
      } else {
        logger.info('No active session found');
      }
    } catch (error) {
      logger.error('Reconnection failed:', error);
      this.scheduleReconnection();
    }
  }

  /**
   * Programa un intento de reconexión
   */
  scheduleReconnection() {
    if (this.reconnectTimer) return;

    let attempts = 0;
    const maxAttempts = 5;
    const baseDelay = 1000; // 1 segundo

    const attemptReconnect = async () => {
      attempts++;

      if (attempts > maxAttempts) {
        logger.error('Max reconnection attempts reached');
        this.stopReconnection();
        return;
      }

      logger.info(`Reconnection attempt ${attempts}/${maxAttempts}`);

      try {
        await this.reconnect();
      } catch (error) {
        // Backoff exponencial
        const delay = Math.min(baseDelay * Math.pow(2, attempts - 1), 30000);
        logger.info(`Retrying in ${delay}ms...`);

        this.reconnectTimer = setTimeout(attemptReconnect, delay);
      }
    };

    this.reconnectTimer = setTimeout(attemptReconnect, baseDelay);
  }

  /**
   * Detiene los intentos de reconexión
   */
  stopReconnection() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Maneja el evento de inicio de sesión
   * @param {Object} session - Sesión del usuario
   */
  async handleSignIn(session) {
    try {
      // Notificar a otras partes de la extensión
      chrome.runtime.sendMessage({
        type: 'AUTH_STATE_CHANGE',
        event: 'SIGNED_IN',
        user: session.user
      });
    } catch (error) {
      logger.error('Error handling sign in:', error);
    }
  }

  /**
   * Maneja el evento de cierre de sesión
   */
  async handleSignOut() {
    try {
      // Limpiar datos locales si es necesario
      await this.storageAdapter.cleanup();

      // Notificar a otras partes de la extensión
      chrome.runtime.sendMessage({
        type: 'AUTH_STATE_CHANGE',
        event: 'SIGNED_OUT'
      });
    } catch (error) {
      logger.error('Error handling sign out:', error);
    }
  }

  /**
   * Obtiene el cliente de Supabase (con lazy initialization)
   * @returns {Promise<Object>} Cliente de Supabase
   */
  async getClient() {
    if (!this.initialized || !this.client) {
      await this.initialize();
    }
    return this.client;
  }

  /**
   * Verifica si hay una sesión activa
   * @returns {Promise<boolean>}
   */
  async hasActiveSession() {
    try {
      const client = await this.getClient();
      const { data: { session } } = await client.auth.getSession();
      return !!session;
    } catch (error) {
      logger.error('Error checking session:', error);
      return false;
    }
  }

  /**
   * Obtiene la sesión actual
   * @returns {Promise<Object|null>}
   */
  async getSession() {
    try {
      const client = await this.getClient();
      const { data: { session }, error } = await client.auth.getSession();

      if (error) {
        logger.error('Error getting session:', error);
        return null;
      }

      return session;
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Obtiene el usuario actual
   * @returns {Promise<Object|null>}
   */
  async getUser() {
    try {
      const client = await this.getClient();
      const { data: { user }, error } = await client.auth.getUser();

      if (error) {
        logger.error('Error getting user:', error);
        return null;
      }

      return user;
    } catch (error) {
      logger.error('Error getting user:', error);
      return null;
    }
  }

  /**
   * Cierra la sesión actual
   * @returns {Promise<void>}
   */
  async signOut() {
    try {
      const client = await this.getClient();
      const { error } = await client.auth.signOut();

      if (error) {
        logger.error('Error signing out:', error);
        throw error;
      }

      logger.info('Signed out successfully');
    } catch (error) {
      logger.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Destruye el cliente y limpia recursos
   */
  async destroy() {
    try {
      this.stopReconnection();

      if (this.client) {
        // Cerrar conexiones realtime si las hay
        this.client.removeAllChannels();
      }

      this.client = null;
      this.initialized = false;

      logger.info('Supabase client destroyed');
    } catch (error) {
      logger.error('Error destroying client:', error);
    }
  }
}

// Crear instancia única (singleton)
const supabaseClient = new SupabaseClient();

// Exportar funciones de utilidad
export const supabase = {
  /**
   * Obtiene el cliente de Supabase
   * @returns {Promise<Object>}
   */
  getClient: () => supabaseClient.getClient(),

  /**
   * Verifica si hay sesión activa
   * @returns {Promise<boolean>}
   */
  hasActiveSession: () => supabaseClient.hasActiveSession(),

  /**
   * Obtiene la sesión actual
   * @returns {Promise<Object|null>}
   */
  getSession: () => supabaseClient.getSession(),

  /**
   * Obtiene el usuario actual
   * @returns {Promise<Object|null>}
   */
  getUser: () => supabaseClient.getUser(),

  /**
   * Cierra la sesión
   * @returns {Promise<void>}
   */
  signOut: () => supabaseClient.signOut(),

  /**
   * Destruye el cliente
   * @returns {Promise<void>}
   */
  destroy: () => supabaseClient.destroy()
};

// Exportar el cliente por defecto
export default supabase;
