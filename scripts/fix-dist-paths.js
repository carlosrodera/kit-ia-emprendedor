#!/usr/bin/env node

/**
 * Fix Vite build paths for Chrome Extension
 * 
 * Vite genera algunas rutas incorrectas que necesitan ser ajustadas
 * para que funcionen correctamente en una Chrome Extension.
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, '..', 'dist');

console.log('🔧 Arreglando rutas en dist...');

// 1. Renombrar archivo style a style.css si existe
const stylePath = join(distPath, 'style');
const styleCssPath = join(distPath, 'style.css');
if (existsSync(stylePath) && !existsSync(styleCssPath)) {
  renameSync(stylePath, styleCssPath);
  console.log('✅ Renombrado: style → style.css');
}

// 2. Arreglar rutas en sidepanel/index.html
const sidepanelPath = join(distPath, 'sidepanel', 'index.html');
if (existsSync(sidepanelPath)) {
  let content = readFileSync(sidepanelPath, 'utf8');
  
  // Arreglar ruta del JS
  content = content.replace(
    'src="../sidepanel/sidepanel.js"',
    'src="./sidepanel.js"'
  );
  
  // Arreglar ruta del CSS
  content = content.replace(
    'href="../style"',
    'href="./sidepanel.css"'
  );
  
  writeFileSync(sidepanelPath, content);
  console.log('✅ Arreglado: sidepanel/index.html');
}

// 3. Arreglar rutas en auth/login.html
const loginPath = join(distPath, 'auth', 'login.html');
if (existsSync(loginPath)) {
  let content = readFileSync(loginPath, 'utf8');
  
  // Arreglar ruta del CSS
  content = content.replace(
    'href="../style"',
    'href="../style.css"'
  );
  
  writeFileSync(loginPath, content);
  console.log('✅ Arreglado: auth/login.html');
}

// 4. Arreglar rutas en auth/callback.html
const callbackPath = join(distPath, 'auth', 'callback.html');
if (existsSync(callbackPath)) {
  let content = readFileSync(callbackPath, 'utf8');
  
  // Arreglar ruta del CSS
  content = content.replace(
    'href="../style"',
    'href="../style.css"'
  );
  
  writeFileSync(callbackPath, content);
  console.log('✅ Arreglado: auth/callback.html');
}

console.log('✨ Rutas arregladas correctamente');