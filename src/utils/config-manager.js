/**
 * Gestión segura de configuración
 * NUNCA hardcodear valores - SIEMPRE usar ConfigManager
 * 
 * @module ConfigManager
 * @since 2025-01-28
 * @version 2.0.0
 */

import { error } from './logger.js';

/**
 * Claves de configuración requeridas
 * @type {Array<string>}
 */
const REQUIRED_KEYS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

/**
 * Valores por defecto para desarrollo
 * @type {Object}
 */
const DEVELOPMENT_DEFAULTS = {
  VITE_LOG_LEVEL: 'debug',
  VITE_ENABLE_MOCKS: 'false',
  VITE_API_TIMEOUT: '10000'
};

/**
 * Clase para gestión segura de configuración
 * @class
 */
export class ConfigManager {
  constructor() {
    this._cache = new Map();
    this._validated = false;
  }

  /**
   * Obtiene un valor de configuración
   * @param {string} key - Clave de configuración
   * @param {*} [defaultValue] - Valor por defecto
   * @returns {string|undefined}
   * @throws {Error} Si la clave es requerida y no existe
   */
  get(key, defaultValue = undefined) {
    // Verificar cache primero
    if (this._cache.has(key)) {
      return this._cache.get(key);
    }

    // Intentar obtener de import.meta.env
    let value = import.meta.env?.[key];

    // Si no existe y es desarrollo, usar defaults
    if (!value && import.meta.env.DEV && DEVELOPMENT_DEFAULTS[key]) {
      value = DEVELOPMENT_DEFAULTS[key];
    }

    // Si no existe y es requerida, error
    if (!value && REQUIRED_KEYS.includes(key) && !defaultValue) {
      const errorMsg = `Required configuration missing: ${key}`;
      error(errorMsg);
      throw new Error(errorMsg);
    }

    // Usar default si se proporcionó
    if (!value && defaultValue !== undefined) {
      value = defaultValue;
    }

    // Cachear el valor
    if (value !== undefined) {
      this._cache.set(key, value);
    }

    return value;
  }

  /**
   * Obtiene un valor de configuración como booleano
   * @param {string} key - Clave de configuración
   * @param {boolean} [defaultValue] - Valor por defecto
   * @returns {boolean}
   */
  getBoolean(key, defaultValue = false) {
    const value = this.get(key, String(defaultValue));
    return value === 'true' || value === '1' || value === true;
  }

  /**
   * Obtiene un valor de configuración como número
   * @param {string} key - Clave de configuración
   * @param {number} [defaultValue] - Valor por defecto
   * @returns {number}
   */
  getNumber(key, defaultValue = 0) {
    const value = this.get(key, String(defaultValue));
    const num = Number(value);
    
    if (isNaN(num)) {
      error(`Configuration value for ${key} is not a valid number: ${value}`);
      return defaultValue;
    }
    
    return num;
  }

  /**
   * Obtiene un valor de configuración como array
   * @param {string} key - Clave de configuración
   * @param {string} [separator=','] - Separador
   * @param {Array} [defaultValue=[]] - Valor por defecto
   * @returns {Array<string>}
   */
  getArray(key, separator = ',', defaultValue = []) {
    const value = this.get(key);
    
    if (!value) {
      return defaultValue;
    }
    
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }

  /**
   * Obtiene un valor de configuración como objeto JSON
   * @param {string} key - Clave de configuración
   * @param {Object} [defaultValue={}] - Valor por defecto
   * @returns {Object}
   */
  getJSON(key, defaultValue = {}) {
    const value = this.get(key);
    
    if (!value) {
      return defaultValue;
    }
    
    try {
      return JSON.parse(value);
    } catch (e) {
      error(`Configuration value for ${key} is not valid JSON: ${value}`);
      return defaultValue;
    }
  }

  /**
   * Verifica si una clave existe
   * @param {string} key - Clave de configuración
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Valida que todas las claves requeridas existan
   * @returns {boolean}
   * @throws {Error} Si faltan claves requeridas
   */
  validate() {
    if (this._validated) {
      return true;
    }

    const missing = REQUIRED_KEYS.filter(key => !this.has(key));
    
    if (missing.length > 0) {
      const errorMsg = `Missing required configuration keys: ${missing.join(', ')}`;
      error(errorMsg);
      throw new Error(errorMsg);
    }
    
    this._validated = true;
    return true;
  }

  /**
   * Obtiene todas las configuraciones (para debugging)
   * @returns {Object}
   */
  getAll() {
    const config = {};
    
    // Obtener todas las claves conocidas
    const allKeys = [
      ...REQUIRED_KEYS,
      ...Object.keys(DEVELOPMENT_DEFAULTS),
      ...Array.from(this._cache.keys())
    ];
    
    // Eliminar duplicados
    const uniqueKeys = [...new Set(allKeys)];
    
    // Obtener valores
    uniqueKeys.forEach(key => {
      const value = this.get(key, null);
      if (value !== null) {
        // Ocultar valores sensibles en logs
        if (key.toLowerCase().includes('key') || 
            key.toLowerCase().includes('secret') || 
            key.toLowerCase().includes('password')) {
          config[key] = '***HIDDEN***';
        } else {
          config[key] = value;
        }
      }
    });
    
    return config;
  }

  /**
   * Limpia la cache
   */
  clearCache() {
    this._cache.clear();
    this._validated = false;
  }

  /**
   * Obtiene la configuración de Supabase
   * @returns {Object}
   */
  getSupabaseConfig() {
    return {
      url: this.get('VITE_SUPABASE_URL'),
      anonKey: this.get('VITE_SUPABASE_ANON_KEY'),
      options: {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          flowType: 'pkce'
        }
      }
    };
  }

  /**
   * Verifica si está en modo desarrollo
   * @returns {boolean}
   */
  isDevelopment() {
    return import.meta.env.DEV || this.getBoolean('VITE_DEV_MODE', false);
  }

  /**
   * Verifica si está en modo producción
   * @returns {boolean}
   */
  isProduction() {
    return !this.isDevelopment();
  }

  /**
   * Obtiene el nivel de log configurado
   * @returns {string}
   */
  getLogLevel() {
    return this.get('VITE_LOG_LEVEL', this.isDevelopment() ? 'debug' : 'error');
  }
}

// Instancia singleton
const configManager = new ConfigManager();

// Exportar métodos para uso directo
export const getConfig = configManager.get.bind(configManager);
export const getConfigBoolean = configManager.getBoolean.bind(configManager);
export const getConfigNumber = configManager.getNumber.bind(configManager);
export const getConfigArray = configManager.getArray.bind(configManager);
export const getConfigJSON = configManager.getJSON.bind(configManager);
export const validateConfig = configManager.validate.bind(configManager);
export const getSupabaseConfig = configManager.getSupabaseConfig.bind(configManager);

// Exportar instancia completa
export default configManager;