#!/usr/bin/env node

/**
 * Script para verificar el tamaño del bundle después del build
 * Verifica que el tamaño total sea menor a 50KB
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const MAX_SIZE_KB = 50;

// Colores para console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Obtiene el tamaño de un archivo en bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Obtiene todos los archivos JS y CSS recursivamente
 */
function getAllFiles(dirPath, fileList = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      fileList.push({
        path: filePath,
        name: path.relative(DIST_DIR, filePath),
        size: stat.size
      });
    }
  });
  
  return fileList;
}

/**
 * Formatea bytes a KB/MB
 */
function formatSize(bytes) {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
}

/**
 * Main function
 */
function checkBundleSize() {
  console.log(`${colors.blue}📦 Kit IA Emprendedor - Bundle Size Analyzer${colors.reset}\n`);
  
  // Verificar que existe el directorio dist
  if (!fs.existsSync(DIST_DIR)) {
    console.error(`${colors.red}❌ Error: No se encontró el directorio dist/`);
    console.error(`   Ejecuta 'npm run build' primero${colors.reset}`);
    process.exit(1);
  }
  
  // Obtener todos los archivos JS y CSS
  const files = getAllFiles(DIST_DIR);
  
  if (files.length === 0) {
    console.error(`${colors.red}❌ Error: No se encontraron archivos JS o CSS en dist/${colors.reset}`);
    process.exit(1);
  }
  
  // Calcular tamaños
  let totalSize = 0;
  const filesByType = {
    'service-worker': [],
    'content-script': [],
    'popup': [],
    'sidebar': [],
    'auth': [],
    'shared': [],
    'other': []
  };
  
  // Clasificar archivos por tipo
  files.forEach(file => {
    totalSize += file.size;
    
    if (file.name.includes('service-worker')) {
      filesByType['service-worker'].push(file);
    } else if (file.name.includes('content-script')) {
      filesByType['content-script'].push(file);
    } else if (file.name.includes('popup')) {
      filesByType['popup'].push(file);
    } else if (file.name.includes('sidebar')) {
      filesByType['sidebar'].push(file);
    } else if (file.name.includes('auth')) {
      filesByType['auth'].push(file);
    } else if (file.name.includes('shared')) {
      filesByType['shared'].push(file);
    } else {
      filesByType['other'].push(file);
    }
  });
  
  // Mostrar reporte detallado
  console.log(`${colors.cyan}📊 Desglose por módulo:${colors.reset}`);
  console.log('─'.repeat(60));
  
  Object.entries(filesByType).forEach(([type, files]) => {
    if (files.length > 0) {
      const moduleSize = files.reduce((sum, file) => sum + file.size, 0);
      console.log(`\n${colors.yellow}${type}:${colors.reset}`);
      
      files.forEach(file => {
        const sizeStr = formatSize(file.size);
        console.log(`  ${file.name.padEnd(40)} ${sizeStr.padStart(10)}`);
      });
      
      console.log(`  ${'Total:'.padEnd(40)} ${formatSize(moduleSize).padStart(10)}`);
    }
  });
  
  // Resumen total
  console.log('\n' + '─'.repeat(60));
  console.log(`${colors.cyan}📈 Resumen:${colors.reset}`);
  console.log(`  Archivos analizados: ${files.length}`);
  console.log(`  Tamaño total: ${formatSize(totalSize)}`);
  
  const totalSizeKB = totalSize / 1024;
  const percentage = (totalSizeKB / MAX_SIZE_KB) * 100;
  
  console.log(`  Límite: ${MAX_SIZE_KB} KB`);
  console.log(`  Uso: ${percentage.toFixed(1)}%`);
  
  // Archivos más grandes
  console.log(`\n${colors.cyan}🏆 Top 5 archivos más grandes:${colors.reset}`);
  const sortedFiles = [...files].sort((a, b) => b.size - a.size).slice(0, 5);
  sortedFiles.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file.name.padEnd(35)} ${formatSize(file.size).padStart(10)}`);
  });
  
  // Verificación final
  console.log('\n' + '─'.repeat(60));
  if (totalSizeKB <= MAX_SIZE_KB) {
    console.log(`${colors.green}✅ Bundle size OK: ${formatSize(totalSize)} (${percentage.toFixed(1)}% del límite)${colors.reset}`);
    
    if (percentage > 80) {
      console.log(`${colors.yellow}⚠️  Advertencia: El bundle está usando más del 80% del límite${colors.reset}`);
    }
    
    process.exit(0);
  } else {
    console.error(`${colors.red}❌ Bundle size excede el límite!${colors.reset}`);
    console.error(`   Tamaño actual: ${formatSize(totalSize)}`);
    console.error(`   Límite: ${MAX_SIZE_KB} KB`);
    console.error(`   Exceso: ${formatSize((totalSizeKB - MAX_SIZE_KB) * 1024)}`);
    
    console.log(`\n${colors.yellow}💡 Sugerencias para reducir el tamaño:${colors.reset}`);
    console.log('   1. Revisa las dependencias y elimina las no usadas');
    console.log('   2. Activa tree-shaking más agresivo');
    console.log('   3. Divide el código en chunks más pequeños');
    console.log('   4. Usa dynamic imports para código no crítico');
    console.log('   5. Minimiza el CSS y elimina estilos no usados');
    
    process.exit(1);
  }
}

// Ejecutar
try {
  checkBundleSize();
} catch (error) {
  console.error(`${colors.red}❌ Error inesperado:${colors.reset}`, error);
  process.exit(1);
}