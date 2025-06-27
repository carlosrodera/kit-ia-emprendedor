# Arquitectura Modular - Kit IA Emprendedor Extension

## 🏗️ Overview

La extensión ha sido refactorizada para usar una **arquitectura modular** que resuelve los problemas de escalabilidad y mantenimiento, especialmente el sistema de favoritos que estaba roto.

## 🔧 Problema Resuelto

**Problema original**: Los favoritos no funcionaban debido a limitaciones de ES6 modules en Chrome Extensions.

**Solución implementada**: Module Loader Pattern con ES modules nativos + dynamic imports.

## 📁 Estructura de Módulos

```
src/sidepanel/
├── sidepanel.js              # Controlador principal
├── modules/
│   ├── module-loader.js      # Sistema de carga de módulos
│   ├── favorites.js          # Módulo de favoritos independiente
│   └── (futuros módulos)     # search.js, storage.js, etc.
└── __tests__/
    └── favorites.test.js     # Tests unitarios completos
```

## 🔄 Module Loader Pattern

### Características Principales

1. **Dynamic Imports**: Usa `import()` para cargar módulos bajo demanda
2. **Cache Inteligente**: Evita cargas duplicadas con Map cache
3. **Fallback Robusto**: Sistema de fallback si falla la carga modular
4. **Reintentos**: 3 intentos automáticos con delay exponencial
5. **Validación**: Verifica exports esperados automáticamente

### Uso del Module Loader

```javascript
// Inicializar el loader
const moduleLoader = new ModuleLoader();
await moduleLoader.init();

// Cargar módulo único
const favoritesModule = await moduleLoader.load('favorites');
const manager = favoritesModule.favoritesManager;

// Cargar múltiples módulos
const modules = await moduleLoader.loadMultiple(['favorites', 'search']);

// Pre-cargar para mejor performance
await moduleLoader.preload(['favorites']);
```

## ⭐ Módulo de Favoritos

### Arquitectura del FavoritesManager

```javascript
export class FavoritesManager {
  constructor() {
    this.favorites = new Set();     // O(1) lookups
    this.initialized = false;
    this.saving = false;
    this.saveTimer = null;         // Debounced saving
    this.changeListeners = [];     // Event system
  }
}
```

### Características Técnicas

1. **Performance O(1)**: Set para lookups constantes
2. **Debounced Saving**: Evita writes excesivos a Chrome Storage
3. **Event System**: Listeners para cambios en tiempo real
4. **Validación Estricta**: Todos los inputs validados
5. **Límites**: Máximo 100 favoritos por performance
6. **Fallback**: Implementación simple si falla la carga modular

### API del FavoritesManager

```javascript
// Inicialización obligatoria
await manager.init();

// Operaciones CRUD
const isNowFavorite = await manager.toggle('gpt-id');
await manager.add('gpt-id');
await manager.remove('gpt-id');

// Consultas
const isFavorite = manager.isFavorite('gpt-id');
const allFavorites = manager.getAll();
const count = manager.getCount();

// Import/Export
await manager.import(['gpt-1', 'gpt-2']);
const backup = manager.export();

// Event listeners
const unsubscribe = manager.onChange((favorites) => {
  console.log('Favorites changed:', favorites);
});
```

## 🛠️ Configuración Vite

### Entrada de Módulos

```javascript
input: {
  'favorites-module': resolve(__dirname, 'src/sidepanel/modules/favorites.js'),
  'sidepanel-js': resolve(__dirname, 'src/sidepanel/sidepanel.js'),
  // ... otros entry points
}
```

### Output ES Modules

```javascript
output: {
  format: 'es',                    // ES modules nativos
  inlineDynamicImports: false,     // Múltiples entry points
  entryFileNames: (chunkInfo) => {
    if (chunkInfo.name === 'favorites-module') {
      return 'sidepanel/modules/favorites.js';
    }
    // ... otros mapeos
  }
}
```

## 🔒 Seguridad y Validación

### Validación de Entrada

```javascript
validateGptId(gptId) {
  if (typeof gptId !== 'string' || gptId.trim().length === 0) {
    throw new Error('GPT ID must be a non-empty string');
  }
}
```

### Límites de Seguridad

- **MAX_FAVORITES**: 100 (performance)
- **SYNC_DELAY**: 100ms (debounce)
- **TIMEOUT**: 5000ms (module loading)
- **RETRY_ATTEMPTS**: 3 (reintentos)

## 📊 Testing

### Cobertura Completa

Los tests cubren:

- ✅ Inicialización correcta e incorrecta
- ✅ Operaciones CRUD completas
- ✅ Import/Export funcionalidad
- ✅ Event listeners y callbacks
- ✅ Storage persistence
- ✅ Edge cases y validaciones
- ✅ Performance (operaciones O(1))
- ✅ Límites y boundaries

### Ejecutar Tests

```bash
npm test                                    # Todos los tests
npx vitest run src/sidepanel/__tests__/     # Solo módulos
```

## 🚀 Ventajas de la Arquitectura

### Escalabilidad

1. **Módulos Independientes**: Cada módulo es self-contained
2. **Lazy Loading**: Módulos se cargan bajo demanda
3. **Cache Inteligente**: Evita cargas duplicadas
4. **Tree Shaking**: Solo código usado se incluye

### Mantenibilidad

1. **Separación de Responsabilidades**: Un módulo = una responsabilidad
2. **Testing Independiente**: Cada módulo se puede testear aislado
3. **Desarrollo Paralelo**: Equipos pueden trabajar en módulos diferentes
4. **Debugging Mejorado**: Logs específicos por módulo

### Performance

1. **Bundle Optimizado**: <50KB total mantenido
2. **Operaciones O(1)**: Set para favoritos
3. **Debounced Operations**: Storage writes optimizados
4. **Module Preloading**: Critical modules pre-cargados

## 🔮 Extensibilidad Futura

### Nuevos Módulos Planeados

```javascript
// search.js - Sistema de búsqueda avanzada
export class SearchManager {
  async search(query, filters) { /* ... */ }
}

// storage.js - Gestión unificada de storage
export class StorageManager {
  async get(key) { /* ... */ }
  async set(key, value) { /* ... */ }
}

// analytics.js - Tracking de uso
export class AnalyticsManager {
  track(event, data) { /* ... */ }
}
```

### Registro de Módulos

```javascript
// Registrar nuevos módulos
registerModule('search', {
  path: 'search.js',
  exports: ['SearchManager'],
  dependencies: ['storage']
});
```

## 🐛 Debugging

### Logs del Module Loader

```javascript
[ModuleLoader] Initializing module loader...
[ModuleLoader] Loading favorites (attempt 1/3)
[ModuleLoader] Successfully loaded module: favorites
[Favorites] Loaded 5 favorites from storage
[Favorites] Added to favorites: gpt-4-turbo
```

### Estado del Sistema

```javascript
// Debug del loader
console.log(moduleLoader.getStatus());
// {
//   initialized: true,
//   cachedModules: ['favorites'],
//   loadingModules: [],
//   availableModules: ['favorites', 'search', 'storage']
// }

// Debug de favoritos
console.log(favoritesManager.getStats());
// {
//   initialized: true,
//   count: 5,
//   maxLimit: 100,
//   listeners: 2,
//   saving: false
// }
```

## ✅ Protocolo de Desarrollo

### Reglas Innegociables

1. **No Patches**: Solo soluciones arquitecturales sólidas
2. **Test First**: TDD obligatorio para nuevos módulos
3. **Performance**: Mantener <50KB bundle total
4. **Documentation**: JSDoc completo obligatorio
5. **Backwards Compatibility**: Fallbacks para robustez

### Proceso de Nuevos Módulos

1. **Diseño**: Definir API y responsabilidades
2. **Tests**: Crear suite de tests completa
3. **Implementación**: Desarrollar con TDD
4. **Registro**: Añadir al module registry
5. **Documentation**: JSDoc + ejemplos de uso

---

**Última actualización**: 21 de Enero 2025  
**Estado**: ✅ Arquitectura modular completamente implementada  
**Próximo**: Testing completo de la extensión en Chrome