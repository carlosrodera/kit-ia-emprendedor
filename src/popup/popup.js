// Popup script para Kit IA Emprendedor
// Este archivo NO usa imports ES6 para compatibilidad con Chrome Extensions

(function() {
  'use strict';

  // Inicialización del popup
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup initialized');
    
    const elements = {
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

    // Mostrar estado de carga inicialmente
    showState('loading');

    // Verificar autenticación
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      console.log('Auth response:', response);
      
      if (response?.success && response.data?.isAuthenticated) {
        // Usuario autenticado
        showState('logged');
        updateUserInfo(response.data.user);
        await loadStats();
      } else {
        // No autenticado
        showState('auth');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      showState('auth');
    }

    // Event listeners
    elements.loginBtn?.addEventListener('click', handleLogin);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    elements.openSidebarBtn?.addEventListener('click', handleOpenSidebar);
    elements.syncBtn?.addEventListener('click', handleSync);
    elements.helpLink?.addEventListener('click', handleHelp);

    function showState(state) {
      // Ocultar todos los estados
      elements.loadingState?.classList.add('hidden');
      elements.authState?.classList.add('hidden');
      elements.loggedState?.classList.add('hidden');
      elements.errorState?.classList.add('hidden');

      // Mostrar el estado solicitado
      switch (state) {
        case 'loading':
          elements.loadingState?.classList.remove('hidden');
          break;
        case 'auth':
          elements.authState?.classList.remove('hidden');
          break;
        case 'logged':
          elements.loggedState?.classList.remove('hidden');
          break;
        case 'error':
          elements.errorState?.classList.remove('hidden');
          break;
      }
    }

    function updateUserInfo(user) {
      if (!user) return;
      
      if (elements.userEmail) {
        elements.userEmail.textContent = user.email || '';
      }
      
      if (elements.userAvatar && user.avatar_url) {
        elements.userAvatar.src = user.avatar_url;
        elements.userAvatar.alt = user.email || 'User avatar';
      }
    }

    async function loadStats() {
      try {
        // Cargar estadísticas de GPTs
        const gptResponse = await chrome.runtime.sendMessage({ type: 'GET_GPT_STATS' });
        if (gptResponse?.success) {
          elements.totalGpts.textContent = gptResponse.data.total || 0;
        }

        // Cargar estadísticas locales
        const localData = await chrome.storage.local.get(['prompts', 'favorites']);
        elements.promptCount.textContent = localData.prompts?.length || 0;
        elements.favoriteCount.textContent = localData.favorites?.length || 0;
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }

    async function handleLogin() {
      try {
        elements.loginBtn.disabled = true;
        
        const response = await chrome.runtime.sendMessage({ type: 'LOGIN' });
        if (!response?.success) {
          throw new Error(response?.error || 'Login failed');
        }
        
        // El service worker manejará la redirección
        window.close();
      } catch (error) {
        console.error('Login error:', error);
        showError('Error al iniciar sesión');
        elements.loginBtn.disabled = false;
      }
    }

    async function handleLogout() {
      try {
        elements.logoutBtn.disabled = true;
        
        const response = await chrome.runtime.sendMessage({ type: 'LOGOUT' });
        if (response?.success) {
          showState('auth');
        } else {
          throw new Error(response?.error || 'Logout failed');
        }
      } catch (error) {
        console.error('Logout error:', error);
        showError('Error al cerrar sesión');
      } finally {
        elements.logoutBtn.disabled = false;
      }
    }

    async function handleOpenSidebar() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'TOGGLE_SIDEBAR',
          data: { show: true }
        });

        window.close();
      } catch (error) {
        console.error('Open sidebar error:', error);
        showError('Error al abrir el panel');
      }
    }

    async function handleSync() {
      try {
        elements.syncBtn.disabled = true;
        
        const response = await chrome.runtime.sendMessage({ type: 'SYNC_GPTS' });
        
        if (response?.success) {
          await loadStats();
          
          // Mostrar feedback visual
          elements.syncBtn.textContent = '✓ Sincronizado';
          setTimeout(() => {
            elements.syncBtn.innerHTML = `
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
        console.error('Sync error:', error);
        showError('Error al sincronizar');
      } finally {
        elements.syncBtn.disabled = false;
      }
    }

    function handleHelp(e) {
      e.preventDefault();
      chrome.tabs.create({ 
        url: 'https://github.com/carlosrodera/kit-ia-emprendedor-extension/wiki' 
      });
    }

    function showError(message) {
      elements.errorMessage.textContent = message;
      showState('error');
    }
  });

})();