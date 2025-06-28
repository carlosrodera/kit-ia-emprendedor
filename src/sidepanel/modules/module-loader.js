/**
 * Module Loader para Chrome Extensions
 * Permite cargar módulos ES6 de forma compatible con Chrome Extensions
 * 
 * @author Kit IA Emprendedor
 * @version 1.0.0
 * @since 2025-01-21
 * 
 * @example
 * ```javascript
 * import { ModuleLoader } from './modules/module-loader.js';
 * 
 * const loader = new ModuleLoader();
 * const favoritesModule = await loader.load('favorites');
 * const manager = new favoritesModule.FavoritesManager();
 * ```
 */

/**
 * Configuración del module loader
 * @readonly
 */
const MODULE_LOADER_CONFIG = {
  BASE_PATH: 'sidepanel/modules/',
  TIMEOUT: 5000, // ms para timeout de carga
  LOG_PREFIX: '[ModuleLoader]',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // ms
};

/**
 * Errores específicos del module loader
 */
export class ModuleLoaderError extends Error {
  constructor(message, moduleName, originalError = null) {
    super(message);
    this.name = 'ModuleLoaderError';
    this.moduleName = moduleName;
    this.originalError = originalError;
  }
}

/**
 * Cache de módulos cargados para evitar múltiples cargas
 * @private
 */
const moduleCache = new Map();

/**
 * Registro de módulos disponibles
 * @private
 */
const moduleRegistry = new Map([
  ['favorites', {
    path: 'favorites.js',
    exports: ['FavoritesManager', 'favoritesManager', 'FAVORITES_CONFIG'],
    dependencies: []
  }],
  // Futuras extensiones del sistema modular
  ['search', {
    path: 'search.js',
    exports: ['SearchManager'],
    dependencies: []
  }],
  ['storage', {
    path: 'storage.js',
    exports: ['StorageManager'],
    dependencies: []
  }]
]);

/**
 * Module Loader principal
 * Gestiona la carga dinámica de módulos para Chrome Extensions
 * 
 * @class ModuleLoader
 */
export class ModuleLoader {
  /**
   * Constructor del ModuleLoader
   */
  constructor() {
    /** @private {Map<string, Promise>} Promesas de carga en progreso */
    this.loadingPromises = new Map();
    
    /** @private {boolean} Flag de inicialización */
    this.initialized = false;
    
    this.log('ModuleLoader initialized');
  }

  /**
   * Inicializa el module loader
   * Verifica que el entorno esté disponible para cargar módulos
   * 
   * @async
   * @returns {Promise<boolean>} true si se inicializó correctamente
   */
  async init() {
    if (this.initialized) {
      return true;
    }

    try {
      this.log('Initializing module loader...');
      
      // Verificar que estamos en un entorno Chrome Extension
      if (!chrome?.runtime?.id) {
        throw new Error('Chrome Extension environment not detected');
      }
      
      // Verificar acceso a módulos
      await this.validateModuleAccess();
      
      this.initialized = true;
      this.log('Module loader initialized successfully');
      return true;
      
    } catch (error) {
      this.error('Failed to initialize module loader:', error);
      return false;
    }
  }

  /**
   * Carga un módulo por nombre
   * 
   * @async
   * @param {string} moduleName - Nombre del módulo a cargar
   * @returns {Promise<Object>} Exports del módulo
   * @throws {ModuleLoaderError} Si falla la carga del módulo
   */
  async load(moduleName) {
    this.validateModuleName(moduleName);
    
    // Verificar cache primero
    if (moduleCache.has(moduleName)) {
      this.log(`Loading ${moduleName} from cache`);
      return moduleCache.get(moduleName);
    }
    
    // Verificar si ya se está cargando
    if (this.loadingPromises.has(moduleName)) {
      this.log(`${moduleName} already loading, waiting...`);
      return await this.loadingPromises.get(moduleName);
    }
    
    // Iniciar nueva carga
    const loadPromise = this.loadModule(moduleName);
    this.loadingPromises.set(moduleName, loadPromise);
    
    try {
      const moduleExports = await loadPromise;
      
      // Cachear resultado exitoso
      moduleCache.set(moduleName, moduleExports);
      this.log(`Successfully loaded module: ${moduleName}`);
      
      return moduleExports;
      
    } catch (error) {
      this.error(`Failed to load module ${moduleName}:`, error);
      throw new ModuleLoaderError(
        `Failed to load module '${moduleName}': ${error.message}`,
        moduleName,
        error
      );
    } finally {
      // Limpiar promesa de carga
      this.loadingPromises.delete(moduleName);
    }
  }

  /**
   * Carga múltiples módulos en paralelo
   * 
   * @async
   * @param {string[]} moduleNames - Array de nombres de módulos
   * @returns {Promise<Object>} Objeto con exports de todos los módulos
   * @throws {ModuleLoaderError} Si algún módulo falla al cargar
   */
  async loadMultiple(moduleNames) {
    if (!Array.isArray(moduleNames)) {
      throw new Error('Module names must be an array');
    }
    
    this.log(`Loading multiple modules: ${moduleNames.join(', ')}`);
    
    const loadPromises = moduleNames.map(async (name) => {
      const moduleExports = await this.load(name);
      return { name, exports: moduleExports };
    });
    
    const results = await Promise.all(loadPromises);
    
    // Convertir a objeto con nombres como keys
    const modulesObject = {};
    results.forEach(({ name, exports }) => {
      modulesObject[name] = exports;
    });
    
    return modulesObject;
  }

  /**
   * Pre-carga módulos comunes para mejor performance
   * 
   * @async
   * @param {string[]} moduleNames - Módulos a pre-cargar
   * @returns {Promise<void>}
   */
  async preload(moduleNames = ['favorites']) {
    this.log(`Preloading modules: ${moduleNames.join(', ')}`);
    
    try {
      await this.loadMultiple(moduleNames);
      this.log('Preload completed successfully');
    } catch (error) {
      this.error('Preload failed:', error);
      // No throw - preload es opcional
    }
  }

  /**
   * Invalida el cache de un módulo específico
   * 
   * @param {string} moduleName - Nombre del módulo a invalidar
   * @returns {boolean} true si se invalidó correctamente
   */
  invalidateCache(moduleName) {
    if (moduleCache.has(moduleName)) {
      moduleCache.delete(moduleName);
      this.log(`Cache invalidated for module: ${moduleName}`);
      return true;
    }
    return false;
  }

  /**
   * Limpia todo el cache de módulos
   */
  clearCache() {
    const count = moduleCache.size;
    moduleCache.clear();
    this.log(`Cleared module cache (${count} modules)`);
  }

  /**
   * Obtiene información sobre el estado del loader
   * 
   * @returns {Object} Estado actual del loader
   */
  getStatus() {
    return {
      initialized: this.initialized,
      cachedModules: Array.from(moduleCache.keys()),
      loadingModules: Array.from(this.loadingPromises.keys()),
      availableModules: Array.from(moduleRegistry.keys())
    };
  }

  /**
   * Carga un módulo específico con reintentos
   * 
   * @private
   * @async
   * @param {string} moduleName - Nombre del módulo
   * @returns {Promise<Object>} Exports del módulo
   */
  async loadModule(moduleName) {
    const moduleInfo = moduleRegistry.get(moduleName);
    if (!moduleInfo) {
      throw new Error(`Module '${moduleName}' not found in registry`);
    }
    
    let lastError;
    
    for (let attempt = 1; attempt <= MODULE_LOADER_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        this.log(`Loading ${moduleName} (attempt ${attempt}/${MODULE_LOADER_CONFIG.RETRY_ATTEMPTS})`);
        
        // Cargar dependencias primero
        await this.loadDependencies(moduleInfo.dependencies);
        
        // Cargar el módulo principal
        const moduleExports = await this.importModule(moduleInfo.path);
        
        // Validar exports esperados
        this.validateExports(moduleExports, moduleInfo.exports, moduleName);
        
        return moduleExports;
        
      } catch (error) {
        lastError = error;
        this.error(`Attempt ${attempt} failed for ${moduleName}:`, error);
        
        if (attempt < MODULE_LOADER_CONFIG.RETRY_ATTEMPTS) {
          await this.delay(MODULE_LOADER_CONFIG.RETRY_DELAY);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Carga dependencias de un módulo
   * 
   * @private
   * @async
   * @param {string[]} dependencies - Array de dependencias
   */
  async loadDependencies(dependencies) {
    if (dependencies.length === 0) return;
    
    this.log(`Loading dependencies: ${dependencies.join(', ')}`);
    
    // Cargar dependencias en paralelo
    const depPromises = dependencies.map(dep => this.load(dep));
    await Promise.all(depPromises);
  }

  /**
   * Importa un módulo usando dynamic import con fallback
   * 
   * @private
   * @async
   * @param {string} modulePath - Ruta del módulo
   * @returns {Promise<Object>} Exports del módulo
   */
  async importModule(modulePath) {
    const fullPath = chrome.runtime.getURL(MODULE_LOADER_CONFIG.BASE_PATH + modulePath);
    
    // Timeout para evitar cuelgues
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Module load timeout: ${modulePath}`));
      }, MODULE_LOADER_CONFIG.TIMEOUT);
    });
    
    try {
      // Intentar dynamic import primero
      const importPromise = import(fullPath);
      const moduleExports = await Promise.race([importPromise, timeoutPromise]);
      
      return moduleExports;
      
    } catch (error) {
      // Fallback: cargar como script y usar global
      this.log(`Dynamic import failed, trying script fallback for ${modulePath}`);
      return await this.loadAsScript(fullPath, modulePath);
    }
  }

  /**
   * Carga módulo como script tag (fallback)
   * 
   * @private
   * @async
   * @param {string} fullPath - URL completa del módulo
   * @param {string} modulePath - Ruta relativa
   * @returns {Promise<Object>} Exports del módulo
   */
  async loadAsScript(fullPath, modulePath) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = fullPath;
      
      script.onload = () => {
        // Buscar exports en window.moduleExports o similar
        const globalName = this.getGlobalName(modulePath);
        const exports = window[globalName];
        
        if (exports) {
          resolve(exports);
        } else {
          reject(new Error(`Module exports not found in global scope: ${globalName}`));
        }
        
        document.head.removeChild(script);
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load script: ${fullPath}`));
        document.head.removeChild(script);
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Genera nombre global para módulo
   * 
   * @private
   * @param {string} modulePath - Ruta del módulo
   * @returns {string} Nombre global
   */
  getGlobalName(modulePath) {
    return 'moduleExports_' + modulePath.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Valida que un módulo tenga los exports esperados
   * 
   * @private
   * @param {Object} moduleExports - Exports del módulo
   * @param {string[]} expectedExports - Exports esperados
   * @param {string} moduleName - Nombre del módulo
   * @throws {Error} Si faltan exports
   */
  validateExports(moduleExports, expectedExports, moduleName) {
    const missingExports = expectedExports.filter(exp => !(exp in moduleExports));
    
    if (missingExports.length > 0) {
      throw new Error(
        `Module '${moduleName}' missing expected exports: ${missingExports.join(', ')}`
      );
    }
  }

  /**
   * Valida acceso a módulos
   * 
   * @private
   * @async
   */
  async validateModuleAccess() {
    try {
      // Verificar que podemos acceder al directorio de módulos
      const testPath = chrome.runtime.getURL(MODULE_LOADER_CONFIG.BASE_PATH);
      
      // Intentar hacer fetch para verificar acceso
      const response = await fetch(testPath, { method: 'HEAD' });
      
      if (!response.ok && response.status !== 404) {
        throw new Error(`Cannot access modules directory: ${response.status}`);
      }
      
    } catch (error) {
      this.log('Module access validation warning:', error.message);
      // No throw - puede ser normal en algunos entornos
    }
  }

  /**
   * Valida nombre de módulo
   * 
   * @private
   * @param {string} moduleName - Nombre a validar
   * @throws {Error} Si el nombre es inválido
   */
  validateModuleName(moduleName) {
    if (typeof moduleName !== 'string' || moduleName.trim().length === 0) {
      throw new Error('Module name must be a non-empty string');
    }
    
    if (!moduleRegistry.has(moduleName)) {
      const available = Array.from(moduleRegistry.keys()).join(', ');
      throw new Error(`Unknown module '${moduleName}'. Available: ${available}`);
    }
  }

  /**
   * Delay helper para reintentos
   * 
   * @private
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log con prefijo del módulo
   * 
   * @private
   * @param {...any} args - Argumentos a loggear
   */
  log(...args) {
    console.log(MODULE_LOADER_CONFIG.LOG_PREFIX, ...args);
  }

  /**
   * Error log con prefijo del módulo
   * 
   * @private
   * @param {...any} args - Argumentos a loggear
   */
  error(...args) {
    console.error(MODULE_LOADER_CONFIG.LOG_PREFIX, ...args);
  }
}

/**
 * Instancia singleton del module loader
 * @type {ModuleLoader}
 */
export const moduleLoader = new ModuleLoader();

/**
 * Función helper para cargar módulos de forma simple
 * 
 * @async
 * @param {string} moduleName - Nombre del módulo
 * @returns {Promise<Object>} Exports del módulo
 */
export const loadModule = async (moduleName) => {
  if (!moduleLoader.initialized) {
    await moduleLoader.init();
  }
  return moduleLoader.load(moduleName);
};

/**
 * Registra un nuevo módulo en el registry
 * 
 * @param {string} name - Nombre del módulo
 * @param {Object} info - Información del módulo
 */
export const registerModule = (name, info) => {
  moduleRegistry.set(name, info);
};