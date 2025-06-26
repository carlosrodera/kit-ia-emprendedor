// Content Script para Kit IA Emprendedor
(function () {
  'use strict';

  // Configuración
  const SIDEBAR_CONFIG = {
    WIDTH: 480,
    MIN_WIDTH: 320,
    MAX_WIDTH: 600,
    Z_INDEX: 2147483647
  };

  // Estado del sidebar
  const sidebarState = {
    isOpen: false,
    iframe: null,
    container: null,
    floatingButton: null
  };

  // Crear y gestionar el sidebar
  function createSidebar() {
    if (sidebarState.container) return;

    // Crear contenedor
    const container = document.createElement('div');
    container.id = 'kitia-sidebar-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: -${SIDEBAR_CONFIG.WIDTH}px;
      width: ${SIDEBAR_CONFIG.WIDTH}px;
      height: 100vh;
      z-index: ${SIDEBAR_CONFIG.Z_INDEX};
      transition: right 0.3s ease-in-out;
      box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    `;

    // Crear iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'kitia-sidebar-iframe';
    iframe.src = chrome.runtime.getURL('sidebar/index.html');
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    `;

    container.appendChild(iframe);
    document.body.appendChild(container);

    sidebarState.container = container;
    sidebarState.iframe = iframe;

    // Escuchar mensajes del iframe
    window.addEventListener('message', handleIframeMessage);
  }

  function createFloatingButton() {
    if (sidebarState.floatingButton) return;

    const button = document.createElement('button');
    button.id = 'kitia-floating-button';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;

    button.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: #4F46E5;
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      z-index: ${SIDEBAR_CONFIG.Z_INDEX - 1};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    `;

    button.addEventListener('click', () => {
      toggleSidebar();
    });

    document.body.appendChild(button);
    sidebarState.floatingButton = button;
  }

  function toggleSidebar(show) {
    if (!sidebarState.container) {
      createSidebar();
    }

    const shouldShow = show !== undefined ? show : !sidebarState.isOpen;

    if (shouldShow) {
      sidebarState.container.style.right = '0';
      sidebarState.isOpen = true;

      // Ajustar el body para hacer espacio
      if (window.innerWidth > 768) {
        document.body.style.marginRight = `${SIDEBAR_CONFIG.WIDTH}px`;
        document.body.style.transition = 'margin-right 0.3s ease-in-out';
      }

      // Actualizar botón
      if (sidebarState.floatingButton) {
        sidebarState.floatingButton.style.backgroundColor = '#EF4444';
        sidebarState.floatingButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      }
    } else {
      sidebarState.container.style.right = `-${SIDEBAR_CONFIG.WIDTH}px`;
      sidebarState.isOpen = false;
      document.body.style.marginRight = '0';

      // Actualizar botón y asegurar que permanezca visible
      if (sidebarState.floatingButton) {
        sidebarState.floatingButton.style.backgroundColor = '#4F46E5';
        sidebarState.floatingButton.style.display = 'flex'; // Asegurar que permanezca visible
        sidebarState.floatingButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
      }

      // Si no existe el botón flotante, recrearlo
      if (!sidebarState.floatingButton || !document.body.contains(sidebarState.floatingButton)) {
        createFloatingButton();
      }
    }

    // Notificar al background
    chrome.runtime.sendMessage({
      type: 'SIDEBAR_STATE_CHANGED',
      data: { isOpen: sidebarState.isOpen }
    });
  }

  function handleIframeMessage(event) {
    // Verificar origen
    if (event.origin !== window.location.origin &&
        !event.origin.startsWith('chrome-extension://')) {
      return;
    }

    const { type, data } = event.data;

    switch (type) {
      case 'CLOSE_SIDEBAR':
        toggleSidebar(false);
        break;
      case 'MINIMIZE_SIDEBAR':
        // Implementar minimización si es necesario
        break;
      case 'OPEN_URL':
        if (data && data.url) {
          window.open(data.url, '_blank');
        }
        break;
      case 'NAVIGATE_URL':
        if (data && data.url) {
          window.location.href = data.url;
        }
        break;
      case 'RESIZE_SIDEBAR':
        if (data && data.width && sidebarState.container) {
          const newWidth = Math.min(Math.max(data.width, SIDEBAR_CONFIG.MIN_WIDTH), SIDEBAR_CONFIG.MAX_WIDTH);
          sidebarState.container.style.width = `${newWidth}px`;

          // Solo actualizar margin si el sidebar está abierto
          if (sidebarState.isOpen && window.innerWidth > 768) {
            document.body.style.marginRight = `${newWidth}px`;
          }

          // Actualizar configuración
          SIDEBAR_CONFIG.WIDTH = newWidth;
        }
        break;
      case 'INSERT_PROMPT':
        if (data && data.prompt) {
          insertPromptInTextarea(data.prompt);
        }
        break;
    }
  }

  // Escuchar mensajes del background/popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script received message:', request);

    switch (request.type) {
      case 'TOGGLE_SIDEBAR':
        toggleSidebar(request.data?.show);
        sendResponse({ success: true });
        break;

      case 'CHECK_SIDEBAR_STATE':
        sendResponse({
          success: true,
          data: { isOpen: sidebarState.isOpen }
        });
        break;

      case 'PING':
        sendResponse({ success: true, data: 'pong' });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Mantener el canal abierto para respuestas asíncronas
  });

  // Escuchar atajos de teclado
  document.addEventListener('keydown', (event) => {
    // Alt + Shift + K para toggle del sidebar
    if (event.altKey && event.shiftKey && event.key === 'K') {
      event.preventDefault();
      toggleSidebar();
    }
  });

  // Función para insertar prompt en ChatGPT
  function insertPromptInTextarea(prompt) {
    // Buscar el textarea de ChatGPT
    const textarea = document.querySelector('#prompt-textarea') ||
                    document.querySelector('textarea[placeholder*="Message"]') ||
                    document.querySelector('textarea[data-id="root"]') ||
                    document.querySelector('[contenteditable="true"]');

    if (textarea) {
      // Si es un textarea normal
      if (textarea.tagName === 'TEXTAREA') {
        textarea.value = prompt;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
      }
      // Si es un div contenteditable (como ChatGPT)
      else if (textarea.contentEditable === 'true') {
        textarea.textContent = prompt;

        // Disparar eventos para que ChatGPT detecte el cambio
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('focus', { bubbles: true }));

        // Poner el cursor al final
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(textarea);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        textarea.focus();
      }

      console.log('Prompt insertado en ChatGPT');
    } else {
      console.warn('No se encontró el textarea de ChatGPT');
    }
  }

  // Cleanup al descargar
  window.addEventListener('unload', () => {
    if (sidebarState.container) {
      sidebarState.container.remove();
    }
    if (sidebarState.floatingButton) {
      sidebarState.floatingButton.remove();
    }
    document.body.style.marginRight = '0';
  });

  // Inicializar
  function init() {
    console.log('Kit IA Emprendedor content script loaded');

    // Prevenir inyecciones duplicadas
    if (document.getElementById('kitia-sidebar-container')) {
      console.warn('Sidebar already injected, skipping initialization');
      return;
    }

    // Crear botón flotante
    createFloatingButton();
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
