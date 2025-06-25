#!/usr/bin/env node
// Build script para Kit IA Emprendedor Extension

const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

// Configuración
const SOURCE_DIR = path.join(__dirname, '../simple');
const BUILD_DIR = path.join(__dirname, '../dist');

// Limpiar directorio de build
function cleanBuildDir() {
  if (fs.existsSync(BUILD_DIR)) {
    fs.rmSync(BUILD_DIR, { recursive: true });
  }
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

// Minificar archivo JavaScript
async function minifyJS(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const result = await minify(code, {
    compress: {
      drop_console: false,
      drop_debugger: true,
      passes: 2,
      dead_code: true,
      unused: true
    },
    mangle: {
      toplevel: true,
      reserved: ['chrome', 'browser']
    },
    format: {
      comments: false,
      ascii_only: true
    }
  });
  return result.code;
}

// Minificar CSS
function minifyCSS(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar comentarios
    .replace(/\s+/g, ' ') // Colapsar espacios
    .replace(/:\s+/g, ':') // Eliminar espacios después de :
    .replace(/;\s+/g, ';') // Eliminar espacios después de ;
    .replace(/\{\s+/g, '{') // Eliminar espacios después de {
    .replace(/\s+\}/g, '}') // Eliminar espacios antes de }
    .replace(/\s*,\s*/g, ',') // Eliminar espacios alrededor de ,
    .trim();
}

// Minificar HTML
function minifyHTML(content) {
  // Extraer y minificar CSS inline
  content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
    return `<style>${minifyCSS(css)}</style>`;
  });
  
  // Minificar HTML
  return content
    .replace(/<!--[\s\S]*?-->/g, '') // Eliminar comentarios
    .replace(/\s+/g, ' ') // Colapsar espacios
    .replace(/>\s+</g, '><') // Eliminar espacios entre tags
    .trim();
}

// Copiar y minificar archivos
async function processFiles(srcDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const files = fs.readdirSync(srcDir);
  
  for (const file of files) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      await processFiles(srcPath, destPath);
    } else {
      const ext = path.extname(file).toLowerCase();
      
      if (ext === '.js') {
        console.log(`Minificando JS: ${file}`);
        const minified = await minifyJS(srcPath);
        fs.writeFileSync(destPath, minified);
      } else if (ext === '.html') {
        console.log(`Minificando HTML: ${file}`);
        const content = fs.readFileSync(srcPath, 'utf8');
        const minified = minifyHTML(content);
        fs.writeFileSync(destPath, minified);
      } else if (ext === '.json') {
        console.log(`Minificando JSON: ${file}`);
        const content = fs.readFileSync(srcPath, 'utf8');
        const minified = JSON.stringify(JSON.parse(content));
        fs.writeFileSync(destPath, minified);
      } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg'].includes(ext)) {
        console.log(`Copiando imagen: ${file}`);
        fs.copyFileSync(srcPath, destPath);
      } else {
        console.log(`Ignorando: ${file}`);
      }
    }
  }
}

// Calcular tamaño del directorio
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

// Formatear tamaño
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Main
async function build() {
  console.log('🚀 Construyendo Kit IA Emprendedor Extension...\n');
  
  // Limpiar directorio
  console.log('🧹 Limpiando directorio de build...');
  cleanBuildDir();
  
  // Procesar archivos
  console.log('\n📦 Procesando archivos...');
  await processFiles(SOURCE_DIR, BUILD_DIR);
  
  // Mostrar tamaño final
  const totalSize = getDirSize(BUILD_DIR);
  console.log('\n✅ Build completado!');
  console.log(`📊 Tamaño total: ${formatSize(totalSize)}`);
  
  if (totalSize > 50 * 1024) {
    console.warn('⚠️  ADVERTENCIA: El tamaño excede 50KB!');
  } else {
    console.log('✨ Tamaño dentro del límite objetivo (<50KB)');
  }
  
  console.log('\n📁 Extensión lista en:', BUILD_DIR);
}

// Ejecutar build
build().catch(err => {
  console.error('❌ Error durante el build:', err);
  process.exit(1);
});