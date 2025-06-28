/**
 * Chrome Extension OAuth Authentication Module
 * Maneja la autenticación OAuth específica para extensiones Chrome
 * usando chrome.identity API
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';
import logger from '../utils/logger.js';
import { STORAGE_KEYS } from './constants.js';

/**
 * Cliente de Supabase para autenticación en extensiones Chrome
 */
class ChromeExtensionAuth {
  constructor() {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Inicializa el cliente de Supabase con configuración específica para Chrome Extensions
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Verificar configuración
      if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url.includes('placeholder')) {
        logger.warn('[ChromeAuth] Using placeholder Supabase URL. Configure .env file with real values.');
      }
      
      // Crear cliente con storage adapter para Chrome
      this.client = createClient(
        SUPABASE_CONFIG.url,
        SUPABASE_CONFIG.anonKey,
        {
          auth: {
            storage: {
              getItem: async (key) => {
                const data = await chrome.storage.local.get(key);
                return data[key] || null;
              },
              setItem: async (key, value) => {
                await chrome.storage.local.set({ [key]: value });
              },
              removeItem: async (key) => {
                await chrome.storage.local.remove(key);
              }
            },
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false, // Crítico para extensiones
            flowType: 'pkce'
          }
        }
      );

      // Configurar listener de cambios de auth
      this.client.auth.onAuthStateChange(this.handleAuthStateChange.bind(this));

      // Intentar recuperar sesión existente
      const { data: { session } } = await this.client.auth.getSession();
      if (session) {
        logger.info('Existing session found', { userId: session.user.id });
      }

      this.initialized = true;
      logger.info('Chrome Extension Auth initialized');
    } catch (error) {
      logger.error('Failed to initialize Chrome Extension Auth:', error);
      throw error;
    }
  }

  /**
   * Maneja cambios en el estado de autenticación
   */
  async handleAuthStateChange(event, session) {
    logger.info('Chrome auth state changed:', event);

    // Notificar a todas las partes de la extensión
    try {
      await chrome.runtime.sendMessage({
        type: 'AUTH_STATE_CHANGE',
        event,
        session,
        user: session?.user || null
      });
    } catch (error) {
      // Es normal que falle si no hay listeners activos
      logger.debug('Failed to send auth state change message:', error);
    }

    // Guardar estado en storage
    if (session) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_DATA]: {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
          last_sign_in: new Date().toISOString()
        }
      });
    } else {
      // Limpiar datos si no hay sesión
      await chrome.storage.local.remove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.AUTH_TOKEN
      ]);
    }
  }

  /**
   * Inicia sesión con OAuth usando chrome.identity
   * @param {'google' | 'github'} provider - Proveedor OAuth
   */
  async signInWithOAuth(provider) {
    if (!this.initialized) await this.initialize();

    try {
      logger.info(`Starting OAuth login with ${provider}`);

      // Obtener la URL de autorización
      const { data, error } = await this.client.auth.signInWithOAuth({
        provider,
        options: {
          skipBrowserRedirect: true // Importante para extensiones
        }
      });

      if (error) throw error;

      // Usar chrome.identity para manejar el flujo OAuth
      return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: data.url,
            interactive: true
          },
          async (redirectUrl) => {
            if (chrome.runtime.lastError) {
              logger.error('Chrome identity error:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            try {
              // Extraer el código de autorización
              const url = new URL(redirectUrl);
              const code = url.searchParams.get('code');
              
              if (!code) {
                throw new Error('No authorization code received');
              }

              // Intercambiar código por sesión
              const { data: { session }, error: sessionError } = 
                await this.client.auth.exchangeCodeForSession(code);

              if (sessionError) throw sessionError;

              logger.info('OAuth login successful', { userId: session.user.id });
              resolve({ session, user: session.user });
            } catch (err) {
              logger.error('OAuth callback processing failed:', err);
              reject(err);
            }
          }
        );
      });
    } catch (error) {
      logger.error('OAuth login failed:', error);
      throw error;
    }
  }

  /**
   * Inicia sesión con email y contraseña
   */
  async signInWithEmail(email, password) {
    if (!this.initialized) await this.initialize();

    try {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      logger.info('Email login successful', { userId: data.user.id });
      return { session: data.session, user: data.user };
    } catch (error) {
      logger.error('Email login failed:', error);
      throw error;
    }
  }

  /**
   * Registra un nuevo usuario
   */
  async signUp(email, password) {
    if (!this.initialized) await this.initialize();

    try {
      const { data, error } = await this.client.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      logger.info('Signup successful', { userId: data.user?.id });
      return { session: data.session, user: data.user };
    } catch (error) {
      logger.error('Signup failed:', error);
      throw error;
    }
  }

  /**
   * Cierra sesión
   */
  async signOut() {
    if (!this.initialized) await this.initialize();

    try {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;

      // Limpiar todos los datos locales
      await chrome.storage.local.remove([
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.GPTS_CACHE,
        STORAGE_KEYS.FAVORITES,
        STORAGE_KEYS.PROMPTS
      ]);

      logger.info('Signout successful');
    } catch (error) {
      logger.error('Signout failed:', error);
      throw error;
    }
  }

  /**
   * Obtiene la sesión actual
   */
  async getSession() {
    if (!this.initialized) await this.initialize();

    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  /**
   * Obtiene el usuario actual
   */
  async getUser() {
    if (!this.initialized) await this.initialize();

    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      logger.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * Refresca la sesión actual
   */
  async refreshSession() {
    if (!this.initialized) await this.initialize();

    try {
      const { data: { session }, error } = await this.client.auth.refreshSession();
      if (error) throw error;
      
      logger.info('Session refreshed successfully');
      return session;
    } catch (error) {
      logger.error('Failed to refresh session:', error);
      throw error;
    }
  }

  /**
   * Verifica si hay una sesión activa
   */
  async isAuthenticated() {
    const session = await this.getSession();
    return !!session;
  }
}

// Crear instancia singleton
const chromeAuth = new ChromeExtensionAuth();

// Exportar métodos
export const auth = {
  initialize: () => chromeAuth.initialize(),
  signInWithOAuth: (provider) => chromeAuth.signInWithOAuth(provider),
  signInWithEmail: (email, password) => chromeAuth.signInWithEmail(email, password),
  signUp: (email, password) => chromeAuth.signUp(email, password),
  signOut: () => chromeAuth.signOut(),
  getSession: () => chromeAuth.getSession(),
  getUser: () => chromeAuth.getUser(),
  refreshSession: () => chromeAuth.refreshSession(),
  isAuthenticated: () => chromeAuth.isAuthenticated(),
  
  // Compatibilidad con el código existente
  getCurrentUser: () => chromeAuth.getUser(),
  getCurrentSession: () => chromeAuth.getSession(),
  loginWithOAuth: (provider) => chromeAuth.signInWithOAuth(provider),
  logout: () => chromeAuth.signOut(),
  hasActiveSubscription: async () => {
    try {
      const user = await chromeAuth.getUser();
      if (!user) return false;
      
      // Importar dinámicamente para evitar dependencias circulares
      const { default: subscriptionManager } = await import('./subscription-manager.js');
      const subscription = await subscriptionManager.checkUserAccess(user.id);
      
      return subscription.licenseType === 'premium';
    } catch (error) {
      logger.error('[ChromeAuth] Error checking subscription:', error);
      return false;
    }
  },
  onAuthStateChange: (callback) => {
    // Implementar listener si es necesario
    return () => {};
  }
};

export default auth;