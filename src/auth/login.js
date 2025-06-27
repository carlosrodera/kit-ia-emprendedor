/**
 * Login page script
 */

import { auth } from '../shared/auth.js';
import { logger } from '../shared/logger.js';

// DOM elements
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const signupLink = document.getElementById('signup-link');
const errorMessage = document.getElementById('error-message');

/**
 * Show error message in UI
 */
function showErrorMessage(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

/**
 * Hide error message in UI
 */
function hideErrorMessage() {
  errorMessage.style.display = 'none';
}

/**
 * Toggle loading state
 */
function setLoading(isLoading) {
  if (isLoading) {
    loginBtn.disabled = true;
    loginBtn.querySelector('.btn-text').style.display = 'none';
    loginBtn.querySelector('.btn-loading').style.display = 'inline-block';
  } else {
    loginBtn.disabled = false;
    loginBtn.querySelector('.btn-text').style.display = 'inline-block';
    loginBtn.querySelector('.btn-loading').style.display = 'none';
  }
}

/**
 * Handle email/password login
 */
async function handleEmailLogin(e) {
  e.preventDefault();

  hideErrorMessage();
  setLoading(true);

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    logger.info('Attempting email login', { email });

    // Inicializar auth module si no está disponible
    if (!auth.isInitialized) {
      await auth.initialize();
    }

    const result = await auth.signInWithEmail(email, password);

    logger.info('Login successful', { userId: result.user.id });

    // Close the window and notify the extension
    chrome.runtime.sendMessage({
      type: 'AUTH_SUCCESS',
      user: result.user
    });

    // Redirect back to main panel
    window.location.href = chrome.runtime.getURL('sidepanel/index.html');
  } catch (error) {
    logger.error('Login failed', error);
    showErrorMessage(error.message || 'Error al iniciar sesión');
  } finally {
    setLoading(false);
  }
}

/**
 * Handle signup link
 */
function handleSignupClick(e) {
  e.preventDefault();

  // For now, show a message since we're not implementing signup
  showErrorMessage('El registro no está disponible en este momento. Contacta al administrador.');
}

// Event listeners
form.addEventListener('submit', handleEmailLogin);
signupLink.addEventListener('click', handleSignupClick);

// Auto-focus email field
emailInput.focus();
