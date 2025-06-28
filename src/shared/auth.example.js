/**
 * Ejemplo de uso del módulo de autenticación
 * Este archivo muestra cómo integrar el módulo auth en la extensión
 */
import logger from '../utils/logger.js';


import auth, { setupAutoRefresh, stopAutoRefresh } from './auth.js';
import { CUSTOM_EVENTS } from './constants.js';

/**
 * Ejemplo 1: Inicialización en el Service Worker
 */
export async function initializeAuthInServiceWorker() {
  try {
    // Inicializar el módulo
    await auth.initialize();

    // Configurar auto-refresh de tokens
    setupAutoRefresh();

    // Escuchar cambios de autenticación
    const unsubscribe = auth.onAuthStateChange((event, session) => {
      logger.debug('Auth state changed:', event);

      switch (event) {
        case 'SIGNED_IN':
          logger.debug('User signed in:', session.user.email);
          // Sincronizar GPTs, cargar preferencias, etc.
          break;

        case 'SIGNED_OUT':
          logger.debug('User signed out');
          // Limpiar UI, resetear estado, etc.
          break;

        case 'TOKEN_REFRESHED':
          logger.debug('Token refreshed successfully');
          break;
      }
    });

    // Verificar si hay sesión activa
    if (auth.isAuthenticated()) {
      logger.debug('User already authenticated:', auth.getCurrentUser());

      // Verificar suscripción
      const hasSubscription = await auth.hasActiveSubscription();
      if (!hasSubscription) {
        logger.debug('User has no active subscription');
        // Mostrar mensaje o limitar funcionalidades
      }
    }
  } catch (error) {
    logger.error('Error initializing auth:', error);
  }
}

/**
 * Ejemplo 2: Login desde el popup
 */
export async function handleLoginInPopup() {
  try {
    // Mostrar loading
    showLoading(true);

    // Intentar login con Google
    const result = await auth.loginWithOAuth('google');

    logger.debug('Login successful:', result.user);

    // Actualizar UI
    updateUIForAuthenticatedUser(result.user);

    // Navegar al dashboard
    window.location.href = '/dashboard.html';
  } catch (error) {
    logger.error('Login failed:', error);
    showError('Error al iniciar sesión. Por favor, intenta de nuevo.');
  } finally {
    showLoading(false);
  }
}

/**
 * Ejemplo 3: Logout desde el sidebar
 */
export async function handleLogoutInSidebar() {
  try {
    // Confirmar con el usuario
    const confirmed = await showConfirmDialog(
      '¿Estás seguro que deseas cerrar sesión?',
      'Se eliminarán todos tus datos locales.'
    );

    if (!confirmed) return;

    // Mostrar loading
    showLoading(true);

    // Cerrar sesión
    await auth.logout();

    // Actualizar UI
    updateUIForUnauthenticatedUser();

    // Redirigir al login
    window.location.href = '/login.html';
  } catch (error) {
    logger.error('Logout failed:', error);
    showError('Error al cerrar sesión.');
  } finally {
    showLoading(false);
  }
}

/**
 * Ejemplo 4: Verificar auth antes de operaciones sensibles
 */
export async function savePromptWithAuthCheck(promptData) {
  try {
    // Verificar autenticación
    if (!auth.isAuthenticated()) {
      showError('Debes iniciar sesión para guardar prompts');
      redirectToLogin();
      return;
    }

    // Verificar estado del token
    const isValid = await auth.checkAuthStatus();
    if (!isValid) {
      showError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      await auth.logout();
      redirectToLogin();
      return;
    }

    // Verificar suscripción para features premium
    const hasSubscription = await auth.hasActiveSubscription();
    if (!hasSubscription && promptData.isPremium) {
      showUpgradeModal();
      return;
    }

    // Proceder con el guardado
    await savePrompt(promptData);
    showSuccess('Prompt guardado correctamente');
  } catch (error) {
    logger.error('Error saving prompt:', error);
    showError('Error al guardar el prompt');
  }
}

/**
 * Ejemplo 5: Escuchar eventos de auth en el content script
 */
export function setupAuthListenerInContentScript() {
  // Escuchar eventos personalizados
  window.addEventListener(CUSTOM_EVENTS.AUTH_STATE_CHANGED, (event) => {
    const { detail } = event;

    logger.debug('Auth state changed in content script:', detail);

    if (detail.isAuthenticated) {
      // Mostrar botón de sidebar
      showSidebarButton();
    } else {
      // Ocultar botón de sidebar
      hideSidebarButton();
    }
  });
}

/**
 * Ejemplo 6: Usar el token para llamadas a API
 */
export async function fetchUserGPTs() {
  try {
    // Obtener token de acceso
    const token = auth.getAccessToken();

    if (!token) {
      throw new Error('No access token available');
    }

    // Hacer llamada a API con el token
    const response = await fetch('https://api.kitiaemprendedor.com/gpts', {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token inválido, intentar refresh
        await auth.refreshSession();
        // Reintentar con nuevo token
        return fetchUserGPTs();
      }
      throw new Error('API request failed');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching GPTs:', error);
    throw error;
  }
}

/**
 * Ejemplo 7: Middleware de autenticación para mensajes
 */
export function createAuthMiddleware() {
  return async (message, sender, sendResponse) => {
    // Lista de mensajes que requieren autenticación
    const authRequiredMessages = [
      'SAVE_PROMPT',
      'DELETE_PROMPT',
      'SYNC_GPTS',
      'ADD_FAVORITE'
    ];

    if (authRequiredMessages.includes(message.type)) {
      // Verificar autenticación
      if (!auth.isAuthenticated()) {
        sendResponse({
          success: false,
          error: 'Authentication required'
        });
        return true;
      }

      // Verificar validez del token
      const isValid = await auth.checkAuthStatus();
      if (!isValid) {
        sendResponse({
          success: false,
          error: 'Session expired'
        });
        return true;
      }
    }

    // Continuar con el procesamiento normal
    return false;
  };
}

/**
 * Ejemplo 8: Cleanup al cerrar la extensión
 */
export function cleanupAuth() {
  // Detener auto-refresh
  stopAutoRefresh();

  // Reset del módulo si es necesario
  // auth.reset(); // Solo si queremos limpiar todo
}

// Funciones auxiliares de UI (implementar según necesidad)
function showLoading(show) { /* ... */ }
function showError(message) { /* ... */ }
function showSuccess(message) { /* ... */ }
function updateUIForAuthenticatedUser(user) { /* ... */ }
function updateUIForUnauthenticatedUser() { /* ... */ }
function showConfirmDialog(title, message) { /* ... */ }
function redirectToLogin() { /* ... */ }
function showUpgradeModal() { /* ... */ }
function savePrompt(data) { /* ... */ }
function showSidebarButton() { /* ... */ }
function hideSidebarButton() { /* ... */ }
