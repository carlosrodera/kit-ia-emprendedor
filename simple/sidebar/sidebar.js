// Sidebar JavaScript seguro para Kit IA Emprendedor
(function() {
  'use strict';

  // Estado del sidebar
  const state = {
    currentTab: 'all',
    currentView: 'grid',
    currentCategory: 'all',
    currentTags: [],
    gpts: [],
    favorites: [],
    recentGpts: [],
    prompts: [],
    searchQuery: '',
    isMinimized: false,
    allCategories: [],
    allTags: [],
    filterDropdownOpen: false,
    notifications: []
  };

  // Elementos DOM
  let elements = {};

  document.addEventListener('DOMContentLoaded', function() {
    console.log('Secure sidebar loaded');
    
    // Cachear elementos DOM
    elements = {
      closeBtn: document.getElementById('close-sidebar-btn'),
      minimizeBtn: document.getElementById('minimize-btn'),
      searchInput: document.getElementById('search-input'),
      content: document.getElementById('sidebar-content'),
      tabs: document.querySelectorAll('.tab'),
      viewBtns: document.querySelectorAll('.view-btn'),
      resizeHandle: document.getElementById('resize-handle'),
      filterToggle: document.getElementById('filter-toggle'),
      filterDropdown: document.getElementById('filter-dropdown'),
      filterContent: document.getElementById('filter-content'),
      activeFiltersCount: document.getElementById('active-filters-count'),
      notificationsBtn: document.getElementById('notifications-btn'),
      notificationsBadge: document.getElementById('notifications-badge')
    };

    // Event listeners
    setupEventListeners();
    
    // Verificar dispositivo antes de cargar datos
    checkDeviceAuthorization();
    
    // Configurar resize
    setupResize();
  });

  function setupEventListeners() {
    // Botón cerrar
    if (elements.closeBtn) {
      SecurityUtils.addSafeEventListener(elements.closeBtn, 'click', closeSidebar);
    }

    // Botón minimizar
    if (elements.minimizeBtn) {
      SecurityUtils.addSafeEventListener(elements.minimizeBtn, 'click', toggleMinimize);
    }

    // Búsqueda
    if (elements.searchInput) {
      SecurityUtils.addSafeEventListener(elements.searchInput, 'input', handleSearch);
    }

    // Tabs
    elements.tabs.forEach(tab => {
      SecurityUtils.addSafeEventListener(tab, 'click', handleTabClick);
    });
    
    // View toggle
    elements.viewBtns.forEach(btn => {
      SecurityUtils.addSafeEventListener(btn, 'click', handleViewToggle);
    });
    
    // Filter toggle
    if (elements.filterToggle) {
      SecurityUtils.addSafeEventListener(elements.filterToggle, 'click', toggleFilterDropdown);
    }
    
    // Notifications
    if (elements.notificationsBtn) {
      SecurityUtils.addSafeEventListener(elements.notificationsBtn, 'click', toggleNotifications);
    }
  }

  function closeSidebar() {
    window.parent.postMessage({ type: 'CLOSE_SIDEBAR' }, '*');
  }

  function toggleMinimize() {
    state.isMinimized = !state.isMinimized;
    // TODO: Implementar minimización visual
    const sidebar = document.getElementById('kit-ia-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('minimized', state.isMinimized);
    }
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

  async function checkDeviceAuthorization() {
    try {
      // Verificar autenticación y dispositivo
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      
      if (!response || !response.success) {
        showError('Error al verificar autenticación');
        return;
      }
      
      const { isAuthenticated, deviceAuthorized, deviceInfo } = response.data;
      
      if (!isAuthenticated) {
        showLoginPrompt();
        return;
      }
      
      if (!deviceAuthorized && deviceInfo) {
        // Mostrar modal de gestión de dispositivos
        showDeviceLimitModal(deviceInfo);
        return;
      }
      
      // Todo OK, cargar datos
      loadInitialData();
    } catch (error) {
      console.error('Error checking device:', error);
      showError('Error al verificar dispositivo');
    }
  }

  async function loadInitialData() {
    try {
      // Cargar GPTs
      const gptsResponse = await chrome.runtime.sendMessage({ type: 'GET_GPTS' });
      if (gptsResponse?.success) {
        // Validar datos de GPTs
        state.gpts = gptsResponse.data.filter(gpt => {
          const validation = SecurityUtils.validateGPTData(gpt);
          if (!validation.valid) {
            SecurityUtils.safeLog('warn', 'Invalid GPT data filtered out', { gpt, errors: validation.errors });
          }
          return validation.valid;
        });
        
        // Extraer categorías y tags únicos
        state.allCategories = [...new Set(state.gpts.map(g => g.category))].sort();
        state.allTags = [...new Set(state.gpts.flatMap(g => g.tags || []))].sort();
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
      
      // Añadir notificaciones de bienvenida
      if (state.notifications.length === 0) {
        addNotification('Bienvenido a Kit IA Emprendedor v0.4.3');
        addNotification('Nuevo sistema de filtros disponible');
        updateNotificationsBadge();
      }

      renderContent();
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error al cargar los datos');
    }
  }

  function renderContent() {
    // Limpiar contenido
    if (elements.content) {
      elements.content.innerHTML = '';
    } else {
      SecurityUtils.safeLog('error', 'Content element not found');
      return;
    }

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

    // Filtrar por categoría
    if (state.currentCategory !== 'all') {
      items = items.filter(item => item.category === state.currentCategory);
    }
    
    // Filtrar por tags
    if (state.currentTags.length > 0) {
      items = items.filter(item => 
        item.tags && state.currentTags.every(tag => item.tags.includes(tag))
      );
    }

    // Renderizar GPTs
    if (items.length === 0) {
      showEmptyState();
    } else {
      if (state.currentView === 'grid') {
        renderGPTGrid(items);
      } else {
        renderGPTList(items);
      }
    }
  }

  function renderGPTGrid(items) {
    const container = SecurityUtils.createElement('div', { className: 'gpt-grid' });
    
    items.forEach(gpt => {
      const card = createGPTCard(gpt);
      container.appendChild(card);
    });
    
    elements.content.appendChild(container);
    setupCardListeners();
  }

  function renderGPTList(items) {
    const container = SecurityUtils.createElement('div', { className: 'gpt-list' });
    
    items.forEach(gpt => {
      const listItem = createGPTListItem(gpt);
      container.appendChild(listItem);
    });
    
    elements.content.appendChild(container);
    setupCardListeners();
  }

  function createGPTCard(gpt) {
    const isFavorite = state.favorites.includes(gpt.id);
    
    const card = SecurityUtils.createElement('div', { 
      className: 'gpt-card',
      attributes: { 'data-gpt-id': gpt.id }
    });
    
    // Icono del GPT
    const icon = SecurityUtils.createElement('div', { 
      className: 'gpt-icon',
      textContent: gpt.icon || '🤖'
    });
    
    // Contenido
    const content = SecurityUtils.createElement('div', { className: 'gpt-content' });
    
    // Header
    const header = SecurityUtils.createElement('div', { className: 'gpt-header' });
    const title = SecurityUtils.createElement('h3', { 
      className: 'gpt-name',
      textContent: gpt.name 
    });
    header.appendChild(title);
    
    // Mostrar categoría en lugar de badge oficial
    if (gpt.category) {
      const categoryBadge = SecurityUtils.createElement('span', { 
        className: 'category-badge',
        textContent: gpt.category
      });
      header.appendChild(categoryBadge);
    }
    
    // Descripción
    const description = SecurityUtils.createElement('p', { 
      className: 'gpt-description',
      textContent: gpt.description
    });
    
    // Tags
    const tagsContainer = SecurityUtils.createElement('div', { className: 'gpt-tags' });
    if (gpt.tags && gpt.tags.length > 0) {
      gpt.tags.forEach(tag => {
        const tagElement = SecurityUtils.createElement('span', { 
          className: 'tag',
          textContent: tag
        });
        tagsContainer.appendChild(tagElement);
      });
    }
    
    // Botones de acción
    const actions = SecurityUtils.createElement('div', { className: 'gpt-actions' });
    
    // Botón favorito
    const favoriteBtn = SecurityUtils.createElement('button', { 
      className: `favorite-btn ${isFavorite ? 'active' : ''}`,
      attributes: { 
        'data-gpt-id': gpt.id,
        'title': isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
      }
    });
    
    // SVG para favorito
    const favIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    favIcon.setAttribute('viewBox', '0 0 24 24');
    favIcon.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    favIcon.setAttribute('width', '16');
    favIcon.setAttribute('height', '16');
    
    const favPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    favPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
    favPath.setAttribute('stroke', 'currentColor');
    favPath.setAttribute('stroke-width', '2');
    favPath.setAttribute('stroke-linejoin', 'round');
    
    favIcon.appendChild(favPath);
    favoriteBtn.appendChild(favIcon);
    
    // Botón usar
    const useBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn primary',
      textContent: 'Usar',
      attributes: { 
        'data-action': 'use',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en esta pestaña'
      }
    });
    
    // Botón nueva pestaña
    const newTabBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon secondary',
      attributes: { 
        'data-action': 'newtab',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en nueva pestaña'
      }
    });
    
    // SVG para nueva pestaña
    const tabIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tabIcon.setAttribute('viewBox', '0 0 24 24');
    tabIcon.setAttribute('fill', 'none');
    tabIcon.setAttribute('width', '16');
    tabIcon.setAttribute('height', '16');
    
    const tabPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tabPath.setAttribute('d', 'M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14');
    tabPath.setAttribute('stroke', 'currentColor');
    tabPath.setAttribute('stroke-width', '2');
    tabPath.setAttribute('stroke-linecap', 'round');
    tabPath.setAttribute('stroke-linejoin', 'round');
    
    tabIcon.appendChild(tabPath);
    newTabBtn.appendChild(tabIcon);
    
    // Ensamblar acciones
    actions.appendChild(favoriteBtn);
    actions.appendChild(useBtn);
    actions.appendChild(newTabBtn);
    
    // Ensamblar contenido
    content.appendChild(header);
    content.appendChild(description);
    content.appendChild(tagsContainer);
    content.appendChild(actions);
    
    // Ensamblar card
    card.appendChild(icon);
    card.appendChild(content);
    
    return card;
  }

  function createGPTListItem(gpt) {
    const isFavorite = state.favorites.includes(gpt.id);
    
    const listItem = SecurityUtils.createElement('div', { 
      className: 'gpt-list-item',
      attributes: { 'data-gpt-id': gpt.id }
    });
    
    // Icono
    const icon = SecurityUtils.createElement('div', { 
      className: 'gpt-list-icon',
      textContent: gpt.icon || '🤖'
    });
    
    // Contenido
    const content = SecurityUtils.createElement('div', { className: 'gpt-list-content' });
    
    // Header
    const header = SecurityUtils.createElement('div', { className: 'gpt-list-header' });
    const name = SecurityUtils.createElement('h4', { 
      className: 'gpt-list-name',
      textContent: gpt.name
    });
    header.appendChild(name);
    
    // Mostrar categoría en lugar de badge oficial
    if (gpt.category) {
      const categoryBadge = SecurityUtils.createElement('span', { 
        className: 'category-badge',
        textContent: gpt.category
      });
      header.appendChild(categoryBadge);
    }
    
    // Descripción
    const description = SecurityUtils.createElement('p', { 
      className: 'gpt-list-description',
      textContent: gpt.description
    });
    
    // Tags
    const tagsContainer = SecurityUtils.createElement('div', { className: 'gpt-tags-small' });
    if (gpt.tags && gpt.tags.length > 0) {
      gpt.tags.forEach(tag => {
        const tagElement = SecurityUtils.createElement('span', { 
          className: 'tag-small',
          textContent: tag
        });
        tagsContainer.appendChild(tagElement);
      });
    }
    
    // Ensamblar contenido
    content.appendChild(header);
    content.appendChild(description);
    content.appendChild(tagsContainer);
    
    // Acciones
    const actions = SecurityUtils.createElement('div', { className: 'gpt-list-actions' });
    
    // Botón favorito
    const favoriteBtn = SecurityUtils.createElement('button', { 
      className: `favorite-btn ${isFavorite ? 'active' : ''}`,
      attributes: { 
        'data-gpt-id': gpt.id,
        'title': isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
      }
    });
    
    // SVG favorito (igual que antes)
    const favIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    favIcon.setAttribute('viewBox', '0 0 24 24');
    favIcon.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
    favIcon.setAttribute('width', '16');
    favIcon.setAttribute('height', '16');
    
    const favPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    favPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
    favPath.setAttribute('stroke', 'currentColor');
    favPath.setAttribute('stroke-width', '2');
    favPath.setAttribute('stroke-linejoin', 'round');
    
    favIcon.appendChild(favPath);
    favoriteBtn.appendChild(favIcon);
    
    // Botón usar
    const useBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon primary',
      attributes: { 
        'data-action': 'use',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en esta pestaña'
      }
    });
    
    // SVG usar
    const useIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    useIcon.setAttribute('viewBox', '0 0 24 24');
    useIcon.setAttribute('fill', 'none');
    useIcon.setAttribute('width', '16');
    useIcon.setAttribute('height', '16');
    
    const usePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    usePath.setAttribute('d', 'M5 12H19M19 12L12 5M19 12L12 19');
    usePath.setAttribute('stroke', 'currentColor');
    usePath.setAttribute('stroke-width', '2');
    usePath.setAttribute('stroke-linecap', 'round');
    usePath.setAttribute('stroke-linejoin', 'round');
    
    useIcon.appendChild(usePath);
    useBtn.appendChild(useIcon);
    
    // Botón nueva pestaña
    const newTabBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon secondary',
      attributes: { 
        'data-action': 'newtab',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en nueva pestaña'
      }
    });
    
    // SVG nueva pestaña (igual que antes)
    const tabIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tabIcon.setAttribute('viewBox', '0 0 24 24');
    tabIcon.setAttribute('fill', 'none');
    tabIcon.setAttribute('width', '16');
    tabIcon.setAttribute('height', '16');
    
    const tabPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tabPath.setAttribute('d', 'M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14');
    tabPath.setAttribute('stroke', 'currentColor');
    tabPath.setAttribute('stroke-width', '2');
    tabPath.setAttribute('stroke-linecap', 'round');
    tabPath.setAttribute('stroke-linejoin', 'round');
    
    tabIcon.appendChild(tabPath);
    newTabBtn.appendChild(tabIcon);
    
    // Ensamblar acciones
    actions.appendChild(favoriteBtn);
    actions.appendChild(useBtn);
    actions.appendChild(newTabBtn);
    
    // Ensamblar item
    listItem.appendChild(icon);
    listItem.appendChild(content);
    listItem.appendChild(actions);
    
    return listItem;
  }

  function showEmptyState() {
    const emptyDiv = SecurityUtils.createElement('div', { className: 'empty-state' });
    
    const icon = SecurityUtils.createElement('div', { 
      className: 'empty-icon',
      textContent: '🔍'
    });
    
    const title = SecurityUtils.createElement('h3', { 
      className: 'empty-title',
      textContent: 'No se encontraron resultados'
    });
    
    const description = SecurityUtils.createElement('p', { 
      className: 'empty-description',
      textContent: 'Intenta ajustar tu búsqueda o filtros'
    });
    
    emptyDiv.appendChild(icon);
    emptyDiv.appendChild(title);
    emptyDiv.appendChild(description);
    
    elements.content.appendChild(emptyDiv);
  }

  function renderPrompts() {
    const container = SecurityUtils.createElement('div', { className: 'prompts-container' });
    
    // Header con botón añadir
    const header = SecurityUtils.createElement('div', { className: 'prompts-header' });
    const title = SecurityUtils.createElement('h3', { 
      className: 'prompts-title',
      textContent: 'Mis Prompts'
    });
    
    const addBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn primary',
      textContent: 'Añadir Prompt',
      attributes: { 'data-action': 'add-prompt' }
    });
    
    header.appendChild(title);
    header.appendChild(addBtn);
    container.appendChild(header);
    
    // Lista de prompts
    if (state.prompts.length === 0) {
      const emptyPrompts = SecurityUtils.createElement('div', { className: 'empty-prompts' });
      const emptyText = SecurityUtils.createElement('p', { 
        textContent: 'Aún no tienes prompts guardados'
      });
      emptyPrompts.appendChild(emptyText);
      container.appendChild(emptyPrompts);
    } else {
      const promptsList = SecurityUtils.createElement('div', { className: 'prompts-list' });
      
      state.prompts.forEach(prompt => {
        const promptItem = createPromptItem(prompt);
        promptsList.appendChild(promptItem);
      });
      
      container.appendChild(promptsList);
    }
    
    elements.content.appendChild(container);
    setupPromptListeners();
  }

  function createPromptItem(prompt) {
    const item = SecurityUtils.createElement('div', { 
      className: 'prompt-item',
      attributes: { 'data-prompt-id': prompt.id }
    });
    
    const content = SecurityUtils.createElement('div', { className: 'prompt-content' });
    
    const title = SecurityUtils.createElement('h4', { 
      className: 'prompt-title',
      textContent: prompt.title
    });
    
    const description = SecurityUtils.createElement('p', { 
      className: 'prompt-description',
      textContent: prompt.content.substring(0, 100) + (prompt.content.length > 100 ? '...' : '')
    });
    
    const actions = SecurityUtils.createElement('div', { className: 'prompt-actions' });
    
    // Botón copiar
    const copyBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon secondary',
      attributes: { 
        'data-action': 'copy-prompt',
        'data-prompt-id': prompt.id,
        'title': 'Copiar prompt'
      }
    });
    
    // SVG copiar
    const copyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    copyIcon.setAttribute('viewBox', '0 0 24 24');
    copyIcon.setAttribute('fill', 'none');
    copyIcon.setAttribute('width', '16');
    copyIcon.setAttribute('height', '16');
    
    const copyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    copyPath.setAttribute('d', 'M8 5H6C4.89543 5 4 5.89543 4 7V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V7C20 5.89543 19.1046 5 18 5H16M8 5C8 6.10457 8.89543 7 10 7H14C15.1046 7 16 6.10457 16 5M8 5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5');
    copyPath.setAttribute('stroke', 'currentColor');
    copyPath.setAttribute('stroke-width', '2');
    copyPath.setAttribute('stroke-linecap', 'round');
    copyPath.setAttribute('stroke-linejoin', 'round');
    
    copyIcon.appendChild(copyPath);
    copyBtn.appendChild(copyIcon);
    
    // Botón editar
    const editBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon secondary',
      attributes: { 
        'data-action': 'edit-prompt',
        'data-prompt-id': prompt.id,
        'title': 'Editar prompt'
      }
    });
    
    // SVG editar
    const editIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    editIcon.setAttribute('viewBox', '0 0 24 24');
    editIcon.setAttribute('fill', 'none');
    editIcon.setAttribute('width', '16');
    editIcon.setAttribute('height', '16');
    
    const editPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    editPath.setAttribute('d', 'M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13M18.5 2.5C19.6046 2.5 20.5 3.39543 20.5 4.5V4.5C20.5 5.60457 19.6046 6.5 18.5 6.5L11 14V17H14L21.5 9.5L18.5 2.5Z');
    editPath.setAttribute('stroke', 'currentColor');
    editPath.setAttribute('stroke-width', '2');
    editPath.setAttribute('stroke-linecap', 'round');
    editPath.setAttribute('stroke-linejoin', 'round');
    
    editIcon.appendChild(editPath);
    editBtn.appendChild(editIcon);
    
    // Botón eliminar
    const deleteBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon danger',
      attributes: { 
        'data-action': 'delete-prompt',
        'data-prompt-id': prompt.id,
        'title': 'Eliminar prompt'
      }
    });
    
    // SVG eliminar
    const deleteIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    deleteIcon.setAttribute('viewBox', '0 0 24 24');
    deleteIcon.setAttribute('fill', 'none');
    deleteIcon.setAttribute('width', '16');
    deleteIcon.setAttribute('height', '16');
    
    const deletePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    deletePath.setAttribute('d', 'M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7M21 7H3M19 7V18C19 19.1046 18.1046 20 17 20H7C5.89543 20 5 19.1046 5 18V7H19Z');
    deletePath.setAttribute('stroke', 'currentColor');
    deletePath.setAttribute('stroke-width', '2');
    deletePath.setAttribute('stroke-linecap', 'round');
    deletePath.setAttribute('stroke-linejoin', 'round');
    
    deleteIcon.appendChild(deletePath);
    deleteBtn.appendChild(deleteIcon);
    
    // Ensamblar acciones
    actions.appendChild(copyBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    // Ensamblar contenido
    content.appendChild(title);
    content.appendChild(description);
    
    // Ensamblar item
    item.appendChild(content);
    item.appendChild(actions);
    
    return item;
  }

  function renderCategoriesAndTags() {
    const container = SecurityUtils.createElement('div', { className: 'categories-container' });
    
    // Título
    const title = SecurityUtils.createElement('h3', { 
      className: 'categories-title',
      textContent: 'Filtros'
    });
    container.appendChild(title);
    
    // Sección categorias
    const categoriesSection = SecurityUtils.createElement('div', { className: 'filter-section' });
    const catTitle = SecurityUtils.createElement('h4', { 
      className: 'filter-section-title',
      textContent: 'Categorías'
    });
    categoriesSection.appendChild(catTitle);
    
    const categoriesList = SecurityUtils.createElement('div', { className: 'filter-list' });
    
    // Opción "Todas"
    const allOption = createFilterOption('category', 'all', 'Todas las categorías', state.gpts.length);
    categoriesList.appendChild(allOption);
    
    // Categorias individuales
    state.allCategories.forEach(category => {
      const count = state.gpts.filter(gpt => gpt.category === category).length;
      const option = createFilterOption('category', category, category, count);
      categoriesList.appendChild(option);
    });
    
    categoriesSection.appendChild(categoriesList);
    container.appendChild(categoriesSection);
    
    // Sección tags
    const tagsSection = SecurityUtils.createElement('div', { className: 'filter-section' });
    const tagsTitle = SecurityUtils.createElement('h4', { 
      className: 'filter-section-title',
      textContent: 'Etiquetas'
    });
    tagsSection.appendChild(tagsTitle);
    
    const tagsList = SecurityUtils.createElement('div', { className: 'filter-list' });
    
    state.allTags.forEach(tag => {
      const count = state.gpts.filter(gpt => gpt.tags && gpt.tags.includes(tag)).length;
      const option = createFilterOption('tag', tag, tag, count);
      tagsList.appendChild(option);
    });
    
    tagsSection.appendChild(tagsList);
    container.appendChild(tagsSection);
    
    elements.content.appendChild(container);
    setupFilterListeners();
  }

  function createFilterOption(type, value, label, count) {
    const isActive = (type === 'category' && state.currentCategory === value);
    
    const option = SecurityUtils.createElement('div', { 
      className: `filter-option ${isActive ? 'active' : ''}`,
      attributes: { 
        'data-filter-type': type,
        'data-filter-value': value
      }
    });
    
    const labelEl = SecurityUtils.createElement('span', { 
      className: 'filter-label',
      textContent: label
    });
    
    const countEl = SecurityUtils.createElement('span', { 
      className: 'filter-count',
      textContent: count.toString()
    });
    
    option.appendChild(labelEl);
    option.appendChild(countEl);
    
    return option;
  }

  function setupCardListeners() {
    // Listeners para botones de GPTs
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(btn => {
      SecurityUtils.addSafeEventListener(btn, 'click', handleFavoriteClick);
    });
    
    const actionButtons = document.querySelectorAll('[data-action]');
    actionButtons.forEach(btn => {
      SecurityUtils.addSafeEventListener(btn, 'click', handleGPTAction);
    });
  }

  function setupPromptListeners() {
    const promptButtons = document.querySelectorAll('[data-action^="add-prompt"], [data-action^="copy-prompt"], [data-action^="edit-prompt"], [data-action^="delete-prompt"]');
    promptButtons.forEach(btn => {
      SecurityUtils.addSafeEventListener(btn, 'click', handlePromptAction);
    });
  }

  function setupFilterListeners() {
    const filterOptions = document.querySelectorAll('.filter-option');
    filterOptions.forEach(option => {
      SecurityUtils.addSafeEventListener(option, 'click', handleFilterClick);
    });
  }

  function handleFavoriteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const gptId = e.currentTarget.dataset.gptId;
    if (!SecurityUtils.validateId(gptId)) {
      SecurityUtils.safeLog('error', 'Invalid GPT ID in favorite click', { gptId });
      return;
    }
    
    toggleFavorite(gptId);
  }

  async function toggleFavorite(gptId) {
    try {
      const isFavorite = state.favorites.includes(gptId);
      const response = await chrome.runtime.sendMessage({
        type: isFavorite ? 'REMOVE_FAVORITE' : 'ADD_FAVORITE',
        data: { gptId }
      });
      
      if (response?.success) {
        if (isFavorite) {
          state.favorites = state.favorites.filter(id => id !== gptId);
          showNotification('Eliminado de favoritos', 'success');
          addNotification('GPT eliminado de favoritos');
        } else {
          state.favorites.push(gptId);
          showNotification('Añadido a favoritos', 'success');
          addNotification('GPT añadido a favoritos');
        }
        
        // Re-renderizar si estamos en la tab de favoritos
        if (state.currentTab === 'favorites') {
          renderContent();
        } else {
          // Solo actualizar el botón específico
          updateFavoriteButton(gptId, !isFavorite);
        }
      } else {
        showNotification('Error al actualizar favoritos', 'error');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showNotification('Error al actualizar favoritos', 'error');
    }
  }

  function updateFavoriteButton(gptId, isFavorite) {
    const buttons = document.querySelectorAll(`[data-gpt-id="${gptId}"].favorite-btn`);
    buttons.forEach(btn => {
      btn.classList.toggle('active', isFavorite);
      btn.setAttribute('title', isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos');
      
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isFavorite ? 'currentColor' : 'none');
      }
    });
  }

  function handleGPTAction(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const action = e.currentTarget.dataset.action;
    const gptId = e.currentTarget.dataset.gptId;
    
    if (!SecurityUtils.validateId(gptId)) {
      SecurityUtils.safeLog('error', 'Invalid GPT ID in action', { gptId, action });
      return;
    }
    
    const gpt = state.gpts.find(g => g.id === gptId);
    if (!gpt) {
      SecurityUtils.safeLog('error', 'GPT not found', { gptId });
      return;
    }
    
    switch (action) {
      case 'use':
        openGPT(gpt, false);
        break;
      case 'newtab':
        openGPT(gpt, true);
        break;
      default:
        SecurityUtils.safeLog('warn', 'Unknown action', { action });
    }
  }

  async function openGPT(gpt, newTab = false) {
    try {
      // Validar URL si existe
      if (gpt.url && !SecurityUtils.validateUrl(gpt.url)) {
        SecurityUtils.safeLog('error', 'Invalid GPT URL', { gpt });
        showNotification('URL del GPT inválida', 'error');
        return;
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'OPEN_GPT',
        data: { gpt, newTab }
      });
      
      if (response?.success) {
        // Añadir a recientes
        addToRecent(gpt);
        showNotification(`Abriendo ${gpt.name}`, 'success');
        addNotification(`GPT "${gpt.name}" abierto`);
        
        // Cerrar sidebar si no es nueva pestaña
        if (!newTab) {
          setTimeout(() => closeSidebar(), 500);
        }
      } else {
        showNotification('Error al abrir GPT', 'error');
      }
    } catch (error) {
      console.error('Error opening GPT:', error);
      showNotification('Error al abrir GPT', 'error');
    }
  }

  function addToRecent(gpt) {
    // Eliminar si ya existe
    state.recentGpts = state.recentGpts.filter(g => g.id !== gpt.id);
    
    // Añadir al principio
    state.recentGpts.unshift(gpt);
    
    // Mantener solo los últimos 10
    state.recentGpts = state.recentGpts.slice(0, 10);
    
    // Guardar en storage
    chrome.runtime.sendMessage({
      type: 'SAVE_RECENT',
      data: { recent: state.recentGpts }
    });
  }

  function handlePromptAction(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const action = e.currentTarget.dataset.action;
    const promptId = e.currentTarget.dataset.promptId;
    
    if (promptId && !SecurityUtils.validateId(promptId)) {
      SecurityUtils.safeLog('error', 'Invalid prompt ID', { promptId, action });
      return;
    }
    
    switch (action) {
      case 'add-prompt':
        showPromptModal();
        break;
      case 'copy-prompt':
        copyPrompt(promptId);
        break;
      case 'edit-prompt':
        editPrompt(promptId);
        break;
      case 'delete-prompt':
        deletePrompt(promptId);
        break;
      default:
        SecurityUtils.safeLog('warn', 'Unknown prompt action', { action });
    }
  }

  async function copyPrompt(promptId) {
    try {
      const prompt = state.prompts.find(p => p.id === promptId);
      if (!prompt) {
        showNotification('Prompt no encontrado', 'error');
        return;
      }
      
      const success = await SecurityUtils.copyToClipboard(prompt.content);
      
      if (success) {
        showNotification('Prompt copiado al portapapeles', 'success');
        addNotification(`Prompt "${prompt.title}" copiado`);
      } else {
        showNotification('Error al copiar prompt', 'error');
      }
    } catch (error) {
      console.error('Error copying prompt:', error);
      showNotification('Error al copiar prompt', 'error');
    }
  }

  function handleFilterClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const filterType = e.currentTarget.dataset.filterType;
    const filterValue = e.currentTarget.dataset.filterValue;
    
    if (filterType === 'category') {
      state.currentCategory = filterValue;
      
      // Actualizar clases activas
      const filterOptions = document.querySelectorAll('.filter-option[data-filter-type="category"]');
      filterOptions.forEach(option => {
        option.classList.toggle('active', option.dataset.filterValue === filterValue);
      });
      
      // Cambiar a la tab de todos para mostrar filtros
      state.currentTab = 'all';
      
      // Actualizar tab activa en UI
      elements.tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === 'all');
      });
      
      renderContent();
    }
  }

  // Usar showToast en lugar de showNotification
  function showNotification(message, type = 'info', duration = 3000) {
    return showToast(message, type, duration);
  }
  
  // Sistema de notificaciones seguro
  const notificationSystem = {
    container: null,
    activeNotifications: new Map(),
    
    init() {
      if (!this.container) {
        this.container = SecurityUtils.createElement('div', { 
          id: 'notifications-container',
          className: 'notifications-container'
        });
        document.body.appendChild(this.container);
      }
    },
    
    show(message, type = 'info', duration = 3000) {
      this.init();
      
      const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const notification = SecurityUtils.createElement('div', { 
        className: `notification notification-${type}`,
        attributes: { 'data-notification-id': id }
      });
      
      // Aplicar estilos seguros
      Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '10000',
        maxWidth: '400px',
        minWidth: '280px',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transform: 'translateX(120%)',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        opacity: '0'
      });
      
      // Icono
      const iconMap = {
        success: '✓',
        error: '⚠',
        warning: '⚠',
        info: 'i'
      };
      
      const icon = SecurityUtils.createElement('div', { 
        className: 'notification-icon',
        textContent: iconMap[type] || iconMap.info
      });
      
      Object.assign(icon.style, {
        flexShrink: '0',
        width: '20px',
        height: '20px',
        textAlign: 'center',
        fontWeight: 'bold',
        color: type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#4F46E5'
      });
      
      // Mensaje
      const content = SecurityUtils.createElement('div', { 
        className: 'notification-content',
        textContent: message
      });
      
      Object.assign(content.style, {
        flex: '1',
        fontSize: '14px',
        lineHeight: '1.4',
        color: 'var(--text-primary)'
      });
      
      // Botón cerrar
      const closeBtn = SecurityUtils.createElement('button', { 
        className: 'notification-close',
        textContent: '×'
      });
      
      Object.assign(closeBtn.style, {
        flexShrink: '0',
        width: '20px',
        height: '20px',
        padding: '0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        opacity: '0.7',
        fontSize: '16px',
        lineHeight: '1'
      });
      
      // Event listener para cerrar
      SecurityUtils.addSafeEventListener(closeBtn, 'click', () => {
        this.hide(id);
      });
      
      // Ensamblar notificación
      notification.appendChild(icon);
      notification.appendChild(content);
      notification.appendChild(closeBtn);
      
      // Añadir al contenedor
      this.container.appendChild(notification);
      this.activeNotifications.set(id, notification);
      
      // Animar entrada
      requestAnimationFrame(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
      });
      
      // Auto-cerrar
      if (duration > 0) {
        setTimeout(() => this.hide(id), duration);
      }
      
      return id;
    },
    
    hide(id) {
      const notification = this.activeNotifications.get(id);
      if (!notification) return;
      
      // Animar salida
      notification.style.transform = 'translateX(120%)';
      notification.style.opacity = '0';
      
      // Remover después de la animación
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        this.activeNotifications.delete(id);
      }, 300);
    }
  };

  function showNotification(message, type = 'info', duration = 3000) {
    return notificationSystem.show(message, type, duration);
  }

  function showError(message) {
    // Limpiar contenido actual
    if (elements.content) {
      elements.content.innerHTML = '';
    }
    
    // Crear elementos de forma segura
    const errorDiv = SecurityUtils.createElement('div', { className: 'error-state' });
    const errorText = SecurityUtils.createElement('p', { textContent: message });
    const retryBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn primary',
      textContent: 'Reintentar'
    });
    
    // Añadir event listener de forma segura
    SecurityUtils.addSafeEventListener(retryBtn, 'click', () => {
      location.reload();
    });
    
    // Construir la estructura
    errorDiv.appendChild(errorText);
    errorDiv.appendChild(retryBtn);
    
    if (elements.content) {
      elements.content.appendChild(errorDiv);
    }
  }

  function showLoginPrompt() {
    if (elements.content) {
      elements.content.innerHTML = '';
    }
    
    const loginDiv = SecurityUtils.createElement('div', { className: 'login-prompt' });
    const title = SecurityUtils.createElement('h3', { textContent: 'Iniciar Sesión' });
    const description = SecurityUtils.createElement('p', { 
      textContent: 'Necesitas iniciar sesión para acceder a tus GPTs'
    });
    
    const loginBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn primary',
      textContent: 'Iniciar Sesión'
    });
    
    SecurityUtils.addSafeEventListener(loginBtn, 'click', () => {
      chrome.runtime.sendMessage({ type: 'SHOW_LOGIN' });
    });
    
    loginDiv.appendChild(title);
    loginDiv.appendChild(description);
    loginDiv.appendChild(loginBtn);
    
    if (elements.content) {
      elements.content.appendChild(loginDiv);
    }
  }

  function showDeviceLimitModal(deviceInfo) {
    // TODO: Implementar modal de dispositivos
    showError('Límite de dispositivos alcanzado. Contacta soporte.');
  }

  function showPromptModal(promptData = null) {
    // TODO: Implementar modal de prompts
    showNotification('Funcionalidad en desarrollo', 'info');
  }

  function editPrompt(promptId) {
    const prompt = state.prompts.find(p => p.id === promptId);
    if (prompt) {
      showPromptModal(prompt);
    }
  }

  async function deletePrompt(promptId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_PROMPT',
        data: { promptId }
      });
      
      if (response?.success) {
        state.prompts = state.prompts.filter(p => p.id !== promptId);
        renderContent(); // Re-renderizar
        showNotification('Prompt eliminado', 'success');
        addNotification('Prompt eliminado correctamente');
      } else {
        showNotification('Error al eliminar prompt', 'error');
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      showNotification('Error al eliminar prompt', 'error');
    }
  }

  // Configurar redimensionamiento
  function setupResize() {
    if (!elements.resizeHandle) return;
    
    let isResizing = false;
    let startX, startWidth;
    
    SecurityUtils.addSafeEventListener(elements.resizeHandle, 'mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      
      const sidebar = document.getElementById('kit-ia-sidebar');
      if (sidebar) {
        startWidth = parseInt(window.getComputedStyle(sidebar).width, 10);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
      }
    });
    
    function handleMouseMove(e) {
      if (!isResizing) return;
      
      const sidebar = document.getElementById('kit-ia-sidebar');
      if (sidebar) {
        const width = startWidth + (startX - e.clientX);
        const minWidth = 320;
        const maxWidth = 600;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, width));
        
        sidebar.style.width = newWidth + 'px';
      }
    }
    
    function handleMouseUp() {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }

  // Funciones de utilidad
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short' 
    });
  }

  // Exportar funciones para testing/debugging
  if (typeof window !== 'undefined') {
    window.KitIASidebar = {
      state,
      renderContent,
      showNotification,
      SecurityUtils
    };
  }

})();

// Añadir estilos para notificaciones si no existen
if (!document.getElementById('kit-ia-notifications-styles')) {
  const style = document.createElement('style');
  style.id = 'kit-ia-notifications-styles';
  style.textContent = `
    .notifications-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      pointer-events: none;
    }
    
    .notification {
      pointer-events: auto;
      margin-bottom: 8px;
    }
    
    .notification:hover .notification-close {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
}
    
    items.forEach(gpt => {
      const card = createGPTListItem(gpt);
      container.appendChild(card);
    });
    
    elements.content.appendChild(container);
    setupCardListeners();
  }

  function createGPTCard(gpt) {
    const isFavorite = state.favorites.includes(gpt.id);
    
    // Crear estructura del card
    const card = SecurityUtils.createElement('div', { 
      className: 'gpt-card',
      attributes: { 'data-gpt-id': gpt.id }
    });

    // Header con icono y badges
    const header = SecurityUtils.createElement('div', { className: 'gpt-header' });
    
    const icon = SecurityUtils.createElement('div', { 
      className: 'gpt-icon',
      textContent: gpt.icon || '🤖'
    });
    
    const badges = SecurityUtils.createElement('div', { className: 'gpt-badges' });
    
    if (gpt.official) {
      const officialBadge = SecurityUtils.createElement('span', { 
        className: 'official-badge',
        textContent: 'Oficial'
      });
      badges.appendChild(officialBadge);
    }
    
    // Botón de favorito
    const favoriteBtn = SecurityUtils.createElement('button', { 
      className: `favorite-btn ${isFavorite ? 'active' : ''}`,
      attributes: { 
        'data-gpt-id': gpt.id,
        'title': isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
      }
    });
    favoriteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" width="18" height="18">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `;
    badges.appendChild(favoriteBtn);
    
    header.appendChild(icon);
    header.appendChild(badges);

    // Información del GPT
    const name = SecurityUtils.createElement('h3', { 
      className: 'gpt-name',
      textContent: gpt.name
    });
    
    const description = SecurityUtils.createElement('p', { 
      className: 'gpt-description',
      textContent: gpt.description
    });

    // Tags
    const tagsContainer = SecurityUtils.createElement('div', { className: 'gpt-tags' });
    if (gpt.tags && Array.isArray(gpt.tags)) {
      gpt.tags.forEach(tag => {
        const tagElement = SecurityUtils.createElement('span', { 
          className: 'tag',
          textContent: tag
        });
        tagsContainer.appendChild(tagElement);
      });
    }

    // Acciones
    const actions = SecurityUtils.createElement('div', { className: 'gpt-actions' });
    
    const useBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn primary',
      textContent: 'Usar',
      attributes: { 
        'data-action': 'use',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en esta pestaña'
      }
    });
    useBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Usar
    `;
    
    const newBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn secondary',
      attributes: { 
        'data-action': 'open-new',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en nueva pestaña'
      }
    });
    newBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M15 3H21V9M21 3L9 15M10 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H17C18.1046 19 19 18.1046 19 17V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    actions.appendChild(useBtn);
    actions.appendChild(newBtn);

    // Construir card completo
    card.appendChild(header);
    card.appendChild(name);
    card.appendChild(description);
    if (tagsContainer.children.length > 0) {
      card.appendChild(tagsContainer);
    }
    card.appendChild(actions);

    return card;
  }

  function createGPTListItem(gpt) {
    const isFavorite = state.favorites.includes(gpt.id);
    
    // Crear estructura del list item
    const item = SecurityUtils.createElement('div', { 
      className: 'gpt-list-item',
      attributes: { 'data-gpt-id': gpt.id }
    });

    // Icono
    const icon = SecurityUtils.createElement('div', { 
      className: 'gpt-list-icon',
      textContent: gpt.icon || '🤖'
    });

    // Contenido
    const content = SecurityUtils.createElement('div', { className: 'gpt-list-content' });
    
    const headerDiv = SecurityUtils.createElement('div', { className: 'gpt-list-header' });
    const name = SecurityUtils.createElement('h4', { 
      className: 'gpt-list-name',
      textContent: gpt.name
    });
    headerDiv.appendChild(name);
    
    if (gpt.official) {
      const badge = SecurityUtils.createElement('span', { 
        className: 'official-badge-small',
        textContent: 'Oficial'
      });
      headerDiv.appendChild(badge);
    }
    
    const description = SecurityUtils.createElement('p', { 
      className: 'gpt-list-description',
      textContent: gpt.description
    });

    content.appendChild(headerDiv);
    content.appendChild(description);

    // Tags en lista
    if (gpt.tags && Array.isArray(gpt.tags)) {
      const tagsDiv = SecurityUtils.createElement('div', { className: 'gpt-tags-small' });
      gpt.tags.forEach(tag => {
        const tagElement = SecurityUtils.createElement('span', { 
          className: 'tag-small',
          textContent: tag
        });
        tagsDiv.appendChild(tagElement);
      });
      content.appendChild(tagsDiv);
    }

    // Acciones
    const actions = SecurityUtils.createElement('div', { className: 'gpt-list-actions' });
    
    // Botón favorito
    const favoriteBtn = SecurityUtils.createElement('button', { 
      className: `favorite-btn ${isFavorite ? 'active' : ''}`,
      attributes: { 
        'data-gpt-id': gpt.id,
        'title': isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'
      }
    });
    favoriteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" width="16" height="16">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
      </svg>
    `;
    
    // Botones de acción
    const useBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon primary',
      attributes: { 
        'data-action': 'use',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en esta pestaña'
      }
    });
    useBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    const newBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn-icon secondary',
      attributes: { 
        'data-action': 'open-new',
        'data-gpt-id': gpt.id,
        'title': 'Abrir en nueva pestaña'
      }
    });
    newBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M15 3H21V9M21 3L9 15M10 5H7C5.89543 5 5 5.89543 5 7V17C5 18.1046 5.89543 19 7 19H17C18.1046 19 19 18.1046 19 17V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    actions.appendChild(favoriteBtn);
    actions.appendChild(useBtn);
    actions.appendChild(newBtn);

    // Construir item completo
    item.appendChild(icon);
    item.appendChild(content);
    item.appendChild(actions);

    return item;
  }

  function renderCategoriesAndTags() {
    elements.content.innerHTML = '';
    
    const container = SecurityUtils.createElement('div', { className: 'filters-container' });
    
    // Sección de categorías
    const categoriesSection = SecurityUtils.createElement('div', { className: 'filter-section' });
    const categoriesTitle = SecurityUtils.createElement('h3', { 
      className: 'filter-title',
      textContent: 'Categorías'
    });
    categoriesSection.appendChild(categoriesTitle);
    
    const categoriesGrid = SecurityUtils.createElement('div', { className: 'filter-grid' });
    
    // Botón "Todas las categorías"
    const allCatBtn = SecurityUtils.createElement('button', { 
      className: `filter-btn ${state.currentCategory === 'all' ? 'active' : ''}`,
      textContent: 'Todas',
      attributes: { 'data-category': 'all' }
    });
    SecurityUtils.addSafeEventListener(allCatBtn, 'click', () => {
      state.currentCategory = 'all';
      state.currentTab = 'all';
      renderContent();
    });
    categoriesGrid.appendChild(allCatBtn);
    
    // Botones de categorías
    state.allCategories.forEach(category => {
      const count = state.gpts.filter(gpt => gpt.category === category).length;
      const btn = SecurityUtils.createElement('button', { 
        className: `filter-btn ${state.currentCategory === category ? 'active' : ''}`,
        attributes: { 'data-category': category }
      });
      
      const text = SecurityUtils.createElement('span', { textContent: category });
      const badge = SecurityUtils.createElement('span', { 
        className: 'filter-count',
        textContent: count.toString()
      });
      
      btn.appendChild(text);
      btn.appendChild(badge);
      
      SecurityUtils.addSafeEventListener(btn, 'click', () => {
        state.currentCategory = category;
        state.currentTab = 'all';
        renderContent();
      });
      
      categoriesGrid.appendChild(btn);
    });
    
    categoriesSection.appendChild(categoriesGrid);
    
    // Sección de tags
    const tagsSection = SecurityUtils.createElement('div', { className: 'filter-section' });
    const tagsTitle = SecurityUtils.createElement('h3', { 
      className: 'filter-title',
      textContent: 'Etiquetas Populares'
    });
    tagsSection.appendChild(tagsTitle);
    
    const tagsGrid = SecurityUtils.createElement('div', { className: 'tags-grid' });
    
    // Contar frecuencia de tags
    const tagCounts = {};
    state.gpts.forEach(gpt => {
      if (gpt.tags && Array.isArray(gpt.tags)) {
        gpt.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    
    // Ordenar tags por frecuencia y mostrar los top 20
    const sortedTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);
    
    sortedTags.forEach(([tag, count]) => {
      const btn = SecurityUtils.createElement('button', { 
        className: 'tag-btn',
        attributes: { 'data-tag': tag }
      });
      
      const text = SecurityUtils.createElement('span', { textContent: tag });
      const badge = SecurityUtils.createElement('span', { 
        className: 'tag-count',
        textContent: count.toString()
      });
      
      btn.appendChild(text);
      btn.appendChild(badge);
      
      SecurityUtils.addSafeEventListener(btn, 'click', () => {
        // Filtrar por tag en la búsqueda
        elements.searchInput.value = tag;
        state.searchQuery = tag.toLowerCase();
        state.currentTab = 'all';
        renderContent();
      });
      
      tagsGrid.appendChild(btn);
    });
    
    tagsSection.appendChild(tagsGrid);
    
    container.appendChild(categoriesSection);
    container.appendChild(tagsSection);
    elements.content.appendChild(container);
  }

  function renderPrompts() {
    elements.content.innerHTML = '';
    
    if (state.prompts.length === 0) {
      showEmptyState('No tienes prompts guardados', 'Crear Prompt');
    } else {
      const header = SecurityUtils.createElement('div', { className: 'prompts-header' });
      const createBtn = SecurityUtils.createElement('button', { 
        className: 'action-btn primary',
        textContent: '+ Nuevo Prompt'
      });
      SecurityUtils.addSafeEventListener(createBtn, 'click', createPrompt);
      header.appendChild(createBtn);
      
      const container = SecurityUtils.createElement('div', { className: 'prompts-list' });
      
      state.prompts.forEach(prompt => {
        const card = createPromptCard(prompt);
        container.appendChild(card);
      });
      
      elements.content.appendChild(header);
      elements.content.appendChild(container);
      setupPromptListeners();
    }
  }

  function createPromptCard(prompt) {
    const card = SecurityUtils.createElement('div', { 
      className: 'prompt-card',
      attributes: { 'data-prompt-id': prompt.id }
    });

    const title = SecurityUtils.createElement('h4', { 
      className: 'prompt-title',
      textContent: prompt.title
    });
    
    // Truncar contenido de forma segura
    const previewText = prompt.content.length > 150 
      ? prompt.content.substring(0, 150) + '...'
      : prompt.content;
    
    const preview = SecurityUtils.createElement('p', { 
      className: 'prompt-preview',
      textContent: previewText
    });

    const footer = SecurityUtils.createElement('div', { className: 'prompt-footer' });
    
    const date = SecurityUtils.createElement('span', { 
      className: 'prompt-date',
      textContent: formatDate(prompt.createdAt)
    });
    
    const actions = SecurityUtils.createElement('div', { className: 'prompt-actions' });
    
    // Botón editar
    const editBtn = SecurityUtils.createElement('button', { 
      className: 'icon-btn small',
      attributes: { 
        'data-action': 'edit',
        'data-prompt-id': prompt.id
      }
    });
    editBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13" stroke="currentColor" stroke-width="2"/>
        <path d="M18.5 2.5C19.3284 1.67157 20.6716 1.67157 21.5 2.5C22.3284 3.32843 22.3284 4.67157 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    
    // Botón copiar
    const copyBtn = SecurityUtils.createElement('button', { 
      className: 'icon-btn small',
      attributes: { 
        'data-action': 'copy',
        'data-prompt-id': prompt.id
      }
    });
    copyBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
        <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    
    // Botón eliminar
    const deleteBtn = SecurityUtils.createElement('button', { 
      className: 'icon-btn small danger',
      attributes: { 
        'data-action': 'delete',
        'data-prompt-id': prompt.id
      }
    });
    deleteBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
        <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 6 21.1046 6 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    
    actions.appendChild(editBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);
    
    footer.appendChild(date);
    footer.appendChild(actions);
    
    card.appendChild(title);
    card.appendChild(preview);
    card.appendChild(footer);

    return card;
  }

  function showEmptyState(message = 'No hay elementos para mostrar', buttonText = null) {
    const emptyDiv = SecurityUtils.createElement('div', { className: 'empty-state' });
    
    const text = SecurityUtils.createElement('p', { textContent: message });
    emptyDiv.appendChild(text);
    
    if (buttonText) {
      const btn = SecurityUtils.createElement('button', { 
        className: 'action-btn primary',
        textContent: buttonText
      });
      
      if (buttonText === 'Crear Prompt') {
        SecurityUtils.addSafeEventListener(btn, 'click', createPrompt);
      }
      
      emptyDiv.appendChild(btn);
    }
    
    elements.content.appendChild(emptyDiv);
  }

  function showError(message) {
    // Limpiar contenido actual
    elements.content.innerHTML = '';
    
    // Crear elementos de forma segura
    const errorDiv = SecurityUtils.createElement('div', { className: 'error-state' });
    const errorText = SecurityUtils.createElement('p', { textContent: message });
    const retryBtn = SecurityUtils.createElement('button', { 
      className: 'action-btn primary',
      textContent: 'Reintentar'
    });
    
    // Añadir event listener de forma segura
    SecurityUtils.addSafeEventListener(retryBtn, 'click', () => {
      location.reload();
    });
    
    // Construir la estructura
    errorDiv.appendChild(errorText);
    errorDiv.appendChild(retryBtn);
    elements.content.appendChild(errorDiv);
  }

  function setupCardListeners() {
    // Event delegation para acciones de GPT
    SecurityUtils.addSafeEventListener(elements.content, 'click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      const gptId = target.dataset.gptId;
      
      if (!SecurityUtils.validateId(gptId)) {
        SecurityUtils.safeLog('warn', 'Invalid GPT ID in action', { action, gptId });
        return;
      }
      
      handleGPTAction(action, gptId);
    });
    
    // Event delegation para botones de favorito
    SecurityUtils.addSafeEventListener(elements.content, 'click', (e) => {
      if (e.target.closest('.favorite-btn')) {
        const btn = e.target.closest('.favorite-btn');
        const gptId = btn.dataset.gptId;
        
        if (!SecurityUtils.validateId(gptId)) {
          SecurityUtils.safeLog('warn', 'Invalid GPT ID in favorite', { gptId });
          return;
        }
        
        toggleFavorite(gptId);
      }
    });
  }

  function setupPromptListeners() {
    // Event delegation para acciones de prompt
    SecurityUtils.addSafeEventListener(elements.content, 'click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      const promptId = target.dataset.promptId;
      
      if (!SecurityUtils.validateId(promptId)) {
        SecurityUtils.safeLog('warn', 'Invalid prompt ID in action', { action, promptId });
        return;
      }
      
      handlePromptAction(action, promptId);
    });
  }

  async function handleGPTAction(action, gptId) {
    const gpt = state.gpts.find(g => g.id === gptId);
    if (!gpt) {
      showToast('GPT no encontrado', 'error');
      return;
    }

    if (!SecurityUtils.validateUrl(gpt.url)) {
      showToast('URL del GPT no válida', 'error');
      return;
    }

    switch (action) {
      case 'use':
        window.open(gpt.url, '_self');
        break;
      case 'open-new':
        window.open(gpt.url, '_blank', 'noopener,noreferrer');
        break;
      default:
        SecurityUtils.safeLog('warn', 'Unknown GPT action', { action, gptId });
    }
  }

  async function handlePromptAction(action, promptId) {
    const prompt = state.prompts.find(p => p.id === promptId);
    if (!prompt) {
      showToast('Prompt no encontrado', 'error');
      return;
    }

    switch (action) {
      case 'copy':
        try {
          const success = await SecurityUtils.copyToClipboard(prompt.content);
          if (success) {
            showToast('Prompt copiado al portapapeles', 'success');
          } else {
            showToast('Error al copiar al portapapeles', 'error');
          }
        } catch (error) {
          showToast('Error al copiar al portapapeles', 'error');
        }
        break;
      case 'edit':
        showEditPromptModal(prompt);
        break;
      case 'delete':
        if (confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
          deletePrompt(promptId);
        }
        break;
      default:
        SecurityUtils.safeLog('warn', 'Unknown prompt action', { action, promptId });
    }
  }

  async function toggleFavorite(gptId) {
    try {
      const isFavorite = state.favorites.includes(gptId);
      const action = isFavorite ? 'REMOVE_FAVORITE' : 'ADD_FAVORITE';
      
      const response = await chrome.runtime.sendMessage({
        type: action,
        data: { gptId }
      });
      
      if (response?.success) {
        if (isFavorite) {
          state.favorites = state.favorites.filter(id => id !== gptId);
          showToast('Eliminado de favoritos', 'info');
        } else {
          state.favorites.push(gptId);
          showToast('Añadido a favoritos', 'success');
        }
        renderContent();
      } else {
        showToast('Error al actualizar favoritos', 'error');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showToast('Error al actualizar favoritos', 'error');
    }
  }

  function createPrompt() {
    showCreatePromptModal();
  }

  function showCreatePromptModal() {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = SecurityUtils.createElement('div', { className: 'modal-overlay' });
    
    const modalContent = SecurityUtils.createElement('div', { className: 'modal' });
    
    // Header
    const header = SecurityUtils.createElement('div', { className: 'modal-header' });
    const title = SecurityUtils.createElement('h3', { textContent: 'Crear Nuevo Prompt' });
    const closeBtn = SecurityUtils.createElement('button', { className: 'modal-close' });
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Body
    const body = SecurityUtils.createElement('div', { className: 'modal-body' });
    
    const titleGroup = SecurityUtils.createElement('div', { className: 'form-group' });
    const titleLabel = SecurityUtils.createElement('label', { 
      textContent: 'Título del Prompt',
      attributes: { for: 'prompt-title' }
    });
    const titleInput = SecurityUtils.createElement('input', { 
      attributes: { 
        type: 'text',
        id: 'prompt-title',
        placeholder: 'Ej: Asistente de Marketing',
        maxlength: '100'
      }
    });
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    
    const contentGroup = SecurityUtils.createElement('div', { className: 'form-group' });
    const contentLabel = SecurityUtils.createElement('label', { 
      textContent: 'Contenido del Prompt',
      attributes: { for: 'prompt-content' }
    });
    const contentTextarea = SecurityUtils.createElement('textarea', { 
      attributes: { 
        id: 'prompt-content',
        rows: '10',
        placeholder: 'Escribe tu prompt aquí...',
        maxlength: '20000'
      }
    });
    const charCounter = SecurityUtils.createElement('small', { 
      className: 'char-counter',
      textContent: '0/20000 caracteres'
    });
    
    contentGroup.appendChild(contentLabel);
    contentGroup.appendChild(contentTextarea);
    contentGroup.appendChild(charCounter);
    
    body.appendChild(titleGroup);
    body.appendChild(contentGroup);
    
    // Footer
    const footer = SecurityUtils.createElement('div', { className: 'modal-footer' });
    const cancelBtn = SecurityUtils.createElement('button', { 
      className: 'btn secondary',
      textContent: 'Cancelar'
    });
    const saveBtn = SecurityUtils.createElement('button', { 
      className: 'btn primary',
      textContent: 'Crear Prompt'
    });
    
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    
    // Construir modal
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modalContent.appendChild(footer);
    modal.appendChild(modalContent);
    
    // Event listeners
    SecurityUtils.addSafeEventListener(closeBtn, 'click', () => modal.remove());
    SecurityUtils.addSafeEventListener(cancelBtn, 'click', () => modal.remove());
    SecurityUtils.addSafeEventListener(saveBtn, 'click', () => saveNewPrompt(modal));
    
    // Character counter
    SecurityUtils.addSafeEventListener(contentTextarea, 'input', () => {
      const length = contentTextarea.value.length;
      charCounter.textContent = `${length}/20000 caracteres`;
    });
    
    // ESC key to close
    SecurityUtils.addSafeEventListener(modal, 'keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
    titleInput.focus();
  }

  function showEditPromptModal(prompt) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = SecurityUtils.createElement('div', { className: 'modal-overlay' });
    
    const modalContent = SecurityUtils.createElement('div', { className: 'modal' });
    
    // Header
    const header = SecurityUtils.createElement('div', { className: 'modal-header' });
    const title = SecurityUtils.createElement('h3', { textContent: 'Editar Prompt' });
    const closeBtn = SecurityUtils.createElement('button', { className: 'modal-close' });
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Body
    const body = SecurityUtils.createElement('div', { className: 'modal-body' });
    
    const titleGroup = SecurityUtils.createElement('div', { className: 'form-group' });
    const titleLabel = SecurityUtils.createElement('label', { 
      textContent: 'Título del Prompt',
      attributes: { for: 'prompt-title' }
    });
    const titleInput = SecurityUtils.createElement('input', { 
      attributes: { 
        type: 'text',
        id: 'prompt-title',
        placeholder: 'Ej: Asistente de Marketing',
        maxlength: '100',
        value: prompt.title || ''
      }
    });
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    
    const contentGroup = SecurityUtils.createElement('div', { className: 'form-group' });
    const contentLabel = SecurityUtils.createElement('label', { 
      textContent: 'Contenido del Prompt',
      attributes: { for: 'prompt-content' }
    });
    const contentTextarea = SecurityUtils.createElement('textarea', { 
      attributes: { 
        id: 'prompt-content',
        rows: '10',
        placeholder: 'Escribe tu prompt aquí...',
        maxlength: '20000'
      }
    });
    contentTextarea.value = prompt.content || '';
    
    const charCounter = SecurityUtils.createElement('small', { 
      className: 'char-counter',
      textContent: `${(prompt.content || '').length}/20000 caracteres`
    });
    
    contentGroup.appendChild(contentLabel);
    contentGroup.appendChild(contentTextarea);
    contentGroup.appendChild(charCounter);
    
    body.appendChild(titleGroup);
    body.appendChild(contentGroup);
    
    // Footer
    const footer = SecurityUtils.createElement('div', { className: 'modal-footer' });
    const cancelBtn = SecurityUtils.createElement('button', { 
      className: 'btn secondary',
      textContent: 'Cancelar'
    });
    const saveBtn = SecurityUtils.createElement('button', { 
      className: 'btn primary',
      textContent: 'Actualizar Prompt'
    });
    
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    
    // Construir modal
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modalContent.appendChild(footer);
    modal.appendChild(modalContent);
    
    // Event listeners
    SecurityUtils.addSafeEventListener(closeBtn, 'click', () => modal.remove());
    SecurityUtils.addSafeEventListener(cancelBtn, 'click', () => modal.remove());
    SecurityUtils.addSafeEventListener(saveBtn, 'click', () => updatePrompt(prompt, modal));
    
    // Character counter
    SecurityUtils.addSafeEventListener(contentTextarea, 'input', () => {
      const length = contentTextarea.value.length;
      charCounter.textContent = `${length}/20000 caracteres`;
    });
    
    // ESC key to close
    SecurityUtils.addSafeEventListener(modal, 'keydown', (e) => {
      if (e.key === 'Escape') {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
    titleInput.focus();
  }

  async function saveNewPrompt(modal) {
    const titleInput = modal.querySelector('#prompt-title');
    const contentTextarea = modal.querySelector('#prompt-content');
    
    const promptData = {
      title: titleInput.value.trim(),
      content: contentTextarea.value.trim()
    };
    
    const validation = SecurityUtils.validatePromptInput(promptData);
    if (!validation.valid) {
      showToast(validation.errors.join(', '), 'warning');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_PROMPT',
        data: promptData
      });
      
      if (response?.success) {
        state.prompts.push(response.data);
        modal.remove();
        if (state.currentTab === 'prompts') {
          renderContent();
        }
        showToast('Prompt creado exitosamente', 'success');
      } else {
        showToast('Error al crear el prompt', 'error');
      }
    } catch (error) {
      console.error('Error creating prompt:', error);
      showToast('Error al crear el prompt', 'error');
    }
  }

  async function updatePrompt(originalPrompt, modal) {
    const titleInput = modal.querySelector('#prompt-title');
    const contentTextarea = modal.querySelector('#prompt-content');
    
    const promptData = {
      id: originalPrompt.id,
      title: titleInput.value.trim(),
      content: contentTextarea.value.trim()
    };
    
    const validation = SecurityUtils.validatePromptInput(promptData);
    if (!validation.valid) {
      showToast(validation.errors.join(', '), 'warning');
      return;
    }
    
    try {
      const index = state.prompts.findIndex(p => p.id === originalPrompt.id);
      if (index > -1) {
        // Actualizar en el estado local
        state.prompts[index] = {
          ...state.prompts[index],
          title: promptData.title,
          content: promptData.content,
          updatedAt: Date.now()
        };
        
        // Enviar mensaje al service worker
        const response = await chrome.runtime.sendMessage({
          type: 'UPDATE_PROMPT',
          data: promptData
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

  // Sistema de notificaciones seguro
  let notificationId = 0;
  const activeNotifications = new Map();
  
  function initNotifications() {
    if (!document.getElementById('notifications-container')) {
      const container = SecurityUtils.createElement('div', { 
        id: 'notifications-container',
        attributes: { 
          style: `position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; max-width: 400px;`
        }
      });
      document.body.appendChild(container);
    }
  }
  
  function showToast(message, type = 'info', duration = 3000) {
    initNotifications();
    const container = document.getElementById('notifications-container');
    const id = ++notificationId;
    
    // Crear notificación de forma segura
    const notification = SecurityUtils.createElement('div', { 
      className: `notification notification-${type}`,
      id: `notification-${id}`,
      attributes: {
        style: `display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); transform: translateX(120%); transition: all 0.3s ease; pointer-events: auto; min-width: 280px; max-width: 100%;`
      }
    });
    
    // Iconos según tipo
    const icons = {
      success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
      error: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
      warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
      info: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
    };
    
    // Icon
    const iconDiv = SecurityUtils.createElement('div', { 
      className: 'notification-icon',
      attributes: {
        style: `flex-shrink: 0; width: 20px; height: 20px; color: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#4F46E5'}`
      }
    });
    iconDiv.innerHTML = icons[type] || icons.info;
    
    // Content
    const contentDiv = SecurityUtils.createElement('div', { 
      className: 'notification-content',
      textContent: message,
      attributes: {
        style: 'flex: 1; font-size: 14px; line-height: 1.4; color: var(--text-primary);'
      }
    });
    
    // Close button
    const closeBtn = SecurityUtils.createElement('button', { 
      className: 'notification-close',
      attributes: {
        style: 'background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 2px; border-radius: 4px; transition: all 0.2s;'
      }
    });
    closeBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>';
    
    notification.appendChild(iconDiv);
    notification.appendChild(contentDiv);
    notification.appendChild(closeBtn);
    
    container.appendChild(notification);
    activeNotifications.set(id, notification);
    
    // Event listeners
    SecurityUtils.addSafeEventListener(closeBtn, 'click', () => hideNotification(id));
    
    // Mostrar animación
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-hide
    if (duration > 0) {
      setTimeout(() => hideNotification(id), duration);
    }
  }
  
  function hideNotification(id) {
    const notification = activeNotifications.get(id);
    if (!notification) return;
    
    notification.style.transform = 'translateX(120%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      notification.remove();
      activeNotifications.delete(id);
    }, 300);
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  // Función para mostrar mensaje de login (segura)
  function showLoginPrompt() {
    elements.content.innerHTML = '';
    
    const loginDiv = SecurityUtils.createElement('div', { className: 'login-prompt' });
    
    const iconDiv = SecurityUtils.createElement('div', { className: 'login-icon' });
    iconDiv.innerHTML = `
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none">
        <path d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14Z" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20 21C20 19.1435 19.2625 17.363 17.9497 16.0503C16.637 14.7375 14.8565 14 13 14H11C9.14348 14 7.36301 14.7375 6.05025 16.0503C4.7375 17.363 4 19.1435 4 21" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    const title = SecurityUtils.createElement('h2', { textContent: 'Inicia Sesión' });
    const desc = SecurityUtils.createElement('p', { textContent: 'Para acceder a tus GPTs y prompts guardados' });
    const loginBtn = SecurityUtils.createElement('button', { 
      className: 'btn-login',
      textContent: '🔑 Iniciar Sesión'
    });
    
    SecurityUtils.addSafeEventListener(loginBtn, 'click', () => {
      // TODO: Implementar login real
      showToast('Login en desarrollo', 'info');
    });
    
    loginDiv.appendChild(iconDiv);
    loginDiv.appendChild(title);
    loginDiv.appendChild(desc);
    loginDiv.appendChild(loginBtn);
    
    elements.content.appendChild(loginDiv);
  }

  // Función para mostrar modal de límite de dispositivos (segura)
  function showDeviceLimitModal(deviceInfo) {
    elements.content.innerHTML = '';
    
    const blockDiv = SecurityUtils.createElement('div', { className: 'device-limit-block' });
    
    const iconDiv = SecurityUtils.createElement('div', { className: 'device-limit-icon' });
    iconDiv.innerHTML = `
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none">
        <path d="M12 9V13M12 17H12.01M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z" 
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    
    const title = SecurityUtils.createElement('h2', { 
      className: 'device-limit-title',
      textContent: 'Límite de Dispositivos Alcanzado'
    });
    
    const desc1 = SecurityUtils.createElement('p', { 
      className: 'device-limit-desc'
    });
    desc1.innerHTML = `Has alcanzado el límite de <strong>${SecurityUtils.escapeHtml(deviceInfo.limit)} dispositivos</strong> para tu plan ${SecurityUtils.escapeHtml(deviceInfo.plan || 'Free')}.`;
    
    const desc2 = SecurityUtils.createElement('p', { 
      className: 'device-limit-desc',
      textContent: 'Para usar la extensión en este dispositivo, debes desactivarla en otro o actualizar tu plan.'
    });
    
    const actionsDiv = SecurityUtils.createElement('div', { className: 'device-limit-actions' });
    
    const manageBtn = SecurityUtils.createElement('button', { 
      className: 'btn-manage-devices',
      textContent: '📱 Gestionar Dispositivos'
    });
    
    const upgradeBtn = SecurityUtils.createElement('button', { 
      className: 'btn-upgrade-plan',
      textContent: '🚀 Ver Planes'
    });
    
    SecurityUtils.addSafeEventListener(manageBtn, 'click', () => {
      loadDeviceManager(deviceInfo);
    });
    
    SecurityUtils.addSafeEventListener(upgradeBtn, 'click', () => {
      window.open('https://kit-ia-pro.com/pricing', '_blank');
    });
    
    actionsDiv.appendChild(manageBtn);
    actionsDiv.appendChild(upgradeBtn);
    
    blockDiv.appendChild(iconDiv);
    blockDiv.appendChild(title);
    blockDiv.appendChild(desc1);
    blockDiv.appendChild(desc2);
    blockDiv.appendChild(actionsDiv);
    
    elements.content.appendChild(blockDiv);
    
    // Agregar estilos
    addDeviceLimitStyles();
  }

  // Cargar el gestor de dispositivos de forma segura
  async function loadDeviceManager(deviceInfo) {
    if (!window.DeviceManager) {
      const script = document.createElement('script');
      script.src = '../components/device-manager.js';
      script.onload = () => {
        window.DeviceManager.showDeviceModal(deviceInfo);
      };
      script.onerror = () => {
        showToast('Error al cargar el gestor de dispositivos', 'error');
      };
      document.head.appendChild(script);
    } else {
      window.DeviceManager.showDeviceModal(deviceInfo);
    }
  }

  function addDeviceLimitStyles() {
    if (document.getElementById('device-limit-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'device-limit-styles';
    style.textContent = `
      .login-prompt,
      .device-limit-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 20px;
        min-height: 400px;
      }
      
      .login-icon,
      .device-limit-icon {
        color: var(--text-secondary);
        margin-bottom: 24px;
        opacity: 0.8;
      }
      
      .device-limit-icon {
        color: var(--error-color);
      }
      
      .login-prompt h2,
      .device-limit-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 16px 0;
      }
      
      .login-prompt p,
      .device-limit-desc {
        color: var(--text-secondary);
        margin: 0 0 12px 0;
        max-width: 400px;
        line-height: 1.5;
      }
      
      .btn-login,
      .device-limit-actions {
        margin-top: 24px;
      }
      
      .device-limit-actions {
        display: flex;
        gap: 12px;
      }
      
      .btn-login,
      .btn-manage-devices,
      .btn-upgrade-plan {
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .btn-login,
      .btn-upgrade-plan {
        background: var(--accent-color);
        color: white;
      }
      
      .btn-login:hover,
      .btn-upgrade-plan:hover {
        background: var(--accent-hover);
        transform: translateY(-1px);
      }
      
      .btn-manage-devices {
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }
      
      .btn-manage-devices:hover {
        background: var(--bg-hover);
      }
    `;
    
    document.head.appendChild(style);
  }

  function setupResize() {
    if (!elements.resizeHandle) return;
    
    let isResizing = false;
    let startX, startWidth;
    
    SecurityUtils.addSafeEventListener(elements.resizeHandle, 'mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      
      const sidebar = document.getElementById('kit-ia-sidebar');
      if (sidebar) {
        startWidth = parseInt(window.getComputedStyle(sidebar).width, 10);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        e.preventDefault();
      }
    });
    
    function handleMouseMove(e) {
      if (!isResizing) return;
      
      const sidebar = document.getElementById('kit-ia-sidebar');
      if (sidebar) {
        const width = startWidth + (startX - e.clientX);
        const minWidth = 320;
        const maxWidth = 600;
        const newWidth = Math.max(minWidth, Math.min(maxWidth, width));
        
        sidebar.style.width = newWidth + 'px';
      }
    }
    
    function handleMouseUp() {
      isResizing = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
  }
  
  // Toggle filter dropdown
  function toggleFilterDropdown() {
    state.filterDropdownOpen = !state.filterDropdownOpen;
    
    if (elements.filterToggle) {
      elements.filterToggle.classList.toggle('active', state.filterDropdownOpen);
    }
    
    if (elements.filterDropdown) {
      elements.filterDropdown.classList.toggle('active', state.filterDropdownOpen);
    }
    
    if (state.filterDropdownOpen) {
      renderFilters();
    }
  }
  
  // Render filters in dropdown
  function renderFilters() {
    if (!elements.filterContent) return;
    
    elements.filterContent.innerHTML = '';
    
    // Sección de categorías
    const categoriesSection = SecurityUtils.createElement('div', { className: 'filter-section' });
    const catTitle = SecurityUtils.createElement('h4', { 
      className: 'filter-section-title',
      textContent: 'CATEGORÍAS'
    });
    categoriesSection.appendChild(catTitle);
    
    const categoriesList = SecurityUtils.createElement('div', { className: 'filter-list' });
    
    // Opción "Todas"
    const allOption = createFilterOption('category', 'all', 'Todas las categorías', state.gpts.length);
    categoriesList.appendChild(allOption);
    
    // Categorías individuales
    state.allCategories.forEach(category => {
      const count = state.gpts.filter(gpt => gpt.category === category).length;
      const option = createFilterOption('category', category, category, count);
      categoriesList.appendChild(option);
    });
    
    categoriesSection.appendChild(categoriesList);
    elements.filterContent.appendChild(categoriesSection);
    
    // Sección de etiquetas
    if (state.allTags.length > 0) {
      const tagsSection = SecurityUtils.createElement('div', { className: 'filter-section' });
      const tagsTitle = SecurityUtils.createElement('h4', { 
        className: 'filter-section-title',
        textContent: 'ETIQUETAS'
      });
      tagsSection.appendChild(tagsTitle);
      
      const tagsList = SecurityUtils.createElement('div', { className: 'filter-list' });
      
      state.allTags.forEach(tag => {
        const count = state.gpts.filter(gpt => gpt.tags && gpt.tags.includes(tag)).length;
        const option = createFilterOption('tag', tag, tag, count);
        tagsList.appendChild(option);
      });
      
      tagsSection.appendChild(tagsList);
      elements.filterContent.appendChild(tagsSection);
    }
    
    setupFilterListeners();
  }
  
  function createFilterOption(type, value, label, count) {
    const isActive = (type === 'category' && state.currentCategory === value) ||
                    (type === 'tag' && state.currentTags.includes(value));
    
    const option = SecurityUtils.createElement('div', { 
      className: `filter-option ${isActive ? 'active' : ''}`,
      attributes: { 
        'data-filter-type': type,
        'data-filter-value': value
      }
    });
    
    const labelEl = SecurityUtils.createElement('span', { 
      className: 'filter-label',
      textContent: label
    });
    
    const countEl = SecurityUtils.createElement('span', { 
      className: 'filter-count',
      textContent: `(${count})`
    });
    
    option.appendChild(labelEl);
    option.appendChild(countEl);
    
    return option;
  }
  
  function setupFilterListeners() {
    const filterOptions = document.querySelectorAll('.filter-option');
    filterOptions.forEach(option => {
      SecurityUtils.addSafeEventListener(option, 'click', handleFilterClick);
    });
  }
  
  function handleFilterClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const filterType = e.currentTarget.dataset.filterType;
    const filterValue = e.currentTarget.dataset.filterValue;
    
    if (filterType === 'category') {
      state.currentCategory = filterValue;
    } else if (filterType === 'tag') {
      const index = state.currentTags.indexOf(filterValue);
      if (index > -1) {
        state.currentTags.splice(index, 1);
      } else {
        state.currentTags.push(filterValue);
      }
    }
    
    // Actualizar contador de filtros activos
    updateActiveFiltersCount();
    
    // Re-renderizar
    renderFilters();
    renderContent();
  }
  
  function updateActiveFiltersCount() {
    let count = 0;
    if (state.currentCategory !== 'all') count++;
    count += state.currentTags.length;
    
    if (elements.activeFiltersCount) {
      elements.activeFiltersCount.textContent = count.toString();
      elements.activeFiltersCount.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }
  
  // Toggle notifications
  function toggleNotifications() {
    const existingDropdown = document.getElementById('notifications-dropdown');
    
    if (existingDropdown) {
      existingDropdown.remove();
      return;
    }
    
    // Crear dropdown de notificaciones
    const dropdown = SecurityUtils.createElement('div', {
      id: 'notifications-dropdown',
      className: 'notifications-dropdown active'
    });
    
    // Header
    const header = SecurityUtils.createElement('div', { className: 'notifications-header' });
    const title = SecurityUtils.createElement('h4', { 
      className: 'notifications-title',
      textContent: 'Notificaciones'
    });
    
    const clearBtn = SecurityUtils.createElement('button', {
      className: 'notifications-clear',
      textContent: 'Limpiar todo'
    });
    
    SecurityUtils.addSafeEventListener(clearBtn, 'click', () => {
      state.notifications = [];
      updateNotificationsBadge();
      toggleNotifications();
    });
    
    header.appendChild(title);
    header.appendChild(clearBtn);
    dropdown.appendChild(header);
    
    // Lista de notificaciones
    const list = SecurityUtils.createElement('div', { className: 'notifications-list' });
    
    if (state.notifications.length === 0) {
      const empty = SecurityUtils.createElement('div', { 
        className: 'empty-notifications',
        textContent: 'No hay notificaciones nuevas'
      });
      list.appendChild(empty);
    } else {
      state.notifications.forEach(notif => {
        const item = SecurityUtils.createElement('div', { className: 'notification-item' });
        const content = SecurityUtils.createElement('div', { 
          className: 'notification-content',
          textContent: notif.message
        });
        const time = SecurityUtils.createElement('div', { 
          className: 'notification-time',
          textContent: formatTime(notif.timestamp)
        });
        
        item.appendChild(content);
        item.appendChild(time);
        list.appendChild(item);
      });
    }
    
    dropdown.appendChild(list);
    
    // Posicionar dropdown
    if (elements.notificationsBtn) {
      const rect = elements.notificationsBtn.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = (rect.bottom + 8) + 'px';
      dropdown.style.right = '20px';
      document.body.appendChild(dropdown);
      
      // Cerrar al hacer clic fuera
      setTimeout(() => {
        SecurityUtils.addSafeEventListener(document, 'click', function closeDropdown(e) {
          if (!dropdown.contains(e.target) && !elements.notificationsBtn.contains(e.target)) {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
          }
        });
      }, 100);
    }
  }
  
  function updateNotificationsBadge() {
    if (elements.notificationsBadge) {
      const count = state.notifications.length;
      elements.notificationsBadge.textContent = count.toString();
      elements.notificationsBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }
  
  function addNotification(message) {
    state.notifications.unshift({
      id: Date.now(),
      message: message,
      timestamp: new Date()
    });
    
    // Mantener máximo 10 notificaciones
    state.notifications = state.notifications.slice(0, 10);
    
    updateNotificationsBadge();
  }
  
  function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} minutos`;
    if (hours < 24) return `Hace ${hours} horas`;
    return `Hace ${days} días`;
  }
  
  // Sistema de toast más simple
  function showToast(message, type = 'info', duration = 3000) {
    const toast = SecurityUtils.createElement('div', {
      className: `toast toast-${type}`,
      textContent: message,
      attributes: {
        style: `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: ${type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : type === 'warning' ? '#F59E0B' : '#4F46E5'};
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 10000;
          animation: slideIn 0.3s ease;
        `
      }
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  // Eliminar renderCategoriesAndTags ya que no se usa
  function renderCategoriesAndTags() {
    // Esta función ya no se necesita
    // Los filtros ahora están en el dropdown
  }

  // Agregar footer de forma segura
  function addFooter() {
    const existingFooter = document.getElementById('sidebar-footer');
    if (existingFooter) return;
    
    const footer = SecurityUtils.createElement('div', { 
      id: 'sidebar-footer',
      className: 'sidebar-footer',
      attributes: {
        style: 'padding: 10px 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid var(--border-color); background: var(--bg-secondary);'
      }
    });
    
    const link = SecurityUtils.createElement('a', { 
      textContent: 'Made with ☕ by Carlos Rodera',
      attributes: { 
        href: 'https://carlosrodera.com',
        target: '_blank',
        rel: 'noopener noreferrer',
        style: 'color: inherit; text-decoration: none;'
      }
    });
    
    footer.appendChild(link);
    
    // Añadir al final del sidebar
    const sidebarContainer = document.querySelector('.sidebar-container');
    if (sidebarContainer) {
      sidebarContainer.appendChild(footer);
    }
  }

  // Inicializar footer cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addFooter, 100);
  });

})();