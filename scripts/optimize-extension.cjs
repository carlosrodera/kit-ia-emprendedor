#!/usr/bin/env node
// Optimizador agresivo para Kit IA Emprendedor Extension

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const BUILD_DIR = path.join(__dirname, '../dist');

// Optimizar service worker
async function optimizeServiceWorker() {
  const filePath = path.join(BUILD_DIR, 'background/service-worker.js');
  const code = fs.readFileSync(filePath, 'utf8');
  
  // Eliminar logging y código debug
  const optimized = code
    .replace(/console\.(log|info|warn|debug)\([^)]*\);?/g, '')
    .replace(/\/\/ Debug:.*$/gm, '')
    .replace(/debugger;?/g, '');
  
  const result = await minify(optimized, {
    compress: {
      drop_console: true,
      drop_debugger: true,
      dead_code: true,
      unused: true,
      pure_funcs: ['console.log', 'console.info', 'console.warn'],
      passes: 3
    },
    mangle: {
      toplevel: true,
      reserved: ['chrome']
    },
    format: {
      comments: false,
      ascii_only: true
    }
  });
  
  fs.writeFileSync(filePath, result.code);
  console.log('✅ Service worker optimizado');
}

// Optimizar sidebar
async function optimizeSidebar() {
  const jsPath = path.join(BUILD_DIR, 'sidebar/sidebar.js');
  const htmlPath = path.join(BUILD_DIR, 'sidebar/index.html');
  
  // Optimizar JS
  const jsCode = fs.readFileSync(jsPath, 'utf8');
  const jsOptimized = jsCode.replace(/console\.(log|info|warn|debug)\([^)]*\);?/g, '');
  
  const jsResult = await minify(jsOptimized, {
    compress: {
      drop_console: true,
      dead_code: true,
      unused: true,
      passes: 3
    },
    mangle: {
      toplevel: true,
      reserved: ['chrome', 'document', 'window']
    }
  });
  
  fs.writeFileSync(jsPath, jsResult.code);
  
  // Optimizar HTML/CSS
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Extraer CSS
  const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (cssMatch) {
    let css = cssMatch[1];
    
    // Optimizar CSS más agresivamente
    css = css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Comentarios
      .replace(/\s+/g, ' ') // Espacios múltiples
      .replace(/:\s+/g, ':') // Espacios después de :
      .replace(/;\s+/g, ';') // Espacios después de ;
      .replace(/\{\s+/g, '{') // Espacios después de {
      .replace(/\s+\}/g, '}') // Espacios antes de }
      .replace(/\s*,\s*/g, ',') // Espacios alrededor de ,
      .replace(/;\s*}/g, '}') // ; antes de }
      .replace(/\s+(!important)/g, '$1') // Espacios antes de !important
      .trim();
    
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/, `<style>${css}</style>`);
  }
  
  // Optimizar HTML
  html = html
    .replace(/<!--[\s\S]*?-->/g, '') // Comentarios
    .replace(/\s+/g, ' ') // Espacios múltiples
    .replace(/>\s+</g, '><') // Espacios entre tags
    .replace(/\s+>/g, '>') // Espacios antes de >
    .replace(/<\s+/g, '<') // Espacios después de <
    .trim();
  
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Sidebar optimizado');
}

// Optimizar content script
async function optimizeContentScript() {
  const filePath = path.join(BUILD_DIR, 'content/content-script.js');
  const code = fs.readFileSync(filePath, 'utf8');
  
  const optimized = code.replace(/console\.(log|info|warn|debug)\([^)]*\);?/g, '');
  
  const result = await minify(optimized, {
    compress: {
      drop_console: true,
      dead_code: true,
      unused: true,
      passes: 3
    },
    mangle: {
      toplevel: true,
      reserved: ['chrome', 'document', 'window']
    }
  });
  
  fs.writeFileSync(filePath, result.code);
  console.log('✅ Content script optimizado');
}

// Optimizar popup
async function optimizePopup() {
  const jsPath = path.join(BUILD_DIR, 'popup/popup.js');
  const htmlPath = path.join(BUILD_DIR, 'popup/popup.html');
  
  // Optimizar JS
  const jsCode = fs.readFileSync(jsPath, 'utf8');
  const jsResult = await minify(jsCode, {
    compress: {
      drop_console: true,
      dead_code: true,
      unused: true
    },
    mangle: true
  });
  
  fs.writeFileSync(jsPath, jsResult.code);
  
  // Optimizar HTML
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Popup optimizado');
}

// Eliminar archivos innecesarios
function removeUnnecessaryFiles() {
  const toRemove = ['generate-icons.js'];
  toRemove.forEach(file => {
    const filePath = path.join(BUILD_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  Eliminado: ${file}`);
    }
  });
}

// Calcular tamaño
function getDirSize(dirPath) {
  let size = 0;
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      size += getDirSize(filePath);
    } else {
      size += stat.size;
    }
  }
  
  return size;
}

// Main
async function optimize() {
  console.log('🚀 Optimizando extensión...\n');
  
  await optimizeServiceWorker();
  await optimizeSidebar();
  await optimizeContentScript();
  await optimizePopup();
  removeUnnecessaryFiles();
  
  const totalSize = getDirSize(BUILD_DIR);
  console.log('\n✅ Optimización completada!');
  console.log(`📊 Tamaño final: ${(totalSize / 1024).toFixed(2)} KB`);
  
  if (totalSize > 50 * 1024) {
    console.warn('⚠️  ADVERTENCIA: Aún excede 50KB');
  } else {
    console.log('✨ ¡Objetivo logrado! <50KB');
  }
}

optimize().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});