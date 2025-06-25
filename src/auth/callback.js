/**
 * OAuth callback handler
 */

import auth from '@shared/auth.js';
import { logger } from '@shared/logger.js';

// DOM elements
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const retryButton = document.getElementById('retry-button');

/**
 * Show error message in UI
 */
function showErrorMessage(message) {
  errorText.textContent = message;
  errorMessage.style.display = 'block';
  
  // Hide loading elements
  document.querySelector('.loading').style.display = 'none';
  document.querySelector('h2').style.display = 'none';
  document.querySelector('p').style.display = 'none';
}

/**
 * Process OAuth callback
 */
async function handleCallback() {
  try {
    logger.info('Processing OAuth callback');
    
    // Get the current session
    const session = await auth.getSession();
    
    if (!session) {
      throw new Error('No se pudo obtener la sesión');
    }
    
    logger.info('OAuth callback successful', { userId: session.user.id });
    
    // Notify the extension about successful auth
    chrome.runtime.sendMessage({
      type: 'AUTH_SUCCESS',
      user: session.user,
      session: session
    });
    
    // Show success briefly then close
    document.querySelector('h2').textContent = '¡Autenticación exitosa!';
    document.querySelector('p').textContent = 'Esta ventana se cerrará automáticamente...';
    
    setTimeout(() => {
      window.close();
    }, 1500);
    
  } catch (error) {
    logger.error('OAuth callback failed', error);
    showErrorMessage(error.message || 'Error durante la autenticación');
  }
}

// Setup event listeners
if (retryButton) {
  retryButton.addEventListener('click', () => {
    window.location.href = 'login.html';
  });
}

// Handle callback on page load
handleCallback();