#!/usr/bin/env node

/**
 * Script para verificar que la extensión esté lista para cargar en Chrome
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist');

// Archivos requeridos
const REQUIRED_FILES = [
  'manifest.json',
  'background/service-worker.js',
  'content/content-script.js',
  'popup/popup.html',
  'sidebar/index.html',
  'sidebar/styles/sidebar.css',
  'assets/icons/icon-16.png',
  'assets/icons/icon-32.png',
  'assets/icons/icon-48.png',
  'assets/icons/icon-128.png'
];

console.log('🔍 Verificando extensión Kit IA Emprendedor...\n');

let hasErrors = false;

// Verificar que existe la carpeta dist
if (!fs.existsSync(DIST_DIR)) {
  console.error('❌ La carpeta dist/ no existe. Ejecuta: npm run build');
  process.exit(1);
}

// Verificar archivos requeridos
console.log('📁 Verificando archivos requeridos:');
REQUIRED_FILES.forEach(file => {
  const filePath = path.join(DIST_DIR, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
  } else {
    console.error(`  ❌ ${file} - NO ENCONTRADO`);
    hasErrors = true;
  }
});

// Verificar manifest.json
console.log('\n📋 Verificando manifest.json:');
try {
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Verificaciones básicas
  if (manifest.manifest_version === 3) {
    console.log('  ✅ Manifest version 3');
  } else {
    console.error('  ❌ Manifest version debe ser 3');
    hasErrors = true;
  }
  
  if (manifest.name && manifest.version && manifest.description) {
    console.log('  ✅ Información básica presente');
  } else {
    console.error('  ❌ Falta información básica (name, version, description)');
    hasErrors = true;
  }
  
  if (manifest.permissions && manifest.permissions.includes('storage')) {
    console.log('  ✅ Permisos configurados');
  } else {
    console.error('  ❌ Falta permiso de storage');
    hasErrors = true;
  }
  
} catch (error) {
  console.error('  ❌ Error leyendo manifest.json:', error.message);
  hasErrors = true;
}

// Calcular tamaño total
console.log('\n📊 Tamaño de la extensión:');
const getDirectorySize = (dir) => {
  let size = 0;
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    }
  });
  
  return size;
};

const totalSize = getDirectorySize(DIST_DIR);
const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
console.log(`  📦 Tamaño total: ${totalSizeMB} MB`);

// Resultado final
console.log('\n' + '='.repeat(50));
if (!hasErrors) {
  console.log('✅ La extensión está lista para cargar en Chrome!');
  console.log('\nPasos siguientes:');
  console.log('1. Abre chrome://extensions/');
  console.log('2. Activa "Modo de desarrollador"');
  console.log('3. Click en "Cargar extensión sin empaquetar"');
  console.log(`4. Selecciona: ${DIST_DIR}`);
} else {
  console.error('❌ Se encontraron errores. Corrige los problemas antes de cargar.');
  process.exit(1);
}