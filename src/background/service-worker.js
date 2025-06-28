/**
 * Service Worker - Kit IA Emprendedor v1.0
 * Centraliza toda la lógica de negocio
 */
import logger from '../utils/logger.js';
import subscriptionManager from '../shared/subscription-manager.js';


// Por ahora importamos funciones básicas - luego añadiremos módulos
let authState = {
  isAuthenticated: false,
  user: null
};

// GPTs oficiales con información de tiers para planes
const OFFICIAL_GPTS = [
  // GPTs Básicos (disponibles para todos)
  {
    id: 'dall-e',
    name: 'DALL·E',
    description: 'Generador de imágenes con IA avanzada',
    category: 'Creative',
    url: 'https://chatgpt.com/g/g-2fkFE8rbu-dall-e',
    tags: ['imagen', 'arte', 'creativo', 'diseño'],
    tier: 'basic'
  },
  {
    id: 'writing-coach',
    name: 'Writing Coach',
    description: 'Ayuda con escritura y corrección de textos',
    category: 'Writing',
    url: 'https://chatgpt.com/g/g-ZdfrSRAyo-creative-writing-coach',
    tags: ['escritura', 'corrección', 'redacción', 'textos'],
    tier: 'basic'
  },
  
  // GPTs Lite (requieren plan Lite o superior)
  {
    id: 'data-analysis',
    name: 'Data Analyst',
    description: 'Análisis avanzado de datos y visualizaciones',
    category: 'Productivity',
    url: 'https://chatgpt.com/g/g-HMNcP6w7d-data-analyst',
    tags: ['datos', 'análisis', 'gráficos', 'estadísticas'],
    tier: 'lite'
  },
  {
    id: 'code-copilot',
    name: 'Code Copilot',
    description: 'Asistente avanzado para programación',
    category: 'Programming',
    url: 'https://chatgpt.com/g/g-2DQzU5UZl-code-copilot',
    tags: ['código', 'programación', 'debug', 'desarrollo'],
    tier: 'lite'
  },
  
  // GPTs Premium (solo para usuarios Premium)
  {
    id: 'consensus',
    name: 'Consensus',
    description: 'Investigación académica basada en evidencia',
    category: 'Research',
    url: 'https://chatgpt.com/g/g-bo0FiWLY7-consensus',
    tags: ['investigación', 'académico', 'papers', 'ciencia'],
    tier: 'premium'
  },
  {
    id: 'canva',
    name: 'Canva',
    description: 'Diseño gráfico profesional con plantillas',
    category: 'Creative',
    url: 'https://chatgpt.com/g/g-alKfVrz9K-canva',
    tags: ['diseño', 'plantillas', 'gráficos', 'marketing'],
    tier: 'premium'
  },
  {
    id: 'math-solver',
    name: 'Math Solver',
    description: 'Resuelve problemas matemáticos paso a paso',
    category: 'Productivity',
    url: 'https://chatgpt.com/g/g-9YeZz6m6k-math-solver',
    tags: ['matemáticas', 'cálculo', 'álgebra', 'educación'],
    tier: 'lite'
  },
  {
    id: 'sql-expert',
    name: 'SQL Expert',
    description: 'Ayuda con consultas y optimización SQL',
    category: 'Programming',
    url: 'https://chatgpt.com/g/g-m5lMeGifF-sql-expert',
    tags: ['sql', 'base de datos', 'consultas', 'optimización'],
    tier: 'lite'
  },
  {
    id: 'copywriter-gpt',
    name: 'CopywriterGPT',
    description: 'Redacción publicitaria y marketing de contenidos',
    category: 'Writing',
    url: 'https://chatgpt.com/g/g-ZRE92jkYg-copywritergpt',
    tags: ['copywriting', 'marketing', 'publicidad', 'ventas'],
    tier: 'basic'
  },
  {
    id: 'scholar-gpt',
    name: 'Scholar GPT',
    description: 'Asistente para investigación académica',
    category: 'Research',
    url: 'https://chatgpt.com/g/g-kZ0zYXH0g-scholar-gpt',
    tags: ['académico', 'investigación', 'citas', 'bibliografía']
  }
];

// Inicialización
chrome.runtime.onInstalled.addListener(async ({ reason, previousVersion }) => {
  logger.debug('[SW] Extension installed:', reason, 'Previous version:', previousVersion);

  if (reason === 'install') {
    // Inicializar datos por defecto
    await chrome.storage.local.set({
      gpts: OFFICIAL_GPTS,
      favorites: [],
      prompts: [],
      settings: {
        theme: 'dark', // Dark mode con acentos verdes
        defaultView: 'grid'
      }
    });
    logger.debug('[SW] Initial data set');
  } else if (reason === 'update') {
    // Verificar y limpiar datos en actualizaciones
    const data = await chrome.storage.local.get(['favorites', 'gpts', 'prompts']);
    logger.debug('[SW] Current storage data:', data);
    
    // Asegurar que favorites es un array
    if (!Array.isArray(data.favorites)) {
      await chrome.storage.local.set({ favorites: [] });
      logger.debug('[SW] Reset favorites to empty array');
    }
    
    // Asegurar que GPTs existen
    if (!data.gpts || !Array.isArray(data.gpts)) {
      await chrome.storage.local.set({ gpts: OFFICIAL_GPTS });
      logger.debug('[SW] Reset GPTs to defaults');
    }
  }
});

// Configurar comportamiento del Side Panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => logger.error('Error setting panel behavior:', error));

// Message Handler con validación de seguridad
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validar origen del mensaje
  if (sender.id !== chrome.runtime.id) {
    logger.error('[SW] Mensaje rechazado - origen no válido:', sender);
    sendResponse({ success: false, error: 'Origen no autorizado' });
    return false;
  }

  // Validar estructura del mensaje
  if (!request || typeof request !== 'object' || !request.type || typeof request.type !== 'string') {
    logger.error('[SW] Mensaje rechazado - estructura inválida:', request);
    sendResponse({ success: false, error: 'Estructura de mensaje inválida' });
    return false;
  }

  logger.debug('[SW] Message received:', request.type);

  handleMessage(request)
    .then(sendResponse)
    .catch(error => {
      logger.error('[SW] Error:', error);
      sendResponse({ success: false, error: error.message });
    });

  return true; // Indica respuesta asíncrona
});

/**
 * Maneja mensajes del frontend
 */
async function handleMessage(request) {
  switch (request.type) {
    // Datos
    case 'GET_GPTS':
      const { gpts } = await chrome.storage.local.get('gpts');
      return { success: true, data: gpts || OFFICIAL_GPTS };

    case 'GET_FAVORITES':
      const { favorites } = await chrome.storage.local.get('favorites');
      return { success: true, data: favorites || [] };

    case 'TOGGLE_FAVORITE':
      if (!request.gptId) {
        throw new Error('GPT ID is required');
      }
      
      const favResult = await chrome.storage.local.get('favorites');
      let favs = favResult.favorites || [];
      
      // Asegurar que es un array
      if (!Array.isArray(favs)) {
        logger.warn('[SW] Favorites was not an array, resetting');
        favs = [];
      }
      
      const index = favs.indexOf(request.gptId);
      logger.debug('[SW] Toggle favorite:', request.gptId, 'Current index:', index);

      if (index > -1) {
        favs.splice(index, 1);
        logger.debug('[SW] Removed from favorites');
      } else {
        favs.push(request.gptId);
        logger.debug('[SW] Added to favorites');
      }

      await chrome.storage.local.set({ favorites: favs });
      logger.debug('[SW] Updated favorites:', favs);
      return { success: true, data: favs };

    case 'GET_PROMPTS':
      const { prompts } = await chrome.storage.local.get('prompts');
      return { success: true, data: prompts || [] };

    case 'SAVE_PROMPT':
      const promptsResult = await chrome.storage.local.get('prompts');
      const allPrompts = promptsResult.prompts || [];

      if (request.data.id) {
        // Actualizar existente
        const idx = allPrompts.findIndex(p => p.id === request.data.id);
        if (idx > -1) {
          allPrompts[idx] = request.data;
        }
      } else {
        // Crear nuevo
        request.data.id = `prompt-${Date.now()}`;
        request.data.created_at = new Date().toISOString();
        request.data.favorite = false; // Inicializar como no favorito
        allPrompts.push(request.data);
      }

      await chrome.storage.local.set({ prompts: allPrompts });
      return { success: true, data: request.data };

    case 'DELETE_PROMPT':
      const delResult = await chrome.storage.local.get('prompts');
      let remainingPrompts = delResult.prompts || [];
      remainingPrompts = remainingPrompts.filter(p => p.id !== request.id);

      await chrome.storage.local.set({ prompts: remainingPrompts });
      return { success: true };

    case 'TOGGLE_PROMPT_FAVORITE':
      if (!request.promptId) {
        throw new Error('Prompt ID is required');
      }
      
      const promptFavResult = await chrome.storage.local.get('prompts');
      const promptList = promptFavResult.prompts || [];
      
      const promptIndex = promptList.findIndex(p => p.id === request.promptId);
      if (promptIndex > -1) {
        promptList[promptIndex].favorite = !promptList[promptIndex].favorite;
        await chrome.storage.local.set({ prompts: promptList });
        logger.debug('[SW] Toggled prompt favorite:', request.promptId, promptList[promptIndex].favorite);
        return { success: true, data: promptList[promptIndex] };
      }
      
      throw new Error('Prompt not found');

    // Autenticación (placeholder)
    case 'AUTH_CHECK':
      return { success: true, data: authState };

    case 'AUTH_LOGIN':
      // Auth handled by auth module in sidepanel
      return { success: false, error: 'Auth should be handled in sidepanel' };

    case 'AUTH_LOGOUT':
      authState = {
        isAuthenticated: false,
        user: null
      };
      return { success: true };

    case 'GET_NOTIFICATIONS':
      return await getNotifications(request.userId);

    case 'MARK_NOTIFICATION_READ':
      return await markNotificationRead(request.userId, request.notificationId);

    case 'SYNC_FAVORITES':
      // Sincronizar favoritos desde el panel
      if (Array.isArray(request.favorites)) {
        await chrome.storage.local.set({ favorites: request.favorites });
        logger.debug('[SW] Favorites synced:', request.favorites);
        return { success: true };
      }
      throw new Error('Invalid favorites data');

    case 'CHECK_USER_ACCESS':
      return await checkUserAccess(request.email);

    case 'AUTH_SUCCESS':
      // Manejar autenticación exitosa desde callback
      logger.debug('[SW] Authentication successful:', request.user?.email);
      
      authState = {
        isAuthenticated: true,
        user: request.user,
        session: request.session
      };
      
      // Notificar a todas las ventanas/tabs sobre el cambio de estado
      try {
        chrome.runtime.sendMessage({
          type: 'AUTH_STATE_CHANGED',
          authState: authState
        });
      } catch (error) {
        // No hay problemas si no hay listeners
        logger.debug('[SW] No listeners for auth state change');
      }
      
      return { success: true, data: authState };

    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// Sistema de notificaciones
async function getNotifications(userId) {
  try {
    // TODO: Implementar sistema real de notificaciones desde Supabase
    // Por ahora retornar array vacío
    return {
      success: true,
      data: {
        notifications: [],
        unread: 0
      }
    };
  } catch (error) {
    logger.error('[SW] Error getting notifications:', error);
    return { success: false, error: error.message };
  }
}

async function markNotificationRead(userId, notificationId) {
  try {
    const { readNotifications = [] } = await chrome.storage.local.get('readNotifications');

    if (!readNotifications.includes(notificationId)) {
      readNotifications.push(notificationId);
      await chrome.storage.local.set({ readNotifications });
    }

    return { success: true };
  } catch (error) {
    logger.error('[SW] Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

// Sistema de verificación de acceso del usuario
async function checkUserAccess(email) {
  try {
    logger.debug('[SW] Checking user access for:', email);

    // Obtener el ID del usuario actual
    const userId = authState.user?.id;
    if (!userId) {
      logger.debug('[SW] No user ID found, returning LITE access');
      return {
        success: true,
        data: {
          hasAccess: false,
          licenseType: 'lite',
          expiresAt: null
        }
      };
    }

    // Usar el subscription manager para verificar acceso real
    const subscriptionData = await subscriptionManager.checkUserAccess(userId);
    
    logger.debug('[SW] User access result:', { email, ...subscriptionData });
    
    return {
      success: true,
      data: subscriptionData
    };

  } catch (error) {
    logger.error('[SW] Error checking user access:', error);
    return {
      success: false,
      error: 'Error verificando acceso del usuario'
    };
  }
}

// Abrir side panel cuando se hace click en el icono
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
