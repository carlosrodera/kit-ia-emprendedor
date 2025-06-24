/**
 * @fileoverview Setup global para tests con Vitest
 */

import { vi } from 'vitest';

// Mock de Chrome API para tests
global.chrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: vi.fn((path) => `chrome-extension://test-extension-id/${path}`),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
  }
};

// Mock de console para tests más limpios
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn()
};

// Configuración de DOMPurify para tests
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Crear una instancia de window con JSDOM
const window = new JSDOM('').window;

// Crear DOMPurify con el window de JSDOM
global.DOMPurify = DOMPurify(window);

// También hacer disponible el window para otros usos
global.window = window;
global.document = window.document;

// Limpiar mocks después de cada test
afterEach(() => {
  vi.clearAllMocks();
});

// Configuración de timeout para tests
vi.setConfig({ testTimeout: 10000 });