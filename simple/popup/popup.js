// Popup script para Kit IA Emprendedor
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
      retryBtn: document.getElementById('retry-btn'),
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
    elements.retryBtn?.addEventListener('click', () => location.reload());

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
      
      if (elements.userAvatar) {
        if (user.avatar_url) {
          elements.userAvatar.src = user.avatar_url;
        } else {
          // Crear avatar con inicial
          const initial = user.email ? user.email[0].toUpperCase() : '?';
          elements.userAvatar.style.display = 'none';
          const avatarDiv = document.createElement('div');
          avatarDiv.className = 'user-avatar';
          avatarDiv.textContent = initial;
          elements.userAvatar.parentElement.replaceChild(avatarDiv, elements.userAvatar);
        }
      }
    }

    async function loadStats() {
      try {
        // Cargar estadísticas de GPTs
        const gptResponse = await chrome.runtime.sendMessage({ type: 'GET_GPT_STATS' });
        if (gptResponse?.success) {
          elements.totalGpts.textContent = gptResponse.data.total || 0;
          elements.favoriteCount.textContent = gptResponse.data.favoriteCount || 0;
          elements.promptCount.textContent = gptResponse.data.promptCount || 0;
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }

    async function handleLogin() {
      try {
        elements.loginBtn.disabled = true;
        
        const response = await chrome.runtime.sendMessage({ 
          type: 'LOGIN',
          data: { provider: 'google' }
        });
        
        if (response?.success) {
          showState('logged');
          updateUserInfo(response.data.user);
          await loadStats();
        } else {
          throw new Error(response?.error || 'Login failed');
        }
      } catch (error) {
        console.error('Login error:', error);
        showError('Error al iniciar sesión');
      } finally {
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
        
        // Verificar si podemos inyectar en esta página
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
          // Abrir ChatGPT en nueva pestaña
          chrome.tabs.create({ url: 'https://chat.openai.com' });
          window.close();
          return;
        }

        // Intentar enviar mensaje al content script
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            type: 'TOGGLE_SIDEBAR',
            data: { show: true }
          });
          window.close();
        } catch (messageError) {
          // Si falla, intentar inyectar el content script primero
          console.log('Content script not loaded, injecting...');
          
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content/content-script.js']
            });
            
            // Esperar un momento para que se cargue
            setTimeout(async () => {
              try {
                await chrome.tabs.sendMessage(tab.id, { 
                  type: 'TOGGLE_SIDEBAR',
                  data: { show: true }
                });
                window.close();
              } catch (retryError) {
                console.error('Retry error:', retryError);
                showError('Error al abrir el panel. Intenta recargar la página.');
              }
            }, 100);
          } catch (injectError) {
            console.error('Inject error:', injectError);
            showError('No se puede abrir el panel en esta página');
          }
        }
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
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M1 4V10H7M23 20V14H17M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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