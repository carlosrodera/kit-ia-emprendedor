/**
 * Sidebar Principal JavaScript
 * @module sidebar/sidebar
 */

import { STORAGE_KEYS, DEFAULT_PREFERENCES, MESSAGES } from '../shared/constants.js';
import { Logger } from '../shared/logger.js';
// TODO: Implementar validateGPT y validatePrompt en validation.js
// import { validateGPT, validatePrompt } from '../shared/validation.js';

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
  pagination: {
    page: 1,
    perPage: 20,
    loading: false,
    hasMore: true
  },
  draftPrompt: null,
  notifications: []
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
  elements.container = document.getElementById('sidebar-container');
  elements.tabs = document.getElementById('tabs');
  elements.searchInput = document.getElementById('search-input');
  elements.categoryFilter = document.getElementById('category-filter');
  elements.favoritesToggle = document.getElementById('favorites-toggle');
  elements.gptsList = document.getElementById('gpts-list');
  elements.promptsList = document.getElementById('prompts-list');
  elements.promptForm = document.getElementById('prompt-form');
  elements.notificationsContainer = document.getElementById('notifications');
  elements.loadingIndicator = document.getElementById('loading-indicator');
  elements.emptyState = document.getElementById('empty-state');
}

/**
 * Carga el estado inicial desde storage
 */
async function loadInitialState() {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.GPTS,
      STORAGE_KEYS.PROMPTS,
      STORAGE_KEYS.FAVORITES,
      STORAGE_KEYS.ACTIVE_TAB,
      STORAGE_KEYS.DRAFT_PROMPT
    ]);
    
    state.gpts = stored[STORAGE_KEYS.GPTS_CACHE] || [];
    state.prompts = stored[STORAGE_KEYS.PROMPTS] || [];
    state.favorites = stored[STORAGE_KEYS.FAVORITES] || [];
    state.activeTab = stored[STORAGE_KEYS.ACTIVE_TAB] || 'gpts';
    state.draftPrompt = stored[STORAGE_KEYS.DRAFT_PROMPT] || null;
    
    logger.info('Estado inicial cargado:', {
      gptsCount: state.gpts.length,
      promptsCount: state.prompts.length,
      favoritesCount: state.favorites.length
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
  
  // Filtros
  elements.categoryFilter.addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    filterAndRenderItems();
  });
  
  elements.favoritesToggle.addEventListener('change', (e) => {
    state.filters.favorites = e.target.checked;
    filterAndRenderItems();
  });
  
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
  
  // Actualizar UI
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Mostrar contenido correspondiente
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('hidden', !content.classList.contains(`${tabName}-content`));
  });
  
  // Guardar en storage
  chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_TAB]: tabName });
  
  // Renderizar contenido
  if (tabName === 'gpts') {
    renderGPTs();
  } else if (tabName === 'prompts') {
    renderPrompts();
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
  const filtered = filterGPTs();
  
  if (filtered.length === 0) {
    showEmptyState('gpts');
    return;
  }
  
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
  
  // Filtro de favoritos
  if (state.filters.favorites) {
    filtered = filtered.filter(gpt => state.favorites.includes(gpt.id));
  }
  
  return filtered;
}

/**
 * Crea el HTML de una card de GPT
 */
function createGPTCard(gpt) {
  const isFavorite = state.favorites.includes(gpt.id);
  
  return `
    <div class="gpt-card" data-gpt-id="${gpt.id}">
      <div class="gpt-header">
        <img src="${gpt.icon || 'assets/icons/default-gpt.svg'}" alt="${gpt.name}" class="gpt-icon">
        <div class="gpt-info">
          <h3 class="gpt-name">${escapeHtml(gpt.name)}</h3>
          <span class="gpt-category">${escapeHtml(gpt.category || 'General')}</span>
        </div>
        <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}" title="Añadir a favoritos">
          <svg class="icon-star" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </button>
      </div>
      <p class="gpt-description">${escapeHtml(gpt.description || 'Sin descripción')}</p>
      <div class="gpt-actions">
        <button class="btn-secondary open-gpt" data-url="${gpt.url}">Abrir GPT</button>
        <button class="btn-primary use-gpt" data-gpt-id="${gpt.id}">Usar</button>
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
  return `
    <div class="prompt-card" data-prompt-id="${prompt.id}">
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
  `;
}

/**
 * Añade event listeners a las cards de prompt
 */
function addPromptCardListeners() {
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
  const messages = {
    gpts: 'No se encontraron GPTs. Intenta ajustar los filtros.',
    prompts: 'No hay prompts guardados. ¡Crea tu primer prompt!'
  };
  
  elements.emptyState.innerHTML = `
    <div class="empty-icon">
      <svg viewBox="0 0 24 24" width="48" height="48">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>
    <p class="empty-message">${messages[type]}</p>
  `;
  
  elements.emptyState.classList.remove('hidden');
  
  // Ocultar lista correspondiente
  if (type === 'gpts') {
    elements.gptsList.classList.add('hidden');
  } else {
    elements.promptsList.classList.add('hidden');
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
  // Establecer tab activa
  setActiveTab(state.activeTab);
  
  // Cargar draft si existe
  if (state.draftPrompt) {
    const form = elements.promptForm;
    form.querySelector('[name="title"]').value = state.draftPrompt.title || '';
    form.querySelector('[name="content"]').value = state.draftPrompt.content || '';
    form.querySelector('[name="tags"]').value = state.draftPrompt.tags || '';
    
    showNotification('Borrador recuperado', 'info');
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

// Exportar para testing
export { state, init, showNotification };