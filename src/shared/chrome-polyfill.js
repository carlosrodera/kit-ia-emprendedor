// Chrome API Polyfill para compatibilidad
// Este archivo asegura que chrome API esté disponible globalmente

if (typeof chrome === 'undefined') {
  console.error('Chrome API not available');
  window.chrome = {
    runtime: {
      sendMessage: () => Promise.reject('Chrome API not available'),
      onMessage: { addListener: () => {} }
    },
    storage: {
      local: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        clear: () => Promise.resolve()
      }
    },
    tabs: {
      query: () => Promise.resolve([]),
      create: () => Promise.resolve(),
      sendMessage: () => Promise.resolve()
    }
  };
}
