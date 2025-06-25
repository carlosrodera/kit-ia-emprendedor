// Sidebar JavaScript para Kit IA Emprendedor
(function() {
  'use strict';

  // Estado del sidebar
  const state = {
    currentTab: 'all',
    currentView: 'grid', // 'grid' o 'list'
    gpts: [],
    favorites: [],
    recentGpts: [],
    prompts: [],
    searchQuery: '',
    isMinimized: false,
    allCategories: []
  };

  // Elementos DOM
  let elements = {};

  document.addEventListener('DOMContentLoaded', function() {
    console.log('Sidebar loaded');
    
    // Cachear elementos DOM
    elements = {
      closeBtn: document.getElementById('close-sidebar-btn'),
      minimizeBtn: document.getElementById('minimize-btn'),
      searchInput: document.getElementById('search-input'),
      content: document.getElementById('sidebar-content'),
      tabs: document.querySelectorAll('.tab'),
      viewBtns: document.querySelectorAll('.view-btn'),
      resizeHandle: document.getElementById('resize-handle')
    };

    // Event listeners
    setupEventListeners();
    
    // Cargar datos iniciales
    loadInitialData();
    
    // Configurar resize
    setupResize();
  });

  function setupEventListeners() {
    // Botón cerrar
    if (elements.closeBtn) {
      elements.closeBtn.addEventListener('click', closeSidebar);
    }

    // Botón minimizar
    if (elements.minimizeBtn) {
      elements.minimizeBtn.addEventListener('click', toggleMinimize);
    }

    // Búsqueda
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', handleSearch);
    }

    // Tabs
    elements.tabs.forEach(tab => {
      tab.addEventListener('click', handleTabClick);
    });
    
    // View toggle
    elements.viewBtns.forEach(btn => {
      btn.addEventListener('click', handleViewToggle);
    });
  }

  function closeSidebar() {
    window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
  }

  function toggleMinimize() {
    state.isMinimized = !state.isMinimized;
    // TODO: Implementar minimización visual
  }

  function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    renderContent();
  }

  function handleTabClick(e) {
    const tab = e.currentTarget.dataset.tab;
    state.currentTab = tab;
    
    // Actualizar clases activas
    elements.tabs.forEach(t => t.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    renderContent();
  }
  
  function handleViewToggle(e) {
    const view = e.currentTarget.dataset.view;
    state.currentView = view;
    
    // Actualizar clases activas
    elements.viewBtns.forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    renderContent();
  }

  async function loadInitialData() {
    try {
      // Cargar GPTs
      const gptsResponse = await chrome.runtime.sendMessage({ type: 'GET_GPTS' });
      if (gptsResponse?.success) {
        state.gpts = gptsResponse.data || [];
        // Extraer categorías únicas
        state.allCategories = [...new Set(state.gpts.map(g => g.category))].sort();
      }

      // Cargar favoritos
      const favResponse = await chrome.runtime.sendMessage({ type: 'GET_FAVORITES' });
      if (favResponse?.success) {
        state.favorites = favResponse.data || [];
      }

      // Cargar prompts
      const promptsResponse = await chrome.runtime.sendMessage({ type: 'GET_PROMPTS' });
      if (promptsResponse?.success) {
        state.prompts = promptsResponse.data || [];
      }

      renderContent();
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    }
  }

  function renderContent() {
    let content = '';
    let items = [];

    // Filtrar según tab activa
    switch (state.currentTab) {
      case 'all':
        items = state.gpts;
        break;
      case 'favorites':
        items = state.gpts.filter(gpt => state.favorites.includes(gpt.id));
        break;
      case 'recent':
        items = state.recentGpts;
        break;
      case 'prompts':
        renderPrompts();
        return;
    }

    // Aplicar búsqueda
    if (state.searchQuery) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(state.searchQuery) ||
        item.description.toLowerCase().includes(state.searchQuery) ||
        item.category.toLowerCase().includes(state.searchQuery) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(state.searchQuery)))
      );
    }

    // Renderizar GPTs
    if (items.length === 0) {
      content = `
        <div class="empty-state">
          <p>${state.searchQuery ? 'No se encontraron resultados' : 'No hay elementos para mostrar'}</p>
        </div>
      `;
    } else {
      // Agrupar por categorías
      const grouped = groupByCategory(items);
      const containerClass = state.currentView === 'grid' ? 'gpt-grid' : 'gpt-list';
      
      content = Object.entries(grouped).map(([category, gpts]) => `
        <div class="category-section">
          <h3 class="category-title">${category}</h3>
          <div class="${containerClass}">
            ${gpts.map(gpt => renderGPTCard(gpt)).join('')}
          </div>
        </div>
      `).join('');
    }

    elements.content.innerHTML = content;
    
    // Añadir event listeners a las tarjetas
    setupCardListeners();
  }

  function groupByCategory(items) {
    const grouped = {};
    items.forEach(item => {
      const category = item.category || 'Sin categoría';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }

  function renderGPTCard(gpt) {
    const isFavorite = state.favorites.includes(gpt.id);
    const isListView = state.currentView === 'list';
    
    if (isListView) {
      return `
        <div class="gpt-list-item" data-gpt-id="${gpt.id}">
          <div class="gpt-list-icon">${gpt.icon || '🤖'}</div>
          <div class="gpt-list-content">
            <div class="gpt-list-header">
              <h4 class="gpt-list-name">${gpt.name}</h4>
              ${gpt.official ? '<span class="official-badge-small">Oficial</span>' : ''}
            </div>
            <p class="gpt-list-description">${gpt.description}</p>
            ${gpt.tags ? `<div class="gpt-tags-small">${gpt.tags.map(tag => `<span class="tag-small">${tag}</span>`).join('')}</div>` : ''}
          </div>
          <div class="gpt-list-actions">
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}" title="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
              <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" width="16" height="16">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="action-btn-icon primary" data-action="use" data-gpt-id="${gpt.id}" title="Abrir en esta pestaña">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="action-btn-icon secondary" data-action="open-new" data-gpt-id="${gpt.id}" title="Abrir en nueva pestaña">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M15 3H21V9M21 3L9 15M10 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H17C18.1046 19 19 18.1046 19 17V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }
    
    // Vista de tarjetas (grid)
    return `
      <div class="gpt-card" data-gpt-id="${gpt.id}">
        <div class="gpt-header">
          <div class="gpt-icon">${gpt.icon || '🤖'}</div>
          <div class="gpt-badges">
            ${gpt.official ? '<span class="official-badge">Oficial</span>' : ''}
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}" title="${isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
              <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" width="18" height="18">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <h3 class="gpt-name">${gpt.name}</h3>
        <p class="gpt-description">${gpt.description}</p>
        ${gpt.tags ? `<div class="gpt-tags">${gpt.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        <div class="gpt-actions">
          <button class="action-btn primary" data-action="use" data-gpt-id="${gpt.id}" title="Abrir en esta pestaña">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Usar
          </button>
          <button class="action-btn secondary" data-action="open-new" data-gpt-id="${gpt.id}" title="Abrir en nueva pestaña">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M15 3H21V9M21 3L9 15M10 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H17C18.1046 19 19 18.1046 19 17V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function renderPrompts() {
    let content = '';
    
    if (state.prompts.length === 0) {
      content = `
        <div class="empty-state">
          <p>No tienes prompts guardados</p>
          <button class="action-btn primary" id="create-prompt-btn">
            Crear Prompt
          </button>
        </div>
      `;
    } else {
      content = `
        <div class="prompts-header">
          <button class="action-btn primary" id="create-prompt-btn">
            + Nuevo Prompt
          </button>
        </div>
        <div class="prompts-list">
          ${state.prompts.map(prompt => renderPromptCard(prompt)).join('')}
        </div>
      `;
    }

    elements.content.innerHTML = content;
    
    // Event listener para crear prompt
    const createBtn = document.getElementById('create-prompt-btn');
    if (createBtn) {
      createBtn.addEventListener('click', createPrompt);
    }
    
    setupPromptListeners();
  }

  function renderPromptCard(prompt) {
    return `
      <div class="prompt-card" data-prompt-id="${prompt.id}">
        <h4 class="prompt-title">${prompt.title}</h4>
        <p class="prompt-preview">${prompt.content.substring(0, 150)}...</p>
        <div class="prompt-footer">
          <span class="prompt-date">${formatDate(prompt.createdAt)}</span>
          <div class="prompt-actions">
            <button class="icon-btn small" data-action="edit" data-prompt-id="${prompt.id}">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13" stroke="currentColor" stroke-width="2"/>
                <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="icon-btn small" data-action="copy" data-prompt-id="${prompt.id}">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
            <button class="icon-btn small" data-action="delete" data-prompt-id="${prompt.id}">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M4 7H20M10 11V17M14 11V17M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7M9 7V4C9 2.89543 9.89543 2 11 2H13C14.1046 2 15 2.89543 15 4V7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function setupCardListeners() {
    // Favoritos
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', toggleFavorite);
    });

    // Acciones de GPT
    document.querySelectorAll('.action-btn[data-action], .action-btn-icon[data-action]').forEach(btn => {
      btn.addEventListener('click', handleGPTAction);
    });
  }

  function setupPromptListeners() {
    document.querySelectorAll('.icon-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', handlePromptAction);
    });
  }

  async function toggleFavorite(e) {
    e.stopPropagation();
    const gptId = e.currentTarget.dataset.gptId;
    
    if (!gptId) {
      console.error('No GPT ID found');
      return;
    }
    
    const isFavorite = state.favorites.includes(gptId);
    
    try {
      let response;
      if (isFavorite) {
        response = await chrome.runtime.sendMessage({ 
          type: 'REMOVE_FAVORITE', 
          data: { gptId } 
        });
        if (response?.success) {
          state.favorites = state.favorites.filter(id => id !== gptId);
        }
      } else {
        response = await chrome.runtime.sendMessage({ 
          type: 'ADD_FAVORITE', 
          data: { gptId } 
        });
        if (response?.success) {
          state.favorites.push(gptId);
        }
      }
      
      if (response?.success) {
        renderContent();
        showToast(isFavorite ? 'Eliminado de favoritos' : 'Añadido a favoritos', 'success');
      } else {
        console.error('Error in response:', response?.error);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  async function handleGPTAction(e) {
    const action = e.currentTarget.dataset.action;
    const gptId = e.currentTarget.dataset.gptId;
    const gpt = state.gpts.find(g => g.id === gptId);
    
    if (!gpt || !gpt.url) {
      showToast('URL del GPT no disponible', 'error');
      return;
    }
    
    switch (action) {
      case 'use':
        // Abrir GPT en la pestaña actual
        openGPT(gpt.url, gpt.name, false);
        break;
        
      case 'open-new':
        // Abrir GPT en nueva pestaña
        openGPT(gpt.url, gpt.name, true);
        break;
    }
  }

  function openGPT(url, name, newTab = true) {
    // Añadir a recientes
    addToRecent(url, name);
    
    if (newTab) {
      // Abrir en nueva pestaña
      window.parent.postMessage({ 
        type: 'OPEN_URL', 
        data: { url } 
      }, '*');
      showToast(`Abriendo ${name} en nueva pestaña...`);
    } else {
      // Navegar en la pestaña actual
      window.parent.postMessage({ 
        type: 'NAVIGATE_URL', 
        data: { url } 
      }, '*');
      showToast(`Navegando a ${name}...`);
    }
  }
  
  function addToRecent(url, name) {
    // Implementar lógica para añadir a recientes
    // Por ahora solo log
    console.log('Adding to recent:', name);
  }

  async function handlePromptAction(e) {
    const action = e.currentTarget.dataset.action;
    const promptId = e.currentTarget.dataset.promptId;
    const prompt = state.prompts.find(p => p.id === promptId);
    
    if (!prompt) return;
    
    switch (action) {
      case 'edit':
        editPrompt(prompt);
        break;
        
      case 'copy':
        try {
          await navigator.clipboard.writeText(prompt.content);
          showToast('Prompt copiado al portapapeles', 'success');
        } catch (error) {
          fallbackCopyToClipboard(prompt.content);
          showToast('Prompt copiado al portapapeles', 'success');
        }
        break;
        
      case 'delete':
        if (confirm('¿Estás seguro de eliminar este prompt?')) {
          await deletePrompt(promptId);
        }
        break;
    }
  }

  function createPrompt() {
    const modal = createPromptModal();
    document.body.appendChild(modal);
    
    // Focus en el primer input
    setTimeout(() => {
      const titleInput = modal.querySelector('#prompt-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }
  
  function createPromptModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Crear Nuevo Prompt</h3>
          <button class="modal-close" id="modal-close-btn">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="prompt-title">Título del Prompt</label>
            <input type="text" id="prompt-title" placeholder="Ej: Asistente de Marketing" maxlength="100">
          </div>
          <div class="form-group">
            <label for="prompt-content">Contenido del Prompt</label>
            <textarea id="prompt-content" rows="10" placeholder="Escribe tu prompt aquí..." maxlength="20000"></textarea>
            <small class="char-counter">0/20000 caracteres</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" id="modal-cancel-btn">Cancelar</button>
          <button class="btn primary" id="modal-save-btn">Guardar Prompt</button>
        </div>
      </div>
    `;
    
    // Añadir event listeners a los botones
    const closeBtn = modal.querySelector('#modal-close-btn');
    const cancelBtn = modal.querySelector('#modal-cancel-btn');
    const saveBtn = modal.querySelector('#modal-save-btn');
    
    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());
    saveBtn.addEventListener('click', () => saveNewPrompt(modal));
    
    // Añadir event listener para el contador de caracteres
    const textarea = modal.querySelector('#prompt-content');
    const counter = modal.querySelector('.char-counter');
    textarea.addEventListener('input', () => {
      counter.textContent = `${textarea.value.length}/20000 caracteres`;
    });
    
    // Cerrar con Escape
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      }
    });
    
    return modal;
  }
  
  async function saveNewPrompt(modal) {
    const title = modal.querySelector('#prompt-title').value.trim();
    const content = modal.querySelector('#prompt-content').value.trim();
    
    if (!title || !content) {
      showToast('Por favor completa todos los campos', 'warning');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PROMPT',
        data: { title, content }
      });
      
      if (response?.success) {
        state.prompts.push(response.data);
        modal.remove();
        
        // Si estamos en la tab de prompts, actualizar vista
        if (state.currentTab === 'prompts') {
          renderContent();
        }
        
        showToast('Prompt guardado exitosamente', 'success');
      } else {
        showToast('Error al guardar el prompt', 'error');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      showToast('Error al guardar el prompt', 'error');
    }
  }

  function editPrompt(prompt) {
    const modalOverlay = createEditModal(prompt);
    document.body.appendChild(modalOverlay);
    
    // Focus en el campo de título después de un breve delay
    setTimeout(() => {
      const titleInput = modalOverlay.querySelector('#prompt-title');
      if (titleInput) titleInput.focus();
    }, 100);
  }
  
  function createEditModal(prompt) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>Editar Prompt</h3>
          <button class="modal-close" id="modal-close-btn">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="prompt-title">Título del Prompt</label>
            <input type="text" id="prompt-title" placeholder="Ej: Asistente de Marketing" maxlength="100" value="${prompt.title || ''}">
          </div>
          <div class="form-group">
            <label for="prompt-content">Contenido del Prompt</label>
            <textarea id="prompt-content" rows="10" placeholder="Escribe tu prompt aquí..." maxlength="20000">${prompt.content || ''}</textarea>
            <small class="char-counter">${(prompt.content || '').length}/20000 caracteres</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" id="modal-cancel-btn">Cancelar</button>
          <button class="btn primary" id="modal-save-btn">Actualizar Prompt</button>
        </div>
      </div>
    `;
    
    // Event listeners
    const closeBtn = modal.querySelector('#modal-close-btn');
    const cancelBtn = modal.querySelector('#modal-cancel-btn');
    const saveBtn = modal.querySelector('#modal-save-btn');
    
    closeBtn.addEventListener('click', () => modal.remove());
    cancelBtn.addEventListener('click', () => modal.remove());
    saveBtn.addEventListener('click', () => updatePrompt(prompt, modal));
    
    // Character counter
    const contentTextarea = modal.querySelector('#prompt-content');
    const charCounter = modal.querySelector('.char-counter');
    contentTextarea.addEventListener('input', () => {
      charCounter.textContent = `${contentTextarea.value.length}/20000 caracteres`;
    });
    
    // ESC key to close
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.remove();
    });
    
    return modal;
  }
  
  async function updatePrompt(originalPrompt, modal) {
    const title = modal.querySelector('#prompt-title').value.trim();
    const content = modal.querySelector('#prompt-content').value.trim();
    
    if (!title || !content) {
      showToast('Por favor completa todos los campos', 'warning');
      return;
    }
    
    try {
      const index = state.prompts.findIndex(p => p.id === originalPrompt.id);
      if (index > -1) {
        // Actualizar en el estado local
        state.prompts[index] = {
          ...state.prompts[index],
          title,
          content,
          updatedAt: Date.now()
        };
        
        // Enviar mensaje al service worker
        const response = await chrome.runtime.sendMessage({
          type: 'UPDATE_PROMPT',
          data: {
            id: originalPrompt.id,
            title,
            content
          }
        });
        
        if (response?.success) {
          modal.remove();
          if (state.currentTab === 'prompts') {
            renderContent();
          }
          showToast('Prompt actualizado exitosamente', 'success');
        } else {
          showToast('Error al actualizar el prompt', 'error');
        }
      }
    } catch (error) {
      console.error('Error updating prompt:', error);
      showToast('Error al actualizar el prompt', 'error');
    }
  }

  async function deletePrompt(promptId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_PROMPT',
        data: { id: promptId }
      });
      
      if (response?.success) {
        state.prompts = state.prompts.filter(p => p.id !== promptId);
        renderContent();
        showToast('Prompt eliminado', 'success');
      }
    } catch (error) {
      console.error('Error eliminando prompt:', error);
      showError('Error al eliminar el prompt');
    }
  }
  
  function fallbackCopyToClipboard(text) {
    // Fallback para cuando clipboard API está bloqueada
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    
    document.body.removeChild(textArea);
  }

  // Sistema de notificaciones mejorado
  let notificationId = 0;
  const activeNotifications = new Map();
  
  function initNotifications() {
    if (!document.getElementById('notifications-container')) {
      const container = document.createElement('div');
      container.id = 'notifications-container';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 400px;
      `;
      document.body.appendChild(container);
    }
  }
  
  function showToast(message, type = 'info', duration = 3000) {
    initNotifications();
    const container = document.getElementById('notifications-container');
    const id = ++notificationId;
    
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.id = `notification-${id}`;
    
    // Iconos según tipo
    const icons = {
      success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
      error: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
      warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
      info: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
    };
    
    // Estilos
    notification.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transform: translateX(120%);
      transition: all 0.3s ease;
      pointer-events: auto;
      min-width: 280px;
      max-width: 100%;
    `;
    
    // Contenido
    notification.innerHTML = `
      <div class="notification-icon" style="flex-shrink: 0; width: 20px; height: 20px; color: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#4F46E5'}">
        ${icons[type]}
      </div>
      <div class="notification-content" style="flex: 1; font-size: 14px; line-height: 1.4; color: var(--text-primary);">
        ${message}
      </div>
      <button class="notification-close" style="flex-shrink: 0; width: 20px; height: 20px; padding: 0; background: none; border: none; cursor: pointer; color: var(--text-secondary); opacity: 0.7;">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;
    
    // Agregar al contenedor
    container.appendChild(notification);
    activeNotifications.set(id, notification);
    
    // Animar entrada
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    // Event listener para cerrar
    notification.querySelector('.notification-close').addEventListener('click', () => {
      hideNotification(id);
    });
    
    // Auto-cerrar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => hideNotification(id), duration);
    }
    
    return id;
  }
  
  function hideNotification(id) {
    const notification = activeNotifications.get(id);
    if (!notification) return;
    
    // Animar salida
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    
    // Remover después de la animación
    setTimeout(() => {
      notification.remove();
      activeNotifications.delete(id);
    }, 300);
  }

  function showError(message) {
    elements.content.innerHTML = `
      <div class="error-state">
        <p>${message}</p>
        <button class="action-btn primary" onclick="location.reload()">
          Reintentar
        </button>
      </div>
    `;
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  // Configurar resize del sidebar
  function setupResize() {
    if (!elements.resizeHandle) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 480; // Width por defecto
    
    elements.resizeHandle.addEventListener('mousedown', initResize);
    
    function initResize(e) {
      isResizing = true;
      startX = e.clientX;
      
      // Usar width actual del iframe en lugar de acceder al parent
      startWidth = parseInt(getComputedStyle(document.documentElement).width, 10) || 480;
      
      elements.resizeHandle.classList.add('dragging');
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
      
      // Prevenir selección de texto mientras arrastra
      e.preventDefault();
    }
    
    function doResize(e) {
      if (!isResizing) return;
      
      const diff = startX - e.clientX;
      const newWidth = Math.min(Math.max(startWidth + diff, 320), 600);
      
      // Enviar mensaje al parent para actualizar el ancho
      try {
        window.parent.postMessage({
          type: 'RESIZE_SIDEBAR',
          data: { width: newWidth }
        }, '*');
      } catch (error) {
        console.warn('Cross-origin resize blocked, using fallback');
        // Fallback: cambiar el width del iframe directamente
        document.documentElement.style.width = newWidth + 'px';
      }
    }
    
    function stopResize() {
      isResizing = false;
      elements.resizeHandle.classList.remove('dragging');
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    }
  }

  // Añadir estilos adicionales
  addStyles();

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Categorías */
      .category-section {
        margin-bottom: 32px;
      }
      
      .category-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 16px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-color);
      }
      
      /* Grid de GPTs */
      .gpt-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
      }
      
      .gpt-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s;
        cursor: pointer;
      }
      
      .gpt-card:hover {
        background: var(--bg-hover);
        border-color: #404040;
      }
      
      .gpt-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      
      .gpt-icon {
        font-size: 32px;
        width: 48px;
        height: 48px;
        background: var(--bg-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .favorite-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: var(--text-secondary);
        transition: all 0.2s;
      }
      
      .favorite-btn:hover,
      .favorite-btn.active {
        color: #FCD34D;
      }
      
      .favorite-btn svg {
        width: 20px;
        height: 20px;
      }
      
      .gpt-name {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }
      
      .gpt-description {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 0 12px 0;
        line-height: 1.4;
      }
      
      .gpt-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      
      .tag {
        font-size: 11px;
        padding: 2px 8px;
        background: var(--bg-primary);
        color: var(--text-secondary);
        border-radius: 4px;
      }
      
      .gpt-actions {
        display: flex;
        gap: 8px;
      }
      
      .action-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      
      .action-btn.primary {
        background: var(--accent-color);
        color: white;
        flex: 1;
      }
      
      .action-btn.primary:hover {
        background: var(--accent-hover);
      }
      
      .action-btn.secondary {
        background: var(--bg-hover);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }
      
      .action-btn.secondary:hover {
        background: var(--border-color);
      }
      
      /* Lista de GPTs */
      .gpt-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .gpt-list-item {
        display: flex;
        align-items: center;
        padding: 12px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        transition: all 0.2s;
        gap: 12px;
      }
      
      .gpt-list-item:hover {
        background: var(--bg-hover);
        border-color: #404040;
      }
      
      .gpt-list-icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        background: var(--bg-primary);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .gpt-list-content {
        flex: 1;
        min-width: 0;
      }
      
      .gpt-list-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      
      .gpt-list-name {
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        color: var(--text-primary);
      }
      
      .gpt-list-description {
        font-size: 12px;
        color: var(--text-secondary);
        margin: 0;
        line-height: 1.3;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .gpt-tags-small {
        display: flex;
        gap: 4px;
        margin-top: 4px;
      }
      
      .tag-small {
        font-size: 10px;
        padding: 1px 6px;
        background: var(--bg-primary);
        color: var(--text-secondary);
        border-radius: 3px;
      }
      
      .gpt-list-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      }
      
      .action-btn-icon {
        padding: 6px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        background: none;
        color: var(--text-secondary);
      }
      
      .action-btn-icon:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      
      .action-btn-icon.primary {
        color: var(--accent-color);
      }
      
      .action-btn-icon.primary:hover {
        background: var(--accent-color);
        color: white;
      }
      
      /* Badges */
      .gpt-badges {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .official-badge {
        background: var(--success-color);
        color: white;
        font-size: 10px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
      }
      
      .official-badge-small {
        background: var(--success-color);
        color: white;
        font-size: 9px;
        font-weight: 600;
        padding: 1px 4px;
        border-radius: 3px;
        text-transform: uppercase;
      }
      
      /* Prompts */
      .prompts-header {
        margin-bottom: 16px;
      }
      
      .prompts-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .prompt-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s;
      }
      
      .prompt-card:hover {
        background: var(--bg-hover);
      }
      
      .prompt-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }
      
      .prompt-preview {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0 0 12px 0;
        line-height: 1.4;
      }
      
      .prompt-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .prompt-date {
        font-size: 12px;
        color: var(--text-secondary);
      }
      
      .prompt-actions {
        display: flex;
        gap: 4px;
      }
      
      .icon-btn.small {
        padding: 4px;
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .icon-btn.small:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      
      /* Modal */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }
      
      .modal {
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        max-height: 80vh;
        overflow: hidden;
        animation: slideInModal 0.2s ease;
      }
      
      .modal-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--bg-secondary);
      }
      
      .modal-header h3 {
        margin: 0;
        font-size: 16px;
        color: var(--text-primary);
      }
      
      .modal-close {
        background: none;
        border: none;
        color: var(--text-secondary);
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .modal-close:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
      
      .modal-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }
      
      .form-group {
        margin-bottom: 16px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: var(--text-primary);
        font-size: 14px;
      }
      
      .form-group input,
      .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-primary);
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s;
        resize: vertical;
      }
      
      .form-group input:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--accent-color);
      }
      
      .char-counter {
        display: block;
        margin-top: 4px;
        font-size: 12px;
        color: var(--text-secondary);
        text-align: right;
      }
      
      .modal-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background: var(--bg-secondary);
      }
      
      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .btn.primary {
        background: var(--accent-color);
        color: white;
      }
      
      .btn.primary:hover {
        background: var(--accent-hover);
      }
      
      .btn.secondary {
        background: var(--bg-hover);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }
      
      .btn.secondary:hover {
        background: var(--border-color);
      }
      
      /* Estados vacíos */
      .empty-state,
      .error-state,
      .loading-state {
        text-align: center;
        padding: 48px 24px;
        color: var(--text-secondary);
      }
      
      .empty-state .action-btn {
        margin-top: 16px;
      }
      
      /* Toast animations */
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        to {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideInModal {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(-20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

})();