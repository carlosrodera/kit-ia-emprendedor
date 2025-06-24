/**
 * Login page script
 */

import auth from '@shared/auth.js';
import { error as showError, info as showInfo } from '@shared/notifications.js';
import { logger } from '@shared/logger.js';

// DOM elements
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const googleBtn = document.getElementById('google-btn');
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
    googleBtn.disabled = true;
    loginBtn.querySelector('.btn-text').style.display = 'none';
    loginBtn.querySelector('.btn-loading').style.display = 'inline-block';
  } else {
    loginBtn.disabled = false;
    googleBtn.disabled = false;
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
    
    const { data, error } = await auth.signIn(email, password);
    
    if (error) {
      throw error;
    }
    
    logger.info('Login successful', { userId: data.user.id });
    
    // Close the window and notify the extension
    chrome.runtime.sendMessage({
      type: 'AUTH_SUCCESS',
      user: data.user
    });
    
    window.close();
    
  } catch (error) {
    logger.error('Login failed', error);
    showErrorMessage(error.message || 'Error al iniciar sesión');
  } finally {
    setLoading(false);
  }
}

/**
 * Handle Google OAuth login
 */
async function handleGoogleLogin() {
  hideErrorMessage();
  setLoading(true);
  
  try {
    logger.info('Initiating Google OAuth login');
    
    // Por ahora, mostrar mensaje ya que OAuth no está implementado en auth.js
    throw new Error('Login con Google no está disponible temporalmente');
    
  } catch (error) {
    logger.error('Google login failed', error);
    showErrorMessage(error.message || 'Error al iniciar sesión con Google');
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
googleBtn.addEventListener('click', handleGoogleLogin);
signupLink.addEventListener('click', handleSignupClick);

// Auto-focus email field
emailInput.focus();