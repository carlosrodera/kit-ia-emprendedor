/**
 * Constantes globales de la aplicación
 */

export const APP_NAME = 'Kit IA Emprendedor';
export const APP_VERSION = '0.1.0';

// Prefijos para evitar colisiones
export const APP_PREFIX = 'kitia';
export const STORAGE_PREFIX = 'kitia_';

// Claves de almacenamiento
export const STORAGE_KEYS = {
  AUTH_TOKEN: `${STORAGE_PREFIX}auth_token`,
  USER_DATA: `${STORAGE_PREFIX}user_data`,
  GPTS_CACHE: `${STORAGE_PREFIX}gpts_cache`,
  FAVORITES: `${STORAGE_PREFIX}favorites`,
  PROMPTS: `${STORAGE_PREFIX}prompts`,
  PREFERENCES: `${STORAGE_PREFIX}preferences`,
  LAST_SYNC: `${STORAGE_PREFIX}last_sync`,
  NOTIFICATIONS_READ: `${STORAGE_PREFIX}notifications_read`
};

// Categorías de GPTs (debe coincidir con Supabase)
export const GPT_CATEGORIES = {
  PRODUCTIVITY: { id: 'productivity', name: 'Productivity', icon: '⚡', color: '#3B82F6' },
  WRITING: { id: 'writing', name: 'Writing', icon: '✍️', color: '#10B981' },
  RESEARCH: { id: 'research', name: 'Research', icon: '🔍', color: '#8B5CF6' },
  EDUCATION: { id: 'education', name: 'Education', icon: '🎓', color: '#F59E0B' },
  DEVELOPMENT: { id: 'development', name: 'Development', icon: '💻', color: '#EF4444' },
  BUSINESS: { id: 'business', name: 'Business', icon: '💼', color: '#6366F1' },
  CREATIVE: { id: 'creative', name: 'Creative', icon: '🎨', color: '#EC4899' },
  OTHER: { id: 'other', name: 'Other', icon: '📦', color: '#6B7280' }
};

// Tipos de vista
export const VIEW_MODES = {
  CARD: 'card',
  LIST: 'list'
};

// Tipos de notificación
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
};

// Duración de notificaciones (ms)
export const NOTIFICATION_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
  PERMANENT: 0
};

// Límites de almacenamiento
export const STORAGE_LIMITS = {
  MAX_PROMPTS: 100,
  MAX_PROMPT_LENGTH: 5000,
  MAX_CACHE_AGE: 1000 * 60 * 60 * 24, // 24 horas
  SYNC_INTERVAL: 1000 * 60 * 5 // 5 minutos
};

// Configuración de API
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 segundo
};

// Dimensiones del sidebar
export const SIDEBAR_CONFIG = {
  WIDTH: 360,
  MIN_WIDTH: 320,
  MAX_WIDTH: 480,
  Z_INDEX: 2147483647 // Máximo z-index
};

// Mensajes de error comunes
export const ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'Debes iniciar sesión para acceder a esta función',
  NETWORK_ERROR: 'Error de conexión. Por favor, verifica tu conexión a internet',
  STORAGE_FULL: 'El almacenamiento local está lleno. Elimina algunos prompts antiguos',
  INVALID_DATA: 'Los datos proporcionados no son válidos',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción',
  RATE_LIMITED: 'Demasiadas solicitudes. Por favor, espera un momento',
  UNKNOWN_ERROR: 'Ha ocurrido un error inesperado'
};

// Configuración por defecto del usuario
export const DEFAULT_PREFERENCES = {
  theme: 'light',
  viewMode: VIEW_MODES.CARD,
  showNotifications: true,
  autoSync: true,
  syncInterval: STORAGE_LIMITS.SYNC_INTERVAL,
  compactMode: false,
  language: 'es'
};

// URLs importantes
export const URLS = {
  PRIVACY_POLICY: 'https://kitiaemprendedor.com/privacy',
  TERMS_OF_SERVICE: 'https://kitiaemprendedor.com/terms',
  SUPPORT: 'https://kitiaemprendedor.com/support',
  DOCUMENTATION: 'https://kitiaemprendedor.com/docs'
};

// Eventos personalizados
export const CUSTOM_EVENTS = {
  AUTH_STATE_CHANGED: 'kitia:auth:changed',
  GPTS_UPDATED: 'kitia:gpts:updated',
  PROMPT_SAVED: 'kitia:prompt:saved',
  PREFERENCE_CHANGED: 'kitia:preference:changed',
  SYNC_COMPLETED: 'kitia:sync:completed',
  NOTIFICATION_RECEIVED: 'kitia:notification:received'
};

// Mensajes entre componentes
export const MESSAGES = {
  // Auth
  CHECK_AUTH: 'CHECK_AUTH',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_ERROR: 'AUTH_ERROR',

  // GPTs
  GET_GPTS: 'GET_GPTS',
  SYNC_GPTS: 'SYNC_GPTS',
  GET_GPT_STATS: 'GET_GPT_STATS',

  // Sidebar
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SIDEBAR_READY: 'SIDEBAR_READY',

  // Storage
  SAVE_PROMPT: 'SAVE_PROMPT',
  DELETE_PROMPT: 'DELETE_PROMPT',
  GET_PROMPTS: 'GET_PROMPTS',

  // Favorites
  ADD_FAVORITE: 'ADD_FAVORITE',
  REMOVE_FAVORITE: 'REMOVE_FAVORITE',
  GET_FAVORITES: 'GET_FAVORITES',

  // Notifications
  GET_NOTIFICATIONS: 'GET_NOTIFICATIONS',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ'
};
