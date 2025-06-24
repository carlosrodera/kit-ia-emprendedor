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
let floatingButton = null;
let originalBodyMargin = null;
let isResizing = false;

/**
 * Inicializa el content script
 */
function init() {
  // Prevenir inyecciones duplicadas
  if (document.getElementById('kitia-sidebar-container')) {
    logger.warn('Sidebar already injected, skipping initialization');
    return;
  }

  logger.info('Content script initialized');

  // Escuchar mensajes del service worker
  chrome.runtime.onMessage.addListener(handleMessage);

  // Escuchar mensajes de la página
  window.addEventListener('message', handlePageMessage);

  // Escuchar atajos de teclado
  document.addEventListener('keydown', handleKeyboard);

  // Crear botón flotante
  createFloatingButton();

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
    const result = await chrome.storage.local.get(['sidebarVisible', 'sidebarPersist']);
    
    // Si sidebarPersist está activo y el sidebar estaba visible
    if (result.sidebarPersist && result.sidebarVisible) {
      showSidebar();
    }
  } catch (error) {
    logger.error('Error checking auto show sidebar:', error);
  }
}

/**
 * Maneja eventos de teclado
 */
function handleKeyboard(event) {
  // Alt + Shift + K para toggle del sidebar
  if (event.altKey && event.shiftKey && event.key === 'K') {
    event.preventDefault();
    toggleSidebar();
  }
}

/**
 * Crea el botón flotante para toggle del sidebar
 */
function createFloatingButton() {
  // Prevenir duplicados
  if (floatingButton) return;

  floatingButton = document.createElement('button');
  floatingButton.id = 'kitia-floating-button';
  floatingButton.setAttribute('aria-label', 'Toggle Kit IA Sidebar');
  floatingButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  // Estilos del botón
  Object.assign(floatingButton.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    zIndex: SIDEBAR_CONFIG.Z_INDEX - 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    opacity: '0.9'
  });

  // Eventos del botón
  floatingButton.addEventListener('click', () => {
    toggleSidebar();
  });

  floatingButton.addEventListener('mouseenter', () => {
    floatingButton.style.opacity = '1';
    floatingButton.style.transform = 'scale(1.1)';
  });

  floatingButton.addEventListener('mouseleave', () => {
    floatingButton.style.opacity = '0.9';
    floatingButton.style.transform = 'scale(1)';
  });

  // Agregar al DOM
  document.body.appendChild(floatingButton);
  logger.info('Floating button created');
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
    // Animar entrada
    sidebarIframe.style.transform = 'translateX(0)';
    sidebarVisible = true;
    
    // Ajustar contenido de la página
    adjustPageContent(true);
    
    // Actualizar botón flotante
    updateFloatingButton(true);
    
    // Guardar estado
    chrome.storage.local.set({
      sidebarVisible: true
    });

    // Notificar al service worker
    chrome.runtime.sendMessage({
      type: 'SIDEBAR_STATE_CHANGED',
      payload: { visible: true }
    });

    logger.info('Sidebar shown');
  }
}

/**
 * Oculta el sidebar
 */
function hideSidebar() {
  if (sidebarIframe) {
    // Animar salida
    sidebarIframe.style.transform = 'translateX(100%)';
    sidebarVisible = false;
    
    // Restaurar contenido de la página
    adjustPageContent(false);
    
    // Actualizar botón flotante
    updateFloatingButton(false);
    
    // Guardar estado
    chrome.storage.local.set({ sidebarVisible: false });

    // Notificar al service worker
    chrome.runtime.sendMessage({
      type: 'SIDEBAR_STATE_CHANGED',
      payload: { visible: false }
    });

    logger.info('Sidebar hidden');
  }
}

/**
 * Ajusta el contenido de la página cuando se muestra/oculta el sidebar
 */
function adjustPageContent(show) {
  const body = document.body;
  const html = document.documentElement;
  
  if (show) {
    // Guardar margen original
    originalBodyMargin = body.style.marginRight || '';
    
    // Aplicar margen para hacer espacio al sidebar
    const newMargin = `${SIDEBAR_CONFIG.WIDTH}px`;
    body.style.marginRight = newMargin;
    
    // Ajustar elementos fixed que puedan estar en el lado derecho
    adjustFixedElements(true);
  } else {
    // Restaurar margen original
    if (originalBodyMargin !== null) {
      body.style.marginRight = originalBodyMargin;
      originalBodyMargin = null;
    }
    
    // Restaurar elementos fixed
    adjustFixedElements(false);
  }
}

/**
 * Ajusta elementos con position fixed
 */
function adjustFixedElements(adjust) {
  const fixedElements = document.querySelectorAll('*');
  
  fixedElements.forEach(element => {
    const style = window.getComputedStyle(element);
    
    if (style.position === 'fixed' && style.right !== 'auto') {
      if (adjust) {
        // Guardar valor original
        element.dataset.originalRight = style.right;
        
        // Ajustar posición
        const currentRight = parseInt(style.right) || 0;
        element.style.right = `${currentRight + SIDEBAR_CONFIG.WIDTH}px`;
      } else {
        // Restaurar valor original
        if (element.dataset.originalRight) {
          element.style.right = element.dataset.originalRight;
          delete element.dataset.originalRight;
        }
      }
    }
  });
}

/**
 * Actualiza el estado visual del botón flotante
 */
function updateFloatingButton(isOpen) {
  if (!floatingButton) return;
  
  if (isOpen) {
    floatingButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    floatingButton.style.backgroundColor = '#EF4444';
  } else {
    floatingButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    floatingButton.style.backgroundColor = '#3B82F6';
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
      zIndex: SIDEBAR_CONFIG.Z_INDEX.toString(),
      pointerEvents: 'none',
      isolation: 'isolate' // Crear nuevo contexto de stacking
    });

    // Crear iframe
    sidebarIframe = document.createElement('iframe');
    sidebarIframe.id = 'kitia-sidebar-iframe';
    sidebarIframe.src = chrome.runtime.getURL('sidebar/index.html');
    
    // Atributos de seguridad del iframe
    sidebarIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    sidebarIframe.setAttribute('allow', 'clipboard-write; clipboard-read');
    
    // Estilos del iframe
    Object.assign(sidebarIframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
      backgroundColor: 'white',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      pointerEvents: 'auto'
    });

    // Crear handle de resize
    const resizeHandle = document.createElement('div');
    resizeHandle.id = 'kitia-resize-handle';
    Object.assign(resizeHandle.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '4px',
      height: '100%',
      cursor: 'ew-resize',
      backgroundColor: 'transparent',
      pointerEvents: 'auto',
      transition: 'background-color 0.2s ease'
    });

    // Eventos de resize
    resizeHandle.addEventListener('mouseenter', () => {
      resizeHandle.style.backgroundColor = 'rgba(59, 130, 246, 0.5)';
    });

    resizeHandle.addEventListener('mouseleave', () => {
      if (!isResizing) {
        resizeHandle.style.backgroundColor = 'transparent';
      }
    });

    resizeHandle.addEventListener('mousedown', startResize);

    // Agregar al DOM
    container.appendChild(resizeHandle);
    container.appendChild(sidebarIframe);
    document.body.appendChild(container);

    // Escuchar cuando el iframe esté listo
    sidebarIframe.addEventListener('load', () => {
      logger.info('Sidebar iframe loaded');
      
      // Enviar mensaje inicial al sidebar
      sidebarIframe.contentWindow.postMessage({
        type: 'SIDEBAR_INIT',
        payload: {
          theme: document.documentElement.dataset.theme || 'light'
        }
      }, chrome.runtime.getURL(''));
    });

    sidebarInjected = true;
    logger.info('Sidebar injected successfully');
  } catch (error) {
    logger.error('Error injecting sidebar:', error);
  }
}

/**
 * Inicia el resize del sidebar
 */
function startResize(e) {
  isResizing = true;
  document.body.style.userSelect = 'none';
  
  const startX = e.clientX;
  const startWidth = parseInt(document.getElementById('kitia-sidebar-container').style.width);
  
  function handleMouseMove(e) {
    const newWidth = startWidth - (e.clientX - startX);
    resizeSidebar(newWidth);
  }
  
  function handleMouseUp() {
    isResizing = false;
    document.body.style.userSelect = '';
    
    const resizeHandle = document.getElementById('kitia-resize-handle');
    if (resizeHandle) {
      resizeHandle.style.backgroundColor = 'transparent';
    }
    
    // Guardar nuevo ancho
    const container = document.getElementById('kitia-sidebar-container');
    if (container) {
      const width = parseInt(container.style.width);
      chrome.storage.local.set({ sidebarWidth: width });
    }
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
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
    
    // Ajustar el contenido de la página si el sidebar está visible
    if (sidebarVisible) {
      document.body.style.marginRight = `${newWidth}px`;
    }
    
    // Notificar al sidebar del cambio de tamaño
    if (sidebarIframe?.contentWindow) {
      sidebarIframe.contentWindow.postMessage({
        type: 'SIDEBAR_RESIZED',
        payload: { width: newWidth }
      }, chrome.runtime.getURL(''));
    }
    
    logger.debug(`Sidebar resized to ${newWidth}px`);
  }
}

/**
 * Limpieza al descargar
 */
function cleanup() {
  logger.info('Cleaning up content script...');
  
  // Remover elementos inyectados
  const elementsToRemove = [
    'kitia-sidebar-container',
    'kitia-floating-button'
  ];
  
  elementsToRemove.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.remove();
    }
  });
  
  // Restaurar estilos originales
  if (originalBodyMargin !== null) {
    document.body.style.marginRight = originalBodyMargin;
  }
  
  // Restaurar elementos fixed
  adjustFixedElements(false);
  
  // Remover event listeners
  window.removeEventListener('message', handlePageMessage);
  document.removeEventListener('keydown', handleKeyboard);
  
  // Limpiar referencias
  sidebarIframe = null;
  floatingButton = null;
  sidebarInjected = false;
  sidebarVisible = false;
  
  logger.info('Content script cleaned up');
}

/**
 * Detecta cambios en el DOM que puedan afectar al sidebar
 */
function observeDOMChanges() {
  const observer = new MutationObserver((mutations) => {
    // Verificar si nuestros elementos siguen en el DOM
    if (sidebarInjected && !document.getElementById('kitia-sidebar-container')) {
      logger.warn('Sidebar container removed from DOM, re-injecting...');
      sidebarInjected = false;
      if (sidebarVisible) {
        showSidebar();
      }
    }
    
    if (floatingButton && !document.getElementById('kitia-floating-button')) {
      logger.warn('Floating button removed from DOM, re-creating...');
      floatingButton = null;
      createFloatingButton();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: false
  });
  
  return observer;
}

// Variables para el observer
let domObserver = null;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    domObserver = observeDOMChanges();
  });
} else {
  init();
  domObserver = observeDOMChanges();
}

// Limpiar al descargar
window.addEventListener('unload', () => {
  if (domObserver) {
    domObserver.disconnect();
  }
  cleanup();
});

// Manejar cambios de visibilidad de la página
document.addEventListener('visibilitychange', () => {
  if (document.hidden && sidebarVisible) {
    // Pausar animaciones cuando la página no es visible
    if (sidebarIframe) {
      sidebarIframe.style.transition = 'none';
    }
  } else if (!document.hidden && sidebarVisible) {
    // Reanudar animaciones
    if (sidebarIframe) {
      sidebarIframe.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }
});