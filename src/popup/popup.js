import { logger } from '../shared/logger.js';
import { MESSAGES } from '../shared/constants.js';

class PopupManager {
  constructor() {
    this.elements = {
      loadingState: document.getElementById('loading-state'),
      authState: document.getElementById('auth-state'),
      loggedState: document.getElementById('logged-state'),
      errorState: document.getElementById('error-state'),
      loginBtn: document.getElementById('login-btn'),
      logoutBtn: document.getElementById('logout-btn'),
      openSidebarBtn: document.getElementById('open-sidebar-btn'),
      syncBtn: document.getElementById('sync-btn'),
      helpLink: document.getElementById('help-link'),
      totalGpts: document.getElementById('total-gpts'),
      favoriteCount: document.getElementById('favorite-count'),
      promptCount: document.getElementById('prompt-count'),
      userAvatar: document.getElementById('user-avatar'),
      userEmail: document.getElementById('user-email'),
      errorMessage: document.getElementById('error-message')
    };

    this.state = {
      isAuthenticated: false,
      user: null,
      stats: {
        totalGpts: 0,
        favoriteCount: 0,
        promptCount: 0
      }
    };

    this.init();
  }

  async init() {
    try {
      logger.info('Popup: Initializing');
      this.showLoading();
      this.attachEventListeners();
      await this.checkAuthStatus();
      await this.loadStats();
      this.render();
    } catch (error) {
      logger.error('Popup: Initialization error', error);
      this.showError('Error al inicializar la extensión');
    }
  }

  attachEventListeners() {
    this.elements.loginBtn?.addEventListener('click', () => this.handleLogin());
    this.elements.logoutBtn?.addEventListener('click', () => this.handleLogout());
    this.elements.openSidebarBtn?.addEventListener('click', () => this.handleOpenSidebar());
    this.elements.syncBtn?.addEventListener('click', () => this.handleSync());
    this.elements.helpLink?.addEventListener('click', (e) => this.handleHelp(e));
  }

  async checkAuthStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ 
        type: MESSAGES.CHECK_AUTH 
      });

      if (response?.success) {
        this.state.isAuthenticated = response.data.isAuthenticated;
        this.state.user = response.data.user;
        logger.info('Popup: Auth status', { isAuthenticated: this.state.isAuthenticated });
      } else {
        throw new Error(response?.error || 'Auth check failed');
      }
    } catch (error) {
      logger.error('Popup: Auth check error', error);
      this.state.isAuthenticated = false;
      this.state.user = null;
    }
  }

  async loadStats() {
    if (!this.state.isAuthenticated) return;

    try {
      const [gptStats, promptStats] = await Promise.all([
        chrome.runtime.sendMessage({ type: MESSAGES.GET_GPT_STATS }),
        chrome.storage.local.get(['prompts', 'favorites'])
      ]);

      if (gptStats?.success) {
        this.state.stats.totalGpts = gptStats.data.total || 0;
      }

      this.state.stats.favoriteCount = promptStats.favorites?.length || 0;
      this.state.stats.promptCount = promptStats.prompts?.length || 0;

      logger.info('Popup: Stats loaded', this.state.stats);
    } catch (error) {
      logger.error('Popup: Stats loading error', error);
    }
  }

  render() {
    this.hideAllStates();

    if (this.state.isAuthenticated) {
      this.showLoggedState();
    } else {
      this.showAuthState();
    }
  }

  showLoading() {
    this.hideAllStates();
    this.elements.loadingState.classList.remove('hidden');
  }

  showAuthState() {
    this.hideAllStates();
    this.elements.authState.classList.remove('hidden');
  }

  showLoggedState() {
    this.hideAllStates();
    this.elements.loggedState.classList.remove('hidden');
    this.updateUserInfo();
    this.updateStats();
  }

  showError(message) {
    this.hideAllStates();
    this.elements.errorState.classList.remove('hidden');
    this.elements.errorMessage.textContent = message;
  }

  hideAllStates() {
    Object.values(this.elements).forEach(el => {
      if (el && el.id?.includes('state')) {
        el.classList.add('hidden');
      }
    });
  }

  updateUserInfo() {
    if (this.state.user) {
      this.elements.userEmail.textContent = this.state.user.email || '';
      
      if (this.state.user.avatar_url) {
        this.elements.userAvatar.src = this.state.user.avatar_url;
        this.elements.userAvatar.alt = this.state.user.email || 'User avatar';
      } else {
        this.elements.userAvatar.style.display = 'none';
      }
    }
  }

  updateStats() {
    this.elements.totalGpts.textContent = this.state.stats.totalGpts;
    this.elements.favoriteCount.textContent = this.state.stats.favoriteCount;
    this.elements.promptCount.textContent = this.state.stats.promptCount;
  }

  async handleLogin() {
    try {
      logger.info('Popup: Login requested');
      this.elements.loginBtn.disabled = true;
      
      const response = await chrome.runtime.sendMessage({ 
        type: MESSAGES.LOGIN 
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Login failed');
      }

      // El service worker manejará la redirección
      window.close();
    } catch (error) {
      logger.error('Popup: Login error', error);
      this.showError('Error al iniciar sesión');
      this.elements.loginBtn.disabled = false;
    }
  }

  async handleLogout() {
    try {
      logger.info('Popup: Logout requested');
      this.elements.logoutBtn.disabled = true;

      const response = await chrome.runtime.sendMessage({ 
        type: MESSAGES.LOGOUT 
      });

      if (response?.success) {
        this.state.isAuthenticated = false;
        this.state.user = null;
        this.render();
      } else {
        throw new Error(response?.error || 'Logout failed');
      }
    } catch (error) {
      logger.error('Popup: Logout error', error);
      this.showError('Error al cerrar sesión');
    } finally {
      this.elements.logoutBtn.disabled = false;
    }
  }

  async handleOpenSidebar() {
    try {
      logger.info('Popup: Open sidebar requested');
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, { 
        type: MESSAGES.TOGGLE_SIDEBAR,
        data: { show: true }
      });

      window.close();
    } catch (error) {
      logger.error('Popup: Open sidebar error', error);
      this.showError('Error al abrir el panel');
    }
  }

  async handleSync() {
    try {
      logger.info('Popup: Sync requested');
      this.elements.syncBtn.disabled = true;
      this.elements.syncBtn.querySelector('.icon').classList.add('rotating');

      const response = await chrome.runtime.sendMessage({ 
        type: MESSAGES.SYNC_GPTS 
      });

      if (response?.success) {
        await this.loadStats();
        this.updateStats();
        
        // Mostrar feedback visual
        this.elements.syncBtn.textContent = '✓ Sincronizado';
        setTimeout(() => {
          this.elements.syncBtn.innerHTML = `
            <svg class="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.65 2.35A8 8 0 0 0 2.35 13.65M2.35 2.35A8 8 0 0 1 13.65 13.65" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Sincronizar
          `;
        }, 2000);
      } else {
        throw new Error(response?.error || 'Sync failed');
      }
    } catch (error) {
      logger.error('Popup: Sync error', error);
      this.showError('Error al sincronizar');
    } finally {
      this.elements.syncBtn.disabled = false;
      this.elements.syncBtn.querySelector('.icon')?.classList.remove('rotating');
    }
  }

  handleHelp(e) {
    e.preventDefault();
    chrome.tabs.create({ 
      url: 'https://github.com/carlosrodera/kit-ia-emprendedor-extension/wiki' 
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});