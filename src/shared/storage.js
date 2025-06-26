/**
 * Módulo de Storage - Kit IA Emprendedor
 * Encapsula toda la interacción con chrome.storage.local
 *
 * @module storage
 */

import {
  STORAGE_KEYS,
  STORAGE_LIMITS,
  ERROR_MESSAGES,
  DEFAULT_PREFERENCES
} from './constants.js';
import { logger } from './logger.js';

/**
 * Clase principal para gestión de almacenamiento
 */
class StorageManager {
  constructor() {
    this.listeners = new Map();
    this.initializeListeners();
  }

  /**
   * Inicializa los listeners de cambios en storage
   */
  initializeListeners() {
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          this.handleStorageChanges(changes);
        }
      });
    }
  }

  /**
   * Maneja los cambios en storage y notifica a los listeners
   * @param {Object} changes - Cambios detectados
   */
  handleStorageChanges(changes) {
    for (const [key, change] of Object.entries(changes)) {
      const callbacks = this.listeners.get(key) || [];
      callbacks.forEach(callback => {
        try {
          callback(change.newValue, change.oldValue);
        } catch (error) {
          logger.error('Error in storage change listener:', error);
        }
      });
    }
  }

  /**
   * Añade un listener para cambios en una clave específica
   * @param {string} key - Clave a observar
   * @param {Function} callback - Función a ejecutar
   * @returns {Function} Función para remover el listener
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);

    // Retorna función para remover el listener
    return () => {
      const callbacks = this.listeners.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Obtiene datos del storage
   * @param {string|string[]} keys - Clave(s) a obtener
   * @returns {Promise<Object>} Datos almacenados
   */
  async get(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      logger.error('Error getting from storage:', error);
      throw error;
    }
  }

  /**
   * Guarda datos en storage
   * @param {Object} data - Datos a guardar
   * @returns {Promise<void>}
   */
  async set(data) {
    try {
      await chrome.storage.local.set(data);
    } catch (error) {
      logger.error('Error setting storage:', error);
      throw error;
    }
  }

  /**
   * Elimina datos del storage
   * @param {string|string[]} keys - Clave(s) a eliminar
   * @returns {Promise<void>}
   */
  async remove(keys) {
    try {
      await chrome.storage.local.remove(keys);
    } catch (error) {
      logger.error('Error removing from storage:', error);
      throw error;
    }
  }

  /**
   * Limpia todo el storage
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      await chrome.storage.local.clear();
      logger.info('Storage cleared');
    } catch (error) {
      logger.error('Error clearing storage:', error);
      throw error;
    }
  }

  /**
   * Obtiene información sobre el uso del storage
   * @returns {Promise<Object>} Bytes usados y disponibles
   */
  async getStorageInfo() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
      return {
        used: bytesInUse,
        total: quota,
        available: quota - bytesInUse,
        percentage: (bytesInUse / quota) * 100
      };
    } catch (error) {
      logger.error('Error getting storage info:', error);
      return null;
    }
  }
}

// Instancia única del manager
const storageManager = new StorageManager();

/**
 * Funciones de Auth Token
 */
export const authStorage = {
  /**
   * Guarda el token de autenticación
   * @param {string} token - Token a guardar
   * @returns {Promise<void>}
   */
  async saveToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token');
    }
    await storageManager.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
    logger.info('Auth token saved');
  },

  /**
   * Obtiene el token de autenticación
   * @returns {Promise<string|null>} Token o null si no existe
   */
  async getToken() {
    const result = await storageManager.get(STORAGE_KEYS.AUTH_TOKEN);
    return result[STORAGE_KEYS.AUTH_TOKEN] || null;
  },

  /**
   * Elimina el token de autenticación
   * @returns {Promise<void>}
   */
  async removeToken() {
    await storageManager.remove(STORAGE_KEYS.AUTH_TOKEN);
    logger.info('Auth token removed');
  },

  /**
   * Verifica si existe un token
   * @returns {Promise<boolean>}
   */
  async hasToken() {
    const token = await this.getToken();
    return !!token;
  }
};

/**
 * Funciones para gestión de Prompts
 */
export const promptStorage = {
  /**
   * Obtiene todos los prompts
   * @returns {Promise<Array>} Lista de prompts
   */
  async getAll() {
    const result = await storageManager.get(STORAGE_KEYS.PROMPTS);
    return result[STORAGE_KEYS.PROMPTS] || [];
  },

  /**
   * Guarda un nuevo prompt
   * @param {Object} prompt - Prompt a guardar
   * @returns {Promise<Object>} Prompt guardado con ID
   */
  async save(prompt) {
    // Validación
    if (!prompt || typeof prompt !== 'object') {
      throw new Error(ERROR_MESSAGES.INVALID_DATA);
    }

    if (!prompt.title || !prompt.content) {
      throw new Error('Title and content are required');
    }

    if (prompt.content.length > STORAGE_LIMITS.MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt content exceeds maximum length of ${STORAGE_LIMITS.MAX_PROMPT_LENGTH} characters`);
    }

    // Obtener prompts existentes
    const prompts = await this.getAll();

    // Verificar límite
    if (prompts.length >= STORAGE_LIMITS.MAX_PROMPTS) {
      throw new Error(`Maximum number of prompts (${STORAGE_LIMITS.MAX_PROMPTS}) reached`);
    }

    // Crear nuevo prompt con ID único
    const newPrompt = {
      id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: prompt.title.trim(),
      content: prompt.content.trim(),
      category: prompt.category || 'other',
      tags: prompt.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    };

    // Añadir a la lista
    prompts.push(newPrompt);

    // Guardar
    await storageManager.set({ [STORAGE_KEYS.PROMPTS]: prompts });
    logger.info('Prompt saved:', newPrompt.id);

    return newPrompt;
  },

  /**
   * Actualiza un prompt existente
   * @param {string} id - ID del prompt
   * @param {Object} updates - Datos a actualizar
   * @returns {Promise<Object>} Prompt actualizado
   */
  async update(id, updates) {
    if (!id || !updates) {
      throw new Error(ERROR_MESSAGES.INVALID_DATA);
    }

    // Validar longitud si se actualiza el contenido
    if (updates.content && updates.content.length > STORAGE_LIMITS.MAX_PROMPT_LENGTH) {
      throw new Error(`Prompt content exceeds maximum length of ${STORAGE_LIMITS.MAX_PROMPT_LENGTH} characters`);
    }

    const prompts = await this.getAll();
    const index = prompts.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error('Prompt not found');
    }

    // Actualizar prompt
    prompts[index] = {
      ...prompts[index],
      ...updates,
      id: prompts[index].id, // Mantener ID original
      createdAt: prompts[index].createdAt, // Mantener fecha de creación
      updatedAt: new Date().toISOString()
    };

    await storageManager.set({ [STORAGE_KEYS.PROMPTS]: prompts });
    logger.info('Prompt updated:', id);

    return prompts[index];
  },

  /**
   * Elimina un prompt
   * @param {string} id - ID del prompt a eliminar
   * @returns {Promise<void>}
   */
  async delete(id) {
    if (!id) {
      throw new Error('ID is required');
    }

    const prompts = await this.getAll();
    const filtered = prompts.filter(p => p.id !== id);

    if (filtered.length === prompts.length) {
      throw new Error('Prompt not found');
    }

    await storageManager.set({ [STORAGE_KEYS.PROMPTS]: filtered });
    logger.info('Prompt deleted:', id);
  },

  /**
   * Incrementa el contador de uso de un prompt
   * @param {string} id - ID del prompt
   * @returns {Promise<void>}
   */
  async incrementUsage(id) {
    const prompts = await this.getAll();
    const prompt = prompts.find(p => p.id === id);

    if (prompt) {
      prompt.usageCount = (prompt.usageCount || 0) + 1;
      prompt.lastUsedAt = new Date().toISOString();
      await storageManager.set({ [STORAGE_KEYS.PROMPTS]: prompts });
    }
  },

  /**
   * Busca prompts por texto
   * @param {string} query - Texto a buscar
   * @returns {Promise<Array>} Prompts que coinciden
   */
  async search(query) {
    if (!query) return this.getAll();

    const prompts = await this.getAll();
    const lowerQuery = query.toLowerCase();

    return prompts.filter(prompt =>
      prompt.title.toLowerCase().includes(lowerQuery) ||
      prompt.content.toLowerCase().includes(lowerQuery) ||
      (prompt.tags && prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }
};

/**
 * Funciones para gestión de Favoritos
 */
export const favoritesStorage = {
  /**
   * Obtiene todos los IDs de GPTs favoritos
   * @returns {Promise<Array>} Lista de IDs
   */
  async getAll() {
    const result = await storageManager.get(STORAGE_KEYS.FAVORITES);
    return result[STORAGE_KEYS.FAVORITES] || [];
  },

  /**
   * Añade un GPT a favoritos
   * @param {string} gptId - ID del GPT
   * @returns {Promise<void>}
   */
  async add(gptId) {
    if (!gptId) {
      throw new Error('GPT ID is required');
    }

    const favorites = await this.getAll();

    if (!favorites.includes(gptId)) {
      favorites.push(gptId);
      await storageManager.set({ [STORAGE_KEYS.FAVORITES]: favorites });
      logger.info('Added to favorites:', gptId);
    }
  },

  /**
   * Elimina un GPT de favoritos
   * @param {string} gptId - ID del GPT
   * @returns {Promise<void>}
   */
  async remove(gptId) {
    if (!gptId) {
      throw new Error('GPT ID is required');
    }

    const favorites = await this.getAll();
    const filtered = favorites.filter(id => id !== gptId);

    if (filtered.length < favorites.length) {
      await storageManager.set({ [STORAGE_KEYS.FAVORITES]: filtered });
      logger.info('Removed from favorites:', gptId);
    }
  },

  /**
   * Verifica si un GPT está en favoritos
   * @param {string} gptId - ID del GPT
   * @returns {Promise<boolean>}
   */
  async isFavorite(gptId) {
    const favorites = await this.getAll();
    return favorites.includes(gptId);
  },

  /**
   * Alterna el estado de favorito
   * @param {string} gptId - ID del GPT
   * @returns {Promise<boolean>} Nuevo estado
   */
  async toggle(gptId) {
    const isFav = await this.isFavorite(gptId);

    if (isFav) {
      await this.remove(gptId);
    } else {
      await this.add(gptId);
    }

    return !isFav;
  }
};

/**
 * Funciones para gestión de Preferencias
 */
export const preferencesStorage = {
  /**
   * Obtiene todas las preferencias
   * @returns {Promise<Object>} Preferencias del usuario
   */
  async getAll() {
    const result = await storageManager.get(STORAGE_KEYS.PREFERENCES);
    return { ...DEFAULT_PREFERENCES, ...(result[STORAGE_KEYS.PREFERENCES] || {}) };
  },

  /**
   * Guarda preferencias
   * @param {Object} preferences - Preferencias a guardar
   * @returns {Promise<void>}
   */
  async save(preferences) {
    const current = await this.getAll();
    const updated = { ...current, ...preferences };

    await storageManager.set({ [STORAGE_KEYS.PREFERENCES]: updated });
    logger.info('Preferences saved');
  },

  /**
   * Obtiene una preferencia específica
   * @param {string} key - Clave de la preferencia
   * @returns {Promise<any>} Valor de la preferencia
   */
  async get(key) {
    const preferences = await this.getAll();
    return preferences[key];
  },

  /**
   * Establece una preferencia específica
   * @param {string} key - Clave de la preferencia
   * @param {any} value - Valor a establecer
   * @returns {Promise<void>}
   */
  async set(key, value) {
    const preferences = await this.getAll();
    preferences[key] = value;
    await this.save(preferences);
  },

  /**
   * Resetea las preferencias a valores por defecto
   * @returns {Promise<void>}
   */
  async reset() {
    await storageManager.set({ [STORAGE_KEYS.PREFERENCES]: DEFAULT_PREFERENCES });
    logger.info('Preferences reset to defaults');
  }
};

/**
 * Funciones para gestión de Cache de GPTs
 */
export const cacheStorage = {
  /**
   * Obtiene el cache de GPTs
   * @returns {Promise<Object|null>} Cache o null si expiró
   */
  async getGPTsCache() {
    const result = await storageManager.get(STORAGE_KEYS.GPTS_CACHE);
    const cache = result[STORAGE_KEYS.GPTS_CACHE];

    if (!cache) return null;

    // Verificar TTL
    const age = Date.now() - cache.timestamp;
    if (age > STORAGE_LIMITS.MAX_CACHE_AGE) {
      logger.info('GPTs cache expired');
      await this.clearGPTsCache();
      return null;
    }

    return cache.data;
  },

  /**
   * Guarda GPTs en cache
   * @param {Array} gpts - Lista de GPTs
   * @returns {Promise<void>}
   */
  async saveGPTsCache(gpts) {
    if (!Array.isArray(gpts)) {
      throw new Error('GPTs must be an array');
    }

    const cache = {
      data: gpts,
      timestamp: Date.now(),
      count: gpts.length
    };

    await storageManager.set({ [STORAGE_KEYS.GPTS_CACHE]: cache });
    logger.info(`Cached ${gpts.length} GPTs`);
  },

  /**
   * Limpia el cache de GPTs
   * @returns {Promise<void>}
   */
  async clearGPTsCache() {
    await storageManager.remove(STORAGE_KEYS.GPTS_CACHE);
    logger.info('GPTs cache cleared');
  },

  /**
   * Obtiene información del cache
   * @returns {Promise<Object>} Información del cache
   */
  async getCacheInfo() {
    const result = await storageManager.get(STORAGE_KEYS.GPTS_CACHE);
    const cache = result[STORAGE_KEYS.GPTS_CACHE];

    if (!cache) {
      return { exists: false };
    }

    const age = Date.now() - cache.timestamp;
    return {
      exists: true,
      timestamp: cache.timestamp,
      age,
      expired: age > STORAGE_LIMITS.MAX_CACHE_AGE,
      count: cache.count
    };
  }
};

/**
 * Funciones de Backup y Export
 */
export const backupStorage = {
  /**
   * Exporta todos los datos a JSON
   * @returns {Promise<Object>} Todos los datos del storage
   */
  async exportAll() {
    try {
      const allData = await storageManager.get(null);

      // Añadir metadata
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appName: 'Kit IA Emprendedor',
        data: allData
      };

      logger.info('Data exported successfully');
      return exportData;
    } catch (error) {
      logger.error('Error exporting data:', error);
      throw error;
    }
  },

  /**
   * Importa datos desde JSON
   * @param {Object} data - Datos a importar
   * @param {boolean} merge - Si true, mezcla con datos existentes
   * @returns {Promise<void>}
   */
  async importAll(data, merge = false) {
    try {
      // Validar estructura
      if (!data || !data.data || typeof data.data !== 'object') {
        throw new Error('Invalid import data structure');
      }

      // Verificar versión si existe
      if (data.version && data.version !== '1.0') {
        logger.warn('Import data version mismatch:', data.version);
      }

      if (merge) {
        // Obtener datos actuales
        const currentData = await storageManager.get(null);

        // Mezclar datos
        const mergedData = { ...currentData };

        // Mezclar prompts manteniendo IDs únicos
        if (data.data[STORAGE_KEYS.PROMPTS] && currentData[STORAGE_KEYS.PROMPTS]) {
          const currentPrompts = currentData[STORAGE_KEYS.PROMPTS] || [];
          const importPrompts = data.data[STORAGE_KEYS.PROMPTS] || [];
          const existingIds = new Set(currentPrompts.map(p => p.id));

          const newPrompts = importPrompts.filter(p => !existingIds.has(p.id));
          mergedData[STORAGE_KEYS.PROMPTS] = [...currentPrompts, ...newPrompts];

          // Verificar límite
          if (mergedData[STORAGE_KEYS.PROMPTS].length > STORAGE_LIMITS.MAX_PROMPTS) {
            throw new Error(`Import would exceed maximum prompts limit (${STORAGE_LIMITS.MAX_PROMPTS})`);
          }
        }

        // Mezclar favoritos
        if (data.data[STORAGE_KEYS.FAVORITES] && currentData[STORAGE_KEYS.FAVORITES]) {
          const currentFavs = new Set(currentData[STORAGE_KEYS.FAVORITES] || []);
          const importFavs = data.data[STORAGE_KEYS.FAVORITES] || [];
          importFavs.forEach(fav => currentFavs.add(fav));
          mergedData[STORAGE_KEYS.FAVORITES] = Array.from(currentFavs);
        }

        // Guardar datos mezclados
        await storageManager.set(mergedData);
      } else {
        // Reemplazar todos los datos
        await storageManager.clear();
        await storageManager.set(data.data);
      }

      logger.info('Data imported successfully');
    } catch (error) {
      logger.error('Error importing data:', error);
      throw error;
    }
  },

  /**
   * Descarga los datos como archivo JSON
   * @returns {Promise<void>}
   */
  async downloadBackup() {
    try {
      const data = await this.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const filename = `kit-ia-backup-${new Date().toISOString().split('T')[0]}.json`;

      // Crear enlace de descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Limpiar URL
      URL.revokeObjectURL(url);

      logger.info('Backup downloaded:', filename);
    } catch (error) {
      logger.error('Error downloading backup:', error);
      throw error;
    }
  }
};

/**
 * Funciones de utilidad general
 */
export const storageUtils = {
  /**
   * Verifica el estado del storage
   * @returns {Promise<Object>} Estado del storage
   */
  async checkHealth() {
    try {
      // Verificar que podemos leer y escribir
      const testKey = '_health_check_';
      const testValue = Date.now();

      await storageManager.set({ [testKey]: testValue });
      const result = await storageManager.get(testKey);
      await storageManager.remove(testKey);

      if (result[testKey] !== testValue) {
        throw new Error('Storage read/write test failed');
      }

      // Obtener información de uso
      const info = await storageManager.getStorageInfo();

      return {
        healthy: true,
        storageInfo: info,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Storage health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  /**
   * Limpia datos antiguos o no utilizados
   * @returns {Promise<Object>} Resumen de limpieza
   */
  async cleanup() {
    const summary = {
      promptsRemoved: 0,
      cacheCleared: false,
      bytesFreed: 0
    };

    try {
      const beforeInfo = await storageManager.getStorageInfo();

      // Limpiar cache expirado
      const cacheInfo = await cacheStorage.getCacheInfo();
      if (cacheInfo.exists && cacheInfo.expired) {
        await cacheStorage.clearGPTsCache();
        summary.cacheCleared = true;
      }

      // Opcional: limpiar prompts muy antiguos sin uso
      // (implementar según necesidades)

      const afterInfo = await storageManager.getStorageInfo();
      summary.bytesFreed = (beforeInfo?.used || 0) - (afterInfo?.used || 0);

      logger.info('Storage cleanup completed:', summary);
      return summary;
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  },

  /**
   * Añade listener para cambios en storage
   * @param {string} key - Clave a observar
   * @param {Function} callback - Callback a ejecutar
   * @returns {Function} Función para remover el listener
   */
  addListener(key, callback) {
    return storageManager.addListener(key, callback);
  },

  /**
   * Obtiene información del storage
   * @returns {Promise<Object>} Información de uso
   */
  getStorageInfo() {
    return storageManager.getStorageInfo();
  }
};

// Exportar todo como un objeto para fácil acceso
export default {
  auth: authStorage,
  prompts: promptStorage,
  favorites: favoritesStorage,
  preferences: preferencesStorage,
  cache: cacheStorage,
  backup: backupStorage,
  utils: storageUtils
};
