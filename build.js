/**
 * Kit IA Emprendedor - Build Script
 * Compila la extensión de /src a /dist
 */

const fs = require('fs-extra');
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');

// Directorios
const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

// Limpiador CSS
const cleanCSS = new CleanCSS({ level: 2 });

/**
 * Limpia el directorio dist
 */
async function cleanDist() {
  console.log('🧹 Limpiando directorio dist...');
  await fs.emptyDir(DIST_DIR);
}

/**
 * Copia archivos estáticos
 */
async function copyStaticFiles() {
  console.log('📋 Copiando archivos estáticos...');
  
  // Copiar manifest.json
  await fs.copy(
    path.join(SRC_DIR, 'manifest.json'),
    path.join(DIST_DIR, 'manifest.json')
  );
  
  // Copiar iconos
  await fs.copy(
    path.join(SRC_DIR, 'icons'),
    path.join(DIST_DIR, 'icons')
  );
}

/**
 * Procesa archivos JavaScript
 */
async function processJavaScript() {
  console.log('📦 Procesando JavaScript...');
  
  const jsFiles = [
    { src: 'background/service-worker.js', dist: 'background/service-worker.js' },
    { src: 'sidepanel/sidepanel.js', dist: 'sidepanel/sidepanel.js' },
    { src: 'popup/popup.js', dist: 'popup/popup.js' }
  ];
  
  for (const file of jsFiles) {
    const srcPath = path.join(SRC_DIR, file.src);
    const distPath = path.join(DIST_DIR, file.dist);
    
    // Asegurar que el directorio existe
    await fs.ensureDir(path.dirname(distPath));
    
    // Leer archivo
    const code = await fs.readFile(srcPath, 'utf8');
    
    // Minificar en producción
    if (process.env.NODE_ENV === 'production') {
      const result = await minify(code, {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        mangle: true
      });
      
      await fs.writeFile(distPath, result.code);
    } else {
      // En desarrollo, copiar sin minificar
      await fs.writeFile(distPath, code);
    }
  }
}

/**
 * Procesa archivos CSS
 */
async function processCSS() {
  console.log('🎨 Procesando CSS...');
  
  const cssFiles = [
    { src: 'sidepanel/sidepanel.css', dist: 'sidepanel/sidepanel.css' }
  ];
  
  for (const file of cssFiles) {
    const srcPath = path.join(SRC_DIR, file.src);
    const distPath = path.join(DIST_DIR, file.dist);
    
    // Asegurar que el directorio existe
    await fs.ensureDir(path.dirname(distPath));
    
    // Leer archivo
    const css = await fs.readFile(srcPath, 'utf8');
    
    // Minificar en producción
    if (process.env.NODE_ENV === 'production') {
      const output = cleanCSS.minify(css);
      await fs.writeFile(distPath, output.styles);
    } else {
      // En desarrollo, copiar sin minificar
      await fs.writeFile(distPath, css);
    }
  }
}

/**
 * Procesa archivos HTML
 */
async function processHTML() {
  console.log('📄 Procesando HTML...');
  
  const htmlFiles = [
    { src: 'sidepanel/index.html', dist: 'sidepanel/index.html' },
    { src: 'popup/popup.html', dist: 'popup/popup.html' }
  ];
  
  for (const file of htmlFiles) {
    const srcPath = path.join(SRC_DIR, file.src);
    const distPath = path.join(DIST_DIR, file.dist);
    
    // Asegurar que el directorio existe
    await fs.ensureDir(path.dirname(distPath));
    
    // Copiar archivo
    await fs.copy(srcPath, distPath);
  }
}

/**
 * Crea el archivo de datos con los GPTs oficiales
 */
async function createDataFile() {
  console.log('📊 Creando archivo de datos...');
  
  const gptsData = {
    version: 1,
    gpts: [
      {
        id: "gpt-1",
        name: "Consensus",
        description: "Tu asistente de investigación IA",
        category: "Research",
        url: "https://chatgpt.com/g/g-bo0FiWLY7-consensus",
        tags: ["investigación", "académico", "papers"]
      },
      {
        id: "gpt-2",
        name: "image generator",
        description: "Un GPT con licencia para usar DALL·E",
        category: "Creative",
        url: "https://chatgpt.com/g/g-pmuQfob8d-image-generator",
        tags: ["imágenes", "arte", "diseño"]
      },
      {
        id: "gpt-3",
        name: "Data Analyst",
        description: "Sube cualquier archivo con datos",
        category: "Productivity",
        url: "https://chatgpt.com/g/g-HMNcP6w7d-data-analyst",
        tags: ["datos", "análisis", "estadísticas"]
      },
      {
        id: "gpt-4",
        name: "Canva",
        description: "Crea fácilmente diseños para ti",
        category: "Creative",
        url: "https://chatgpt.com/g/g-alKfVrz9K-canva",
        tags: ["diseño", "presentaciones", "gráficos"]
      },
      {
        id: "gpt-5",
        name: "Write For Me",
        description: "Escribe contenido adaptado con IA",
        category: "Writing",
        url: "https://chatgpt.com/g/g-B3hgivKK9-write-for-me",
        tags: ["escritura", "contenido", "copywriting"]
      },
      {
        id: "gpt-6",
        name: "Web Browser",
        description: "Navego por la web para ti",
        category: "Research",
        url: "https://chatgpt.com/g/g-3w1rEXGE0-web-browser",
        tags: ["búsqueda", "navegación", "información"]
      },
      {
        id: "gpt-7",
        name: "Code Copilot",
        description: "Code Smart, Build Fast con IA",
        category: "Programming",
        url: "https://chatgpt.com/g/g-2DQzU5UZl-code-copilot",
        tags: ["código", "programación", "desarrollo"]
      },
      {
        id: "gpt-8",
        name: "Whimsical Diagrams",
        description: "Explicar y visualizar conceptos",
        category: "Productivity",
        url: "https://chatgpt.com/g/g-vI2kaiM9N-whimsical-diagrams",
        tags: ["diagramas", "flujo", "mapas mentales"]
      },
      {
        id: "gpt-9",
        name: "Scholar GPT",
        description: "IA mejorada para búsquedas académicas",
        category: "Research",
        url: "https://chatgpt.com/g/g-kZ0eYXlJe-scholar-gpt",
        tags: ["académico", "investigación", "citas"]
      },
      {
        id: "gpt-10",
        name: "AskYourPDF Research Assistant",
        description: "IA mejorada para documentos PDF",
        category: "Research",
        url: "https://chatgpt.com/g/g-UfFxTDMxq-askyourpdf-research-assistant",
        tags: ["PDF", "documentos", "análisis"]
      }
    ]
  };
  
  await fs.ensureDir(path.join(DIST_DIR, 'data'));
  await fs.writeJSON(
    path.join(DIST_DIR, 'data', 'gpts.json'),
    gptsData,
    { spaces: 2 }
  );
}

/**
 * Build principal
 */
async function build() {
  console.log('🚀 Iniciando build...');
  console.log(`📦 Modo: ${process.env.NODE_ENV || 'development'}`);
  
  try {
    await cleanDist();
    await copyStaticFiles();
    await processJavaScript();
    await processCSS();
    await processHTML();
    await createDataFile();
    
    console.log('✅ Build completado exitosamente!');
  } catch (error) {
    console.error('❌ Error en build:', error);
    process.exit(1);
  }
}

// Ejecutar build
build();