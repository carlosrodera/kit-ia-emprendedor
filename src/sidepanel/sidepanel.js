/**
 * Kit IA Emprendedor - Side Panel Controller
 * Gestiona toda la UI del panel lateral
 */

// Estado de la aplicación
const state = {
  currentTab: 'all',
  currentView: 'grid',
  currentCategory: 'all',
  searchQuery: '',
  gpts: [],
  favorites: [],
  prompts: [],
  isLoading: true
};

// Elementos del DOM
const elements = {};

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Panel] Initializing...');
  
  // Cachear elementos DOM
  cacheElements();
  
  // Configurar event listeners
  setupEventListeners();
  
  // Cargar datos iniciales
  await loadInitialData();
  
  // Renderizar UI
  renderContent();
});

/**
 * Cachea referencias a elementos DOM
 */
function cacheElements() {
  elements.searchInput = document.getElementById('search-input');
  elements.content = document.getElementById('content');
  elements.tabs = document.querySelectorAll('.tab');
  elements.viewButtons = document.querySelectorAll('.view-btn');
  elements.categoryFilter = document.getElementById('category-filter');
  elements.promptModal = document.getElementById('prompt-modal');
  elements.promptForm = document.getElementById('prompt-form');
  elements.notificationsBadge = document.getElementById('notifications-badge');
}

/**
 * Configura event listeners
 */
function setupEventListeners() {
  // Búsqueda
  elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
  
  // Tabs
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => handleTabChange(tab.dataset.tab));
  });
  
  // Vista
  elements.viewButtons.forEach(btn => {
    btn.addEventListener('click', () => handleViewChange(btn.dataset.view));
  });
  
  // Filtro de categoría
  elements.categoryFilter.addEventListener('change', handleCategoryChange);
  
  // Modal de prompts
  document.getElementById('modal-close').addEventListener('click', closePromptModal);
  document.getElementById('cancel-btn').addEventListener('click', closePromptModal);
  elements.promptForm.addEventListener('submit', handlePromptSubmit);
  
  // Botones de header
  document.getElementById('notifications-btn').addEventListener('click', handleNotifications);
  document.getElementById('settings-btn').addEventListener('click', handleSettings);
  document.getElementById('upgrade-link').addEventListener('click', handleUpgrade);
}

/**
 * Carga datos iniciales
 */
async function loadInitialData() {
  try {
    // Obtener GPTs
    const gptsResponse = await chrome.runtime.sendMessage({ type: 'GET_GPTS' });
    if (gptsResponse.success) {
      state.gpts = gptsResponse.data;
    }
    
    // Obtener favoritos
    const favsResponse = await chrome.runtime.sendMessage({ type: 'GET_FAVORITES' });
    if (favsResponse.success) {
      state.favorites = favsResponse.data;
    }
    
    // Obtener prompts
    const promptsResponse = await chrome.runtime.sendMessage({ type: 'GET_PROMPTS' });
    if (promptsResponse.success) {
      state.prompts = promptsResponse.data;
    }
    
    state.isLoading = false;
  } catch (error) {
    console.error('[Panel] Error loading data:', error);
    state.isLoading = false;
  }
}

/**
 * Renderiza el contenido principal
 */
function renderContent() {
  if (state.isLoading) {
    return;
  }
  
  const items = getFilteredItems();
  
  if (items.length === 0) {
    renderEmptyState();
    return;
  }
  
  if (state.currentTab === 'prompts') {
    renderPrompts(items);
  } else {
    renderGPTs(items);
  }
}

/**
 * Obtiene items filtrados según el estado actual
 */
function getFilteredItems() {
  let items = [];
  
  // Seleccionar items según tab
  switch (state.currentTab) {
    case 'favorites':
      items = state.gpts.filter(gpt => state.favorites.includes(gpt.id));
      break;
    case 'prompts':
      items = state.prompts;
      break;
    default:
      items = state.gpts;
  }
  
  // Aplicar búsqueda
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    items = items.filter(item => {
      const searchText = `${item.name} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase();
      return searchText.includes(query);
    });
  }
  
  // Aplicar filtro de categoría (solo para GPTs)
  if (state.currentTab !== 'prompts' && state.currentCategory !== 'all') {
    items = items.filter(gpt => gpt.category === state.currentCategory);
  }
  
  return items;
}

/**
 * Renderiza GPTs
 */
function renderGPTs(gpts) {
  const isGrid = state.currentView === 'grid';
  const container = document.createElement('div');
  container.className = isGrid ? 'gpts-grid' : 'gpts-list';
  
  gpts.forEach(gpt => {
    const element = isGrid ? createGPTCard(gpt) : createGPTListItem(gpt);
    container.appendChild(element);
  });
  
  elements.content.innerHTML = '';
  elements.content.appendChild(container);
}

/**
 * Crea una tarjeta de GPT
 */
function createGPTCard(gpt) {
  const isFavorite = state.favorites.includes(gpt.id);
  
  const card = document.createElement('div');
  card.className = 'gpt-card';
  card.innerHTML = `
    <div class="gpt-card-header">
      <h3 class="gpt-card-title">${escapeHtml(gpt.name)}</h3>
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}">
        ⭐
      </button>
    </div>
    <p class="gpt-card-description">${escapeHtml(gpt.description)}</p>
    <div class="gpt-card-footer">
      <span class="gpt-card-badge">${escapeHtml(gpt.category)}</span>
      <button class="open-btn" data-gpt-url="${escapeHtml(gpt.url)}">
        Abrir →
      </button>
    </div>
  `;
  
  // Event listeners
  card.querySelector('.favorite-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(gpt.id);
  });
  
  card.querySelector('.open-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openGPT(gpt.url);
  });
  
  return card;
}

/**
 * Crea un item de lista de GPT
 */
function createGPTListItem(gpt) {
  const isFavorite = state.favorites.includes(gpt.id);
  
  const item = document.createElement('div');
  item.className = 'gpt-list-item';
  item.innerHTML = `
    <div class="gpt-list-content">
      <h3 class="gpt-list-title">${escapeHtml(gpt.name)}</h3>
      <p class="gpt-list-description">${escapeHtml(gpt.description)}</p>
    </div>
    <div class="gpt-list-actions">
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}">
        ⭐
      </button>
      <button class="open-btn" data-gpt-url="${escapeHtml(gpt.url)}">
        Abrir
      </button>
    </div>
  `;
  
  // Event listeners
  item.querySelector('.favorite-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(gpt.id);
  });
  
  item.querySelector('.open-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openGPT(gpt.url);
  });
  
  return item;
}

/**
 * Renderiza prompts
 */
function renderPrompts(prompts) {
  const container = document.createElement('div');
  container.className = 'prompts-container';
  
  prompts.forEach(prompt => {
    container.appendChild(createPromptCard(prompt));
  });
  
  // Botón flotante para añadir prompt
  const addBtn = document.createElement('button');
  addBtn.className = 'add-prompt-btn';
  addBtn.innerHTML = '+';
  addBtn.addEventListener('click', () => showPromptModal());
  
  elements.content.innerHTML = '';
  elements.content.appendChild(container);
  elements.content.appendChild(addBtn);
}

/**
 * Crea una tarjeta de prompt
 */
function createPromptCard(prompt) {
  const card = document.createElement('div');
  card.className = 'prompt-card';
  card.innerHTML = `
    <div class="prompt-header">
      <h3 class="prompt-title">${escapeHtml(prompt.name)}</h3>
      <div class="prompt-actions">
        <button class="icon-btn" title="Copiar" data-action="copy" data-prompt-id="${prompt.id}">
          📋
        </button>
        <button class="icon-btn" title="Editar" data-action="edit" data-prompt-id="${prompt.id}">
          ✏️
        </button>
        <button class="icon-btn" title="Eliminar" data-action="delete" data-prompt-id="${prompt.id}">
          🗑️
        </button>
      </div>
    </div>
    <p class="prompt-content">${escapeHtml(prompt.content)}</p>
    ${prompt.tags && prompt.tags.length > 0 ? `
      <div class="prompt-tags">
        ${prompt.tags.map(tag => `<span class="prompt-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    ` : ''}
  `;
  
  // Event listeners
  card.querySelectorAll('.prompt-actions button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const promptId = btn.dataset.promptId;
      handlePromptAction(action, promptId);
    });
  });
  
  return card;
}

/**
 * Renderiza estado vacío
 */
function renderEmptyState() {
  let message = '';
  let emoji = '';
  
  switch (state.currentTab) {
    case 'favorites':
      message = 'No tienes GPTs favoritos';
      emoji = '⭐';
      break;
    case 'prompts':
      message = 'No tienes prompts guardados';
      emoji = '📝';
      break;
    default:
      message = 'No se encontraron GPTs';
      emoji = '🔍';
  }
  
  elements.content.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">${emoji}</div>
      <h3>${message}</h3>
      ${state.currentTab === 'prompts' ? 
        '<button class="btn btn-primary" onclick="showPromptModal()">Crear primer prompt</button>' : 
        '<p>Intenta con otros filtros</p>'
      }
    </div>
  `;
}

// Event Handlers

async function handleSearch(e) {
  state.searchQuery = e.target.value.trim();
  renderContent();
}

function handleTabChange(tab) {
  state.currentTab = tab;
  
  // Actualizar UI
  elements.tabs.forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  // Re-renderizar
  renderContent();
}

function handleViewChange(view) {
  state.currentView = view;
  
  // Actualizar UI
  elements.viewButtons.forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`).classList.add('active');
  
  // Re-renderizar
  renderContent();
}

function handleCategoryChange(e) {
  state.currentCategory = e.target.value;
  renderContent();
}

async function toggleFavorite(gptId) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TOGGLE_FAVORITE',
      gptId: gptId
    });
    
    if (response.success) {
      state.favorites = response.data;
      renderContent();
    }
  } catch (error) {
    console.error('[Panel] Error toggling favorite:', error);
  }
}

function openGPT(url) {
  chrome.tabs.create({ url });
}

async function handlePromptAction(action, promptId) {
  switch (action) {
    case 'copy':
      const prompt = state.prompts.find(p => p.id === promptId);
      if (prompt) {
        try {
          await navigator.clipboard.writeText(prompt.content);
          showToast('Prompt copiado al portapapeles');
        } catch (error) {
          console.error('Error copiando:', error);
        }
      }
      break;
      
    case 'edit':
      const promptToEdit = state.prompts.find(p => p.id === promptId);
      if (promptToEdit) {
        showPromptModal(promptToEdit);
      }
      break;
      
    case 'delete':
      if (confirm('¿Eliminar este prompt?')) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'DELETE_PROMPT',
            id: promptId
          });
          
          if (response.success) {
            state.prompts = state.prompts.filter(p => p.id !== promptId);
            renderContent();
            showToast('Prompt eliminado');
          }
        } catch (error) {
          console.error('[Panel] Error deleting prompt:', error);
        }
      }
      break;
  }
}

// Modal functions
function showPromptModal(prompt = null) {
  const isEdit = !!prompt;
  
  document.getElementById('modal-title').textContent = isEdit ? 'Editar Prompt' : 'Nuevo Prompt';
  document.getElementById('prompt-name').value = prompt?.name || '';
  document.getElementById('prompt-content').value = prompt?.content || '';
  document.getElementById('prompt-tags').value = prompt?.tags?.join(', ') || '';
  
  elements.promptModal.dataset.promptId = prompt?.id || '';
  elements.promptModal.style.display = 'flex';
}

function closePromptModal() {
  elements.promptModal.style.display = 'none';
  elements.promptForm.reset();
}

async function handlePromptSubmit(e) {
  e.preventDefault();
  
  const promptId = elements.promptModal.dataset.promptId;
  const promptData = {
    id: promptId || undefined,
    name: document.getElementById('prompt-name').value.trim(),
    content: document.getElementById('prompt-content').value.trim(),
    tags: document.getElementById('prompt-tags').value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag)
  };
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_PROMPT',
      data: promptData
    });
    
    if (response.success) {
      // Actualizar estado local
      if (promptId) {
        const index = state.prompts.findIndex(p => p.id === promptId);
        if (index > -1) {
          state.prompts[index] = response.data;
        }
      } else {
        state.prompts.push(response.data);
      }
      
      closePromptModal();
      renderContent();
      showToast(promptId ? 'Prompt actualizado' : 'Prompt creado');
    }
  } catch (error) {
    console.error('[Panel] Error saving prompt:', error);
    showToast('Error al guardar prompt', 'error');
  }
}

// Otras funciones
function handleNotifications() {
  showToast('Sistema de notificaciones próximamente');
}

function handleSettings() {
  showToast('Configuración próximamente');
}

function handleUpgrade() {
  showToast('Sistema de planes próximamente');
}

// Utilidades
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

function showToast(message, type = 'success') {
  // Implementación simple de toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#EF4444' : '#10B981'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 2000;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Hacer showPromptModal global para el botón en empty state
window.showPromptModal = showPromptModal;