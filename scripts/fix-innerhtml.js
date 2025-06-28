#!/usr/bin/env node

/**
 * Script para reemplazar innerHTML inseguros con SecureDOM
 * Ejecutar: node scripts/fix-innerhtml.js
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname, basename } from 'path';

const FILES_TO_FIX = [
  './src/sidepanel/sidepanel.js',
  './src/sidepanel/components/plan-ui.js',
  './src/sidebar/sidebar.js',
  './src/content/content-script.js',
  './src/components/device-manager.js',
  './src/shared/notifications.js',
  './src/sidebar/components/notifications.js'
];

// Patrones de reemplazo
const REPLACEMENTS = [
  {
    // innerHTML simple assignment
    pattern: /(\w+)\.innerHTML\s*=\s*`([^`]+)`/g,
    replacement: (match, element, content) => {
      // Si es solo texto sin HTML
      if (!/<[^>]+>/.test(content)) {
        return `SecureDOM.setText(${element}, \`${content}\`)`;
      }
      // Si contiene HTML
      return `SecureDOM.setHTML(${element}, \`${content}\`)`;
    }
  },
  {
    // innerHTML con template literal multilinea
    pattern: /(\w+)\.innerHTML\s*=\s*`([^`]+)`/gs,
    replacement: (match, element, content) => {
      if (!/<[^>]+>/.test(content)) {
        return `SecureDOM.setText(${element}, \`${content}\`)`;
      }
      return `SecureDOM.setHTML(${element}, \`${content}\`)`;
    }
  },
  {
    // innerHTML con string simple
    pattern: /(\w+)\.innerHTML\s*=\s*'([^']+)'/g,
    replacement: (match, element, content) => {
      if (!/<[^>]+>/.test(content)) {
        return `SecureDOM.setText(${element}, '${content}')`;
      }
      return `SecureDOM.setHTML(${element}, '${content}')`;
    }
  },
  {
    // innerHTML con string doble
    pattern: /(\w+)\.innerHTML\s*=\s*"([^"]+)"/g,
    replacement: (match, element, content) => {
      if (!/<[^>]+>/.test(content)) {
        return `SecureDOM.setText(${element}, "${content}")`;
      }
      return `SecureDOM.setHTML(${element}, "${content}")`;
    }
  },
  {
    // innerHTML vacío
    pattern: /(\w+)\.innerHTML\s*=\s*['"`]['"`]/g,
    replacement: (match, element) => `SecureDOM.clear(${element})`
  },
  {
    // innerHTML con expresión
    pattern: /(\w+)\.innerHTML\s*=\s*([^;]+);/g,
    replacement: (match, element, expression) => {
      // Si es una expresión compleja, usar setHTML
      if (expression.includes('.map(') || expression.includes('+') || expression.includes('?')) {
        return `SecureDOM.setHTML(${element}, ${expression});`;
      }
      return match; // Dejar sin cambios si no es claro
    }
  }
];

// Reemplazos para console.log
const CONSOLE_REPLACEMENTS = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.debug('
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error('
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn('
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'logger.info('
  }
];

async function fixFile(filePath) {
  try {
    let content = await readFile(filePath, 'utf-8');
    const originalContent = content;
    let changesMade = 0;
    
    // Añadir imports si no existen
    const hasSecureDOM = content.includes('import SecureDOM') || content.includes('import { SecureDOM');
    const hasLogger = content.includes('import logger') || content.includes('import { logger');
    
    let imports = [];
    if (!hasSecureDOM && content.includes('.innerHTML')) {
      imports.push("import SecureDOM from '../utils/secure-dom.js';");
    }
    if (!hasLogger && content.includes('console.')) {
      imports.push("import logger from '../utils/logger.js';");
    }
    
    if (imports.length > 0) {
      // Buscar dónde insertar los imports
      const firstImportMatch = content.match(/^import .+ from .+;/m);
      if (firstImportMatch) {
        // Insertar después del primer import
        const insertPos = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
        content = content.slice(0, insertPos) + '\n' + imports.join('\n') + content.slice(insertPos);
      } else {
        // Insertar al principio del archivo
        content = imports.join('\n') + '\n\n' + content;
      }
      changesMade += imports.length;
    }
    
    // Aplicar reemplazos de innerHTML
    REPLACEMENTS.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        changesMade += matches.length;
        content = content.replace(pattern, replacement);
      }
    });
    
    // Aplicar reemplazos de console
    CONSOLE_REPLACEMENTS.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        changesMade += matches.length;
        content = content.replace(pattern, replacement);
      }
    });
    
    if (changesMade > 0) {
      await writeFile(filePath, content);
      console.log(`✅ Fixed ${filePath}: ${changesMade} changes made`);
      return changesMade;
    } else {
      console.log(`ℹ️  ${filePath}: No changes needed`);
      return 0;
    }
    
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🔧 Fixing innerHTML vulnerabilities...\n');
  
  let totalChanges = 0;
  
  for (const file of FILES_TO_FIX) {
    const changes = await fixFile(file);
    totalChanges += changes;
  }
  
  console.log(`\n✨ Total changes made: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n⚠️  IMPORTANT: Please review all changes and test thoroughly!');
    console.log('   Some complex innerHTML expressions may need manual adjustment.');
  }
}

main().catch(console.error);