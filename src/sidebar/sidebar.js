/**
 * Sidebar Principal JavaScript
 * @module sidebar/sidebar
 */

import { STORAGE_KEYS, DEFAULT_PREFERENCES, MESSAGES } from '../shared/constants.js';
import { Logger } from '../shared/logger.js';
import { getNotificationSystem, notify } from './components/notifications.js';
// TODO: Implementar validateGPT y validatePrompt en validation.js
// import { validateGPT, validatePrompt } from '../shared/validation.js';

// Importar datos dummy para testing
import { DUMMY_GPTS } from '../data/dummy-gpts.js';

const logger = new Logger('Sidebar');

/**
 * Estado global del sidebar
 */
const state = {
  activeTab: 'gpts',
  gpts: [],
  prompts: [],
  favorites: [],
  searchQuery: '',
  filters: {
    category: 'all',
    favorites: false
  },
  viewMode: 'grid', // 'grid' or 'list'
  pagination: {
    page: 1,
    perPage: 20,
    loading: false,
    hasMore: true
  },
  draftPrompt: null,
  notifications: [],
  selectedPrompts: new Set(),
  multiSelectMode: false
};

/**
 * Elementos DOM cacheados
 */
const elements = {};

/**
 * Inicialización principal
 */
async function init() {
  try {
    logger.info('Inicializando sidebar');
    
    // Cachear elementos DOM
    cacheElements();
    
    // Cargar estado inicial
    await loadInitialState();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Renderizar UI inicial
    renderUI();
    
    // Configurar comunicación con service worker
    setupMessageHandlers();
    
    logger.info('Sidebar inicializado correctamente');
  } catch (error) {
    logger.error('Error al inicializar sidebar:', error);
    showNotification('Error al inicializar la extensión', 'error');
  }
}

/**
 * Cachea elementos DOM para optimizar acceso
 */
function cacheElements() {
  // Main containers
  elements.sidebar = document.getElementById('kitia-sidebar');
  elements.content = document.querySelector('.kitia-content');
  
  // Navigation
  elements.tabs = document.querySelector('.kitia-tabs');
  elements.searchInput = document.getElementById('kitia-search-input');
  
  // Toolbar
  elements.categoryFilter = document.getElementById('kitia-category-filter');
  elements.viewGridBtn = document.getElementById('kitia-view-grid');
  elements.viewListBtn = document.getElementById('kitia-view-list');
  
  // Panels
  elements.gptsList = document.getElementById('kitia-gpts-list');
  elements.promptsList = document.getElementById('kitia-prompts-list');
  elements.favoritesList = document.getElementById('kitia-favorites-list');
  elements.notificationsList = document.getElementById('kitia-notifications-list');
  
  // Empty states
  elements.gptsEmpty = document.getElementById('kitia-gpts-empty');
  elements.promptsEmpty = document.getElementById('kitia-prompts-empty');
  elements.favoritesEmpty = document.getElementById('kitia-favorites-empty');
  elements.notificationsEmpty = document.getElementById('kitia-notifications-empty');
  
  // Skeleton loader
  elements.gptsSkeleton = document.getElementById('kitia-gpts-skeleton');
  
  // Modals
  elements.promptModal = document.getElementById('kitia-prompt-modal');
  elements.promptForm = document.getElementById('kitia-prompt-form');
  
  // Buttons
  elements.minimizeBtn = document.getElementById('kitia-minimize-btn');
  elements.closeBtn = document.getElementById('kitia-close-btn');
}

/**
 * Carga el estado inicial desde storage
 */
async function loadInitialState() {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.GPTS_CACHE,
      STORAGE_KEYS.PROMPTS,
      STORAGE_KEYS.FAVORITES,
      STORAGE_KEYS.ACTIVE_TAB,
      STORAGE_KEYS.DRAFT_PROMPT,
      'kitia_view_mode'
    ]);
    
    // TODO: Cambiar a datos reales cuando esté implementado el backend
    state.gpts = stored[STORAGE_KEYS.GPTS_CACHE] || DUMMY_GPTS;
    state.prompts = stored[STORAGE_KEYS.PROMPTS] || [];
    state.favorites = stored[STORAGE_KEYS.FAVORITES] || [];
    state.activeTab = stored[STORAGE_KEYS.ACTIVE_TAB] || 'gpts';
    state.draftPrompt = stored[STORAGE_KEYS.DRAFT_PROMPT] || null;
    state.viewMode = stored.kitia_view_mode || 'grid';
    
    logger.info('Estado inicial cargado:', {
      gptsCount: state.gpts.length,
      promptsCount: state.prompts.length,
      favoritesCount: state.favorites.length,
      viewMode: state.viewMode
    });
  } catch (error) {
    logger.error('Error al cargar estado inicial:', error);
  }
}

/**
 * Configura todos los event listeners
 */
function setupEventListeners() {
  // Tabs
  elements.tabs.addEventListener('click', handleTabClick);
  
  // Búsqueda con debounce
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value;
      filterAndRenderItems();
    }, 300);
  });
  
  // Category filter
  elements.categoryFilter?.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    filterAndRenderItems();
  });
  
  // View toggle buttons
  elements.viewGridBtn?.addEventListener('click', () => setViewMode('grid'));
  elements.viewListBtn?.addEventListener('click', () => setViewMode('list'));
  
  // Minimize and close buttons
  elements.minimizeBtn?.addEventListener('click', minimizeSidebar);
  elements.closeBtn?.addEventListener('click', closeSidebar);
  
  // Formulario de prompts
  elements.promptForm.addEventListener('submit', handlePromptSubmit);
  
  // Auto-save de drafts
  const promptTextarea = elements.promptForm.querySelector('textarea');
  promptTextarea.addEventListener('input', debounce(saveDraft, 1000));
  
  // Contador de caracteres
  promptTextarea.addEventListener('input', updateCharCount);
  
  // Infinite scroll
  elements.gptsList.addEventListener('scroll', handleScroll);
  
  // Atajos de teclado
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Toggle sidebar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleSidebar();
    }
  });
}

/**
 * Maneja clicks en tabs
 */
function handleTabClick(e) {
  const tab = e.target.closest('[data-tab]');
  if (!tab) return;
  
  const tabName = tab.dataset.tab;
  setActiveTab(tabName);
}

/**
 * Cambia la tab activa
 */
function setActiveTab(tabName) {
  state.activeTab = tabName;
  
  // Actualizar UI de tabs
  document.querySelectorAll('[data-tab]').forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle('kitia-tab-active', isActive);
    tab.setAttribute('aria-selected', isActive);
  });
  
  // Mostrar/ocultar paneles
  document.querySelectorAll('.kitia-panel').forEach(panel => {
    panel.hidden = true;
  });
  
  const activePanel = document.getElementById(`kitia-panel-${tabName}`);
  if (activePanel) {
    activePanel.hidden = false;
  }
  
  // Mostrar/ocultar toolbar (solo visible en tab GPTs)
  const toolbar = document.getElementById('kitia-toolbar');
  if (toolbar) {
    toolbar.hidden = tabName !== 'gpts';
  }
  
  // Guardar en storage
  chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_TAB]: tabName });
  
  // Renderizar contenido según la tab
  switch (tabName) {
    case 'gpts':
      renderGPTs();
      break;
    case 'prompts':
      renderPrompts();
      break;
    case 'favorites':
      renderFavorites();
      break;
    case 'notifications':
      renderNotifications();
      break;
  }
}

/**
 * Renderiza la lista de favoritos
 */
function renderFavorites() {
  const favoritedGPTs = state.gpts.filter(gpt => state.favorites.includes(gpt.id));
  const favoritedPrompts = state.prompts.filter(prompt => state.favorites.includes(prompt.id));
  
  if (favoritedGPTs.length === 0 && favoritedPrompts.length === 0) {
    showEmptyState('favorites');
    return;
  }
  
  if (elements.favoritesEmpty) elements.favoritesEmpty.hidden = true;
  if (elements.favoritesList) {
    elements.favoritesList.hidden = false;
    
    let html = '';
    
    // Renderizar GPTs favoritos
    if (favoritedGPTs.length > 0) {
      html += '<h3 class="kitia-section-title">GPTs Favoritos</h3>';
      html += '<div class="kitia-gpt-list">';
      html += favoritedGPTs.map(gpt => createGPTCard(gpt)).join('');
      html += '</div>';
    }
    
    // Renderizar prompts favoritos
    if (favoritedPrompts.length > 0) {
      html += '<h3 class="kitia-section-title">Prompts Favoritos</h3>';
      html += '<div class="kitia-list">';
      html += favoritedPrompts.map(prompt => createPromptCard(prompt)).join('');
      html += '</div>';
    }
    
    elements.favoritesList.innerHTML = html;
    
    // Añadir listeners
    addGPTCardListeners();
    addPromptCardListeners();
  }
}

/**
 * Renderiza la lista de notificaciones
 */
function renderNotifications() {
  if (state.notifications.length === 0) {
    if (elements.notificationsEmpty) elements.notificationsEmpty.hidden = false;
    if (elements.notificationsList) elements.notificationsList.hidden = true;
    return;
  }
  
  if (elements.notificationsEmpty) elements.notificationsEmpty.hidden = true;
  if (elements.notificationsList) {
    elements.notificationsList.hidden = false;
    // TODO: Implementar renderizado de notificaciones
  }
}

/**
 * Filtra y renderiza items según búsqueda y filtros
 */
function filterAndRenderItems() {
  if (state.activeTab === 'gpts') {
    renderGPTs();
  } else {
    renderPrompts();
  }
}

/**
 * Renderiza lista de GPTs con lazy loading
 */
async function renderGPTs() {
  // Ocultar skeleton
  if (elements.gptsSkeleton) {
    elements.gptsSkeleton.hidden = true;
  }
  
  const filtered = filterGPTs();
  
  if (filtered.length === 0) {
    showEmptyState('gpts');
    return;
  }
  
  // Mostrar lista
  if (elements.gptsEmpty) elements.gptsEmpty.hidden = true;
  if (elements.gptsList) {
    elements.gptsList.hidden = false;
    
    // Paginación
    const start = 0;
    const end = state.pagination.page * state.pagination.perPage;
    const paginated = filtered.slice(start, end);
    
    elements.gptsList.innerHTML = paginated.map(gpt => createGPTCard(gpt)).join('');
    
    // Actualizar estado de paginación
    state.pagination.hasMore = end < filtered.length;
    
    // Añadir listeners a las nuevas cards
    addGPTCardListeners();
  }
}

/**
 * Filtra GPTs según búsqueda y filtros
 */
function filterGPTs() {
  let filtered = [...state.gpts];
  
  // Filtro de búsqueda
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(gpt => 
      gpt.name.toLowerCase().includes(query) ||
      gpt.description?.toLowerCase().includes(query) ||
      gpt.category?.toLowerCase().includes(query)
    );
  }
  
  // Filtro de categoría
  if (state.filters.category !== 'all') {
    filtered = filtered.filter(gpt => gpt.category === state.filters.category);
  }
  
  // Filtro de favoritos (solo en tab de favoritos)
  if (state.activeTab === 'favorites') {
    filtered = filtered.filter(gpt => state.favorites.includes(gpt.id));
  }
  
  return filtered;
}

/**
 * Obtiene el nombre de categoría para mostrar
 */
function getCategoryDisplayName(category) {
  const categoryNames = {
    productivity: 'Productividad',
    creative: 'Creatividad',
    development: 'Desarrollo',
    writing: 'Escritura',
    research: 'Investigación',
    education: 'Educación',
    business: 'Negocios',
    other: 'Otros'
  };
  
  return categoryNames[category] || categoryNames.other;
}

/**
 * Cambia el modo de vista
 */
function setViewMode(mode) {
  if (state.viewMode === mode) return;
  
  state.viewMode = mode;
  
  // Actualizar botones
  elements.viewGridBtn?.classList.toggle('kitia-view-btn-active', mode === 'grid');
  elements.viewListBtn?.classList.toggle('kitia-view-btn-active', mode === 'list');
  
  // Actualizar clase del contenedor
  elements.content?.classList.remove('kitia-view-grid', 'kitia-view-list');
  elements.content?.classList.add(`kitia-view-${mode}`);
  
  // Guardar preferencia
  chrome.storage.local.set({ 'kitia_view_mode': mode });
  
  // Re-renderizar si estamos en GPTs
  if (state.activeTab === 'gpts') {
    renderGPTs();
  }
}

/**
 * Minimiza el sidebar
 */
function minimizeSidebar() {
  elements.sidebar?.classList.add('kitia-sidebar--minimized');
  // Notificar al content script
  chrome.runtime.sendMessage({ type: 'MINIMIZE_SIDEBAR' });
}

/**
 * Cierra el sidebar
 */
function closeSidebar() {
  elements.sidebar?.classList.remove('kitia-sidebar--open');
  // Notificar al content script
  chrome.runtime.sendMessage({ type: 'CLOSE_SIDEBAR' });
}

/**
 * Crea el HTML de una card de GPT
 */
function createGPTCard(gpt) {
  const isFavorite = state.favorites.includes(gpt.id);
  const categoryName = getCategoryDisplayName(gpt.category);
  
  return `
    <div class="kitia-gpt-card" data-gpt-id="${gpt.id}">
      <span class="kitia-gpt-card__badge kitia-gpt-card__badge--${gpt.category || 'other'}">
        ${escapeHtml(categoryName)}
      </span>
      <div class="kitia-gpt-card__header">
        <div class="kitia-gpt-card__icon">
          ${gpt.icon ? `<img src="${gpt.icon}" alt="${gpt.name}" width="24" height="24">` : `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `}
        </div>
        <div class="kitia-gpt-card__info">
          <h3 class="kitia-gpt-card__title">${escapeHtml(gpt.name)}</h3>
          <p class="kitia-gpt-card__description">${escapeHtml(gpt.description || 'Sin descripción')}</p>
        </div>
      </div>
      <div class="kitia-gpt-card__actions">
        <button class="kitia-gpt-card__button kitia-gpt-card__button--primary use-gpt" data-gpt-id="${gpt.id}">
          Usar GPT
        </button>
        <button class="kitia-btn-icon favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}" title="${isFavorite ? 'Quitar de' : 'Añadir a'} favoritos">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="${isFavorite ? 'M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z' : 'M2.866 14.85c-.078.444.36.791.746.593l4.39-2.256 4.389 2.256c.386.198.824-.149.746-.592l-.83-4.73 3.522-3.356c.33-.314.16-.888-.282-.95l-4.898-.696L8.465.792a.513.513 0 0 0-.927 0L5.354 5.12l-4.898.696c-.441.062-.612.636-.283.95l3.523 3.356-.83 4.73zm4.905-2.767-3.686 1.894.694-3.957a.565.565 0 0 0-.163-.505L1.71 6.745l4.052-.576a.525.525 0 0 0 .393-.288L8 2.223l1.847 3.658a.525.525 0 0 0 .393.288l4.052.575-2.906 2.77a.565.565 0 0 0-.163.506l.694 3.957-3.686-1.894a.503.503 0 0 0-.46 0z'}"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Añade event listeners a las cards de GPT
 */
function addGPTCardListeners() {
  // Favoritos
  document.querySelectorAll('.favorite-btn').forEach(btn => {
    btn.addEventListener('click', handleFavoriteToggle);
  });
  
  // Abrir GPT
  document.querySelectorAll('.open-gpt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const url = e.target.dataset.url;
      chrome.tabs.create({ url });
    });
  });
  
  // Usar GPT
  document.querySelectorAll('.use-gpt').forEach(btn => {
    btn.addEventListener('click', handleUseGPT);
  });
}

/**
 * Maneja el toggle de favoritos
 */
async function handleFavoriteToggle(e) {
  e.stopPropagation();
  const gptId = e.currentTarget.dataset.gptId;
  
  try {
    const index = state.favorites.indexOf(gptId);
    if (index > -1) {
      state.favorites.splice(index, 1);
      e.currentTarget.classList.remove('active');
      showNotification('Eliminado de favoritos', 'info');
    } else {
      state.favorites.push(gptId);
      e.currentTarget.classList.add('active');
      showNotification('Añadido a favoritos', 'success');
    }
    
    // Guardar en storage
    await chrome.storage.local.set({ [STORAGE_KEYS.FAVORITES]: state.favorites });
    
    // Re-renderizar si está activo el filtro de favoritos
    if (state.filters.favorites) {
      renderGPTs();
    }
  } catch (error) {
    logger.error('Error al actualizar favoritos:', error);
    showNotification('Error al actualizar favoritos', 'error');
  }
}

/**
 * Renderiza lista de prompts
 */
function renderPrompts() {
  const filtered = filterPrompts();
  
  if (filtered.length === 0) {
    showEmptyState('prompts');
    return;
  }
  
  // Renderizar barra de herramientas si hay items seleccionados
  renderMultiSelectToolbar();
  
  elements.promptsList.innerHTML = filtered.map(prompt => createPromptCard(prompt)).join('');
  
  // Añadir listeners
  addPromptCardListeners();
}

/**
 * Filtra prompts según búsqueda
 */
function filterPrompts() {
  if (!state.searchQuery) return state.prompts;
  
  const query = state.searchQuery.toLowerCase();
  return state.prompts.filter(prompt => 
    prompt.title.toLowerCase().includes(query) ||
    prompt.content.toLowerCase().includes(query) ||
    prompt.tags?.some(tag => tag.toLowerCase().includes(query))
  );
}

/**
 * Crea el HTML de una card de prompt
 */
function createPromptCard(prompt) {
  const isSelected = state.selectedPrompts.has(prompt.id);
  
  return `
    <div class="prompt-card ${isSelected ? 'selected' : ''}" data-prompt-id="${prompt.id}">
      <div class="prompt-select-checkbox">
        <input type="checkbox" 
               class="prompt-checkbox" 
               data-prompt-id="${prompt.id}"
               ${isSelected ? 'checked' : ''}
               aria-label="Seleccionar ${escapeHtml(prompt.title)}">
      </div>
      <div class="prompt-content">
        <div class="prompt-header">
          <h3 class="prompt-title">${escapeHtml(prompt.title)}</h3>
          <div class="prompt-actions">
            <button class="icon-btn copy-prompt" data-prompt-id="${prompt.id}" title="Copiar">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
            <button class="icon-btn edit-prompt" data-prompt-id="${prompt.id}" title="Editar">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="icon-btn delete-prompt" data-prompt-id="${prompt.id}" title="Eliminar">
              <svg class="icon" viewBox="0 0 24 24">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="prompt-preview">${escapeHtml(prompt.content.substring(0, 150))}...</p>
        ${prompt.tags?.length ? `
          <div class="prompt-tags">
            ${prompt.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        <div class="prompt-meta">
          <span class="prompt-date">${formatDate(prompt.createdAt)}</span>
          <span class="prompt-length">${prompt.content.length} caracteres</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Añade event listeners a las cards de prompt
 */
function addPromptCardListeners() {
  // Checkboxes
  document.querySelectorAll('.prompt-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', handlePromptSelection);
  });
  
  // Copiar
  document.querySelectorAll('.copy-prompt').forEach(btn => {
    btn.addEventListener('click', handleCopyPrompt);
  });
  
  // Editar
  document.querySelectorAll('.edit-prompt').forEach(btn => {
    btn.addEventListener('click', handleEditPrompt);
  });
  
  // Eliminar
  document.querySelectorAll('.delete-prompt').forEach(btn => {
    btn.addEventListener('click', handleDeletePrompt);
  });
  
  // Selección al hacer click en la card (no en botones)
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', handleCardClick);
  });
}

/**
 * Maneja la copia de un prompt
 */
async function handleCopyPrompt(e) {
  const promptId = e.currentTarget.dataset.promptId;
  const prompt = state.prompts.find(p => p.id === promptId);
  
  if (!prompt) return;
  
  try {
    await navigator.clipboard.writeText(prompt.content);
    showNotification('Prompt copiado al portapapeles', 'success');
    
    // Animación visual
    e.currentTarget.classList.add('copied');
    setTimeout(() => {
      e.currentTarget.classList.remove('copied');
    }, 1000);
  } catch (error) {
    logger.error('Error al copiar prompt:', error);
    showNotification('Error al copiar prompt', 'error');
  }
}

/**
 * Maneja la edición de un prompt
 */
function handleEditPrompt(e) {
  const promptId = e.currentTarget.dataset.promptId;
  const prompt = state.prompts.find(p => p.id === promptId);
  
  if (!prompt) return;
  
  // Cargar en el formulario
  const form = elements.promptForm;
  form.querySelector('[name="title"]').value = prompt.title;
  form.querySelector('[name="content"]').value = prompt.content;
  form.querySelector('[name="tags"]').value = prompt.tags?.join(', ') || '';
  form.dataset.editingId = promptId;
  
  // Cambiar a tab de crear/editar
  setActiveTab('create');
  
  // Scroll al formulario
  form.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Maneja la eliminación de un prompt
 */
async function handleDeletePrompt(e) {
  const promptId = e.currentTarget.dataset.promptId;
  
  if (!confirm('¿Estás seguro de que quieres eliminar este prompt?')) {
    return;
  }
  
  try {
    // Eliminar del estado
    const index = state.prompts.findIndex(p => p.id === promptId);
    if (index > -1) {
      state.prompts.splice(index, 1);
    }
    
    // Guardar en storage
    await chrome.storage.local.set({ [STORAGE_KEYS.PROMPTS]: state.prompts });
    
    // Re-renderizar
    renderPrompts();
    
    showNotification('Prompt eliminado', 'success');
  } catch (error) {
    logger.error('Error al eliminar prompt:', error);
    showNotification('Error al eliminar prompt', 'error');
  }
}

/**
 * Maneja el envío del formulario de prompts
 */
async function handlePromptSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const promptData = {
    title: formData.get('title').trim(),
    content: formData.get('content').trim(),
    tags: formData.get('tags').split(',').map(t => t.trim()).filter(Boolean)
  };
  
  // Validar
  // TODO: Implementar validación
  // const validation = validatePrompt(promptData);
  const validation = { isValid: true }; // Temporal
  if (!validation.isValid) {
    showNotification(validation.errors.join(', '), 'error');
    return;
  }
  
  try {
    const editingId = e.target.dataset.editingId;
    
    if (editingId) {
      // Actualizar prompt existente
      const index = state.prompts.findIndex(p => p.id === editingId);
      if (index > -1) {
        state.prompts[index] = {
          ...state.prompts[index],
          ...promptData,
          updatedAt: Date.now()
        };
      }
      delete e.target.dataset.editingId;
    } else {
      // Crear nuevo prompt
      const newPrompt = {
        id: generateId(),
        ...promptData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      state.prompts.unshift(newPrompt);
    }
    
    // Guardar en storage
    await chrome.storage.local.set({ [STORAGE_KEYS.PROMPTS]: state.prompts });
    
    // Limpiar formulario
    e.target.reset();
    state.draftPrompt = null;
    await chrome.storage.local.remove(STORAGE_KEYS.DRAFT_PROMPT);
    
    // Cambiar a tab de prompts y re-renderizar
    setActiveTab('prompts');
    
    showNotification(editingId ? 'Prompt actualizado' : 'Prompt creado', 'success');
  } catch (error) {
    logger.error('Error al guardar prompt:', error);
    showNotification('Error al guardar prompt', 'error');
  }
}

/**
 * Guarda el borrador del prompt
 */
async function saveDraft() {
  const form = elements.promptForm;
  const draft = {
    title: form.querySelector('[name="title"]').value,
    content: form.querySelector('[name="content"]').value,
    tags: form.querySelector('[name="tags"]').value,
    savedAt: Date.now()
  };
  
  state.draftPrompt = draft;
  
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.DRAFT_PROMPT]: draft });
    logger.info('Borrador guardado');
  } catch (error) {
    logger.error('Error al guardar borrador:', error);
  }
}

/**
 * Actualiza el contador de caracteres
 */
function updateCharCount(e) {
  const count = e.target.value.length;
  const counter = e.target.parentElement.querySelector('.char-count');
  if (counter) {
    counter.textContent = `${count} caracteres`;
    counter.classList.toggle('warning', count > 4000);
  }
}

/**
 * Maneja el scroll infinito
 */
function handleScroll(e) {
  const { scrollTop, scrollHeight, clientHeight } = e.target;
  
  if (scrollHeight - scrollTop <= clientHeight + 100 && 
      !state.pagination.loading && 
      state.pagination.hasMore) {
    loadMoreGPTs();
  }
}

/**
 * Carga más GPTs (paginación)
 */
async function loadMoreGPTs() {
  state.pagination.loading = true;
  showLoadingIndicator();
  
  // Simular delay de carga
  await new Promise(resolve => setTimeout(resolve, 300));
  
  state.pagination.page++;
  renderGPTs();
  
  state.pagination.loading = false;
  hideLoadingIndicator();
}

/**
 * Maneja atajos de teclado
 */
function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + K para búsqueda
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    elements.searchInput.focus();
  }
  
  // Ctrl/Cmd + N para nuevo prompt
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    setActiveTab('create');
  }
}

/**
 * Toggle del sidebar
 */
function toggleSidebar() {
  elements.container.classList.toggle('collapsed');
  
  // Guardar estado
  const isCollapsed = elements.container.classList.contains('collapsed');
  chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
}

/**
 * Muestra una notificación
 */
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <span class="notification-message">${escapeHtml(message)}</span>
    <button class="notification-close">&times;</button>
  `;
  
  // Añadir al contenedor
  elements.notificationsContainer.appendChild(notification);
  
  // Animar entrada
  requestAnimationFrame(() => {
    notification.classList.add('show');
  });
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    removeNotification(notification);
  });
  
  // Auto-remove después de 5 segundos
  setTimeout(() => {
    removeNotification(notification);
  }, 5000);
}

/**
 * Elimina una notificación
 */
function removeNotification(notification) {
  notification.classList.remove('show');
  setTimeout(() => {
    notification.remove();
  }, 300);
}

/**
 * Muestra estado vacío
 */
function showEmptyState(type) {
  // Ocultar skeleton si está visible
  if (elements.gptsSkeleton) {
    elements.gptsSkeleton.hidden = true;
  }
  
  // Mostrar estado vacío correspondiente
  switch (type) {
    case 'gpts':
      if (elements.gptsList) elements.gptsList.hidden = true;
      if (elements.gptsEmpty) elements.gptsEmpty.hidden = false;
      break;
    case 'prompts':
      if (elements.promptsList) elements.promptsList.hidden = true;
      if (elements.promptsEmpty) elements.promptsEmpty.hidden = false;
      break;
    case 'favorites':
      if (elements.favoritesList) elements.favoritesList.hidden = true;
      if (elements.favoritesEmpty) elements.favoritesEmpty.hidden = false;
      break;
  }
}

/**
 * Muestra indicador de carga
 */
function showLoadingIndicator() {
  elements.loadingIndicator.classList.remove('hidden');
}

/**
 * Oculta indicador de carga
 */
function hideLoadingIndicator() {
  elements.loadingIndicator.classList.add('hidden');
}

/**
 * Configura manejadores de mensajes con service worker
 */
function setupMessageHandlers() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.info('Mensaje recibido:', message);
    
    switch (message.type) {
      case 'UPDATE_GPTS':
        state.gpts = message.data;
        if (state.activeTab === 'gpts') {
          renderGPTs();
        }
        break;
        
      case 'GPT_ADDED':
        state.gpts.unshift(message.data);
        if (state.activeTab === 'gpts') {
          renderGPTs();
        }
        showNotification('Nuevo GPT añadido', 'success');
        break;
        
      case 'SYNC_COMPLETE':
        showNotification('Sincronización completada', 'success');
        loadInitialState();
        break;
        
      default:
        logger.warn('Tipo de mensaje no manejado:', message.type);
    }
    
    sendResponse({ received: true });
  });
}

/**
 * Renderiza la UI completa
 */
function renderUI() {
  // Establecer modo de vista inicial
  setViewMode(state.viewMode);
  
  // Establecer tab activa
  setActiveTab(state.activeTab);
  
  // Cargar draft si existe
  if (state.draftPrompt && elements.promptForm) {
    const form = elements.promptForm;
    const titleInput = form.querySelector('[name="title"]');
    const contentInput = form.querySelector('[name="content"]');
    const tagsInput = form.querySelector('[name="tags"]');
    
    if (titleInput) titleInput.value = state.draftPrompt.title || '';
    if (contentInput) contentInput.value = state.draftPrompt.content || '';
    if (tagsInput) tagsInput.value = state.draftPrompt.tags || '';
    
    showNotification('Borrador recuperado', 'info');
  }
  
  // Actualizar contador de favoritos
  updateFavoritesCount();
}

/**
 * Actualiza el contador de favoritos en la tab
 */
function updateFavoritesCount() {
  const favoritesCount = document.getElementById('kitia-favorites-count');
  if (favoritesCount) {
    favoritesCount.textContent = state.favorites.length;
    favoritesCount.hidden = state.favorites.length === 0;
  }
}

/**
 * Utilidades
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Hace un momento';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
  if (diff < 604800000) return `Hace ${Math.floor(diff / 86400000)} días`;
  
  return date.toLocaleDateString();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Maneja el uso de un GPT
 */
async function handleUseGPT(e) {
  const gptId = e.currentTarget.dataset.gptId;
  const gpt = state.gpts.find(g => g.id === gptId);
  
  if (!gpt) return;
  
  try {
    // Enviar mensaje al service worker para abrir el GPT
    const response = await chrome.runtime.sendMessage({
      type: 'OPEN_GPT',
      data: { gpt }
    });
    
    if (response.success) {
      showNotification(`Abriendo ${gpt.name}...`, 'info');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    logger.error('Error al usar GPT:', error);
    showNotification('Error al abrir el GPT', 'error');
  }
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/**
 * Renderiza la barra de herramientas de multi-selección
 */
function renderMultiSelectToolbar() {
  const existingToolbar = document.getElementById('multi-select-toolbar');
  const promptsPanel = document.getElementById('kitia-panel-prompts');
  const panelHeader = promptsPanel.querySelector('.kitia-panel-header');
  
  if (state.selectedPrompts.size === 0) {
    if (existingToolbar) {
      existingToolbar.remove();
    }
    state.multiSelectMode = false;
    document.body.classList.remove('multi-select-mode');
    return;
  }
  
  state.multiSelectMode = true;
  document.body.classList.add('multi-select-mode');
  
  if (!existingToolbar) {
    const toolbar = document.createElement('div');
    toolbar.id = 'multi-select-toolbar';
    toolbar.className = 'multi-select-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-left">
        <button type="button" class="select-all-btn" id="select-all-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2zm10.03 4.97a.5.5 0 0 1 .47.53v.5a.5.5 0 0 1-.5.5.5.5 0 0 1-.47-.53v-.5a.5.5 0 0 1 .5-.5zm-5.657 1.06a.5.5 0 0 1 0 .707L4.707 8.393a.5.5 0 0 1-.707 0L2.343 6.736a.5.5 0 1 1 .707-.707l1.353 1.353 3.293-3.293a.5.5 0 0 1 .707 0z"/>
          </svg>
          <span id="select-all-text">Seleccionar todo</span>
        </button>
        <span class="selected-count">
          <span id="selected-count">${state.selectedPrompts.size}</span> seleccionado${state.selectedPrompts.size !== 1 ? 's' : ''}
        </span>
      </div>
      <div class="toolbar-actions">
        <button type="button" class="btn-toolbar copy-all" id="copy-all-btn" title="Copiar todos">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2 0v8h8V2H6zM2 6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2h-2v2H2V8h2V6H2z"/>
          </svg>
          Copiar
        </button>
        <button type="button" class="btn-toolbar export-all" id="export-all-btn" title="Exportar seleccionados">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.5 6.5a.5.5 0 0 0-1 0v3.793L6.354 9.146a.5.5 0 1 0-.708.708l2 2a.5.5 0 0 0 .708 0l2-2a.5.5 0 0 0-.708-.708L8.5 10.293V6.5z"/>
            <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
          </svg>
          Exportar
        </button>
        <button type="button" class="btn-toolbar delete-all" id="delete-all-btn" title="Eliminar seleccionados">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
          </svg>
          Eliminar
        </button>
      </div>
    `;
    
    // Insertar después del header
    if (panelHeader && panelHeader.nextSibling) {
      promptsPanel.insertBefore(toolbar, panelHeader.nextSibling);
    } else {
      promptsPanel.insertBefore(toolbar, promptsPanel.firstChild);
    }
    
    // Añadir event listeners
    document.getElementById('select-all-btn').addEventListener('click', handleSelectAll);
    document.getElementById('copy-all-btn').addEventListener('click', handleCopySelected);
    document.getElementById('export-all-btn').addEventListener('click', handleExportSelected);
    document.getElementById('delete-all-btn').addEventListener('click', handleDeleteSelected);
  } else {
    // Actualizar contador
    document.getElementById('selected-count').textContent = state.selectedPrompts.size;
    existingToolbar.querySelector('.selected-count').innerHTML = `
      <span id="selected-count">${state.selectedPrompts.size}</span> seleccionado${state.selectedPrompts.size !== 1 ? 's' : ''}
    `;
  }
}

/**
 * Maneja la selección de prompts
 */
function handlePromptSelection(e) {
  e.stopPropagation();
  const promptId = e.target.dataset.promptId;
  const card = e.target.closest('.prompt-card');
  
  if (e.target.checked) {
    state.selectedPrompts.add(promptId);
    card.classList.add('selected');
  } else {
    state.selectedPrompts.delete(promptId);
    card.classList.remove('selected');
  }
  
  renderMultiSelectToolbar();
  updateSelectAllButton();
}

/**
 * Maneja click en la card
 */
function handleCardClick(e) {
  // No hacer nada si se clickeó en un botón o checkbox
  if (e.target.closest('.icon-btn') || e.target.closest('.prompt-checkbox')) {
    return;
  }
  
  // Si estamos en modo multi-select, toggle la selección
  if (state.multiSelectMode || e.ctrlKey || e.metaKey) {
    const checkbox = e.currentTarget.querySelector('.prompt-checkbox');
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));
  }
}

/**
 * Maneja seleccionar/deseleccionar todo
 */
function handleSelectAll() {
  const allPrompts = filterPrompts();
  const allSelected = allPrompts.every(p => state.selectedPrompts.has(p.id));
  
  if (allSelected) {
    // Deseleccionar todo
    state.selectedPrompts.clear();
    document.querySelectorAll('.prompt-checkbox').forEach(cb => {
      cb.checked = false;
      cb.closest('.prompt-card').classList.remove('selected');
    });
  } else {
    // Seleccionar todo
    allPrompts.forEach(prompt => {
      state.selectedPrompts.add(prompt.id);
    });
    document.querySelectorAll('.prompt-checkbox').forEach(cb => {
      cb.checked = true;
      cb.closest('.prompt-card').classList.add('selected');
    });
  }
  
  renderMultiSelectToolbar();
  updateSelectAllButton();
}

/**
 * Actualiza el botón de seleccionar todo
 */
function updateSelectAllButton() {
  const btn = document.getElementById('select-all-btn');
  if (!btn) return;
  
  const allPrompts = filterPrompts();
  const allSelected = allPrompts.length > 0 && allPrompts.every(p => state.selectedPrompts.has(p.id));
  
  const textSpan = btn.querySelector('#select-all-text');
  textSpan.textContent = allSelected ? 'Deseleccionar todo' : 'Seleccionar todo';
}

/**
 * Maneja copiar prompts seleccionados
 */
async function handleCopySelected() {
  const selectedPrompts = state.prompts.filter(p => state.selectedPrompts.has(p.id));
  
  if (selectedPrompts.length === 0) return;
  
  try {
    const content = selectedPrompts.map(prompt => {
      let text = `## ${prompt.title}\n\n${prompt.content}`;
      if (prompt.tags?.length) {
        text += `\n\nTags: ${prompt.tags.join(', ')}`;
      }
      return text;
    }).join('\n\n---\n\n');
    
    await navigator.clipboard.writeText(content);
    showNotification(`${selectedPrompts.length} prompts copiados al portapapeles`, 'success');
  } catch (error) {
    logger.error('Error al copiar prompts:', error);
    showNotification('Error al copiar prompts', 'error');
  }
}

/**
 * Maneja exportar prompts seleccionados
 */
function handleExportSelected() {
  const selectedPrompts = state.prompts.filter(p => state.selectedPrompts.has(p.id));
  
  if (selectedPrompts.length === 0) return;
  
  try {
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      prompts: selectedPrompts
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit-ia-prompts-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`${selectedPrompts.length} prompts exportados`, 'success');
  } catch (error) {
    logger.error('Error al exportar prompts:', error);
    showNotification('Error al exportar prompts', 'error');
  }
}

/**
 * Maneja eliminar prompts seleccionados
 */
async function handleDeleteSelected() {
  const count = state.selectedPrompts.size;
  
  if (count === 0) return;
  
  if (!confirm(`¿Estás seguro de que quieres eliminar ${count} prompt${count !== 1 ? 's' : ''}?`)) {
    return;
  }
  
  try {
    // Eliminar del estado
    state.prompts = state.prompts.filter(p => !state.selectedPrompts.has(p.id));
    
    // Guardar en storage
    await chrome.storage.local.set({ [STORAGE_KEYS.PROMPTS]: state.prompts });
    
    // Limpiar selección
    state.selectedPrompts.clear();
    
    // Re-renderizar
    renderPrompts();
    
    showNotification(`${count} prompt${count !== 1 ? 's' : ''} eliminado${count !== 1 ? 's' : ''}`, 'success');
  } catch (error) {
    logger.error('Error al eliminar prompts:', error);
    showNotification('Error al eliminar prompts', 'error');
  }
}

// Exportar para testing
export { state, init, showNotification };