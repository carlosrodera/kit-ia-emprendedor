// Service Worker simplificado para Kit IA Emprendedor
// Sin imports ES6 para compatibilidad con Chrome Extensions

(function () {
  'use strict';

  // Estado del service worker
  const state = {
    isAuthenticated: false,
    user: null,
    gpts: []
  };

  // Configuración básica
  const CONFIG = {
    SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',
    SUPABASE_ANON_KEY: 'YOUR_ANON_KEY_HERE'
  };

  // Logger simple
  const logger = {
    info: (...args) => console.log('[SW]', ...args),
    error: (...args) => console.error('[SW]', ...args),
    warn: (...args) => console.warn('[SW]', ...args),
    debug: (...args) => console.debug('[SW]', ...args)
  };

  // Listener de instalación
  chrome.runtime.onInstalled.addListener((details) => {
    logger.info('Extension installed:', details.reason);

    if (details.reason === 'install') {
      // Primera instalación
      chrome.action.setBadgeBackgroundColor({ color: '#4F46E5' });
      chrome.action.setBadgeText({ text: '' });

      // Abrir página de bienvenida
      chrome.tabs.create({
        url: chrome.runtime.getURL('auth/login.html?welcome=true')
      });
    }
  });

  // Manejador principal de mensajes
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.debug('Message received:', message.type);

    // Manejar mensaje de forma asíncrona
    handleMessage(message, sender)
      .then(sendResponse)
      .catch(error => {
        logger.error('Error handling message:', error);
        sendResponse({ success: false, error: error.message });
      });

    // Indicar que la respuesta será asíncrona
    return true;
  });

  // Función para manejar mensajes
  async function handleMessage(message, sender) {
    const { type, data } = message;

    switch (type) {
      case 'CHECK_AUTH':
        return checkAuth();

      case 'LOGIN':
        return login(data);

      case 'LOGOUT':
        return logout();

      case 'GET_GPT_STATS':
        return getGPTStats();

      case 'SYNC_GPTS':
        return syncGPTs();

      case 'TOGGLE_SIDEBAR':
        return toggleSidebar(sender.tab);

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  // Funciones de autenticación
  async function checkAuth() {
    try {
      // Por ahora simulamos autenticación
      const stored = await chrome.storage.local.get(['user', 'session']);

      if (stored.user && stored.session) {
        state.isAuthenticated = true;
        state.user = stored.user;

        return {
          success: true,
          data: {
            isAuthenticated: true,
            user: state.user,
            hasSubscription: true
          }
        };
      }

      return {
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
          hasSubscription: false
        }
      };
    } catch (error) {
      logger.error('Error checking auth:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function login(data) {
    try {
      logger.info('Login attempt');

      // Por ahora simulamos login exitoso
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        avatar_url: 'https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff'
      };

      // Guardar en storage
      await chrome.storage.local.set({
        user: mockUser,
        session: { token: 'mock-token-123' }
      });

      state.isAuthenticated = true;
      state.user = mockUser;

      // Sincronizar GPTs
      await syncGPTs();

      return {
        success: true,
        data: {
          user: mockUser,
          session: { token: 'mock-token-123' }
        }
      };
    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function logout() {
    try {
      // Limpiar storage
      await chrome.storage.local.remove(['user', 'session', 'gpts']);

      state.isAuthenticated = false;
      state.user = null;
      state.gpts = [];

      // Limpiar badge
      chrome.action.setBadgeText({ text: '' });

      return { success: true };
    } catch (error) {
      logger.error('Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Funciones de GPTs
  async function getGPTStats() {
    try {
      const stored = await chrome.storage.local.get(['gpts', 'favorites', 'prompts']);

      return {
        success: true,
        data: {
          total: stored.gpts?.length || 0,
          favoriteCount: stored.favorites?.length || 0,
          promptCount: stored.prompts?.length || 0
        }
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function syncGPTs() {
    try {
      logger.info('Syncing GPTs');

      // Por ahora usamos datos mock
      const mockGPTs = [
        {
          id: 'gpt-1',
          name: 'Asistente de Contenido',
          description: 'Ayuda a crear contenido de alta calidad',
          icon: '✍️',
          category: 'content',
          prompt: 'Eres un asistente especializado en crear contenido...'
        },
        {
          id: 'gpt-2',
          name: 'Analista de Datos',
          description: 'Análisis y visualización de datos',
          icon: '📊',
          category: 'data',
          prompt: 'Eres un experto en análisis de datos...'
        },
        {
          id: 'gpt-3',
          name: 'Desarrollador Web',
          description: 'Asistente para desarrollo web',
          icon: '💻',
          category: 'development',
          prompt: 'Eres un desarrollador web experto...'
        }
      ];

      // Guardar en storage
      await chrome.storage.local.set({ gpts: mockGPTs });
      state.gpts = mockGPTs;

      // Actualizar badge
      chrome.action.setBadgeText({ text: mockGPTs.length.toString() });

      return {
        success: true,
        data: mockGPTs
      };
    } catch (error) {
      logger.error('Error syncing GPTs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Función para toggle sidebar
  async function toggleSidebar(tab) {
    try {
      if (!tab || !tab.id) {
        throw new Error('No active tab');
      }

      // Verificar si la URL es válida
      const isValidUrl = tab.url &&
        (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
        !tab.url.includes('chrome.google.com/webstore');

      if (!isValidUrl) {
        throw new Error('Cannot inject sidebar on this page');
      }

      // Enviar mensaje al content script
      await chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_SIDEBAR'
      });

      return { success: true };
    } catch (error) {
      logger.error('Error toggling sidebar:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Listener para comandos
  chrome.commands.onCommand.addListener(async (command) => {
    logger.debug('Command received:', command);

    if (command === 'toggle-sidebar') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'TOGGLE_SIDEBAR'
          });
        }
      } catch (error) {
        logger.error('Error handling command:', error);
      }
    }
  });

  // Log de carga exitosa
  logger.info('Service Worker loaded successfully');
  logger.info('Extension version:', chrome.runtime.getManifest().version);
})();
