/**
 * @fileoverview Configuración centralizada de la extensión
 *
 * IMPORTANTE: No commitear credenciales reales a Git
 * Usar variables de entorno en producción
 */

// Detectar entorno
const isDevelopment = process.env.NODE_ENV === 'development' ||
                     chrome.runtime.getManifest().version.includes('0.1');

/**
 * Configuración de Supabase
 * Proyecto: EVO (Kit IA Emprendedor)
 */
export const SUPABASE_CONFIG = {
  url: process.env.VITE_SUPABASE_URL || 'https://nktqqsbebhoedgookfzu.supabase.co',
  // Esta key es pública y segura de exponer en el cliente
  // IMPORTANTE: Configurar VITE_SUPABASE_ANON_KEY en .env antes de producción
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || (() => {
    if (isDevelopment) {
      console.warn('[Config] ⚠️ Using development Supabase key. Configure .env for production!');
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rdHFxc2JlYmhvZWRnb29rZnp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNzYyMTEsImV4cCI6MjA2NTk1MjIxMX0.YmsU1VKwHkuFHFLCBW56KlGinvToSzHXtwSmkl5uhK4';
    }
    throw new Error('Supabase anon key not configured. Please set VITE_SUPABASE_ANON_KEY in .env file');
  })(),
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    realtime: {
      enabled: false // No necesitamos realtime en v1
    },
    global: {
      headers: {
        'x-client-info': 'kit-ia-emprendedor-extension'
      }
    }
  }
};

/**
 * URLs de la aplicación
 */
export const URLS = {
  // OAuth callbacks
  authCallback: chrome.runtime.getURL('auth/callback.html'),
  loginPage: chrome.runtime.getURL('auth/login.html'),

  // External URLs
  website: 'https://kitiaemprendedor.com',
  support: 'https://kitiaemprendedor.com/support',
  privacy: 'https://kitiaemprendedor.com/privacy',
  terms: 'https://kitiaemprendedor.com/terms',

  // Documentation
  docs: 'https://docs.kitiaemprendedor.com',
  changelog: 'https://github.com/carlosrodera/kit-ia-emprendedor-extension/releases'
};

/**
 * Configuración de almacenamiento
 */
export const STORAGE_CONFIG = {
  // Límites
  maxPrompts: 100,
  maxPromptLength: 5000,
  maxTags: 10,
  maxTagLength: 30,

  // Cache
  gptsCacheTTL: 24 * 60 * 60 * 1000, // 24 horas
  notificationsCacheTTL: 60 * 60 * 1000, // 1 hora

  // Sync
  autoSyncInterval: isDevelopment ? 60 * 1000 : 5 * 60 * 1000, // 1 min dev, 5 min prod

  // Quotas (Chrome storage limits)
  localStorageQuota: 5 * 1024 * 1024, // 5MB
  syncStorageQuota: 100 * 1024, // 100KB
  quotaWarningThreshold: 0.9 // Warn at 90% usage
};

/**
 * Configuración de UI
 */
export const UI_CONFIG = {
  // Sidebar
  sidebarWidth: {
    default: 360,
    min: 320,
    max: 480
  },

  // Animations
  animationDuration: {
    fast: 150,
    normal: 200,
    slow: 300
  },

  // Debounce/Throttle
  searchDebounce: 300,
  resizeThrottle: 100,
  scrollThrottle: 150,

  // Pagination
  itemsPerPage: 20,

  // Notifications
  notificationDuration: {
    info: 5000,
    success: 3000,
    warning: 8000,
    error: 10000
  },
  maxVisibleNotifications: 3
};

/**
 * Configuración de desarrollo
 */
export const DEV_CONFIG = {
  // Logging
  enableLogging: isDevelopment,
  logLevel: isDevelopment ? 'debug' : 'error',

  // Debugging
  showDebugInfo: isDevelopment,
  enableDevTools: isDevelopment,

  // Testing
  mockData: false,
  bypassAuth: false
};

/**
 * Feature flags
 */
export const FEATURES = {
  // v1.0 features
  oauth: true,
  localStorage: true,
  favorites: true,
  prompts: true,
  notifications: true,
  search: true,
  filters: true,
  export: true,

  // Future features (v2.0)
  darkMode: false,
  cloudSync: false,
  collaboration: false,
  aiSuggestions: false,
  advancedSearch: false,
  templates: false,
  analytics: false
};

/**
 * Validar configuración
 */
export function validateConfig() {
  const errors = [];

  if (!SUPABASE_CONFIG.url) {
    errors.push('Supabase URL is required');
  }

  if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_ANON_KEY_HERE') {
    errors.push('Supabase anon key is not configured');
  }

  if (STORAGE_CONFIG.maxPrompts > 1000) {
    errors.push('Max prompts exceeds reasonable limit');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    return false;
  }

  return true;
}

// Exportar configuración completa
export default {
  supabase: SUPABASE_CONFIG,
  urls: URLS,
  storage: STORAGE_CONFIG,
  ui: UI_CONFIG,
  dev: DEV_CONFIG,
  features: FEATURES,
  isDevelopment,
  version: chrome.runtime.getManifest().version
};

// Exportar isDevelopment como export nombrado también
export { isDevelopment };
