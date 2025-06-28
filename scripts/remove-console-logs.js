/**
 * Script para reemplazar todos los console.log con logger
 */

import fs from 'fs';
import path from 'path';
import pkg from 'glob';
const { glob } = pkg;

// Función para procesar un archivo
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let hasChanges = false;
  
  // Patterns para detectar console.log
  const patterns = [
    // console.log simple
    { 
      pattern: /console\.log\s*\(/g,
      replacement: 'logger.debug('
    },
    // console.error
    { 
      pattern: /console\.error\s*\(/g,
      replacement: 'logger.error('
    },
    // console.warn
    { 
      pattern: /console\.warn\s*\(/g,
      replacement: 'logger.warn('
    },
    // console.info
    { 
      pattern: /console\.info\s*\(/g,
      replacement: 'logger.info('
    }
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      hasChanges = true;
    }
  });
  
  // Si hay cambios, verificar si necesita importar logger
  if (hasChanges) {
    // Verificar si ya tiene import de logger
    const hasLoggerImport = /import.*logger.*from.*logger/i.test(content);
    
    if (!hasLoggerImport) {
      // Determinar la ruta relativa correcta para el import
      const fileDir = path.dirname(filePath);
      const relativePath = path.relative(fileDir, path.join(process.cwd(), 'src/utils/logger.js'));
      const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
      
      // Añadir import al principio del archivo (después de los comentarios)
      const importStatement = `import logger from '${importPath.replace(/\\/g, '/')}';\n`;
      
      // Buscar dónde insertar el import (después del primer comentario de bloque si existe)
      const blockCommentEnd = content.indexOf('*/');
      if (blockCommentEnd !== -1) {
        const insertPosition = blockCommentEnd + 2;
        content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
      } else {
        content = importStatement + content;
      }
    }
    
    // Guardar archivo modificado
    fs.writeFileSync(filePath, content);
    console.log(`✅ Procesado: ${filePath}`);
    return 1;
  }
  
  return 0;
}

// Buscar todos los archivos JS
const files = glob.sync('src/**/*.js', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/utils/logger.js']
});

console.log(`🔍 Encontrados ${files.length} archivos JS para procesar`);

let totalProcessed = 0;

files.forEach(file => {
  totalProcessed += processFile(file);
});

console.log(`\n✨ Proceso completado: ${totalProcessed} archivos modificados`);