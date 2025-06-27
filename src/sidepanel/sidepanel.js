/**
 * Kit IA Emprendedor - Side Panel Controller
 * Gestiona toda la UI del panel lateral usando arquitectura modular
 * 
 * @author Kit IA Emprendedor
 * @version 2.0.0
 * @since 2025-01-21
 */

// Módulos globales
let favoritesManager = null;
let moduleLoader = null;
let authModule = null;

// Estado de la aplicación
const state = {
  currentTab: 'all',
  currentView: 'grid',
  currentCategory: 'all',
  searchQuery: '',
  gpts: [],
  favorites: [],
  prompts: [],
  isLoading: true,
  modulesLoaded: false,
  isAuthenticated: false,
  currentUser: null,
  // Multi-select state
  isSelectMode: false,
  selectedPrompts: new Set()
};

// Elementos del DOM
const elements = {};

/**
 * Inicializa el sistema de módulos
 * DEBE ejecutarse antes que cualquier otra funcionalidad
 * 
 * @async
 * @returns {Promise<boolean>} true si se inicializaron correctamente
 */
async function initializeModules() {
  try {
    console.log('[Panel] Loading modules...');
    
    // Cargar module loader usando ruta absoluta
    const moduleLoaderPath = chrome.runtime.getURL('sidepanel/modules/module-loader.js');
    const loaderModule = await import(moduleLoaderPath);
    moduleLoader = loaderModule.moduleLoader;
    
    // Inicializar module loader
    await moduleLoader.init();
    
    // Cargar módulo de autenticación
    try {
      const authPath = chrome.runtime.getURL('shared/auth.js');
      const authImport = await import(authPath);
      authModule = authImport.auth;
      await authModule.initialize();
      console.log('[Panel] Auth module loaded');
    } catch (authError) {
      console.error('[Panel] Failed to load auth module:', authError);
      // Continuar sin auth por ahora
    }
    
    // Cargar módulo de favoritos
    const favoritesModule = await moduleLoader.load('favorites');
    favoritesManager = favoritesModule.favoritesManager;
    
    // Inicializar favoritos
    await favoritesManager.init();
    
    state.modulesLoaded = true;
    console.log('[Panel] Modules loaded successfully');
    
    return true;
    
  } catch (error) {
    console.error('[Panel] Failed to load modules:', error);
    
    // Fallback: usar implementación simple en línea
    await initializeFallbackFavorites();
    
    return false;
  }
}

/**
 * Implementación fallback simple de favoritos
 * Se usa si falla la carga modular
 * 
 * @async
 */
async function initializeFallbackFavorites() {
  console.log('[Panel] Using fallback favorites implementation');
  
  // Implementación mínima inline
  const favorites = new Set();
  
  // Cargar desde storage
  try {
    const result = await chrome.storage.local.get('favorites');
    if (result.favorites && Array.isArray(result.favorites)) {
      result.favorites.forEach(id => favorites.add(id));
    }
  } catch (error) {
    console.error('[Panel] Fallback favorites load failed:', error);
  }
  
  // Crear objeto compatible con API de FavoritesManager
  favoritesManager = {
    isFavorite: (id) => favorites.has(id),
    toggle: async (id) => {
      const wasRemoved = favorites.delete(id);
      if (!wasRemoved) {
        favorites.add(id);
      }
      
      // Guardar en storage
      try {
        await chrome.storage.local.set({ favorites: Array.from(favorites) });
      } catch (error) {
        console.error('[Panel] Fallback save failed:', error);
      }
      
      return favorites.has(id);
    },
    getAll: () => Array.from(favorites),
    init: async () => true
  };
  
  state.modulesLoaded = true;
}

/**
 * Verifica el estado de autenticación
 * @returns {Promise<boolean>} true si está autenticado
 */
async function checkAuthentication() {
  // TEMPORAL: Modo desarrollo mientras arreglamos el problema de env vars
  const DEV_MODE = true; // Temporalmente activado para continuar desarrollo
  
  if (DEV_MODE) {
    console.warn('[Panel] 🔧 DEVELOPMENT MODE - Auth bypassed temporalmente');
    state.isAuthenticated = true;
    state.currentUser = {
      email: 'dev@kitiaemprendedor.com',
      id: 'dev-user-001',
      created_at: new Date().toISOString()
    };
    updateUserAvatar();
    
    // Cargar GPTs desde el service worker
    loadInitialData();
    return true;
  }
  
  if (!authModule) {
    console.error('[Panel] Auth module not loaded - BLOCKING ACCESS');
    showAuthRequiredScreen();
    return false; // BLOQUEAR acceso sin auth
  }
  
  try {
    const isAuthenticated = authModule.isAuthenticated();
    const user = authModule.getCurrentUser();
    
    console.log('[Panel] Auth status:', { isAuthenticated, user: user?.email });
    
    state.isAuthenticated = isAuthenticated;
    state.currentUser = user;
    
    if (!isAuthenticated) {
      showLoginScreen();
      return false;
    }
    
    // Actualizar avatar del usuario
    updateUserAvatar();
    
    return true;
  } catch (error) {
    console.error('[Panel] Error checking authentication:', error);
    showAuthRequiredScreen();
    return false; // BLOQUEAR acceso en caso de error
  }
}

/**
 * Muestra pantalla de error de autenticación
 */
function showAuthRequiredScreen() {
  const errorHtml = `
    <div class="auth-error-screen">
      <div class="auth-error-container">
        <div class="auth-error-header">
          <img src="../assets/icons/icon-128.svg" alt="Kit IA Emprendedor" width="64" height="64">
          <h1>Kit IA Emprendedor</h1>
          <h2>🔒 Producto Premium</h2>
          <p>Se requiere autenticación para acceder</p>
        </div>
        
        <div class="auth-error-content">
          <div class="error-message">
            <h3>⚠️ Error de Sistema</h3>
            <p>No se pudo cargar el módulo de autenticación.</p>
            <p>Por favor, recarga la extensión o contacta soporte.</p>
          </div>
          
          <div class="auth-error-actions">
            <button id="reload-extension-btn" class="btn-primary">
              🔄 Recargar Extensión
            </button>
            <button id="open-login-page-btn" class="btn-secondary">
              🔑 Abrir Login
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Reemplazar todo el contenido del panel
  document.body.innerHTML = errorHtml;
  
  // Configurar event listeners
  const reloadBtn = document.getElementById('reload-extension-btn');
  const openLoginBtn = document.getElementById('open-login-page-btn');
  
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => location.reload());
  }
  
  if (openLoginBtn) {
    openLoginBtn.addEventListener('click', () => {
      const loginUrl = chrome.runtime.getURL('auth/login.html');
      chrome.tabs.create({ url: loginUrl });
    });
  }
}

/**
 * Muestra la pantalla de login
 */
function showLoginScreen() {
  const loginHtml = `
    <div class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <img src="../assets/icons/icon-128.svg" alt="Kit IA Emprendedor" width="64" height="64">
          <h1>Kit IA Emprendedor</h1>
          <p>Accede a tu cuenta premium</p>
        </div>
        
        <div class="login-content">
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="tu@email.com"
                required
                autocomplete="email"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Contraseña</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
            </div>
            
            <button type="submit" class="btn btn-primary" id="login-btn">
              Iniciar Sesión
            </button>
          </form>
          
          <div class="auth-divider">
            <span>¿No tienes cuenta?</span>
          </div>
          
          <button id="show-register-btn" class="btn btn-secondary">
            Crear Cuenta
          </button>
          
          <div class="auth-footer">
            <a href="#" id="forgot-password-link">¿Olvidaste tu contraseña?</a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Reemplazar todo el contenido del panel
  document.body.innerHTML = loginHtml;
  
  // Configurar event listeners para login
  setupLoginEventListeners();
}

/**
 * Configura event listeners para la pantalla de login
 */
function setupLoginEventListeners() {
  const loginForm = document.getElementById('login-form');
  const showRegisterBtn = document.getElementById('show-register-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleEmailLogin);
  }
  
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', showRegisterScreen);
  }
  
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Función de recuperación próximamente', 'info');
    });
  }
}

/**
 * Maneja login con email y password
 */
async function handleEmailLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (!authModule) {
    showToast('Sistema de autenticación no disponible', 'error');
    return;
  }
  
  try {
    showToast('Iniciando sesión...', 'info');
    await authModule.signInWithEmail(email, password);
    
    // Actualizar estado y avatar
    state.isAuthenticated = true;
    state.currentUser = authModule.getCurrentUser();
    updateUserAvatar();
    
    // Recargar la página después del login exitoso
    location.reload();
  } catch (error) {
    console.error('[Panel] Email login error:', error);
    showToast(error.message || 'Error al iniciar sesión', 'error');
  }
}

/**
 * Muestra pantalla de registro
 */
function showRegisterScreen() {
  const registerHtml = `
    <div class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <img src="../assets/icons/icon-128.svg" alt="Kit IA Emprendedor" width="64" height="64">
          <h1>Kit IA Emprendedor</h1>
          <p>Crea tu cuenta premium</p>
        </div>
        
        <div class="login-content">
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label for="register-email">Email</label>
              <input 
                type="email" 
                id="register-email" 
                name="email" 
                placeholder="tu@email.com"
                required
                autocomplete="email"
              />
            </div>
            
            <div class="form-group">
              <label for="register-password">Contraseña</label>
              <input 
                type="password" 
                id="register-password" 
                name="password" 
                placeholder="Mínimo 8 caracteres"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </div>
            
            <div class="form-group">
              <label for="register-password-confirm">Confirmar Contraseña</label>
              <input 
                type="password" 
                id="register-password-confirm" 
                name="password-confirm" 
                placeholder="Repite la contraseña"
                required
                minlength="8"
                autocomplete="new-password"
              />
            </div>
            
            <button type="submit" class="btn btn-primary" id="register-btn">
              Crear Cuenta
            </button>
          </form>
          
          <div class="auth-divider">
            <span>¿Ya tienes cuenta?</span>
          </div>
          
          <button id="show-login-btn" class="btn btn-secondary">
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.innerHTML = registerHtml;
  setupRegisterEventListeners();
}

/**
 * Configura event listeners para registro
 */
function setupRegisterEventListeners() {
  const registerForm = document.getElementById('register-form');
  const showLoginBtn = document.getElementById('show-login-btn');
  
  if (registerForm) {
    registerForm.addEventListener('submit', handleEmailRegister);
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', showLoginScreen);
  }
}

/**
 * Maneja registro con email
 */
async function handleEmailRegister(e) {
  e.preventDefault();
  
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const passwordConfirm = document.getElementById('register-password-confirm').value;
  
  if (password !== passwordConfirm) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }
  
  if (!authModule) {
    showToast('Sistema de autenticación no disponible', 'error');
    return;
  }
  
  try {
    showToast('Creando cuenta...', 'info');
    await authModule.signUpWithEmail(email, password);
    
    showToast('Cuenta creada exitosamente', 'success');
    
    // Cambiar a pantalla de login
    setTimeout(() => {
      showLoginScreen();
    }, 1500);
  } catch (error) {
    console.error('[Panel] Email register error:', error);
    showToast(error.message || 'Error al crear cuenta', 'error');
  }
}

/**
 * Abre la página de login completa
 */
function handleOpenLoginPage() {
  const loginUrl = chrome.runtime.getURL('auth/login.html');
  chrome.tabs.create({ url: loginUrl });
}

// Inicialización principal
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Panel] Initializing...');

  // Inicializar módulos primero
  await initializeModules();
  
  // Verificar autenticación antes de continuar
  const isAuthenticated = await checkAuthentication();
  
  if (!isAuthenticated) {
    // La función showLoginScreen ya se ejecutó en checkAuthentication
    return;
  }

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
  elements.userProfileBtn = document.getElementById('user-profile-btn');
  elements.userInitials = document.getElementById('user-initials');
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
  elements.userProfileBtn.addEventListener('click', handleUserProfile);
}

/**
 * Carga datos iniciales
 */
async function loadInitialData() {
  try {
    // Obtener GPTs
    const gptsResponse = await chrome.runtime.sendMessage({ type: 'GET_GPTS' });
    console.log('[Panel] GPTs loaded:', gptsResponse);
    if (gptsResponse.success) {
      state.gpts = gptsResponse.data;
      // Actualizar opciones de categorías después de cargar GPTs
      updateCategoryOptions();
    }

    // Obtener favoritos del manager
    try {
      state.favorites = favoritesManager.getAll();
      console.log('[Panel] Current favorites:', state.favorites);
    } catch (error) {
      console.warn('[Panel] Error getting favorites:', error);
      state.favorites = [];
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
      items = state.gpts.filter(gpt => favoritesManager.isFavorite(gpt.id));
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
  // Verificar estado actual del favorito directamente del manager
  const isFavorite = favoritesManager.isFavorite(gpt.id);
  console.log(`[Panel] Creating card for ${gpt.id}, isFavorite: ${isFavorite}, manager has: ${favoritesManager.getAll().join(', ')}`);

  const card = document.createElement('div');
  card.className = 'gpt-card';
  card.innerHTML = `
    <div class="gpt-card-header">
      <h3 class="gpt-card-title">${escapeHtml(gpt.name)}</h3>
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
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

  // Event listeners - Usar delegación mejorada
  const favoriteBtn = card.querySelector('.favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', handleFavoriteClick);
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
  // Verificar estado actual del favorito directamente del manager
  const isFavorite = favoritesManager.isFavorite(gpt.id);
  console.log(`[Panel] Creating list item for ${gpt.id}, isFavorite: ${isFavorite}, manager has: ${favoritesManager.getAll().join(', ')}`);

  const item = document.createElement('div');
  item.className = 'gpt-list-item';
  item.innerHTML = `
    <div class="gpt-list-content">
      <h3 class="gpt-list-title">${escapeHtml(gpt.name)}</h3>
      <p class="gpt-list-description">${escapeHtml(gpt.description)}</p>
    </div>
    <div class="gpt-list-actions">
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-gpt-id="${gpt.id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
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

  // Event listeners - Usar delegación mejorada
  const favoriteBtn = item.querySelector('.favorite-btn');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', handleFavoriteClick);
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

  // Barra de herramientas para multi-selección
  const toolbar = createMultiSelectToolbar();
  container.appendChild(toolbar);

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
  if (state.selectedPrompts.has(prompt.id)) {
    card.classList.add('selected');
  }
  
  card.innerHTML = `
    ${state.isSelectMode ? `
      <input type="checkbox" 
             class="prompt-checkbox" 
             data-prompt-id="${prompt.id}"
             ${state.selectedPrompts.has(prompt.id) ? 'checked' : ''}>
    ` : ''}
    <div class="prompt-content-wrapper ${state.isSelectMode ? 'with-checkbox' : ''}">
      <div class="prompt-header">
        <h3 class="prompt-title">${escapeHtml(prompt.name)}</h3>
        <div class="prompt-actions">
          <button class="favorite-btn prompt-favorite ${prompt.favorite ? 'active' : ''}" 
                  title="${prompt.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}" 
                  data-prompt-id="${prompt.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
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
    </div>
  `;

  // Event listener para checkbox
  const checkbox = card.querySelector('.prompt-checkbox');
  if (checkbox) {
    checkbox.addEventListener('change', (e) => {
      handlePromptSelection(prompt.id, e.target.checked);
    });
  }

  // Event listener para el botón de favorito
  const favoriteBtn = card.querySelector('.prompt-favorite');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', handlePromptFavoriteClick);
  }
  
  // Event listeners para las demás acciones
  card.querySelectorAll('.prompt-actions button:not(.prompt-favorite)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const promptId = btn.dataset.promptId;
      handlePromptAction(action, promptId);
    });
  });

  return card;
}

/**
 * Crea la barra de herramientas para multi-selección
 */
function createMultiSelectToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'multi-select-toolbar';
  toolbar.innerHTML = `
    <div class="multi-select-left">
      <button class="btn-text ${state.isSelectMode ? 'active' : ''}" id="toggle-select-mode">
        ${state.isSelectMode ? 'Cancelar selección' : 'Seleccionar múltiples'}
      </button>
      ${state.isSelectMode ? `
        <span class="selection-count">${state.selectedPrompts.size} seleccionados</span>
      ` : ''}
    </div>
    ${state.isSelectMode && state.selectedPrompts.size > 0 ? `
      <div class="multi-select-actions">
        <button class="btn-text" id="select-all">Seleccionar todos</button>
        <button class="btn-text" id="deselect-all">Deseleccionar todos</button>
        <button class="btn btn-secondary" id="export-selected">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="currentColor" stroke-width="2"/>
            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
          </svg>
          Exportar seleccionados
        </button>
        <button class="btn btn-danger" id="delete-selected">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2"/>
            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2"/>
          </svg>
          Eliminar seleccionados
        </button>
      </div>
    ` : ''}
  `;

  // Event listeners
  const toggleBtn = toolbar.querySelector('#toggle-select-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSelectMode);
  }

  const selectAllBtn = toolbar.querySelector('#select-all');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', selectAllPrompts);
  }

  const deselectAllBtn = toolbar.querySelector('#deselect-all');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', deselectAllPrompts);
  }

  const exportBtn = toolbar.querySelector('#export-selected');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportSelectedPrompts);
  }

  const deleteBtn = toolbar.querySelector('#delete-selected');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', deleteSelectedPrompts);
  }

  return toolbar;
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


/**
 * Actualiza TODAS las estrellas de favoritos para un GPT específico
 * @param {string} gptId - ID del GPT
 * @param {boolean} isFavorite - Si es favorito o no
 */
function updateAllFavoriteButtons(gptId, isFavorite) {
  // Buscar TODOS los botones de favorito para este GPT
  const favoriteButtons = document.querySelectorAll(`button.favorite-btn[data-gpt-id="${gptId}"]`);
  
  console.log(`[Panel] Updating ${favoriteButtons.length} favorite buttons for GPT ${gptId}`);
  
  favoriteButtons.forEach(button => {
    if (isFavorite) {
      button.classList.add('active');
      console.log(`[Panel] Added active class to button for ${gptId}`);
    } else {
      button.classList.remove('active');
      console.log(`[Panel] Removed active class from button for ${gptId}`);
    }
  });
}

/**
 * Actualiza TODAS las estrellas de favoritos para un Prompt específico
 * @param {string} promptId - ID del Prompt
 * @param {boolean} isFavorite - Si es favorito o no
 */
function updateAllPromptFavoriteButtons(promptId, isFavorite) {
  // Buscar TODOS los botones de favorito para este Prompt
  const favoriteButtons = document.querySelectorAll(`button.prompt-favorite[data-prompt-id="${promptId}"]`);
  
  console.log(`[Panel] Updating ${favoriteButtons.length} favorite buttons for Prompt ${promptId}`);
  
  favoriteButtons.forEach(button => {
    if (isFavorite) {
      button.classList.add('active');
      button.title = 'Quitar de favoritos';
    } else {
      button.classList.remove('active');
      button.title = 'Añadir a favoritos';
    }
  });
}

/**
 * Manejador unificado para clicks en favoritos
 */
async function handleFavoriteClick(e) {
  e.stopPropagation();
  e.preventDefault();
  
  const button = e.currentTarget;
  const gptId = button.dataset.gptId;
  
  if (!gptId) {
    console.error('[Panel] No GPT ID found on button');
    return;
  }
  
  console.log('[Panel] Favorite clicked:', gptId);
  
  // Desactivar TODOS los botones de este GPT temporalmente
  const allButtons = document.querySelectorAll(`button.favorite-btn[data-gpt-id="${gptId}"]`);
  allButtons.forEach(btn => btn.disabled = true);
  
  try {
    // Debug state ANTES del toggle
    console.log('[Panel] BEFORE toggle:', {
      gptId,
      wasFavorite: favoritesManager.isFavorite(gptId),
      buttonClass: button.className
    });
    
    // Toggle en el manager
    const isFavorite = await favoritesManager.toggle(gptId);
    
    // Debug state DESPUÉS del toggle
    console.log('[Panel] AFTER toggle:', {
      gptId,
      isNowFavorite: isFavorite,
      managerConfirms: favoritesManager.isFavorite(gptId)
    });
    
    // Actualizar estado local inmediatamente
    state.favorites = favoritesManager.getAll();
    
    // Si estamos en favoritos y se eliminó, re-renderizar para quitar el item
    if (state.currentTab === 'favorites' && !isFavorite) {
      console.log('[Panel] Re-rendering favorites because item was removed');
      // Usar setTimeout para dar tiempo a que se actualice el storage
      setTimeout(() => renderContent(), 100);
    } else {
      // Si no necesitamos re-renderizar, actualizar TODAS las estrellas de este GPT
      updateAllFavoriteButtons(gptId, isFavorite);
    }
    
    // Mostrar feedback visual
    showToast(isFavorite ? '⭐ Añadido a favoritos' : '💫 Eliminado de favoritos');
    
  } catch (error) {
    console.error('[Panel] Error toggling favorite:', error);
    showToast('Error al actualizar favorito', 'error');
  } finally {
    // Re-habilitar TODOS los botones
    allButtons.forEach(btn => btn.disabled = false);
  }
}

/**
 * Manejador para clicks en favoritos de prompts
 */
async function handlePromptFavoriteClick(e) {
  e.stopPropagation();
  e.preventDefault();
  
  const button = e.currentTarget;
  const promptId = button.dataset.promptId;
  
  if (!promptId) {
    console.error('[Panel] No Prompt ID found on button');
    return;
  }
  
  console.log('[Panel] Prompt favorite clicked:', promptId);
  
  // Desactivar el botón temporalmente
  button.disabled = true;
  
  try {
    // Hacer toggle del favorito
    const response = await chrome.runtime.sendMessage({
      type: 'TOGGLE_PROMPT_FAVORITE',
      promptId: promptId
    });
    
    if (response.success) {
      const updatedPrompt = response.data;
      console.log('[Panel] Prompt favorite toggled:', updatedPrompt);
      
      // Actualizar el prompt en el estado local
      const promptIndex = state.prompts.findIndex(p => p.id === promptId);
      if (promptIndex > -1) {
        state.prompts[promptIndex] = updatedPrompt;
      }
      
      // Actualizar la UI
      updateAllPromptFavoriteButtons(promptId, updatedPrompt.favorite);
      
      // Mostrar feedback
      showToast(updatedPrompt.favorite ? '⭐ Prompt añadido a favoritos' : '💫 Prompt eliminado de favoritos');
    }
  } catch (error) {
    console.error('[Panel] Error toggling prompt favorite:', error);
    showToast('Error al actualizar favorito', 'error');
  } finally {
    // Re-habilitar el botón
    button.disabled = false;
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

// Multi-select Functions

/**
 * Alterna el modo de selección múltiple
 */
function toggleSelectMode() {
  state.isSelectMode = !state.isSelectMode;
  
  // Limpiar selección al salir del modo
  if (!state.isSelectMode) {
    state.selectedPrompts.clear();
  }
  
  // Re-renderizar para mostrar/ocultar checkboxes
  renderContent();
}

/**
 * Maneja la selección/deselección de un prompt
 */
function handlePromptSelection(promptId, isSelected) {
  if (isSelected) {
    state.selectedPrompts.add(promptId);
  } else {
    state.selectedPrompts.delete(promptId);
  }
  
  // Actualizar la clase visual
  const checkbox = document.querySelector(`.prompt-checkbox[data-prompt-id="${promptId}"]`);
  if (checkbox) {
    const card = checkbox.closest('.prompt-card');
    if (card) {
      card.classList.toggle('selected', isSelected);
    }
  }
  
  // Re-renderizar la toolbar para actualizar el contador
  renderContent();
}

/**
 * Selecciona todos los prompts visibles
 */
function selectAllPrompts() {
  const filteredData = getFilteredData();
  
  if (state.currentTab === 'prompts') {
    filteredData.forEach(prompt => {
      state.selectedPrompts.add(prompt.id);
    });
    renderContent();
  }
}

/**
 * Deselecciona todos los prompts
 */
function deselectAllPrompts() {
  state.selectedPrompts.clear();
  renderContent();
}

/**
 * Exporta los prompts seleccionados a un archivo TXT
 */
function exportSelectedPrompts() {
  const selectedPromptsList = state.prompts.filter(p => 
    state.selectedPrompts.has(p.id)
  );
  
  if (selectedPromptsList.length === 0) {
    showToast('No hay prompts seleccionados', 'error');
    return;
  }
  
  // Crear contenido del archivo
  let content = '=== KIT IA EMPRENDEDOR - PROMPTS EXPORTADOS ===\n';
  content += `Fecha: ${new Date().toLocaleString('es-ES')}\n`;
  content += `Total: ${selectedPromptsList.length} prompts\n`;
  content += '\n' + '='.repeat(50) + '\n\n';
  
  selectedPromptsList.forEach((prompt, index) => {
    content += `PROMPT ${index + 1}: ${prompt.name}\n`;
    content += '-'.repeat(prompt.name.length + 10) + '\n';
    content += prompt.content + '\n';
    
    if (prompt.tags && prompt.tags.length > 0) {
      content += `\nTags: ${prompt.tags.join(', ')}\n`;
    }
    
    content += '\n' + '='.repeat(50) + '\n\n';
  });
  
  // Crear blob y descargar
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `prompts_kit_ia_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`\u2713 ${selectedPromptsList.length} prompts exportados`);
  
  // Limpiar selección
  deselectAllPrompts();
}

/**
 * Elimina los prompts seleccionados
 */
async function deleteSelectedPrompts() {
  const selectedCount = state.selectedPrompts.size;
  
  if (selectedCount === 0) {
    showToast('No hay prompts seleccionados', 'error');
    return;
  }
  
  if (!confirm(`¿Eliminar ${selectedCount} prompts seleccionados?`)) {
    return;
  }
  
  try {
    // Eliminar cada prompt seleccionado
    for (const promptId of state.selectedPrompts) {
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_PROMPT',
        id: promptId
      });
      
      if (response.success) {
        // Eliminar del estado local
        state.prompts = state.prompts.filter(p => p.id !== promptId);
      }
    }
    
    showToast(`\u2713 ${selectedCount} prompts eliminados`);
    
    // Limpiar selección y salir del modo
    state.selectedPrompts.clear();
    state.isSelectMode = false;
    renderContent();
    
  } catch (error) {
    console.error('[Panel] Error deleting prompts:', error);
    showToast('Error al eliminar prompts', 'error');
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

/**
 * Maneja click en el perfil de usuario
 */
function handleUserProfile() {
  if (!authModule || !state.isAuthenticated) {
    showToast('Usuario no autenticado', 'error');
    return;
  }
  
  showUserProfileModal();
}

/**
 * Muestra el modal de perfil de usuario
 */
function showUserProfileModal() {
  const user = state.currentUser;
  
  const profileHtml = `
    <div class="modal" id="profile-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Perfil de Usuario</h2>
          <button class="modal-close" id="profile-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="profile-info">
            <div class="profile-avatar">
              <div class="user-avatar large">
                <span class="user-initials">${getUserInitials(user?.email)}</span>
              </div>
            </div>
            <div class="profile-details">
              <h3>${user?.email || 'Usuario'}</h3>
              <p class="profile-email">${user?.email || 'Sin email'}</p>
              <p class="profile-joined">Miembro desde: ${formatDate(user?.created_at)}</p>
            </div>
          </div>
          
          <div class="profile-actions">
            <button class="btn btn-danger" id="logout-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" stroke-width="2"/>
                <path d="M16 17L21 12L16 7" stroke="currentColor" stroke-width="2"/>
                <path d="M21 12H9" stroke="currentColor" stroke-width="2"/>
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Añadir al DOM
  document.body.insertAdjacentHTML('beforeend', profileHtml);
  
  // Configurar event listeners
  const modal = document.getElementById('profile-modal');
  const closeBtn = document.getElementById('profile-modal-close');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.remove());
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Maneja el logout del usuario
 */
async function handleLogout() {
  // TEMPORAL: Modo desarrollo mientras arreglamos el problema de env vars
  const DEV_MODE = true; // Debe coincidir con el valor en checkAuthentication
  
  if (DEV_MODE) {
    showToast('Cerrando sesión (modo desarrollo)...', 'info');
    // En modo desarrollo, simplemente recargar para "cerrar sesión"
    setTimeout(() => {
      location.reload();
    }, 500);
    return;
  }
  
  if (!authModule) {
    showToast('Sistema de autenticación no disponible', 'error');
    return;
  }
  
  try {
    showToast('Cerrando sesión...', 'info');
    await authModule.logout();
    
    // Recargar la página para mostrar login
    location.reload();
  } catch (error) {
    console.error('[Panel] Logout error:', error);
    showToast('Error al cerrar sesión', 'error');
  }
}

/**
 * Obtiene las iniciales del usuario
 */
function getUserInitials(email) {
  if (!email) return '?';
  
  const parts = email.split('@')[0].split('.');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  return email.substring(0, 2).toUpperCase();
}

/**
 * Actualiza el avatar del usuario en el header
 */
function updateUserAvatar() {
  if (state.currentUser && elements.userInitials) {
    const initials = getUserInitials(state.currentUser.email);
    elements.userInitials.textContent = initials;
  }
}

/**
 * Formatea una fecha para mostrar
 */
function formatDate(dateString) {
  if (!dateString) return 'Desconocido';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Desconocido';
  }
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
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
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

// Listener para cambios en storage (sincronización entre pestañas)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.favorites) {
    console.log('[Panel] Favorites changed externally');
    // Solo actualizar si el cambio viene de otra pestaña/ventana
    // para evitar re-render innecesario cuando cambiamos favoritos localmente
    const currentFavorites = favoritesManager.getAll();
    const newFavorites = changes.favorites.newValue || [];
    
    // Comparar arrays para ver si realmente cambió
    const hasChanged = JSON.stringify(currentFavorites.sort()) !== JSON.stringify(newFavorites.sort());
    
    if (hasChanged) {
      favoritesManager.init().then(() => {
        state.favorites = favoritesManager.getAll();
        renderContent();
      });
    }
  }
});
