/**
 * Service Worker - Kit IA Emprendedor
 * Maneja la lógica de fondo de la extensión
 * 
 * @module service-worker
 */

// Importar módulos necesarios
import { auth, setupAutoRefresh, stopAutoRefresh } from '../shared/auth.js';
import storage from '../shared/storage.js';
import { SUPABASE_CONFIG } from '../shared/config.js';
import { 
  STORAGE_KEYS, 
  MESSAGES, 
  ERROR_MESSAGES,
  CUSTOM_EVENTS,
  API_CONFIG,
  STORAGE_LIMITS,
  NOTIFICATION_TYPES,
  NOTIFICATION_DURATION
} from '../shared/constants.js';
import { serviceWorkerLogger as logger } from '../shared/logger.js';
import { createClient } from '@supabase/supabase-js';

// Estado en memoria
const serviceWorkerState = {
  isInitialized: false,
  syncInterval: null,
  supabaseClient: null,
  notificationCount: 0
};

/**
 * Obtiene el cliente de Supabase (lazy initialization)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabaseClient() {
  if (!serviceWorkerState.supabaseClient) {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_ANON_KEY_HERE') {
      throw new Error('Supabase configuration is missing or invalid');
    }
    
    serviceWorkerState.supabaseClient = createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          ...SUPABASE_CONFIG.options.auth,
          storage: {
            getItem: async (key) => {
              const data = await storage.auth.getToken();
              return data;
            },
            setItem: async (key, value) => {
              await storage.auth.saveToken(value);
            },
            removeItem: async (key) => {
              await storage.auth.removeToken();
            }
          }
        }
      }
    );
  }
  return serviceWorkerState.supabaseClient;
}

// Listener de instalación
chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Extension installed:', details.reason);
  
  try {
    if (details.reason === 'install') {
      await handleFirstInstall();
    } else if (details.reason === 'update') {
      await handleUpdate(details.previousVersion);
    }
    
    // Inicializar extensión después de instalación/actualización
    await initializeExtension();
  } catch (error) {
    logger.error('Error during installation:', error);
  }
});

// Listener de inicio
chrome.runtime.onStartup.addListener(async () => {
  logger.info('Browser started');
  await initializeExtension();
});

// Manejador de mensajes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Verificar origen del mensaje
  if (!sender.id || sender.id !== chrome.runtime.id) {
    logger.warn('Message from unknown source:', sender);
    sendResponse({ success: false, error: 'Invalid sender' });
    return false;
  }
  
  logger.debug('Message received:', message.type);
  
  // Procesar mensaje de forma asíncrona
  handleMessage(message, sender)
    .then(sendResponse)
    .catch(error => {
      logger.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    });
  
  // Indicar que la respuesta será asíncrona
  return true;
});

// Manejador principal de mensajes
async function handleMessage(message, sender) {
  const { type, payload } = message;
  
  try {
    switch (type) {
      // Auth messages
      case MESSAGES.CHECK_AUTH:
        return await checkAuthStatus();
        
      case MESSAGES.LOGIN:
        return await handleLogin(payload);
        
      case MESSAGES.LOGOUT:
        return await handleLogout();
        
      // GPT messages
      case MESSAGES.GET_GPTS:
        return await getGPTs();
        
      case MESSAGES.SYNC_GPTS:
        return await syncGPTs();
        
      case MESSAGES.GET_GPT_STATS:
        return await getGPTStats();
        
      // Favorite messages
      case MESSAGES.ADD_FAVORITE:
        return await addFavorite(payload.gptId);
        
      case MESSAGES.REMOVE_FAVORITE:
        return await removeFavorite(payload.gptId);
        
      case MESSAGES.GET_FAVORITES:
        return await getFavorites();
        
      // Prompt messages
      case MESSAGES.SAVE_PROMPT:
        return await savePrompt(payload);
        
      case MESSAGES.DELETE_PROMPT:
        return await deletePrompt(payload.id);
        
      case MESSAGES.GET_PROMPTS:
        return await getPrompts(payload);
        
      // Sidebar messages
      case MESSAGES.TOGGLE_SIDEBAR:
        return await toggleSidebar(sender.tab);
        
      // Notification messages
      case MESSAGES.GET_NOTIFICATIONS:
        return await getNotifications();
        
      case MESSAGES.MARK_NOTIFICATION_READ:
        return await markNotificationRead(payload.id);
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    logger.error(`Error in ${type}:`, error);
    throw error;
  }
}

// Funciones de inicialización
async function handleFirstInstall() {
  try {
    logger.info('Handling first installation');
    
    // Configurar valores por defecto
    await storage.preferences.reset();
    
    // Configurar badge
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
    chrome.action.setBadgeText({ text: '' });
    
    // Abrir página de bienvenida
    chrome.tabs.create({
      url: chrome.runtime.getURL('auth/login.html?welcome=true')
    });
    
    logger.info('First installation completed');
  } catch (error) {
    logger.error('Error in first install:', error);
    throw error;
  }
}

async function handleUpdate(previousVersion) {
  try {
    logger.info(`Updated from version ${previousVersion}`);
    
    // Verificar si necesitamos migrar datos
    const currentVersion = chrome.runtime.getManifest().version;
    
    // Aquí se pueden manejar migraciones específicas por versión
    // Por ejemplo:
    // if (previousVersion < '1.0.0' && currentVersion >= '1.0.0') {
    //   await migrateToV1();
    // }
    
    // Mostrar notificación de actualización
    await showNotification({
      type: NOTIFICATION_TYPES.INFO,
      title: 'Extension actualizada',
      message: `Kit IA Emprendedor se ha actualizado a la versión ${currentVersion}`,
      duration: NOTIFICATION_DURATION.MEDIUM
    });
    
  } catch (error) {
    logger.error('Error in update:', error);
  }
}

async function initializeExtension() {
  if (serviceWorkerState.isInitialized) {
    logger.debug('Extension already initialized');
    return;
  }
  
  try {
    logger.info('Initializing extension');
    
    // Inicializar módulo de autenticación
    await auth.initialize();
    
    // Configurar auto-refresh de tokens
    setupAutoRefresh();
    
    // Configurar sincronización periódica de GPTs
    await setupGPTSync();
    
    // Actualizar badge si está autenticado
    if (auth.isAuthenticated()) {
      await updateBadge();
    }
    
    serviceWorkerState.isInitialized = true;
    logger.info('Extension initialized successfully');
    
  } catch (error) {
    logger.error('Error initializing extension:', error);
    serviceWorkerState.isInitialized = false;
  }
}

// Funciones de autenticación
async function checkAuthStatus() {
  try {
    const isValid = await auth.checkAuthStatus();
    
    return {
      success: true,
      data: {
        isAuthenticated: auth.isAuthenticated(),
        user: auth.getCurrentUser(),
        hasSubscription: await auth.hasActiveSubscription()
      }
    };
  } catch (error) {
    logger.error('Error checking auth status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handleLogin(payload) {
  try {
    if (!payload || !payload.provider) {
      throw new Error('Provider is required');
    }
    
    logger.info(`Login attempt with ${payload.provider}`);
    
    // Login con OAuth
    const result = await auth.loginWithOAuth(payload.provider);
    
    // Iniciar sincronización de GPTs
    await syncGPTs();
    
    // Actualizar badge
    await updateBadge();
    
    return {
      success: true,
      data: {
        user: result.user,
        session: result.session
      }
    };
  } catch (error) {
    logger.error('Login error:', error);
    return {
      success: false,
      error: error.message || ERROR_MESSAGES.UNKNOWN_ERROR
    };
  }
}

async function handleLogout() {
  try {
    // Detener sincronización
    stopGPTSync();
    
    // Detener auto-refresh
    stopAutoRefresh();
    
    // Cerrar sesión
    await auth.logout();
    
    // Limpiar badge
    chrome.action.setBadgeText({ text: '' });
    
    // Cerrar todas las pestañas de la extensión
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('*') });
    tabs.forEach(tab => chrome.tabs.remove(tab.id));
    
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
    if (!auth.isAuthenticated()) {
      throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
    }
    
    // Intentar obtener del cache primero
    const cachedGPTs = await storage.cache.getGPTsCache();
    if (cachedGPTs) {
      logger.debug('Returning cached GPTs');
      return {
        success: true,
        data: cachedGPTs,
        fromCache: true
      };
    }
    
    // Si no hay cache, sincronizar
    const result = await syncGPTs();
    return result;
    
  } catch (error) {
    logger.error('Error getting GPTs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function syncGPTs() {
  try {
    if (!auth.isAuthenticated()) {
      throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
    }
    
    logger.info('Syncing GPTs from Supabase');
    
    const client = getSupabaseClient();
    
    // Obtener GPTs oficiales de Supabase
    const { data: gpts, error } = await client
      .from('official_gpts')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      throw error;
    }
    
    // Guardar en cache
    await storage.cache.saveGPTsCache(gpts);
    
    // Actualizar última sincronización
    await storage.set({
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString()
    });
    
    // Actualizar badge
    await updateBadge(gpts.length);
    
    logger.info(`Synced ${gpts.length} GPTs`);
    
    return {
      success: true,
      data: gpts,
      fromCache: false
    };
    
  } catch (error) {
    logger.error('Error syncing GPTs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getGPTStats() {
  try {
    const cachedGPTs = await storage.cache.getGPTsCache();
    const favorites = await storage.favorites.getAll();
    const prompts = await storage.prompts.getAll();
    
    return {
      success: true,
      data: {
        totalGPTs: cachedGPTs?.length || 0,
        favoriteCount: favorites.length,
        promptCount: prompts.length,
        lastSync: await storage.get(STORAGE_KEYS.LAST_SYNC)
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

// Funciones de favoritos
async function addFavorite(gptId) {
  try {
    if (!gptId) {
      throw new Error('GPT ID is required');
    }
    
    await storage.favorites.add(gptId);
    
    return {
      success: true,
      data: { gptId, isFavorite: true }
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
    
    await storage.favorites.remove(gptId);
    
    return {
      success: true,
      data: { gptId, isFavorite: false }
    };
  } catch (error) {
    logger.error('Error removing favorite:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getFavorites() {
  try {
    const favorites = await storage.favorites.getAll();
    
    return {
      success: true,
      data: favorites
    };
  } catch (error) {
    logger.error('Error getting favorites:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Funciones de prompts
async function savePrompt(promptData) {
  try {
    const newPrompt = await storage.prompts.save(promptData);
    
    // Mostrar notificación
    await showNotification({
      type: NOTIFICATION_TYPES.SUCCESS,
      title: 'Prompt guardado',
      message: `"${newPrompt.title}" se ha guardado correctamente`,
      duration: NOTIFICATION_DURATION.SHORT
    });
    
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
    await storage.prompts.delete(promptId);
    
    return {
      success: true
    };
  } catch (error) {
    logger.error('Error deleting prompt:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function getPrompts(payload = {}) {
  try {
    let prompts;
    
    if (payload.search) {
      prompts = await storage.prompts.search(payload.search);
    } else {
      prompts = await storage.prompts.getAll();
    }
    
    // Ordenar por uso/fecha si se especifica
    if (payload.sortBy) {
      prompts.sort((a, b) => {
        switch (payload.sortBy) {
          case 'usage':
            return (b.usageCount || 0) - (a.usageCount || 0);
          case 'date':
            return new Date(b.createdAt) - new Date(a.createdAt);
          case 'name':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
    }
    
    return {
      success: true,
      data: prompts
    };
  } catch (error) {
    logger.error('Error getting prompts:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Funciones de sidebar
async function toggleSidebar(tab) {
  try {
    if (!tab || !tab.id) {
      throw new Error('No active tab');
    }
    
    // Verificar si la URL es válida para inyectar
    const isValidUrl = tab.url && 
      (tab.url.startsWith('http://') || tab.url.startsWith('https://')) &&
      !tab.url.includes('chrome.google.com/webstore');
    
    if (!isValidUrl) {
      throw new Error('Cannot inject sidebar on this page');
    }
    
    // Inyectar content script si no está ya inyectado
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Verificar si el content script ya está cargado
        return window.__kitIAContentScriptLoaded === true;
      }
    });
    
    const isLoaded = results[0]?.result;
    
    if (!isLoaded) {
      // Inyectar content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content-script.js']
      });
      
      // Inyectar estilos
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['src/content/content-styles.css']
      });
    }
    
    // Enviar mensaje para toggle sidebar
    await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGES.TOGGLE_SIDEBAR
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

// Funciones de notificaciones
async function getNotifications() {
  try {
    if (!auth.isAuthenticated()) {
      return {
        success: true,
        data: []
      };
    }
    
    const client = getSupabaseClient();
    const userId = auth.getCurrentUser()?.id;
    
    if (!userId) {
      throw new Error('User ID not found');
    }
    
    // Obtener notificaciones del usuario
    const { data: notifications, error } = await client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      throw error;
    }
    
    // Obtener IDs de notificaciones leídas
    const readIds = await storage.get(STORAGE_KEYS.NOTIFICATIONS_READ);
    const readSet = new Set(readIds[STORAGE_KEYS.NOTIFICATIONS_READ] || []);
    
    // Marcar cuáles están leídas
    const enrichedNotifications = notifications.map(n => ({
      ...n,
      isRead: readSet.has(n.id)
    }));
    
    // Contar no leídas
    const unreadCount = enrichedNotifications.filter(n => !n.isRead).length;
    
    // Actualizar badge
    await updateBadge(unreadCount);
    
    return {
      success: true,
      data: enrichedNotifications,
      unreadCount
    };
    
  } catch (error) {
    logger.error('Error getting notifications:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function markNotificationRead(notificationId) {
  try {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }
    
    // Obtener IDs leídos actuales
    const result = await storage.get(STORAGE_KEYS.NOTIFICATIONS_READ);
    const readIds = result[STORAGE_KEYS.NOTIFICATIONS_READ] || [];
    
    // Añadir nuevo ID si no existe
    if (!readIds.includes(notificationId)) {
      readIds.push(notificationId);
      
      // Guardar actualización
      await storage.set({
        [STORAGE_KEYS.NOTIFICATIONS_READ]: readIds
      });
      
      // Actualizar badge
      await getNotifications(); // Esto actualizará el badge automáticamente
    }
    
    return { success: true };
    
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function showNotification(options) {
  try {
    const { type, title, message, duration = NOTIFICATION_DURATION.MEDIUM } = options;
    
    // Verificar si las notificaciones están habilitadas
    const preferences = await storage.preferences.getAll();
    if (!preferences.showNotifications) {
      return;
    }
    
    // Crear notificación
    const notificationId = `notification_${Date.now()}`;
    
    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icon-128.png'),
      title: title,
      message: message,
      priority: type === NOTIFICATION_TYPES.ERROR ? 2 : 1
    });
    
    // Auto-cerrar si tiene duración
    if (duration > 0) {
      setTimeout(() => {
        chrome.notifications.clear(notificationId);
      }, duration);
    }
    
    logger.info('Notification shown:', title);
    
  } catch (error) {
    logger.error('Error showing notification:', error);
  }
}

// Funciones de utilidad
async function updateBadge(count) {
  try {
    if (typeof count === 'undefined') {
      // Obtener conteo de notificaciones no leídas
      const result = await getNotifications();
      count = result.data ? result.data.filter(n => !n.isRead).length : 0;
    }
    
    // Actualizar badge
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#EF4444' }); // Rojo para notificaciones
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
    
    serviceWorkerState.notificationCount = count;
    
  } catch (error) {
    logger.error('Error updating badge:', error);
  }
}

async function setupGPTSync() {
  try {
    // Limpiar interval existente
    if (serviceWorkerState.syncInterval) {
      clearInterval(serviceWorkerState.syncInterval);
    }
    
    // Obtener preferencias
    const preferences = await storage.preferences.getAll();
    
    if (!preferences.autoSync) {
      logger.info('Auto-sync is disabled');
      return;
    }
    
    // Configurar sincronización periódica
    const syncInterval = preferences.syncInterval || STORAGE_LIMITS.SYNC_INTERVAL;
    
    serviceWorkerState.syncInterval = setInterval(async () => {
      if (auth.isAuthenticated()) {
        logger.debug('Running periodic GPT sync');
        await syncGPTs();
      }
    }, syncInterval);
    
    logger.info(`GPT sync configured every ${syncInterval / 1000 / 60} minutes`);
    
  } catch (error) {
    logger.error('Error setting up GPT sync:', error);
  }
}

function stopGPTSync() {
  if (serviceWorkerState.syncInterval) {
    clearInterval(serviceWorkerState.syncInterval);
    serviceWorkerState.syncInterval = null;
    logger.info('GPT sync stopped');
  }
}

// Listener para cambios en storage
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  
  // Si cambian las preferencias de sincronización
  if (changes[STORAGE_KEYS.PREFERENCES]) {
    const newPrefs = changes[STORAGE_KEYS.PREFERENCES].newValue;
    const oldPrefs = changes[STORAGE_KEYS.PREFERENCES].oldValue;
    
    if (newPrefs?.autoSync !== oldPrefs?.autoSync || 
        newPrefs?.syncInterval !== oldPrefs?.syncInterval) {
      logger.info('Sync preferences changed, reconfiguring...');
      setupGPTSync();
    }
  }
});

// Listener para clicks en notificaciones
chrome.notifications.onClicked.addListener((notificationId) => {
  logger.debug('Notification clicked:', notificationId);
  
  // Abrir popup al hacer click en notificación
  chrome.action.openPopup();
});

// Listener para comandos de teclado
chrome.commands.onCommand.addListener(async (command) => {
  logger.debug('Command received:', command);
  
  if (command === 'toggle-sidebar') {
    try {
      // Obtener la pestaña activa
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab && tab.id) {
        // Enviar mensaje al content script
        await chrome.tabs.sendMessage(tab.id, {
          type: MESSAGES.TOGGLE_SIDEBAR
        });
        
        logger.info('Toggle sidebar command sent to tab:', tab.id);
      }
    } catch (error) {
      logger.error('Error handling toggle sidebar command:', error);
    }
  }
});

// Listener para alarmas (para tareas periódicas)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  logger.debug('Alarm triggered:', alarm.name);
  
  switch (alarm.name) {
    case 'token-refresh':
      if (auth.isAuthenticated()) {
        await auth.checkAuthStatus();
      }
      break;
      
    case 'gpt-sync':
      if (auth.isAuthenticated()) {
        await syncGPTs();
      }
      break;
      
    default:
      logger.warn('Unknown alarm:', alarm.name);
  }
});

// Manejo de errores global
self.addEventListener('unhandledrejection', event => {
  logger.error('Unhandled rejection:', event.reason);
  event.preventDefault();
});

// Log de carga exitosa
logger.info('Service Worker loaded successfully');
logger.info('Extension version:', chrome.runtime.getManifest().version);