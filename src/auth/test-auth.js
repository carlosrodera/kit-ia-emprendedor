/**
 * Script de prueba para autenticación
 */

import { auth } from '../shared/chrome-auth.js';
import { logger } from '../shared/logger.js';

// Elementos DOM
const statusResult = document.getElementById('statusResult');
const emailResult = document.getElementById('emailResult');
const oauthResult = document.getElementById('oauthResult');
const logoutResult = document.getElementById('logoutResult');
const consoleLogs = document.getElementById('consoleLogs');

// Logs array
const logs = [];

// Override console.log para capturar logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

function addLog(type, ...args) {
  const timestamp = new Date().toLocaleTimeString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  logs.push(`[${timestamp}] [${type}] ${message}`);
  updateConsoleLogs();
  
  // También loguear en la consola real
  if (type === 'ERROR') originalError(...args);
  else if (type === 'WARN') originalWarn(...args);
  else if (type === 'INFO') originalInfo(...args);
  else originalLog(...args);
}

console.log = (...args) => addLog('LOG', ...args);
console.error = (...args) => addLog('ERROR', ...args);
console.warn = (...args) => addLog('WARN', ...args);
console.info = (...args) => addLog('INFO', ...args);

// Actualizar logs en pantalla
function updateConsoleLogs() {
  consoleLogs.textContent = logs.slice(-20).join('\n');
  consoleLogs.style.display = 'block';
}

// Mostrar resultado
function showResult(element, message, type = 'info') {
  element.textContent = message;
  element.className = `status ${type}`;
  element.style.display = 'block';
}

// Test: Verificar estado
document.getElementById('checkStatus').addEventListener('click', async () => {
  try {
    console.log('Verificando estado de autenticación...');
    await auth.initialize();
    const isAuth = await auth.isAuthenticated();
    showResult(statusResult, `Autenticado: ${isAuth}`, isAuth ? 'success' : 'warning');
  } catch (error) {
    console.error('Error verificando estado:', error);
    showResult(statusResult, `Error: ${error.message}`, 'error');
  }
});

// Test: Obtener sesión
document.getElementById('getSession').addEventListener('click', async () => {
  try {
    console.log('Obteniendo sesión...');
    const session = await auth.getSession();
    if (session) {
      showResult(statusResult, `Sesión encontrada:\n${JSON.stringify(session, null, 2)}`, 'success');
    } else {
      showResult(statusResult, 'No hay sesión activa', 'warning');
    }
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    showResult(statusResult, `Error: ${error.message}`, 'error');
  }
});

// Test: Obtener usuario
document.getElementById('getUser').addEventListener('click', async () => {
  try {
    console.log('Obteniendo usuario...');
    const user = await auth.getUser();
    if (user) {
      showResult(statusResult, `Usuario:\n${JSON.stringify(user, null, 2)}`, 'success');
    } else {
      showResult(statusResult, 'No hay usuario autenticado', 'warning');
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    showResult(statusResult, `Error: ${error.message}`, 'error');
  }
});

// Test: Login con email
document.getElementById('loginEmail').addEventListener('click', async () => {
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log(`Intentando login con email: ${email}`);
    const result = await auth.signInWithEmail(email, password);
    
    console.log('Login exitoso:', result);
    showResult(emailResult, `Login exitoso!\nUsuario: ${result.user.email}`, 'success');
  } catch (error) {
    console.error('Error en login con email:', error);
    showResult(emailResult, `Error: ${error.message}`, 'error');
  }
});

// Test: Login con Google
document.getElementById('loginGoogle').addEventListener('click', async () => {
  try {
    console.log('Iniciando login con Google...');
    showResult(oauthResult, 'Abriendo ventana de Google...', 'info');
    
    const result = await auth.signInWithOAuth('google');
    
    console.log('Login con Google exitoso:', result);
    showResult(oauthResult, `Login exitoso!\nUsuario: ${result.user.email}`, 'success');
  } catch (error) {
    console.error('Error en login con Google:', error);
    showResult(oauthResult, `Error: ${error.message}`, 'error');
  }
});

// Test: Login con GitHub
document.getElementById('loginGithub').addEventListener('click', async () => {
  try {
    console.log('Iniciando login con GitHub...');
    showResult(oauthResult, 'Abriendo ventana de GitHub...', 'info');
    
    const result = await auth.signInWithOAuth('github');
    
    console.log('Login con GitHub exitoso:', result);
    showResult(oauthResult, `Login exitoso!\nUsuario: ${result.user.email}`, 'success');
  } catch (error) {
    console.error('Error en login con GitHub:', error);
    showResult(oauthResult, `Error: ${error.message}`, 'error');
  }
});

// Test: Logout
document.getElementById('logout').addEventListener('click', async () => {
  try {
    console.log('Cerrando sesión...');
    await auth.signOut();
    
    console.log('Sesión cerrada exitosamente');
    showResult(logoutResult, 'Sesión cerrada exitosamente', 'success');
  } catch (error) {
    console.error('Error cerrando sesión:', error);
    showResult(logoutResult, `Error: ${error.message}`, 'error');
  }
});

// Limpiar logs
document.getElementById('clearLogs').addEventListener('click', () => {
  logs.length = 0;
  updateConsoleLogs();
  consoleLogs.textContent = 'Logs limpiados...';
});

// Inicializar auth al cargar
window.addEventListener('load', async () => {
  try {
    console.log('Inicializando módulo de autenticación...');
    await auth.initialize();
    console.log('Módulo de autenticación inicializado');
    
    // Verificar estado inicial
    const isAuth = await auth.isAuthenticated();
    console.log(`Estado inicial: ${isAuth ? 'Autenticado' : 'No autenticado'}`);
  } catch (error) {
    console.error('Error inicializando auth:', error);
  }
});