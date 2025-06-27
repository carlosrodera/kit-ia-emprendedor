/**
 * Sistema de Favoritos - Módulo Independiente
 * Gestiona el estado de favoritos con persistencia automática en Chrome Storage
 * 
 * @author Kit IA Emprendedor
 * @version 1.0.0
 * @since 2025-01-21
 * 
 * @example
 * ```javascript
 * import { FavoritesManager } from './modules/favorites.js';
 * 
 * const favorites = new FavoritesManager();
 * await favorites.init();
 * 
 * // Toggle favorito
 * const isNowFavorite = await favorites.toggle('gpt-id');
 * 
 * // Verificar estado
 * const isFavorite = favorites.isFavorite('gpt-id');
 * 
 * // Obtener todos los favoritos
 * const allFavorites = favorites.getAll();
 * ```
 */

/**
 * Configuración del módulo de favoritos
 * @readonly
 */
const FAVORITES_CONFIG = {
  STORAGE_KEY: 'favorites',
  MAX_FAVORITES: 100, // Límite por performance
  SYNC_DELAY: 100, // ms para debounce de guardado
  LOG_PREFIX: '[Favorites]'
};

/**
 * Clase principal para gestión de favoritos
 * Implementa patrón Singleton para garantizar una sola instancia
 * 
 * @class FavoritesManager
 */
export class FavoritesManager {
  /**
   * Constructor de FavoritesManager
   * Inicializa el estado interno sin Side Effects
   */
  constructor() {
    /** @private {Set<string>} Set de IDs de favoritos para O(1) lookup */
    this.favorites = new Set();
    
    /** @private {boolean} Flag de inicialización */
    this.initialized = false;
    
    /** @private {boolean} Flag de operación en progreso */
    this.saving = false;
    
    /** @private {number|null} Timer para debounce de guardado */
    this.saveTimer = null;
    
    /** @private {Array<Function>} Listeners para cambios */
    this.changeListeners = [];
    
    this.log('Constructor initialized');
  }

  /**
   * Inicializa el sistema de favoritos cargando desde Chrome Storage
   * DEBE llamarse antes de usar cualquier otro método
   * 
   * @async
   * @returns {Promise<boolean>} true si se inicializó correctamente
   * @throws {Error} Si hay problemas de acceso a storage
   */
  async init() {
    if (this.initialized) {
      this.log('Already initialized, skipping');
      return true;
    }

    try {
      this.log('Initializing...');
      
      // Verificar que Chrome Storage esté disponible
      if (!chrome?.storage?.local) {
        throw new Error('Chrome Storage API not available');
      }

      const result = await chrome.storage.local.get(FAVORITES_CONFIG.STORAGE_KEY);
      const storedFavorites = result[FAVORITES_CONFIG.STORAGE_KEY];
      
      if (Array.isArray(storedFavorites)) {
        // Validar y filtrar IDs válidos
        const validFavorites = storedFavorites
          .filter(id => typeof id === 'string' && id.trim().length > 0)
          .slice(0, FAVORITES_CONFIG.MAX_FAVORITES); // Limitar por performance
          
        this.favorites = new Set(validFavorites);
        this.log(`Loaded ${validFavorites.length} favorites from storage`);
      } else {
        // Primera inicialización - crear storage vacío
        this.favorites = new Set();
        await this.save();
        this.log('First initialization - created empty storage');
      }
      
      this.initialized = true;
      this.notifyChange();
      return true;
      
    } catch (error) {
      this.error('Initialization failed:', error);
      // Fallback: continuar con Set vacío
      this.favorites = new Set();
      this.initialized = true;
      return false;
    }
  }

  /**
   * Verifica si un GPT es favorito
   * 
   * @param {string} gptId - ID del GPT a verificar
   * @returns {boolean} true si es favorito
   * @throws {Error} Si el manager no está inicializado
   */
  isFavorite(gptId) {
    this.ensureInitialized();
    this.validateGptId(gptId);
    
    return this.favorites.has(gptId);
  }

  /**
   * Alterna el estado de favorito de un GPT
   * 
   * @async
   * @param {string} gptId - ID del GPT a alternar
   * @returns {Promise<boolean>} true si ahora es favorito, false si se removió
   * @throws {Error} Si hay problemas de validación o storage
   */
  async toggle(gptId) {
    this.ensureInitialized();
    this.validateGptId(gptId);
    
    this.log(`Toggling favorite: ${gptId}`);
    
    const wasRemoved = this.favorites.delete(gptId);
    
    if (!wasRemoved) {
      // No estaba en favoritos, agregarlo
      if (this.favorites.size >= FAVORITES_CONFIG.MAX_FAVORITES) {
        throw new Error(`Maximum favorites limit reached (${FAVORITES_CONFIG.MAX_FAVORITES})`);
      }
      this.favorites.add(gptId);
      this.log(`Added to favorites: ${gptId}`);
    } else {
      this.log(`Removed from favorites: ${gptId}`);
    }
    
    // Guardar cambios con debounce
    await this.debouncedSave();
    
    const isFavorite = this.favorites.has(gptId);
    this.notifyChange();
    
    return isFavorite;
  }

  /**
   * Agrega un GPT a favoritos
   * 
   * @async
   * @param {string} gptId - ID del GPT a agregar
   * @returns {Promise<boolean>} true si se agregó correctamente
   * @throws {Error} Si ya es favorito o hay problemas
   */
  async add(gptId) {
    this.ensureInitialized();
    this.validateGptId(gptId);
    
    if (this.favorites.has(gptId)) {
      this.log(`GPT ${gptId} is already a favorite`);
      return false;
    }
    
    if (this.favorites.size >= FAVORITES_CONFIG.MAX_FAVORITES) {
      throw new Error(`Maximum favorites limit reached (${FAVORITES_CONFIG.MAX_FAVORITES})`);
    }
    
    this.favorites.add(gptId);
    await this.debouncedSave();
    this.notifyChange();
    
    this.log(`Added to favorites: ${gptId}`);
    return true;
  }

  /**
   * Remueve un GPT de favoritos
   * 
   * @async
   * @param {string} gptId - ID del GPT a remover
   * @returns {Promise<boolean>} true si se removió correctamente
   */
  async remove(gptId) {
    this.ensureInitialized();
    this.validateGptId(gptId);
    
    const wasRemoved = this.favorites.delete(gptId);
    
    if (wasRemoved) {
      await this.debouncedSave();
      this.notifyChange();
      this.log(`Removed from favorites: ${gptId}`);
    }
    
    return wasRemoved;
  }

  /**
   * Obtiene la lista completa de favoritos
   * 
   * @returns {string[]} Array de IDs de favoritos
   */
  getAll() {
    this.ensureInitialized();
    return Array.from(this.favorites);
  }

  /**
   * Obtiene el número de favoritos
   * 
   * @returns {number} Cantidad de favoritos
   */
  getCount() {
    this.ensureInitialized();
    return this.favorites.size;
  }

  /**
   * Limpia todos los favoritos
   * 
   * @async
   * @returns {Promise<void>}
   */
  async clear() {
    this.ensureInitialized();
    
    this.favorites.clear();
    await this.save();
    this.notifyChange();
    
    this.log('Cleared all favorites');
  }

  /**
   * Importa favoritos desde un array, reemplazando los existentes
   * 
   * @async
   * @param {string[]} favoritesArray - Array de IDs a importar
   * @returns {Promise<number>} Número de favoritos importados
   * @throws {Error} Si el array es inválido
   */
  async import(favoritesArray) {
    this.ensureInitialized();
    
    if (!Array.isArray(favoritesArray)) {
      throw new Error('Import data must be an array');
    }
    
    const validFavorites = favoritesArray
      .filter(id => typeof id === 'string' && id.trim().length > 0)
      .slice(0, FAVORITES_CONFIG.MAX_FAVORITES);
    
    this.favorites = new Set(validFavorites);
    await this.save();
    this.notifyChange();
    
    this.log(`Imported ${validFavorites.length} favorites`);
    return validFavorites.length;
  }

  /**
   * Exporta favoritos como array
   * 
   * @returns {string[]} Array de IDs de favoritos
   */
  export() {
    this.ensureInitialized();
    return this.getAll();
  }

  /**
   * Registra un listener para cambios en favoritos
   * 
   * @param {Function} callback - Función a llamar cuando cambien los favoritos
   * @returns {Function} Función para des-registrar el listener
   */
  onChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    this.changeListeners.push(callback);
    
    // Retornar función para cleanup
    return () => {
      const index = this.changeListeners.indexOf(callback);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Guarda favoritos en Chrome Storage con debounce
   * 
   * @private
   * @async
   * @returns {Promise<void>}
   */
  async debouncedSave() {
    // Cancelar guardado anterior si existe
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    
    // Programar nuevo guardado
    return new Promise((resolve, reject) => {
      this.saveTimer = setTimeout(async () => {
        try {
          await this.save();
          resolve();
        } catch (error) {
          reject(error);
        }
      }, FAVORITES_CONFIG.SYNC_DELAY);
    });
  }

  /**
   * Guarda favoritos en Chrome Storage inmediatamente
   * 
   * @private
   * @async
   * @returns {Promise<boolean>} true si se guardó correctamente
   */
  async save() {
    if (this.saving) {
      this.log('Save already in progress, skipping');
      return true;
    }
    
    this.saving = true;
    
    try {
      const favoritesArray = Array.from(this.favorites);
      await chrome.storage.local.set({
        [FAVORITES_CONFIG.STORAGE_KEY]: favoritesArray
      });
      
      this.log(`Saved ${favoritesArray.length} favorites to storage`);
      return true;
      
    } catch (error) {
      this.error('Save failed:', error);
      return false;
    } finally {
      this.saving = false;
    }
  }

  /**
   * Notifica a listeners sobre cambios
   * 
   * @private
   */
  notifyChange() {
    const favorites = this.getAll();
    this.changeListeners.forEach(callback => {
      try {
        callback(favorites);
      } catch (error) {
        this.error('Listener callback failed:', error);
      }
    });
  }

  /**
   * Valida que el manager esté inicializado
   * 
   * @private
   * @throws {Error} Si no está inicializado
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('FavoritesManager not initialized. Call init() first.');
    }
  }

  /**
   * Valida un ID de GPT
   * 
   * @private
   * @param {string} gptId - ID a validar
   * @throws {Error} Si el ID es inválido
   */
  validateGptId(gptId) {
    if (typeof gptId !== 'string' || gptId.trim().length === 0) {
      throw new Error('GPT ID must be a non-empty string');
    }
  }

  /**
   * Log con prefijo del módulo
   * 
   * @private
   * @param {...any} args - Argumentos a loggear
   */
  log(...args) {
    console.log(FAVORITES_CONFIG.LOG_PREFIX, ...args);
  }

  /**
   * Error log con prefijo del módulo
   * 
   * @private
   * @param {...any} args - Argumentos a loggear
   */
  error(...args) {
    console.error(FAVORITES_CONFIG.LOG_PREFIX, ...args);
  }

  /**
   * Obtiene estadísticas del manager
   * 
   * @returns {Object} Estadísticas del sistema
   */
  getStats() {
    return {
      initialized: this.initialized,
      count: this.favorites.size,
      maxLimit: FAVORITES_CONFIG.MAX_FAVORITES,
      listeners: this.changeListeners.length,
      saving: this.saving
    };
  }
}

/**
 * Instancia singleton del manager de favoritos
 * @type {FavoritesManager}
 */
export const favoritesManager = new FavoritesManager();

/**
 * Factory function para crear nuevas instancias si es necesario
 * 
 * @returns {FavoritesManager} Nueva instancia del manager
 */
export const createFavoritesManager = () => new FavoritesManager();

/**
 * Configuración exportada para testing
 * @readonly
 */
export { FAVORITES_CONFIG };