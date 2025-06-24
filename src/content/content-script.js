/**
 * Content Script - Kit IA Emprendedor
 * Se inyecta en todas las páginas web
 */

import { createLogger } from '../shared/logger.js';
import { SIDEBAR_CONFIG, CUSTOM_EVENTS } from '../shared/constants.js';

const logger = createLogger('ContentScript');

// Estado del sidebar
let sidebarInjected = false;
let sidebarVisible = false;
let sidebarIframe = null;

/**
 * Inicializa el content script
 */
function init() {
  logger.info('Content script initialized');

  // Escuchar mensajes del service worker
  chrome.runtime.onMessage.addListener(handleMessage);

  // Escuchar mensajes de la página
  window.addEventListener('message', handlePageMessage);

  // Verificar si debemos mostrar el sidebar automáticamente
  checkAutoShowSidebar();
}

/**
 * Maneja mensajes del service worker
 */
function handleMessage(message, sender, sendResponse) {
  logger.debug('Message received:', message);

  switch (message.type) {
    case 'TOGGLE_SIDEBAR':
      toggleSidebar();
      sendResponse({ success: true });
      break;

    case 'SHOW_SIDEBAR':
      showSidebar();
      sendResponse({ success: true });
      break;

    case 'HIDE_SIDEBAR':
      hideSidebar();
      sendResponse({ success: true });
      break;

    default:
      logger.warn('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true; // Indica respuesta asíncrona
}

/**
 * Maneja mensajes desde la página web
 */
function handlePageMessage(event) {
  // Solo aceptar mensajes de nuestro propio iframe
  if (event.source !== sidebarIframe?.contentWindow) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SIDEBAR_READY':
      logger.info('Sidebar ready');
      break;

    case 'CLOSE_SIDEBAR':
      hideSidebar();
      break;

    case 'RESIZE_SIDEBAR':
      resizeSidebar(payload.width);
      break;

    default:
      // Reenviar al service worker si es necesario
      chrome.runtime.sendMessage(event.data);
  }
}

/**
 * Verifica si debe mostrar el sidebar automáticamente
 */
async function checkAutoShowSidebar() {
  try {
    const result = await chrome.storage.local.get(['autoShowSidebar', 'lastUrl']);
    
    if (result.autoShowSidebar && result.lastUrl === window.location.href) {
      showSidebar();
    }
  } catch (error) {
    logger.error('Error checking auto show sidebar:', error);
  }
}

/**
 * Alterna la visibilidad del sidebar
 */
function toggleSidebar() {
  if (sidebarVisible) {
    hideSidebar();
  } else {
    showSidebar();
  }
}

/**
 * Muestra el sidebar
 */
async function showSidebar() {
  if (!sidebarInjected) {
    await injectSidebar();
  }

  if (sidebarIframe) {
    sidebarIframe.style.transform = 'translateX(0)';
    sidebarVisible = true;
    
    // Guardar estado
    chrome.storage.local.set({
      sidebarVisible: true,
      lastUrl: window.location.href
    });

    logger.info('Sidebar shown');
  }
}

/**
 * Oculta el sidebar
 */
function hideSidebar() {
  if (sidebarIframe) {
    sidebarIframe.style.transform = 'translateX(100%)';
    sidebarVisible = false;
    
    // Guardar estado
    chrome.storage.local.set({ sidebarVisible: false });

    logger.info('Sidebar hidden');
  }
}

/**
 * Inyecta el sidebar en la página
 */
async function injectSidebar() {
  try {
    logger.info('Injecting sidebar...');

    // Crear contenedor del iframe
    const container = document.createElement('div');
    container.id = 'kitia-sidebar-container';
    
    // Estilos del contenedor
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: `${SIDEBAR_CONFIG.WIDTH}px`,
      height: '100vh',
      zIndex: SIDEBAR_CONFIG.Z_INDEX,
      pointerEvents: 'none'
    });

    // Crear iframe
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.id = 'kitia-sidebar-iframe';
    sidebarIframe.src = chrome.runtime.getURL('sidebar/index.html');
    
    // Estilos del iframe
    Object.assign(sidebarIframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'white',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      pointerEvents: 'auto'
    });

    // Agregar al DOM
    container.appendChild(sidebarIframe);
    document.body.appendChild(container);

    sidebarInjected = true;
    logger.info('Sidebar injected successfully');
  } catch (error) {
    logger.error('Error injecting sidebar:', error);
  }
}

/**
 * Redimensiona el sidebar
 */
function resizeSidebar(width) {
  if (!sidebarIframe) return;

  const newWidth = Math.max(
    SIDEBAR_CONFIG.MIN_WIDTH,
    Math.min(width, SIDEBAR_CONFIG.MAX_WIDTH)
  );

  const container = document.getElementById('kitia-sidebar-container');
  if (container) {
    container.style.width = `${newWidth}px`;
    logger.debug(`Sidebar resized to ${newWidth}px`);
  }
}

/**
 * Limpieza al descargar
 */
function cleanup() {
  const container = document.getElementById('kitia-sidebar-container');
  if (container) {
    container.remove();
  }

  window.removeEventListener('message', handlePageMessage);
  logger.info('Content script cleaned up');
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Limpiar al descargar
window.addEventListener('unload', cleanup);