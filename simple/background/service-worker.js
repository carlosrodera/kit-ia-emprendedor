// Service Worker simplificado para Kit IA Emprendedor
(function() {
  'use strict';

  // Estado del service worker
  const state = {
    isAuthenticated: false,
    user: null,
    gpts: []
  };

  // GPTs oficiales con URLs reales y categorías
  const mockGPTs = [
    {
      id: 'gpt-1',
      name: 'ChatGPT Plus',
      description: 'Asistente de IA avanzado con GPT-4',
      icon: '🤖',
      category: 'General',
      tags: ['chat', 'asistente', 'gpt-4'],
      url: 'https://chat.openai.com/',
      official: true
    },
    {
      id: 'gpt-2',
      name: 'DALL·E 3',
      description: 'Crea imágenes increíbles desde texto',
      icon: '🎨',
      category: 'Creativo',
      tags: ['imágenes', 'arte', 'diseño'],
      url: 'https://chat.openai.com/g/g-2fkFE8rbu-dall-e',
      official: true
    },
    {
      id: 'gpt-3',
      name: 'Code Copilot',
      description: 'Tu asistente experto en programación',
      icon: '💻',
      category: 'Desarrollo',
      tags: ['código', 'programación', 'debug'],
      url: 'https://chat.openai.com/g/g-2DQzU5UZl-code-copilot',
      official: true
    },
    {
      id: 'gpt-4',
      name: 'Data Analyst',
      description: 'Análisis de datos y visualizaciones',
      icon: '📊',
      category: 'Análisis',
      tags: ['datos', 'estadística', 'gráficos'],
      url: 'https://chat.openai.com/g/g-HMNcP6w7d-data-analyst',
      official: true
    },
    {
      id: 'gpt-5',
      name: 'Canva',
      description: 'Diseña presentaciones y contenido visual',
      icon: '🎨',
      category: 'Diseño',
      tags: ['presentaciones', 'gráficos', 'templates'],
      url: 'https://chat.openai.com/g/g-alKfVrz9K-canva',
      official: true
    },
    {
      id: 'gpt-6',
      name: 'Scholar GPT',
      description: 'Asistente de investigación académica',
      icon: '📚',
      category: 'Investigación',
      tags: ['académico', 'papers', 'citas'],
      url: 'https://chat.openai.com/g/g-kZ0eYXlJe-scholar-gpt',
      official: true
    },
    {
      id: 'gpt-7',
      name: 'Creative Writing',
      description: 'Asistente para escritura creativa',
      icon: '✍️',
      category: 'Escritura',
      tags: ['historias', 'novelas', 'creatividad'],
      url: 'https://chat.openai.com/g/g-DWjSCKn8z-creative-writing-coach',
      official: true
    },
    {
      id: 'gpt-8',
      name: 'Math Solver',
      description: 'Resuelve problemas matemáticos paso a paso',
      icon: '🧮',
      category: 'Educación',
      tags: ['matemáticas', 'cálculo', 'algebra'],
      url: 'https://chat.openai.com/g/g-9YeZz6m6k-math-solver',
      official: true
    }
  ];

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
      
      // Inicializar datos
      chrome.storage.local.set({
        gpts: mockGPTs,
        favorites: [],
        prompts: [],
        user: null,
        session: null
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
        
      case 'GET_GPTS':
        return getGPTs();
        
      case 'SIDEBAR_STATE_CHANGED':
        logger.info('Sidebar state changed:', data);
        return { success: true };
        
      case 'GET_FAVORITES':
        return getFavorites();
        
      case 'ADD_FAVORITE':
        return addFavorite(data?.gptId);
        
      case 'REMOVE_FAVORITE':
        return removeFavorite(data?.gptId);
        
      case 'GET_PROMPTS':
        return getPrompts();
        
      case 'SAVE_PROMPT':
        return savePrompt(data);
        
      case 'DELETE_PROMPT':
        return deletePrompt(data?.id);
        
      case 'UPDATE_PROMPT':
        return updatePrompt(data);
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  }

  // Funciones de autenticación
  async function checkAuth() {
    try {
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
      await chrome.storage.local.remove(['user', 'session']);
      
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
  async function getGPTs() {
    try {
      const stored = await chrome.storage.local.get(['gpts']);
      
      if (stored.gpts && stored.gpts.length > 0) {
        return {
          success: true,
          data: stored.gpts
        };
      }
      
      // Si no hay GPTs almacenados, usar mock data
      await chrome.storage.local.set({ gpts: mockGPTs });
      
      return {
        success: true,
        data: mockGPTs
      };
    } catch (error) {
      logger.error('Error getting GPTs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

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

  // Funciones de favoritos
  async function getFavorites() {
    try {
      const stored = await chrome.storage.local.get(['favorites']);
      return {
        success: true,
        data: stored.favorites || []
      };
    } catch (error) {
      logger.error('Error getting favorites:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function addFavorite(gptId) {
    try {
      if (!gptId) {
        throw new Error('GPT ID is required');
      }
      
      const stored = await chrome.storage.local.get(['favorites']);
      const favorites = stored.favorites || [];
      
      if (!favorites.includes(gptId)) {
        favorites.push(gptId);
        await chrome.storage.local.set({ favorites });
      }
      
      return {
        success: true,
        data: favorites
      };
    } catch (error) {
      logger.error('Error adding favorite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function removeFavorite(gptId) {
    try {
      if (!gptId) {
        throw new Error('GPT ID is required');
      }
      
      const stored = await chrome.storage.local.get(['favorites']);
      const favorites = stored.favorites || [];
      const newFavorites = favorites.filter(id => id !== gptId);
      
      await chrome.storage.local.set({ favorites: newFavorites });
      
      return {
        success: true,
        data: newFavorites
      };
    } catch (error) {
      logger.error('Error removing favorite:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Funciones de prompts
  async function getPrompts() {
    try {
      const stored = await chrome.storage.local.get(['prompts']);
      return {
        success: true,
        data: stored.prompts || []
      };
    } catch (error) {
      logger.error('Error getting prompts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function savePrompt(promptData) {
    try {
      if (!promptData || !promptData.title || !promptData.content) {
        throw new Error('Title and content are required');
      }
      
      const stored = await chrome.storage.local.get(['prompts']);
      const prompts = stored.prompts || [];
      
      const newPrompt = {
        id: 'prompt-' + Date.now(),
        title: promptData.title,
        content: promptData.content,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };
      
      prompts.push(newPrompt);
      await chrome.storage.local.set({ prompts });
      
      return {
        success: true,
        data: newPrompt
      };
    } catch (error) {
      logger.error('Error saving prompt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function deletePrompt(promptId) {
    try {
      if (!promptId) {
        throw new Error('Prompt ID is required');
      }
      
      const stored = await chrome.storage.local.get(['prompts']);
      const prompts = stored.prompts || [];
      const newPrompts = prompts.filter(p => p.id !== promptId);
      
      await chrome.storage.local.set({ prompts: newPrompts });
      
      return {
        success: true,
        data: newPrompts
      };
    } catch (error) {
      logger.error('Error deleting prompt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async function updatePrompt(promptData) {
    try {
      if (!promptData || !promptData.id || !promptData.title || !promptData.content) {
        throw new Error('ID, title and content are required');
      }
      
      const stored = await chrome.storage.local.get(['prompts']);
      const prompts = stored.prompts || [];
      const index = prompts.findIndex(p => p.id === promptData.id);
      
      if (index === -1) {
        throw new Error('Prompt not found');
      }
      
      // Actualizar el prompt manteniendo los campos existentes
      prompts[index] = {
        ...prompts[index],
        title: promptData.title,
        content: promptData.content,
        updatedAt: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ prompts });
      
      return {
        success: true,
        data: prompts[index]
      };
    } catch (error) {
      logger.error('Error updating prompt:', error);
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