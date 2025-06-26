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
  elements.categoryFilterInput = document.getElementById('category-filter-input');
  elements.categoryDropdown = document.getElementById('category-dropdown');
  elements.categorySearch = document.getElementById('category-search');
  elements.categoryOptions = document.getElementById('category-options');
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

  // Filtro de categoría con búsqueda
  setupCategoryDropdown();

  // Modal de prompts
  document.getElementById('modal-close').addEventListener('click', closePromptModal);
  document.getElementById('cancel-btn').addEventListener('click', closePromptModal);
  elements.promptForm.addEventListener('submit', handlePromptSubmit);

  // Botones de header
  document.getElementById('notifications-btn').addEventListener('click', handleNotifications);
  document.getElementById('settings-btn').addEventListener('click', handleSettings);
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
      // Actualizar opciones de categorías después de cargar GPTs
      updateCategoryOptions();
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

    // Obtener notificaciones
    const notifResponse = await chrome.runtime.sendMessage({ type: 'GET_NOTIFICATIONS' });
    if (notifResponse.success) {
      updateNotificationsBadge(notifResponse.data.unread);
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
    console.log('[Panel] Filtering by category:', state.currentCategory);
    console.log('[Panel] GPTs before filter:', items.length);
    items = items.filter(gpt => {
      return gpt.category === state.currentCategory;
    });
    console.log('[Panel] GPTs after filter:', items.length);
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
      <div class="gpt-card-actions">
        <button class="open-btn open-same-tab" data-gpt-url="${escapeHtml(gpt.url)}" title="Abrir en esta pestaña">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M13 7L9 11M9 11L13 15M9 11H21M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11Z" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <button class="open-btn open-new-tab" data-gpt-url="${escapeHtml(gpt.url)}" title="Abrir en nueva pestaña">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Event listeners
  const favoriteBtn = card.querySelector('.favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('[Panel] Favorite button clicked for GPT:', gpt.id);
      await toggleFavorite(gpt.id);
    });
  }

  const openSameTabBtn = card.querySelector('.open-same-tab');
  if (openSameTabBtn) {
    openSameTabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openGPT(gpt.url, false);
    });
  }

  const openNewTabBtn = card.querySelector('.open-new-tab');
  if (openNewTabBtn) {
    openNewTabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openGPT(gpt.url, true);
    });
  }

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
      <button class="open-btn open-same-tab" data-gpt-url="${escapeHtml(gpt.url)}" title="Abrir en esta pestaña">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M13 7L9 11M9 11L13 15M9 11H21M21 11C21 16.5228 16.5228 21 11 21C5.47715 21 1 16.5228 1 11C1 5.47715 5.47715 1 11 1C16.5228 1 21 5.47715 21 11Z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <button class="open-btn open-new-tab" data-gpt-url="${escapeHtml(gpt.url)}" title="Abrir en nueva pestaña">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M10 6H6C4.89543 6 4 6.89543 4 8V18C4 19.1046 4.89543 20 6 20H16C17.1046 20 18 19.1046 18 18V14M14 4H20M20 4V10M20 4L10 14" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  `;

  // Event listeners
  const favoriteBtn = item.querySelector('.favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      console.log('[Panel] Favorite button clicked for GPT:', gpt.id);
      await toggleFavorite(gpt.id);
    });
  }

  const openSameTabBtn = item.querySelector('.open-same-tab');
  if (openSameTabBtn) {
    openSameTabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openGPT(gpt.url, false);
    });
  }

  const openNewTabBtn = item.querySelector('.open-new-tab');
  if (openNewTabBtn) {
    openNewTabBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openGPT(gpt.url, true);
    });
  }

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
    ${prompt.tags && prompt.tags.length > 0
    ? `
      <div class="prompt-tags">
        ${prompt.tags.map(tag => `<span class="prompt-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    `
    : ''}
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
      ${state.currentTab === 'prompts'
    ? '<button class="btn btn-primary" id="create-first-prompt">Crear primer prompt</button>'
    : '<p>Intenta con otros filtros</p>'
}
    </div>
  `;

  // Añadir event listener si es la pestaña de prompts
  if (state.currentTab === 'prompts') {
    const createBtn = document.getElementById('create-first-prompt');
    if (createBtn) {
      createBtn.addEventListener('click', showPromptModal);
    }
  }
}

// Event Handlers

async function handleSearch(e) {
  state.searchQuery = e.target.value.trim();
  console.log('[Panel] Search query:', state.searchQuery);
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

/**
 * Configura el dropdown de categorías con búsqueda
 */
function setupCategoryDropdown() {
  const wrapper = elements.categoryFilterInput.parentElement;

  // Generar opciones de categorías dinámicamente
  updateCategoryOptions();

  // Click en el input para abrir/cerrar
  elements.categoryFilterInput.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCategoryDropdown();
  });

  // Búsqueda en categorías
  elements.categorySearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const options = elements.categoryOptions.querySelectorAll('.category-option');

    options.forEach(option => {
      const text = option.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        option.classList.remove('hidden');
      } else {
        option.classList.add('hidden');
      }
    });
  });

  // Click en una opción
  elements.categoryOptions.addEventListener('click', (e) => {
    const option = e.target.closest('.category-option');
    if (option) {
      selectCategory(option.dataset.value, option.textContent);
    }
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      closeCategoryDropdown();
    }
  });

  // Prevenir que el dropdown se cierre al hacer click dentro
  elements.categoryDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

/**
 * Actualiza las opciones de categorías basado en los GPTs disponibles
 */
function updateCategoryOptions() {
  // Obtener categorías únicas de los GPTs
  const categories = [...new Set(state.gpts.map(gpt => gpt.category))].filter(Boolean);
  
  // Mapeo de categorías en inglés a español
  const categoryTranslations = {
    'Creative': 'Creativo',
    'Productivity': 'Productividad',
    'Programming': 'Programación',
    'Writing': 'Escritura',
    'Research': 'Investigación'
  };
  
  // Limpiar opciones existentes
  elements.categoryOptions.innerHTML = '';
  
  // Añadir opción "Todas las categorías"
  const allOption = document.createElement('div');
  allOption.className = 'category-option';
  allOption.dataset.value = 'all';
  allOption.textContent = 'Todas las categorías';
  elements.categoryOptions.appendChild(allOption);
  
  // Añadir categorías disponibles
  categories.forEach(category => {
    const option = document.createElement('div');
    option.className = 'category-option';
    option.dataset.value = category;
    option.textContent = categoryTranslations[category] || category;
    elements.categoryOptions.appendChild(option);
  });
}

function toggleCategoryDropdown() {
  const wrapper = elements.categoryFilterInput.parentElement;
  const isOpen = wrapper.classList.contains('open');

  if (isOpen) {
    closeCategoryDropdown();
  } else {
    openCategoryDropdown();
  }
}

function openCategoryDropdown() {
  const wrapper = elements.categoryFilterInput.parentElement;
  wrapper.classList.add('open');
  elements.categoryDropdown.style.display = 'flex';
  elements.categorySearch.value = '';
  elements.categorySearch.focus();

  // Mostrar todas las opciones
  const options = elements.categoryOptions.querySelectorAll('.category-option');
  options.forEach(option => {
    option.classList.remove('hidden');
    // Marcar la opción actual como seleccionada
    if (option.dataset.value === state.currentCategory) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

function closeCategoryDropdown() {
  const wrapper = elements.categoryFilterInput.parentElement;
  wrapper.classList.remove('open');
  elements.categoryDropdown.style.display = 'none';
}

function selectCategory(value, text) {
  state.currentCategory = value;
  elements.categoryFilterInput.value = text;
  closeCategoryDropdown();
  renderContent();
}

async function toggleFavorite(gptId) {
  console.log('[Panel] Toggle favorite called for:', gptId);
  try {
    // Obtener todos los botones de favorito para este GPT (puede haber múltiples)
    const buttons = document.querySelectorAll(`[data-gpt-id="${gptId}"]`);
    const isCurrentlyFavorite = state.favorites.includes(gptId);
    
    // Actualización optimista - cambiar UI inmediatamente
    buttons.forEach(btn => {
      if (isCurrentlyFavorite) {
        btn.classList.remove('active');
      } else {
        btn.classList.add('active');
      }
    });

    // Actualizar estado local temporalmente
    if (isCurrentlyFavorite) {
      state.favorites = state.favorites.filter(id => id !== gptId);
    } else {
      state.favorites = [...state.favorites, gptId];
    }

    const response = await chrome.runtime.sendMessage({
      type: 'TOGGLE_FAVORITE',
      gptId
    });

    console.log('[Panel] Toggle favorite response:', response);

    if (response && response.success) {
      state.favorites = response.data;
      console.log('[Panel] Updated favorites:', state.favorites);

      // Si estamos en la pestaña de favoritos, re-renderizar para actualizar la lista
      if (state.currentTab === 'favorites') {
        renderContent();
      }
    } else {
      console.error('[Panel] Toggle favorite failed:', response);
      // Revertir cambio optimista si falla
      buttons.forEach(btn => {
        if (isCurrentlyFavorite) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
      showToast('Error al actualizar favorito', 'error');
    }
  } catch (error) {
    console.error('[Panel] Error toggling favorite:', error);
    // Revertir cambio optimista si hay error
    const buttons = document.querySelectorAll(`[data-gpt-id="${gptId}"]`);
    const isCurrentlyFavorite = state.favorites.includes(gptId);
    buttons.forEach(btn => {
      if (isCurrentlyFavorite) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    showToast('Error al actualizar favorito', 'error');
  }
}

function openGPT(url, newTab = true) {
  if (newTab) {
    chrome.tabs.create({ url });
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url });
      }
    });
  }
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
async function handleNotifications() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_NOTIFICATIONS' });
    if (response.success) {
      showNotificationsModal(response.data.notifications);
    }
  } catch (error) {
    console.error('[Panel] Error getting notifications:', error);
    showToast('Error al cargar notificaciones');
  }
}

function handleSettings() {
  showToast('Configuración próximamente');
}

function updateNotificationsBadge(count) {
  const badge = elements.notificationsBadge;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function showNotificationsModal(notifications) {
  // Crear modal de notificaciones
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Notificaciones</h2>
        <button class="modal-close notification-modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="notifications-list">
          ${notifications.length === 0
    ? '<p class="empty-state">No hay notificaciones nuevas</p>'
    : notifications.map(n => `
                <div class="notification-item ${n.type}" data-id="${n.id}">
                  <div class="notification-icon">${n.icon || '📢'}</div>
                  <div class="notification-content">
                    <h4 class="notification-title">${escapeHtml(n.title)}</h4>
                    <p class="notification-message">${escapeHtml(n.message)}</p>
                    ${n.action_url ? `<a href="${escapeHtml(n.action_url)}" class="notification-link" target="_blank">${escapeHtml(n.action_text || 'Ver más')}</a>` : ''}
                    <span class="notification-time">${formatTime(n.created_at)}</span>
                  </div>
                </div>
              `).join('')
}
        </div>
      </div>
    </div>
  `;

  // Añadir event listener para el botón de cerrar
  const closeBtn = modal.querySelector('.notification-modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
  }

  // Marcar como leídas al abrir
  notifications.forEach(n => {
    chrome.runtime.sendMessage({
      type: 'MARK_NOTIFICATION_READ',
      notificationId: n.id
    });
  });

  // Actualizar badge
  updateNotificationsBadge(0);

  document.body.appendChild(modal);

  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'Ahora mismo';
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} minutos`;
  if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} horas`;
  return date.toLocaleDateString('es-ES');
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
