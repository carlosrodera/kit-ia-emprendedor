/**
 * Configuración de la aplicación
 */

// Detectar si estamos en desarrollo
const isDevelopment = !('update_url' in chrome.runtime.getManifest());

// Configuración de Supabase
export const SUPABASE_CONFIG = {
  url: 'https://nktqqsbebhoedgookfzu.supabase.co',
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE',
  options: {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
};

// Configuración del entorno
export const ENV = {
  isDevelopment,
  isProduction: !isDevelopment,
  version: chrome.runtime.getManifest().version,
  name: chrome.runtime.getManifest().name
};

// Configuración de logs
export const LOG_CONFIG = {
  enabled: isDevelopment,
  level: isDevelopment ? 'debug' : 'error',
  includeTimestamp: true,
  includeStackTrace: isDevelopment
};

// Configuración de cache
export const CACHE_CONFIG = {
  enabled: true,
  ttl: {
    gpts: 1000 * 60 * 60, // 1 hora
    user: 1000 * 60 * 30, // 30 minutos
    notifications: 1000 * 60 * 5 // 5 minutos
  }
};

// Configuración de seguridad
export const SECURITY_CONFIG = {
  maxLoginAttempts: 5,
  lockoutDuration: 1000 * 60 * 15, // 15 minutos
  sessionTimeout: 1000 * 60 * 60 * 24 * 7, // 7 días
  requireHttps: true
};

// Configuración de validación
export const VALIDATION_CONFIG = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
  },
  prompt: {
    minLength: 1,
    maxLength: 5000
  }
};

// Configuración de la UI
export const UI_CONFIG = {
  animations: {
    enabled: true,
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    }
  },
  debounce: {
    search: 300,
    resize: 100,
    scroll: 50
  },
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100]
  }
};

// Feature flags
export const FEATURES = {
  darkMode: true,
  advancedSearch: true,
  exportImport: true,
  analytics: !isDevelopment,
  debugPanel: isDevelopment
};

// Exportar configuración completa
export const CONFIG = {
  supabase: SUPABASE_CONFIG,
  env: ENV,
  log: LOG_CONFIG,
  cache: CACHE_CONFIG,
  security: SECURITY_CONFIG,
  validation: VALIDATION_CONFIG,
  ui: UI_CONFIG,
  features: FEATURES
};

export default CONFIG;