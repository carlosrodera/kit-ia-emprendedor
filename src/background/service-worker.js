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
    url: 'https://chat.openai.com/?model=gpt-4-dalle',
    tags: ['imagen', 'arte', 'creativo', 'diseño']
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    description: 'Análisis avanzado de datos y visualizaciones',
    category: 'Productivity',
    url: 'https://chat.openai.com/?model=gpt-4-code-interpreter',
    tags: ['datos', 'análisis', 'gráficos', 'estadísticas']
  },
  {
    id: 'code-copilot',
    name: 'Code Copilot',
    description: 'Asistente avanzado para programación',
    category: 'Programming',
    url: 'https://chat.openai.com/?model=gpt-4-code',
    tags: ['código', 'programación', 'debug', 'desarrollo']
  },
  {
    id: 'writing-assistant',
    name: 'Writing Assistant',
    description: 'Ayuda con escritura y corrección de textos',
    category: 'Writing',
    url: 'https://chat.openai.com/?model=gpt-4-writing',
    tags: ['escritura', 'corrección', 'redacción', 'textos']
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Investigación y análisis de información',
    category: 'Research',
    url: 'https://chat.openai.com/?model=gpt-4-research',
    tags: ['investigación', 'análisis', 'información', 'estudio']
  }
];

// Inicialización
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  console.log('[SW] Extension installed:', reason);
  
  if (reason === 'install') {
    // Inicializar datos por defecto
    await chrome.storage.local.set({
      gpts: OFFICIAL_GPTS,
      favorites: [],
      prompts: [],
      settings: {
        theme: 'dark',
        defaultView: 'grid'
      }
    });
  }
});

// Configurar comportamiento del Side Panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// Message Handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
      const favResult = await chrome.storage.local.get('favorites');
      let favs = favResult.favorites || [];
      const index = favs.indexOf(request.gptId);
      
      if (index > -1) {
        favs.splice(index, 1);
      } else {
        favs.push(request.gptId);
      }
      
      await chrome.storage.local.set({ favorites: favs });
      return { success: true, data: favs };
    
    case 'GET_PROMPTS':
      const { prompts } = await chrome.storage.local.get('prompts');
      return { success: true, data: prompts || [] };
    
    case 'SAVE_PROMPT':
      const promptsResult = await chrome.storage.local.get('prompts');
      let allPrompts = promptsResult.prompts || [];
      
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
    
    default:
      throw new Error(`Unknown message type: ${request.type}`);
  }
}

// Abrir side panel cuando se hace click en el icono
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});