/**
 * Kit IA Emprendedor - Side Panel Controller
 * Gestiona toda la UI del panel lateral usando arquitectura modular
 * 
 * @author Kit IA Emprendedor
 * @version 2.0.0
 * @since 2025-01-21
 */

// Importar utilidades de seguridad
import SecureDOM from '../utils/secure-dom.js';
import logger from '../utils/logger.js';
import configManager from '../utils/config-manager.js';

// Módulos globales
let favoritesManager = null;
let moduleLoader = null;
let authModule = null;
let planManager = null;
let planUI = null;

// Estado de la aplicación
const state = {
  currentTab: 'all',
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
  selectedPrompts: new Set(),
  // Sort state
  sortBy: 'name-asc'
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
    logger.debug('[Panel] Loading modules...');
    
    // Cargar module loader usando ruta absoluta
    const moduleLoaderPath = chrome.runtime.getURL('sidepanel/modules/module-loader.js');
    const loaderModule = await import(moduleLoaderPath);
    moduleLoader = loaderModule.moduleLoader;
    
    // Inicializar module loader
    await moduleLoader.init();
    
    // Cargar módulo de autenticación Chrome-specific
    try {
      logger.debug('[Panel] Loading Chrome auth module...');
      const authPath = chrome.runtime.getURL('shared/chrome-auth.js');
      logger.debug('[Panel] Chrome auth path:', authPath);
      
      const authImport = await import(authPath);
      logger.debug('[Panel] Chrome auth module imported:', { 
        hasDefault: !!authImport.default, 
        hasAuth: !!authImport.auth, 
        keys: Object.keys(authImport) 
      });
      
      // chrome-auth.js exporta como default
      authModule = authImport.default || authImport.auth;
      
      // Verificar que el módulo se cargó correctamente
      if (!authModule) {
        throw new Error('Chrome auth module not found in import');
      }
      
      // Verificar que tiene el método initialize
      if (!authModule.initialize || typeof authModule.initialize !== 'function') {
        logger.error('[Panel] Auth module structure:', {
          type: typeof authModule,
          keys: Object.keys(authModule),
          hasInitialize: !!authModule.initialize
        });
        throw new Error('Chrome auth module does not have initialize method');
      }
      
      // Inicializar sin timeout - chrome-auth.js maneja esto correctamente
      logger.debug('[Panel] Initializing Chrome auth...');
      await authModule.initialize();
      logger.debug('[Panel] Chrome auth module loaded successfully');
    } catch (authError) {
      logger.error('[Panel] Failed to load Chrome auth module:', authError);
      logger.error('[Panel] Auth error details:', authError.stack);
      
      // Mostrar error específico al usuario
      const errorMessage = authError.message || 'Error desconocido al cargar autenticación';
      showToast(`Error de autenticación: ${errorMessage}`, 'error');
      
      // No continuar sin auth - es crítico
      throw authError;
    }
    
    // Cargar módulo de favoritos
    const favoritesModule = await moduleLoader.load('favorites');
    favoritesManager = favoritesModule.favoritesManager;
    
    // Inicializar favoritos
    await favoritesManager.init();
    
    // Cargar plan manager y UI
    try {
      const planManagerPath = chrome.runtime.getURL('shared/plan-manager.js');
      const planManagerModule = await import(planManagerPath);
      planManager = planManagerModule.default;
      
      const planUIPath = chrome.runtime.getURL('sidepanel/components/plan-ui.js');
      const planUIModule = await import(planUIPath);
      planUI = planUIModule.default;
      
      // Inicializar plan manager
      await planManager.initialize();
      logger.debug('[Panel] Plan Manager initialized');
    } catch (planError) {
      logger.error('[Panel] Failed to load plan system:', planError);
      // No es crítico, continuar sin sistema de planes
    }
    
    state.modulesLoaded = true;
    logger.debug('[Panel] Modules loaded successfully');
    
    return true;
    
  } catch (error) {
    logger.error('[Panel] Failed to load modules:', error);
    
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
  logger.debug('[Panel] Using fallback favorites implementation');
  
  // Implementación mínima inline
  const favorites = new Set();
  
  // Cargar desde storage
  try {
    const result = await chrome.storage.local.get('favorites');
    if (result.favorites && Array.isArray(result.favorites)) {
      result.favorites.forEach(id => favorites.add(id));
    }
  } catch (error) {
    logger.error('[Panel] Fallback favorites load failed:', error);
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
        logger.error('[Panel] Fallback save failed:', error);
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
  // DEV_MODE desactivado - usando autenticación real
  const DEV_MODE = false;
  
  if (DEV_MODE) {
    logger.warn('[Panel] 🔧 DEVELOPMENT MODE - Auth bypassed temporalmente');
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
    logger.error('[Panel] Auth module not loaded - BLOCKING ACCESS');
    showAuthRequiredScreen();
    return false; // BLOQUEAR acceso sin auth
  }
  
  try {
    const isAuthenticated = authModule.isAuthenticated();
    const user = authModule.getCurrentUser();
    
    logger.debug('[Panel] Auth status:', { isAuthenticated, user: user?.email });
    
    state.isAuthenticated = isAuthenticated;
    state.currentUser = user;
    
    if (!isAuthenticated) {
      showLoginScreen();
      return false;
    }
    
    // Actualizar avatar del usuario
    updateUserAvatar();
    
    // Mostrar badge del plan
    displayPlanBadge();
    
    // Cargar datos después de verificar autenticación
    loadInitialData();
    
    return true;
  } catch (error) {
    logger.error('[Panel] Error checking authentication:', error);
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
            <button id="show-login-btn" class="btn-secondary">
              🔑 Mostrar Login
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
  const showLoginBtn = document.getElementById('show-login-btn');
  
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => location.reload());
  }
  
  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', () => {
      showLoginScreen();
    });
  }
}

/**
 * Muestra la pantalla de login/activación
 */
function showLoginScreen() {
  const loginHtml = `
    <div class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <img src="../assets/icons/icon-128.svg" alt="Kit IA Emprendedor" width="64" height="64">
          <h1>Kit IA Emprendedor</h1>
          <p>Tu asistente de IA para emprender</p>
        </div>
        
        <div class="login-content">
          <!-- Registro/Login -->
          <div class="auth-section" id="auth-section">
            <div class="auth-tabs">
              <button type="button" class="tab-btn active" id="register-tab">Crear cuenta</button>
              <button type="button" class="tab-btn" id="login-tab">Iniciar sesión</button>
            </div>
            
            <!-- Registro -->
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
                  placeholder="Mínimo 6 caracteres"
                  required
                  autocomplete="new-password"
                  minlength="6"
                />
              </div>
              
              <button type="submit" class="btn btn-primary" id="register-btn">
                Crear cuenta
              </button>
            </form>
            
            <!-- Login -->
            <form id="login-form" class="auth-form" style="display: none;">
              <div class="form-group">
                <label for="login-email">Email</label>
                <input 
                  type="email" 
                  id="login-email" 
                  name="email" 
                  placeholder="tu@email.com"
                  required
                  autocomplete="email"
                />
              </div>
              
              <div class="form-group">
                <label for="login-password">Contraseña</label>
                <input 
                  type="password" 
                  id="login-password" 
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
          </div>
          
          <div class="auth-actions">
            <button id="toggle-login-btn" class="btn-text" style="display: none;">
              ¿Ya tienes cuenta? Iniciar sesión
            </button>
          </div>
          
          <!-- Comprar producto -->
          <div class="purchase-section">
            <div class="purchase-card">
              <h3>¿No tienes el Kit IA Emprendedor?</h3>
              <p>Únete al kit de los emprendedores que están revolucionando sus negocios con inteligencia artificial</p>
              <a href="https://iaemprendedor.com/" target="_blank" class="btn btn-cta">
                Comprar Kit IA Emprendedor
              </a>
            </div>
          </div>
          
          <div class="auth-footer">
            <a href="https://carlosrodera.com/soporte" target="_blank">¿Problemas? Contactar soporte</a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Reemplazar todo el contenido del panel
  SecureDOM.setHTML(document.body, loginHtml);
  
  // Configurar event listeners para login/activación
  setupLoginEventListeners();
}

/**
 * Configura event listeners para la pantalla de login/activación
 */
function setupLoginEventListeners() {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const registerTab = document.getElementById('register-tab');
  const loginTab = document.getElementById('login-tab');
  
  // Registro
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
  
  // Login
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Tabs para cambiar entre registro y login
  if (registerTab) {
    registerTab.addEventListener('click', () => showAuthTab('register'));
  }
  
  if (loginTab) {
    loginTab.addEventListener('click', () => showAuthTab('login'));
  }
}

/**
 * Maneja el registro de nuevo usuario
 */
async function handleRegister(e) {
  e.preventDefault();
  
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  
  if (!authModule) {
    showToast('Sistema de autenticación no disponible', 'error');
    return;
  }
  
  try {
    showToast('Creando cuenta...', 'info');
    
    // Crear cuenta
    await authModule.signUpWithEmail(email, password);
    
    // TODO: Integrar verificación con Stripe
    // Por ahora, permitir acceso a todos los usuarios registrados
    const hasAccess = true; // await checkUserAccess(email);
    
    if (hasAccess) {
      showToast('¡Cuenta creada exitosamente!', 'success');
      // Actualizar estado
      state.isAuthenticated = true;
      state.currentUser = authModule.getCurrentUser();
      updateUserAvatar();
      location.reload();
    } else {
      // Mostrar pantalla premium
      showPremiumScreen();
    }
    
  } catch (error) {
    logger.error('[Panel] Registration error:', error);
    showToast(error.message || 'Error al crear cuenta', 'error');
  }
}

/**
 * Maneja el login de usuario existente
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!authModule) {
    showToast('Sistema de autenticación no disponible', 'error');
    return;
  }
  
  try {
    showToast('Iniciando sesión...', 'info');
    
    // Login
    await authModule.signInWithEmail(email, password);
    
    // TODO: Integrar verificación con Stripe
    // Por ahora, permitir acceso a todos los usuarios registrados
    const hasAccess = true; // await checkUserAccess(email);
    
    if (hasAccess) {
      showToast('¡Sesión iniciada exitosamente!', 'success');
      // Actualizar estado
      state.isAuthenticated = true;
      state.currentUser = authModule.getCurrentUser();
      updateUserAvatar();
      location.reload();
    } else {
      // Mostrar pantalla premium
      showPremiumScreen();
    }
    
  } catch (error) {
    logger.error('[Panel] Login error:', error);
    showToast(error.message || 'Error al iniciar sesión', 'error');
  }
}

/**
 * Verifica si el usuario tiene acceso premium
 */
async function checkUserAccess(email) {
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'CHECK_USER_ACCESS',
      email: email
    });
    
    return result.success && result.data.hasAccess;
  } catch (error) {
    logger.error('[Panel] Error checking user access:', error);
    return false;
  }
}

/**
 * Cambia entre tabs de registro y login
 */
function showAuthTab(tab) {
  const registerForm = document.getElementById('register-form');
  const loginForm = document.getElementById('login-form');
  const registerTab = document.getElementById('register-tab');
  const loginTab = document.getElementById('login-tab');
  
  if (tab === 'register') {
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    registerTab.classList.add('active');
    loginTab.classList.remove('active');
  } else {
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
    registerTab.classList.remove('active');
    loginTab.classList.add('active');
  }
}

/**
 * Muestra la pantalla premium para usuarios sin acceso
 */
function showPremiumScreen() {
  const premiumHtml = `
    <div class="premium-screen">
      <div class="premium-container">
        <div class="premium-header">
          <img src="../assets/icons/icon-128.svg" alt="Kit IA Emprendedor" width="64" height="64">
          <h1>Kit IA Emprendedor</h1>
          <p class="premium-subtitle">Producto Premium</p>
        </div>
        
        <div class="premium-content">
          <div class="premium-message">
            <h2>🚀 Acceso Exclusivo</h2>
            <p>Esta extensión está reservada para clientes del <strong>Kit IA Emprendedor</strong></p>
          </div>
          
          <div class="premium-cta">
            <p class="premium-description">Únete al kit de los emprendedores que están revolucionando sus negocios con inteligencia artificial</p>
            <a href="https://iaemprendedor.com/" target="_blank" class="btn btn-premium">
              🚀 Comprar Kit IA Emprendedor
            </a>
            <p class="cta-subtitle">Acceso inmediato tras la compra</p>
          </div>
          
          <div class="premium-support">
            <p>¿Ya compraste el Kit? <a href="https://carlosrodera.com/soporte" target="_blank">Contacta soporte</a></p>
          </div>
          
          <button class="btn btn-secondary mt-3" id="back-to-login-btn">
            ← Volver al inicio
          </button>
        </div>
      </div>
    </div>
  `;
  
  SecureDOM.setHTML(document.body, premiumHtml);
  
  // Configurar event listener para el botón de volver
  const backBtn = document.getElementById('back-to-login-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.reload();
    });
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
  
  SecureDOM.setHTML(document.body, registerHtml);
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
    logger.error('[Panel] Email register error:', error);
    showToast(error.message || 'Error al crear cuenta', 'error');
  }
}


// Inicialización principal
document.addEventListener('DOMContentLoaded', async () => {
  logger.debug('[Panel] Initializing...');

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

  // Renderizar UI (los datos ya se cargaron en checkAuthentication)
  renderContent();
});

/**
 * Cachea referencias a elementos DOM
 */
function cacheElements() {
  elements.searchInput = document.getElementById('search-input');
  elements.content = document.getElementById('content');
  elements.tabs = document.querySelectorAll('.tab');
  // View buttons removed - only list view now
  elements.categoryFilterInput = document.getElementById('category-filter-input');
  elements.categoryDropdown = document.getElementById('category-dropdown');
  elements.categorySearch = document.getElementById('category-search');
  elements.categoryOptions = document.getElementById('category-options');
  elements.promptModal = document.getElementById('prompt-modal');
  elements.promptForm = document.getElementById('prompt-form');
  elements.notificationsBadge = document.getElementById('notifications-badge');
  elements.userProfileBtn = document.getElementById('user-profile-btn');
  elements.userInitials = document.getElementById('user-initials');
  elements.sortSelect = document.getElementById('sort-select');
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

  // View toggle removed - only list view now

  // Filtro de categoría con búsqueda
  setupCategoryDropdown();

  // Modal de prompts
  document.getElementById('modal-close').addEventListener('click', closePromptModal);
  document.getElementById('cancel-btn').addEventListener('click', closePromptModal);
  elements.promptForm.addEventListener('submit', handlePromptSubmit);

  // Botones de header
  document.getElementById('notifications-btn').addEventListener('click', handleNotifications);
  elements.userProfileBtn.addEventListener('click', handleUserProfile);
  
  // Ordenamiento
  if (elements.sortSelect) {
    elements.sortSelect.addEventListener('change', handleSortChange);
  }
}

/**
 * Carga datos iniciales
 */
async function loadInitialData() {
  try {
    // Obtener GPTs
    const gptsResponse = await chrome.runtime.sendMessage({ type: 'GET_GPTS' });
    logger.debug('[Panel] GPTs loaded:', gptsResponse);
    if (gptsResponse.success) {
      state.gpts = gptsResponse.data;
      // Actualizar opciones de categorías después de cargar GPTs
      updateCategoryOptions();
    }

    // Obtener favoritos del manager
    try {
      state.favorites = favoritesManager.getAll();
      logger.debug('[Panel] Current favorites:', state.favorites);
    } catch (error) {
      logger.warn('[Panel] Error getting favorites:', error);
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
    
    // Renderizar el contenido después de cargar los datos
    renderContent();
  } catch (error) {
    logger.error('[Panel] Error loading data:', error);
    state.isLoading = false;
    // Renderizar incluso en caso de error para mostrar empty state
    renderContent();
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
  } else if (state.currentTab === 'favorites') {
    // En favoritos, renderizar mixto (GPTs y Prompts)
    renderMixedFavorites(items);
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
      // Combinar GPTs favoritos y prompts favoritos
      const favoriteGpts = state.gpts.filter(gpt => favoritesManager.isFavorite(gpt.id));
      const favoritePrompts = state.prompts.filter(prompt => prompt.favorite);
      
      // Agregar tipo a cada item para distinguir en el renderizado
      items = [
        ...favoriteGpts.map(gpt => ({ ...gpt, itemType: 'gpt' })),
        ...favoritePrompts.map(prompt => ({ ...prompt, itemType: 'prompt' }))
      ];
      break;
    case 'prompts':
      items = state.prompts.map(prompt => ({ ...prompt, itemType: 'prompt' }));
      break;
    default:
      items = state.gpts.map(gpt => ({ ...gpt, itemType: 'gpt' }));
  }

  // Aplicar búsqueda
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    items = items.filter(item => {
      const searchText = `${item.name} ${item.description || item.content || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      return searchText.includes(query);
    });
  }

  // Aplicar filtro de categoría (solo para GPTs)
  if (state.currentTab !== 'prompts' && state.currentCategory !== 'all') {
    logger.debug('[Panel] Filtering by category:', state.currentCategory);
    logger.debug('[Panel] Items before filter:', items.length);
    items = items.filter(item => {
      // Solo filtrar GPTs por categoría
      return item.itemType !== 'gpt' || item.category === state.currentCategory;
    });
    logger.debug('[Panel] Items after filter:', items.length);
  }

  // Aplicar ordenamiento
  items = sortItems(items);

  return items;
}

/**
 * Ordena los items según el criterio seleccionado
 */
function sortItems(items) {
  const sortBy = state.sortBy;
  
  switch (sortBy) {
    case 'name-asc':
      return items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    
    case 'name-desc':
      return items.sort((a, b) => b.name.localeCompare(a.name, 'es'));
    
    case 'category':
      return items.sort((a, b) => {
        // Primero por categoría, luego por nombre
        const catCompare = (a.category || '').localeCompare(b.category || '', 'es');
        if (catCompare !== 0) return catCompare;
        return a.name.localeCompare(b.name, 'es');
      });
    
    case 'recent':
      // Ordenar por fecha de creación (más recientes primero)
      return items.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    
    case 'favorites':
      // Favoritos primero, luego por nombre
      return items.sort((a, b) => {
        const aFav = a.itemType === 'prompt' ? a.favorite : favoritesManager.isFavorite(a.id);
        const bFav = b.itemType === 'prompt' ? b.favorite : favoritesManager.isFavorite(b.id);
        
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.name.localeCompare(b.name, 'es');
      });
    
    default:
      return items;
  }
}

/**
 * Renderiza favoritos mixtos (GPTs y Prompts) en vista de lista
 */
function renderMixedFavorites(items) {
  logger.debug('[Panel] Rendering mixed favorites in list view:', items.length);
  
  const container = document.createElement('div');
  container.className = 'gpts-list'; // Usar gpts-list que tiene estilos
  
  items.forEach(item => {
    let element;
    if (item.itemType === 'prompt') {
      // Prompts como list item
      element = createPromptListItem(item);
    } else {
      // GPTs como list item
      element = createGPTListItem(item);
    }
    container.appendChild(element);
  });
  
  SecureDOM.clear(elements.content);
  elements.content.appendChild(container);
}

/**
 * Renderiza GPTs
 */
function renderGPTs(gpts) {
  logger.debug('[Panel] Rendering GPTs in list view, count:', gpts.length);
  
  const container = document.createElement('div');
  container.className = 'gpts-list';
  
  gpts.forEach(gpt => {
    const element = createGPTListItem(gpt);
    container.appendChild(element);
  });
  
  SecureDOM.clear(elements.content);
  elements.content.appendChild(container);
}


/**
 * Crea un item de lista de GPT
 */
function createGPTListItem(gpt) {
  // Verificar estado actual del favorito directamente del manager
  const isFavorite = favoritesManager.isFavorite(gpt.id);
  logger.debug(`[Panel] Creating list item for ${gpt.id}, isFavorite: ${isFavorite}, manager has: ${favoritesManager.getAll().join(', ')}`);

  const item = document.createElement('div');
  item.className = 'gpt-list-item';
  SecureDOM.setHTML(item, `
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
  `);

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
 * Crea un item de lista de prompt
 */
function createPromptListItem(prompt) {
  const item = document.createElement('div');
  item.className = 'prompt-list-item';
  if (state.selectedPrompts.has(prompt.id)) {
    item.classList.add('selected');
  }
  
  SecureDOM.setHTML(item, `
    ${state.isSelectMode ? `
      <input type="checkbox" 
             class="prompt-checkbox" 
             data-prompt-id="${prompt.id}"
             ${state.selectedPrompts.has(prompt.id) ? 'checked' : ''}>
    ` : ''}
    <div class="prompt-list-content ${state.isSelectMode ? 'with-checkbox' : ''}">
      <div class="prompt-list-header">
        <h3 class="prompt-list-title">${escapeHtml(prompt.name)}</h3>
        ${prompt.tags && prompt.tags.length > 0 ? `
          <div class="prompt-list-tags">
            ${prompt.tags.map(tag => `<span class="prompt-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <p class="prompt-list-description">${escapeHtml(prompt.content.substring(0, 120))}${prompt.content.length > 120 ? '...' : ''}</p>
    </div>
    <div class="prompt-list-actions">
      <button class="favorite-btn prompt-favorite ${prompt.favorite ? 'active' : ''}" 
              title="${prompt.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}" 
              data-prompt-id="${prompt.id}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </button>
      <button class="icon-btn" title="Copiar" data-action="copy" data-prompt-id="${prompt.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M8 5H6C4.9 5 4 5.9 4 7V19C4 20.1 4.9 21 6 21H16C17.1 21 18 20.1 18 19V17" stroke="currentColor" stroke-width="2"/>
          <path d="M8 5C8 3.9 8.9 3 10 3H18C19.1 3 20 3.9 20 5V15C20 16.1 19.1 17 18 17H10C8.9 17 8 16.1 8 15V5Z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <button class="icon-btn" title="Editar" data-action="edit" data-prompt-id="${prompt.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2"/>
          <path d="M18.5 2.50023C18.8978 2.10243 19.4374 1.87891 20 1.87891C20.5626 1.87891 21.1022 2.10243 21.5 2.50023C21.8978 2.89804 22.1213 3.43762 22.1213 4.00023C22.1213 4.56284 21.8978 5.10243 21.5 5.50023L12 15.0002L8 16.0002L9 12.0002L18.5 2.50023Z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      <button class="icon-btn" title="Eliminar" data-action="delete" data-prompt-id="${prompt.id}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M3 6H5H21" stroke="currentColor" stroke-width="2"/>
          <path d="M8 6V4C8 3.5 8.5 3 9 3H15C15.5 3 16 3.5 16 4V6M19 6V20C19 20.5 18.5 21 18 21H6C5.5 21 5 20.5 5 20V6H19Z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  `);

  // Event listener para checkbox
  const checkbox = item.querySelector('.prompt-checkbox');
  if (checkbox) {
    checkbox.addEventListener('change', (e) => {
      handlePromptSelection(prompt.id, e.target.checked);
    });
  }

  // Event listener para el botón de favorito
  const favoriteBtn = item.querySelector('.prompt-favorite');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', handlePromptFavoriteClick);
  }
  
  // Event listeners para las demás acciones
  item.querySelectorAll('.prompt-list-actions button:not(.prompt-favorite)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const promptId = btn.dataset.promptId;
      handlePromptAction(action, promptId);
    });
  });

  return item;
}

/**
 * Renderiza prompts en vista de lista
 */
function renderPrompts(prompts) {
  logger.debug('[Panel] Rendering prompts in list view, count:', prompts.length);
  
  const container = document.createElement('div');
  container.className = 'prompts-list';

  // Barra de herramientas para multi-selección
  const toolbar = createMultiSelectToolbar();
  container.appendChild(toolbar);

  prompts.forEach(prompt => {
    container.appendChild(createPromptListItem(prompt));
  });

  // Botón flotante para añadir prompt
  const addBtn = document.createElement('button');
  addBtn.className = 'add-prompt-btn';
  SecureDOM.setText(addBtn, '+');
  addBtn.addEventListener('click', () => showPromptModal());

  SecureDOM.clear(elements.content);
  elements.content.appendChild(container);
  elements.content.appendChild(addBtn);
}


/**
 * Crea la barra de herramientas para multi-selección
 */
function createMultiSelectToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'multi-select-toolbar' + (state.isSelectMode ? ' active' : '');
  SecureDOM.setHTML(toolbar, `
    <div class="multi-select-controls">
      ${!state.isSelectMode ? `
        <button class="btn btn-select-mode" id="toggle-select-mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 11L12 14L20 6" stroke="currentColor" stroke-width="2"/>
            <path d="M20 12V18C20 19.1 19.1 20 18 20H5C3.9 20 3 19.1 3 18V5C3 3.9 3.9 3 5 3H15" stroke="currentColor" stroke-width="2"/>
          </svg>
          Selección múltiple
        </button>
      ` : `
        <div class="selection-active-controls">
          <button class="btn btn-cancel-select" id="toggle-select-mode">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2"/>
            </svg>
            Cancelar selección
          </button>
          
          <div class="selection-info">
            <span class="selection-count">${state.selectedPrompts.size}</span>
            <span class="selection-label">seleccionados</span>
          </div>
          
          <div class="selection-actions">
            <div class="selection-group">
              <button class="btn btn-outline" id="select-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11L12 14L20 6M9 11L12 14M20 6L12 14" stroke="currentColor" stroke-width="2"/>
                </svg>
                Todo
              </button>
              <button class="btn btn-outline" id="deselect-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19" stroke="currentColor" stroke-width="2"/>
                </svg>
                Ninguno
              </button>
            </div>
            
            <div class="action-group">
              <button class="btn btn-primary" id="copy-selected" title="Copiar contenido">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5H6C4.9 5 4 5.9 4 7V19C4 20.1 4.9 21 6 21H16C17.1 21 18 20.1 18 19V17" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 5C8 3.9 8.9 3 10 3H18C19.1 3 20 3.9 20 5V15C20 16.1 19.1 17 18 17H10C8.9 17 8 16.1 8 15V5Z" stroke="currentColor" stroke-width="2"/>
                </svg>
                Copiar
              </button>
              <button class="btn btn-primary" id="export-selected" title="Exportar a TXT">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="currentColor" stroke-width="2"/>
                  <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2"/>
                  <path d="M12 15V3" stroke="currentColor" stroke-width="2"/>
                </svg>
                Exportar
              </button>
              <button class="btn btn-danger" id="delete-selected" title="Eliminar seleccionados">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6H5H21" stroke="currentColor" stroke-width="2"/>
                  <path d="M8 6V4C8 3.5 8.5 3 9 3H15C15.5 3 16 3.5 16 4V6M19 6V20C19 20.5 18.5 21 18 21H6C5.5 21 5 20.5 5 20V6H19Z" stroke="currentColor" stroke-width="2"/>
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `);

  // Event listeners
  const toggleBtn = toolbar.querySelector('#toggle-select-mode');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      toggleSelectMode();
      // Re-renderizar para actualizar el estado
      renderContent();
    });
  }

  const selectAllBtn = toolbar.querySelector('#select-all');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', selectAllPrompts);
  }

  const deselectAllBtn = toolbar.querySelector('#deselect-all');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', deselectAllPrompts);
  }

  const copyBtn = toolbar.querySelector('#copy-selected');
  if (copyBtn) {
    copyBtn.addEventListener('click', copySelectedPrompts);
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

  SecureDOM.setHTML(elements.content, `
    <div class="empty-state">
      <div class="empty-state-icon">${emoji}</div>
      <h3>${message}</h3>
      ${state.currentTab === 'prompts'
    ? '<button class="btn btn-primary" id="create-first-prompt">Crear primer prompt</button>'
    : '<p>Intenta con otros filtros</p>'
}
    </div>
  `);

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
  logger.debug('[Panel] Search query:', state.searchQuery);
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

/**
 * Maneja cambio de ordenamiento
 */
function handleSortChange(e) {
  state.sortBy = e.target.value;
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
  elements.SecureDOM.clear(categoryOptions);
  
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
  
  logger.debug(`[Panel] Updating ${favoriteButtons.length} favorite buttons for GPT ${gptId}`);
  
  favoriteButtons.forEach(button => {
    if (isFavorite) {
      button.classList.add('active');
      logger.debug(`[Panel] Added active class to button for ${gptId}`);
    } else {
      button.classList.remove('active');
      logger.debug(`[Panel] Removed active class from button for ${gptId}`);
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
  
  logger.debug(`[Panel] Updating ${favoriteButtons.length} favorite buttons for Prompt ${promptId}`);
  
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
    logger.error('[Panel] No GPT ID found on button');
    return;
  }
  
  logger.debug('[Panel] Favorite clicked:', gptId);
  
  // Desactivar TODOS los botones de este GPT temporalmente
  const allButtons = document.querySelectorAll(`button.favorite-btn[data-gpt-id="${gptId}"]`);
  allButtons.forEach(btn => btn.disabled = true);
  
  try {
    // Debug state ANTES del toggle
    logger.debug('[Panel] BEFORE toggle:', {
      gptId,
      wasFavorite: favoritesManager.isFavorite(gptId),
      buttonClass: button.className
    });
    
    // Toggle en el manager
    const isFavorite = await favoritesManager.toggle(gptId);
    
    // Debug state DESPUÉS del toggle
    logger.debug('[Panel] AFTER toggle:', {
      gptId,
      isNowFavorite: isFavorite,
      managerConfirms: favoritesManager.isFavorite(gptId)
    });
    
    // Actualizar estado local inmediatamente
    state.favorites = favoritesManager.getAll();
    
    // Si estamos en favoritos y se eliminó, re-renderizar para quitar el item
    if (state.currentTab === 'favorites' && !isFavorite) {
      logger.debug('[Panel] Re-rendering favorites because item was removed');
      // Usar setTimeout para dar tiempo a que se actualice el storage
      setTimeout(() => renderContent(), 100);
    } else {
      // Si no necesitamos re-renderizar, actualizar TODAS las estrellas de este GPT
      updateAllFavoriteButtons(gptId, isFavorite);
    }
    
    // Mostrar feedback visual
    showToast(isFavorite ? '⭐ Añadido a favoritos' : '💫 Eliminado de favoritos');
    
  } catch (error) {
    logger.error('[Panel] Error toggling favorite:', error);
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
    logger.error('[Panel] No Prompt ID found on button');
    return;
  }
  
  logger.debug('[Panel] Prompt favorite clicked:', promptId);
  
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
      logger.debug('[Panel] Prompt favorite toggled:', updatedPrompt);
      
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
    logger.error('[Panel] Error toggling prompt favorite:', error);
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
          logger.error('Error copiando:', error);
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
          logger.error('[Panel] Error deleting prompt:', error);
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
    const item = checkbox.closest('.prompt-list-item');
    if (item) {
      item.classList.toggle('selected', isSelected);
    }
  }
  
  // Re-renderizar la toolbar para actualizar el contador
  renderContent();
}

/**
 * Selecciona todos los prompts visibles
 */
function selectAllPrompts() {
  const filteredData = getFilteredItems();
  
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
 * Copia el contenido de los prompts seleccionados al portapapeles
 */
function copySelectedPrompts() {
  const selectedPromptsList = state.prompts.filter(p => 
    state.selectedPrompts.has(p.id)
  );
  
  if (selectedPromptsList.length === 0) {
    showToast('No hay prompts seleccionados', 'error');
    return;
  }
  
  // Crear contenido para copiar
  let content = '';
  selectedPromptsList.forEach((prompt, index) => {
    if (index > 0) content += '\n\n---\n\n';
    content += `${prompt.name}\n\n`;
    content += prompt.content;
    if (prompt.tags && prompt.tags.length > 0) {
      content += `\n\nTags: ${prompt.tags.join(', ')}`;
    }
  });
  
  // Copiar al portapapeles
  navigator.clipboard.writeText(content)
    .then(() => {
      showToast(`✓ ${selectedPromptsList.length} prompts copiados al portapapeles`);
      // Limpiar selección
      deselectAllPrompts();
    })
    .catch(err => {
      logger.error('[Panel] Error copiando:', err);
      showToast('Error al copiar prompts', 'error');
    });
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
    logger.error('[Panel] Error deleting prompts:', error);
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
    logger.error('[Panel] Error saving prompt:', error);
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
    logger.error('[Panel] Error getting notifications:', error);
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
  const currentPlan = planManager ? planManager.getCurrentPlan() : null;
  
  // Crear el badge del plan si tenemos planUI
  const planBadgeHtml = planUI && currentPlan ? planUI.createPlanBadge().outerHTML : '';
  
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
              ${currentPlan ? `
                <div class="profile-plan-info">
                  <p class="profile-plan">Plan actual: <strong>${currentPlan.name}</strong></p>
                  ${planBadgeHtml}
                </div>
              ` : ''}
            </div>
          </div>
          
          ${currentPlan && currentPlan.id === 'lite' ? `
            <div class="profile-upgrade-section">
              <div class="upgrade-benefits">
                <h4>🚀 Hazte Premium y desbloquea:</h4>
                <ul>
                  <li>✨ Acceso a TODOS los GPTs Premium</li>
                  <li>💬 Soporte prioritario directo</li>
                  <li>🎯 Sin anuncios ni promociones</li>
                </ul>
                <a href="https://iaemprendedor.com/kit-ia-extension-premium?from=profile" target="_blank" class="btn btn-primary btn-block">
                  Hazte Premium - $47 (pago único)
                </a>
              </div>
            </div>
          ` : ''}
          
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
    logger.error('[Panel] Logout error:', error);
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
 * Muestra el badge del plan en el header
 */
function displayPlanBadge() {
  if (!planUI || !planManager) {
    logger.warn('[Panel] Plan system not loaded');
    return;
  }
  
  const container = document.getElementById('plan-badge-container');
  if (!container) {
    logger.warn('[Panel] Plan badge container not found');
    return;
  }
  
  // Crear y mostrar el badge
  const badge = planUI.createPlanBadge();
  SecureDOM.clear(container);
  container.appendChild(badge);
  
  // Añadir click handler para mostrar info del plan
  badge.addEventListener('click', showPlanInfo);
}

/**
 * Muestra información detallada del plan
 */
function showPlanInfo() {
  if (!planUI || !planManager) return;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  
  const planInfo = planUI.createPlanInfoPanel();
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.maxWidth = '500px';
  
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  SecureDOM.setHTML(modalHeader, `
    <h2>Tu Plan Actual</h2>
    <button class="modal-close">&times;</button>
  `);
  
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(planInfo);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
  
  // Event listeners
  const closeBtn = modalHeader.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
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

  SecureDOM.setHTML(modal, `
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
  `);

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
    logger.debug('[Panel] Favorites changed externally');
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
