/**
 * Módulo de Autenticación - Kit IA Emprendedor
 * Gestiona la autenticación con Supabase y el estado de sesión
 *
 * @module auth
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config.js';
import { STORAGE_KEYS, CUSTOM_EVENTS, ERROR_MESSAGES } from './constants.js';
import { authLogger as logger } from './logger.js';
import storage from './storage.js';

/**
 * Cliente de Supabase - Se inicializa solo cuando se necesita
 * @type {import('@supabase/supabase-js').SupabaseClient|null}
 */
let supabaseClient = null;

/**
 * Estado de autenticación en memoria
 * @type {Object}
 */
const authState = {
  user: null,
  session: null,
  subscription: null,
  isInitialized: false,
  isRefreshing: false
};

/**
 * Listeners para cambios de autenticación
 * @type {Set<Function>}
 */
const authListeners = new Set();

/**
 * Inicializa el cliente de Supabase de forma lazy
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    // Validar configuración
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_ANON_KEY_HERE') {
      throw new Error('Supabase configuration is missing or invalid. Please check config.js');
    }

    logger.info('Initializing Supabase client');

    // Crear cliente con opciones de auth
    supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          ...SUPABASE_CONFIG.options.auth,
          storage: {
            // Usar chrome.storage para persistir sesión
            getItem: async (key) => {
              const data = await storage.auth.getToken();
              return data;
            },
            setItem: async (key, value) => {
              await storage.auth.saveToken(value);
            },
            removeItem: async (key) => {
              await storage.auth.removeToken();
            }
          }
        }
      }
    );

    // Configurar listener de cambios de auth
    supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
  }

  return supabaseClient;
}

/**
 * Maneja cambios en el estado de autenticación
 * @param {string} event - Tipo de evento
 * @param {Object|null} session - Sesión actual
 */
async function handleAuthStateChange(event, session) {
  logger.info('Auth state changed:', event);

  try {
    // Actualizar estado en memoria
    authState.session = session;
    authState.user = session?.user || null;

    // Guardar/limpiar datos según el evento
    switch (event) {
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
        await handleSignIn(session);
        break;

      case 'SIGNED_OUT':
        await handleSignOut();
        break;

      case 'USER_UPDATED':
        await handleUserUpdate(session);
        break;

      default:
        logger.debug('Unhandled auth event:', event);
    }

    // Notificar a listeners
    notifyAuthListeners(event, session);

    // Emitir evento personalizado
    emitAuthEvent(event);
  } catch (error) {
    logger.error('Error handling auth state change:', error);
  }
}

/**
 * Maneja el proceso de inicio de sesión
 * @param {Object} session - Sesión del usuario
 */
async function handleSignIn(session) {
  if (!session?.user) return;

  try {
    // Guardar datos del usuario
    await storage.set({
      [STORAGE_KEYS.USER_DATA]: {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
        last_sign_in: new Date().toISOString()
      }
    });

    // Verificar suscripción
    await checkSubscription(session.user.id);

    logger.info('User signed in successfully:', session.user.email);
  } catch (error) {
    logger.error('Error handling sign in:', error);
    throw error;
  }
}

/**
 * Maneja el proceso de cierre de sesión
 */
async function handleSignOut() {
  try {
    // Limpiar TODOS los datos del usuario
    const keysToRemove = [
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.GPTS_CACHE,
      STORAGE_KEYS.FAVORITES,
      STORAGE_KEYS.PROMPTS,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.NOTIFICATIONS_READ
    ];

    await storage.remove(keysToRemove);

    // Limpiar estado en memoria
    authState.user = null;
    authState.session = null;
    authState.subscription = null;

    logger.info('User signed out and data cleared');
  } catch (error) {
    logger.error('Error handling sign out:', error);
    throw error;
  }
}

/**
 * Maneja actualizaciones del usuario
 * @param {Object} session - Sesión actualizada
 */
async function handleUserUpdate(session) {
  if (!session?.user) return;

  try {
    // Actualizar datos del usuario
    const userData = await storage.get(STORAGE_KEYS.USER_DATA);
    const updatedData = {
      ...userData[STORAGE_KEYS.USER_DATA],
      ...session.user,
      last_updated: new Date().toISOString()
    };

    await storage.set({
      [STORAGE_KEYS.USER_DATA]: updatedData
    });

    logger.info('User data updated');
  } catch (error) {
    logger.error('Error updating user data:', error);
  }
}

/**
 * Verifica el estado de suscripción del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object|null>} Estado de suscripción
 */
async function checkSubscription(userId) {
  try {
    const client = getSupabaseClient();

    // Consultar estado de suscripción
    const { data, error } = await client
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
      throw error;
    }

    authState.subscription = data;
    return data;
  } catch (error) {
    logger.error('Error checking subscription:', error);
    return null;
  }
}

/**
 * Notifica a todos los listeners sobre cambios de auth
 * @param {string} event - Tipo de evento
 * @param {Object|null} session - Sesión actual
 */
function notifyAuthListeners(event, session) {
  authListeners.forEach(listener => {
    try {
      listener(event, session);
    } catch (error) {
      logger.error('Error in auth listener:', error);
    }
  });
}

/**
 * Emite evento personalizado para cambios de auth
 * @param {string} event - Tipo de evento
 */
function emitAuthEvent(event) {
  try {
    const customEvent = new CustomEvent(CUSTOM_EVENTS.AUTH_STATE_CHANGED, {
      detail: {
        event,
        user: authState.user,
        isAuthenticated: !!authState.session
      }
    });

    window.dispatchEvent(customEvent);
  } catch (error) {
    logger.error('Error emitting auth event:', error);
  }
}

/**
 * Funciones públicas del módulo de autenticación
 */
export const auth = {
  /**
   * Inicializa el módulo de autenticación
   * @returns {Promise<void>}
   */
  async initialize() {
    if (authState.isInitialized) {
      logger.debug('Auth already initialized');
      return;
    }

    try {
      logger.info('Initializing auth module');

      const client = getSupabaseClient();

      // Obtener sesión actual
      const { data: { session }, error } = await client.auth.getSession();

      if (error) {
        throw error;
      }

      if (session) {
        await handleAuthStateChange('INITIAL_SESSION', session);
      }

      authState.isInitialized = true;
      logger.info('Auth module initialized');
    } catch (error) {
      logger.error('Error initializing auth:', error);
      authState.isInitialized = false;
      throw error;
    }
  },

  /**
   * Inicia sesión con email y password
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Resultado del login
   */
  async signInWithEmail(email, password) {
    try {
      logger.info('Starting email/password login');
      
      const client = getSupabaseClient();
      
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        logger.error('Email login error:', error);
        throw error;
      }
      
      logger.info('Email login successful');
      return { session: data.session, user: data.user };
    } catch (error) {
      logger.error('Email login error:', error);
      throw error;
    }
  },
  
  /**
   * Registra un nuevo usuario con email y password
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<Object>} Resultado del registro
   */
  async signUpWithEmail(email, password) {
    try {
      logger.info('Starting email/password signup');
      
      const client = getSupabaseClient();
      
      const { data, error } = await client.auth.signUp({
        email,
        password
      });
      
      if (error) {
        logger.error('Email signup error:', error);
        throw error;
      }
      
      logger.info('Email signup successful');
      return { session: data.session, user: data.user };
    } catch (error) {
      logger.error('Email signup error:', error);
      throw error;
    }
  },

  /**
   * Inicia sesión con OAuth
   * @param {'google' | 'github'} provider - Proveedor OAuth
   * @returns {Promise<Object>} Resultado del login
   */
  async loginWithOAuth(provider) {
    try {
      logger.info(`Starting OAuth login with ${provider}`);

      const client = getSupabaseClient();

      // Configurar redirect URL
      const redirectTo = chrome.identity.getRedirectURL();

      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true // Para manejar en la extensión
        }
      });

      if (error) {
        throw error;
      }

      // Abrir ventana de OAuth usando chrome.identity
      return new Promise((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: data.url,
            interactive: true
          },
          async (redirectUrl) => {
            if (chrome.runtime.lastError) {
              logger.error('OAuth error:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }

            try {
              // Extraer código de la URL de redirect
              const url = new URL(redirectUrl);
              const code = url.searchParams.get('code');

              if (!code) {
                throw new Error('No authorization code received');
              }

              // Intercambiar código por sesión
              const { data: session, error: sessionError } = await client.auth.exchangeCodeForSession(code);

              if (sessionError) {
                throw sessionError;
              }

              logger.info('OAuth login successful');
              resolve({ session, user: session.user });
            } catch (err) {
              logger.error('Error processing OAuth callback:', err);
              reject(err);
            }
          }
        );
      });
    } catch (error) {
      logger.error('OAuth login error:', error);
      throw error;
    }
  },

  /**
   * Cierra sesión del usuario
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      logger.info('Starting logout process');

      const client = getSupabaseClient();

      // Cerrar sesión en Supabase
      const { error } = await client.auth.signOut();

      if (error) {
        throw error;
      }

      // La limpieza de datos se maneja en handleSignOut
      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Obtiene el usuario actual
   * @returns {Object|null} Usuario actual o null
   */
  getCurrentUser() {
    return authState.user;
  },

  /**
   * Obtiene la sesión actual
   * @returns {Object|null} Sesión actual o null
   */
  getCurrentSession() {
    return authState.session;
  },

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} True si está autenticado
   */
  isAuthenticated() {
    return !!authState.session;
  },

  /**
   * Verifica si el usuario tiene suscripción activa
   * @returns {Promise<boolean>} True si tiene suscripción activa
   */
  async hasActiveSubscription() {
    if (!authState.user) {
      return false;
    }

    // Si no hay info de suscripción, verificar
    if (!authState.subscription) {
      await checkSubscription(authState.user.id);
    }

    return !!authState.subscription;
  },

  /**
   * Refresca el token de acceso
   * @returns {Promise<void>}
   */
  async refreshSession() {
    if (authState.isRefreshing) {
      logger.debug('Already refreshing session');
      return;
    }

    try {
      authState.isRefreshing = true;
      logger.info('Refreshing session');

      const client = getSupabaseClient();

      const { data: { session }, error } = await client.auth.refreshSession();

      if (error) {
        throw error;
      }

      if (!session) {
        throw new Error('No session returned after refresh');
      }

      logger.info('Session refreshed successfully');
    } catch (error) {
      logger.error('Error refreshing session:', error);

      // Si el refresh falla, probablemente el token expiró
      if (error.message?.includes('refresh_token') || error.message?.includes('expired')) {
        await this.logout();
      }

      throw error;
    } finally {
      authState.isRefreshing = false;
    }
  },

  /**
   * Añade un listener para cambios de autenticación
   * @param {Function} callback - Función a ejecutar en cambios
   * @returns {Function} Función para remover el listener
   */
  onAuthStateChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    authListeners.add(callback);
    logger.debug('Auth listener added');

    // Retornar función para remover el listener
    return () => {
      authListeners.delete(callback);
      logger.debug('Auth listener removed');
    };
  },

  /**
   * Verifica el estado de auth y refresca si es necesario
   * @returns {Promise<boolean>} True si la sesión es válida
   */
  async checkAuthStatus() {
    try {
      if (!authState.session) {
        logger.debug('No session found');
        return false;
      }

      // Verificar si el token está por expirar (5 minutos antes)
      const expiresAt = authState.session.expires_at;
      const expiresIn = expiresAt ? (expiresAt * 1000) - Date.now() : 0;

      if (expiresIn < 5 * 60 * 1000) { // Menos de 5 minutos
        logger.info('Token expiring soon, refreshing...');
        await this.refreshSession();
      }

      return true;
    } catch (error) {
      logger.error('Error checking auth status:', error);
      return false;
    }
  },

  /**
   * Obtiene el token de acceso actual
   * @returns {string|null} Token de acceso o null
   */
  getAccessToken() {
    return authState.session?.access_token || null;
  },

  /**
   * Resetea el módulo de autenticación
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      logger.info('Resetting auth module');

      // Cerrar sesión si existe
      if (authState.session) {
        await this.logout();
      }

      // Limpiar listeners
      authListeners.clear();

      // Resetear estado
      authState.user = null;
      authState.session = null;
      authState.subscription = null;
      authState.isInitialized = false;
      authState.isRefreshing = false;

      // Limpiar cliente
      if (supabaseClient) {
        supabaseClient = null;
      }

      logger.info('Auth module reset complete');
    } catch (error) {
      logger.error('Error resetting auth module:', error);
      throw error;
    }
  }
};

// Auto-refresh setup
let refreshInterval = null;

/**
 * Configura el auto-refresh de tokens
 */
export function setupAutoRefresh() {
  // Limpiar interval existente
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Configurar nuevo interval (cada 30 minutos)
  refreshInterval = setInterval(async () => {
    if (auth.isAuthenticated()) {
      try {
        await auth.checkAuthStatus();
      } catch (error) {
        logger.error('Auto-refresh failed:', error);
      }
    }
  }, 30 * 60 * 1000); // 30 minutos

  logger.info('Auto-refresh configured');
}

/**
 * Detiene el auto-refresh
 */
export function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    logger.info('Auto-refresh stopped');
  }
}

// Exportar por defecto
export default auth;
