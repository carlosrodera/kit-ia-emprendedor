/**
 * Service Worker - Kit IA Emprendedor
 * Maneja la lógica de fondo de la extensión
 */

// Constantes
const EXTENSION_NAME = 'Kit IA Emprendedor';
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  GPTS_CACHE: 'gpts_cache',
  LAST_SYNC: 'last_sync',
  USER_PREFERENCES: 'user_preferences'
};

// Estado en memoria
let authState = {
  isAuthenticated: false,
  token: null,
  user: null
};

// Listener de instalación
chrome.runtime.onInstalled.addListener((details) => {
  console.log(`[${EXTENSION_NAME}] Installed:`, details.reason);
  
  if (details.reason === 'install') {
    // Primera instalación
    handleFirstInstall();
  } else if (details.reason === 'update') {
    // Actualización
    handleUpdate(details.previousVersion);
  }
});

// Listener de inicio
chrome.runtime.onStartup.addListener(() => {
  console.log(`[${EXTENSION_NAME}] Browser started`);
  initializeExtension();
});

// Manejador de mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[${EXTENSION_NAME}] Message received:`, message.type);
  
  // Procesar mensaje de forma asíncrona
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      console.error(`[${EXTENSION_NAME}] Error handling message:`, error);
      sendResponse({ success: false, error: error.message });
    });
  
  // Indicar que la respuesta será asíncrona
  return true;
});

// Manejador principal de mensajes
async function handleMessage(message, sender) {
  const { type, payload } = message;
  
  switch (type) {
    case 'AUTH_CHECK':
      return await checkAuthStatus();
      
    case 'AUTH_LOGIN':
      return await handleLogin(payload);
      
    case 'AUTH_LOGOUT':
      return await handleLogout();
      
    case 'GET_GPTS':
      return await getGPTs();
      
    case 'TOGGLE_FAVORITE':
      return await toggleFavorite(payload.gptId);
      
    case 'SAVE_PROMPT':
      return await savePrompt(payload);
      
    case 'GET_PROMPTS':
      return await getPrompts();
      
    case 'OPEN_SIDEBAR':
      return await openSidebar(sender.tab);
      
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

// Funciones de inicialización
async function handleFirstInstall() {
  // Configurar valores por defecto
  await chrome.storage.local.set({
    [STORAGE_KEYS.USER_PREFERENCES]: {
      theme: 'light',
      viewMode: 'card',
      showNotifications: true,
      autoSync: true,
      syncInterval: 300 // 5 minutos
    }
  });
  
  // Abrir página de bienvenida
  chrome.tabs.create({
    url: chrome.runtime.getURL('auth/login.html?welcome=true')
  });
}

async function handleUpdate(previousVersion) {
  console.log(`[${EXTENSION_NAME}] Updated from version ${previousVersion}`);
  // Aquí se pueden manejar migraciones si es necesario
}

async function initializeExtension() {
  // Cargar estado de autenticación
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.USER_DATA
  ]);
  
  if (stored[STORAGE_KEYS.AUTH_TOKEN]) {
    authState = {
      isAuthenticated: true,
      token: stored[STORAGE_KEYS.AUTH_TOKEN],
      user: stored[STORAGE_KEYS.USER_DATA]
    };
  }
}

// Funciones de autenticación
async function checkAuthStatus() {
  return {
    success: true,
    data: {
      isAuthenticated: authState.isAuthenticated,
      user: authState.user
    }
  };
}

async function handleLogin(credentials) {
  // En producción, esto se comunicaría con Supabase
  // Por ahora, simulamos el login
  console.log(`[${EXTENSION_NAME}] Login attempt:`, credentials.email);
  
  // TODO: Implementar autenticación real con Supabase
  
  return {
    success: false,
    error: 'Login not implemented yet'
  };
}

async function handleLogout() {
  // Limpiar estado y storage
  authState = {
    isAuthenticated: false,
    token: null,
    user: null
  };
  
  await chrome.storage.local.remove([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.USER_DATA
  ]);
  
  return { success: true };
}

// Funciones de GPTs
async function getGPTs() {
  if (!authState.isAuthenticated) {
    return {
      success: false,
      error: 'Not authenticated'
    };
  }
  
  // TODO: Implementar fetch de GPTs desde Supabase
  // Por ahora retornamos datos mock
  return {
    success: true,
    data: []
  };
}

async function toggleFavorite(gptId) {
  if (!authState.isAuthenticated) {
    return {
      success: false,
      error: 'Not authenticated'
    };
  }
  
  // TODO: Implementar toggle de favoritos
  return {
    success: true,
    data: { gptId, isFavorite: true }
  };
}

// Funciones de prompts (almacenamiento local)
async function savePrompt(promptData) {
  const prompts = await getLocalPrompts();
  const newPrompt = {
    id: `prompt_${Date.now()}`,
    ...promptData,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  prompts.push(newPrompt);
  await chrome.storage.local.set({ prompts });
  
  return {
    success: true,
    data: newPrompt
  };
}

async function getPrompts() {
  const prompts = await getLocalPrompts();
  return {
    success: true,
    data: prompts
  };
}

async function getLocalPrompts() {
  const result = await chrome.storage.local.get('prompts');
  return result.prompts || [];
}

// Función para abrir sidebar
async function openSidebar(tab) {
  if (!tab) {
    return {
      success: false,
      error: 'No active tab'
    };
  }
  
  // Inyectar script para mostrar sidebar
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: () => {
      // Este código se ejecutará en el contexto de la página
      window.postMessage({ type: 'TOGGLE_SIDEBAR' }, '*');
    }
  });
  
  return { success: true };
}

// Manejo de errores global
self.addEventListener('unhandledrejection', event => {
  console.error(`[${EXTENSION_NAME}] Unhandled rejection:`, event.reason);
});

console.log(`[${EXTENSION_NAME}] Service Worker loaded`);