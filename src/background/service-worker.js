/**
 * Service Worker - Kit IA Emprendedor v1.0
 * Centraliza toda la lógica de negocio
 */

// Por ahora importamos funciones básicas - luego añadiremos módulos
let authState = {
  isAuthenticated: false,
  user: null
};

// GPTs oficiales hardcodeados por ahora
const OFFICIAL_GPTS = [
  {
    id: 'dall-e',
    name: 'DALL·E',
    description: 'Generador de imágenes con IA avanzada',
    category: 'Creative',
    url: 'https://chatgpt.com/g/g-2fkFE8rbu-dall-e',
    tags: ['imagen', 'arte', 'creativo', 'diseño']
  },
  {
    id: 'data-analysis',
    name: 'Data Analyst',
    description: 'Análisis avanzado de datos y visualizaciones',
    category: 'Productivity',
    url: 'https://chatgpt.com/g/g-HMNcP6w7d-data-analyst',
    tags: ['datos', 'análisis', 'gráficos', 'estadísticas']
  },
  {
    id: 'code-copilot',
    name: 'Code Copilot',
    description: 'Asistente avanzado para programación',
    category: 'Programming',
    url: 'https://chatgpt.com/g/g-2DQzU5UZl-code-copilot',
    tags: ['código', 'programación', 'debug', 'desarrollo']
  },
  {
    id: 'writing-coach',
    name: 'Writing Coach',
    description: 'Ayuda con escritura y corrección de textos',
    category: 'Writing',
    url: 'https://chatgpt.com/g/g-ZdfrSRAyo-creative-writing-coach',
    tags: ['escritura', 'corrección', 'redacción', 'textos']
  },
  {
    id: 'consensus',
    name: 'Consensus',
    description: 'Investigación académica basada en evidencia',
    category: 'Research',
    url: 'https://chatgpt.com/g/g-bo0FiWLY7-consensus',
    tags: ['investigación', 'académico', 'papers', 'ciencia']
  },
  {
    id: 'canva',
    name: 'Canva',
    description: 'Diseño gráfico profesional con plantillas',
    category: 'Creative',
    url: 'https://chatgpt.com/g/g-alKfVrz9K-canva',
    tags: ['diseño', 'plantillas', 'gráficos', 'marketing']
  },
  {
    id: 'math-solver',
    name: 'Math Solver',
    description: 'Resuelve problemas matemáticos paso a paso',
    category: 'Productivity',
    url: 'https://chatgpt.com/g/g-9YeZz6m6k-math-solver',
    tags: ['matemáticas', 'cálculo', 'álgebra', 'educación']
  },
  {
    id: 'sql-expert',
    name: 'SQL Expert',
    description: 'Ayuda con consultas y optimización SQL',
    category: 'Programming',
    url: 'https://chatgpt.com/g/g-m5lMeGifF-sql-expert',
    tags: ['sql', 'base de datos', 'consultas', 'optimización']
  },
  {
    id: 'copywriter-gpt',
    name: 'CopywriterGPT',
    description: 'Redacción publicitaria y marketing de contenidos',
    category: 'Writing',
    url: 'https://chatgpt.com/g/g-ZRE92jkYg-copywritergpt',
    tags: ['copywriting', 'marketing', 'publicidad', 'ventas']
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
  console.log('[SW] Extension installed:', reason, 'Previous version:', previousVersion);

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
    console.log('[SW] Initial data set');
  } else if (reason === 'update') {
    // Verificar y limpiar datos en actualizaciones
    const data = await chrome.storage.local.get(['favorites', 'gpts', 'prompts']);
    console.log('[SW] Current storage data:', data);
    
    // Asegurar que favorites es un array
    if (!Array.isArray(data.favorites)) {
      await chrome.storage.local.set({ favorites: [] });
      console.log('[SW] Reset favorites to empty array');
    }
    
    // Asegurar que GPTs existen
    if (!data.gpts || !Array.isArray(data.gpts)) {
      await chrome.storage.local.set({ gpts: OFFICIAL_GPTS });
      console.log('[SW] Reset GPTs to defaults');
    }
  }
});

// Configurar comportamiento del Side Panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// Message Handler con validación de seguridad
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validar origen del mensaje
  if (sender.id !== chrome.runtime.id) {
    console.error('[SW] Mensaje rechazado - origen no válido:', sender);
    sendResponse({ success: false, error: 'Origen no autorizado' });
    return false;
  }

  // Validar estructura del mensaje
  if (!request || typeof request !== 'object' || !request.type || typeof request.type !== 'string') {
    console.error('[SW] Mensaje rechazado - estructura inválida:', request);
    sendResponse({ success: false, error: 'Estructura de mensaje inválida' });
    return false;
  }

  console.log('[SW] Message received:', request.type);

  handleMessage(request)
    .then(sendResponse)
    .catch(error => {
      console.error('[SW] Error:', error);
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
        console.warn('[SW] Favorites was not an array, resetting');
        favs = [];
      }
      
      const index = favs.indexOf(request.gptId);
      console.log('[SW] Toggle favorite:', request.gptId, 'Current index:', index);

      if (index > -1) {
        favs.splice(index, 1);
        console.log('[SW] Removed from favorites');
      } else {
        favs.push(request.gptId);
        console.log('[SW] Added to favorites');
      }

      await chrome.storage.local.set({ favorites: favs });
      console.log('[SW] Updated favorites:', favs);
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
        console.log('[SW] Toggled prompt favorite:', request.promptId, promptList[promptIndex].favorite);
        return { success: true, data: promptList[promptIndex] };
      }
      
      throw new Error('Prompt not found');

    // Autenticación (placeholder)
    case 'AUTH_CHECK':
      return { success: true, data: authState };

    case 'AUTH_LOGIN':
      // TODO: Implementar con Supabase
      authState = {
        isAuthenticated: true,
        user: { email: request.data.email }
      };
      return { success: true, data: authState };

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
        console.log('[SW] Favorites synced:', request.favorites);
        return { success: true };
      }
      throw new Error('Invalid favorites data');

    case 'CHECK_USER_ACCESS':
      return await checkUserAccess(request.email);

    case 'AUTH_SUCCESS':
      // Manejar autenticación exitosa desde callback
      console.log('[SW] Authentication successful:', request.user?.email);
      
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
        console.log('[SW] No listeners for auth state change');
      }
      
      return { success: true, data: authState };

    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// Sistema de notificaciones
async function getNotifications(userId) {
  try {
    // Por ahora simulamos notificaciones locales
    // TODO: Conectar con Supabase cuando esté configurado
    const mockNotifications = [
      {
        id: 'welcome',
        title: '¡Bienvenido a Kit IA Emprendedor!',
        message: 'Descubre los mejores GPTs oficiales para potenciar tu negocio',
        type: 'info',
        icon: '🎉',
        action_url: 'https://kitiaemprendedor.com/docs',
        action_text: 'Ver guía de inicio',
        created_at: new Date().toISOString()
      },
      {
        id: 'new-gpts',
        title: 'Nuevos GPTs disponibles',
        message: 'Hemos añadido 5 nuevos GPTs especializados en marketing y ventas',
        type: 'success',
        icon: '✨',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'update',
        title: 'Actualización importante',
        message: 'La extensión se ha actualizado con mejoras de rendimiento y nuevas funciones',
        type: 'warning',
        icon: '⚡',
        action_url: 'https://kitiaemprendedor.com/changelog',
        action_text: 'Ver cambios',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ];

    // Obtener notificaciones leídas
    const { readNotifications = [] } = await chrome.storage.local.get('readNotifications');

    // Filtrar no leídas
    const unreadNotifications = mockNotifications.filter(
      n => !readNotifications.includes(n.id)
    );

    return {
      success: true,
      data: {
        notifications: mockNotifications,
        unread: unreadNotifications.length
      }
    };
  } catch (error) {
    console.error('[SW] Error getting notifications:', error);
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
    console.error('[SW] Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

// Sistema de verificación de acceso del usuario
async function checkUserAccess(email) {
  try {
    console.log('[SW] Checking user access for:', email);

    // Lista de emails con acceso (simulación)
    // TODO: Conectar con Supabase para verificación real en user_subscriptions
    const premiumUsers = [
      'carlos@carlosrodera.com',
      'test@kitiaemprendedor.com',
      'demo@example.com'
    ];

    // Por ahora, simulamos acceso basado en emails específicos
    // En producción: consultar tabla user_subscriptions en Supabase
    const hasAccess = premiumUsers.includes(email.toLowerCase());
    
    console.log('[SW] User access result:', { email, hasAccess });
    
    return {
      success: true,
      data: {
        hasAccess: hasAccess,
        licenseType: hasAccess ? 'premium' : 'none',
        expiresAt: null // Null = sin expiración
      }
    };

  } catch (error) {
    console.error('[SW] Error checking user access:', error);
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
