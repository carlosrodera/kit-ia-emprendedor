/**
 * @fileoverview Configuración centralizada de la extensión
 *
 * IMPORTANTE: No commitear credenciales reales a Git
 * Usar variables de entorno en producción
 */
import logger from '../utils/logger.js';


import configManager from '../utils/config-manager.js';

// Detectar entorno
const isDevelopment = import.meta.env.DEV || 
                     chrome.runtime.getManifest().version.includes('0.1');

/**
 * Configuración de Supabase
 * Proyecto: EVO (Kit IA Emprendedor)
 */
export const SUPABASE_CONFIG = {
  url: configManager.get('VITE_SUPABASE_URL'),
  anonKey: configManager.get('VITE_SUPABASE_ANON_KEY'),
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // IMPORTANTE: false en Chrome Extensions
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
  mockData: import.meta.env.VITE_MOCK_DATA === 'true',
  bypassAuth: import.meta.env.VITE_BYPASS_AUTH === 'true'
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

  try {
    // Validar usando ConfigManager
    configManager.validate();
  } catch (error) {
    errors.push(error.message);
  }

  if (STORAGE_CONFIG.maxPrompts > 1000) {
    errors.push('Max prompts exceeds reasonable limit');
  }

  if (errors.length > 0) {
    logger.error('Configuration errors:', errors);
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
  version: chrome?.runtime?.getManifest?.()?.version || '0.0.0'
};

// Exportar isDevelopment como export nombrado también
export { isDevelopment };
