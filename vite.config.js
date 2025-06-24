import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom plugin para validar tamaño del bundle
const bundleSizeValidator = () => {
  return {
    name: 'bundle-size-validator',
    closeBundle() {
      const distPath = path.resolve(__dirname, 'dist');
      
      let totalSize = 0;
      const getAllFiles = (dirPath) => {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            getAllFiles(filePath);
          } else if (file.endsWith('.js') || file.endsWith('.css')) {
            totalSize += stat.size;
          }
        });
      };
      
      if (fs.existsSync(distPath)) {
        getAllFiles(distPath);
        const totalSizeKB = totalSize / 1024;
        
        console.log('\n📦 Bundle Size Report:');
        console.log(`Total JS/CSS size: ${totalSizeKB.toFixed(2)} KB`);
        
        if (totalSizeKB > 50) {
          console.error(`❌ Bundle size (${totalSizeKB.toFixed(2)} KB) exceeds 50KB limit!`);
          process.exit(1);
        } else {
          console.log(`✅ Bundle size is within 50KB limit`);
        }
      }
    }
  };
};

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  return {
    root: 'src',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false,
      
      // Optimización agresiva para producción
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug'],
          passes: 3,
          unsafe: true,
          unsafe_comps: true,
          unsafe_proto: true,
          unsafe_regexp: true,
          unsafe_undefined: true,
          dead_code: true,
          evaluate: true,
          comparisons: true,
          inline: true,
          loops: true,
          reduce_vars: true,
          toplevel: true,
          hoist_funs: true,
          if_return: true,
          join_vars: true,
          collapse_vars: true,
          reduce_funcs: true
        },
        mangle: {
          toplevel: true,
          properties: {
            regex: /^_/
          }
        },
        format: {
          comments: false,
          ascii_only: true
        }
      } : undefined,
      
      // Configuración para Chrome Extension
      rollupOptions: {
        input: {
          // Service Worker (background script)
          'service-worker': resolve(__dirname, 'src/background/service-worker.js'),
          
          // Content Script
          'content-script': resolve(__dirname, 'src/content/content-script.js'),
          
          // HTML pages
          'popup': resolve(__dirname, 'src/popup/popup.html'),
          'sidebar': resolve(__dirname, 'src/sidebar/index.html'),
          'auth-login': resolve(__dirname, 'src/auth/login.html'),
          'auth-callback': resolve(__dirname, 'src/auth/callback.html')
        },
        output: {
          // Archivos sin hash para extensión Chrome
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'service-worker') {
              return 'background/[name].js';
            }
            if (chunkInfo.name === 'content-script') {
              return 'content/[name].js';
            }
            return '[name]/[name].js';
          },
          
          // Chunks compartidos en carpeta shared
          chunkFileNames: 'shared/[name].js',
          
          // Assets organizados
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.css')) {
              // CSS en la carpeta del módulo correspondiente
              const name = assetInfo.name.replace('.css', '');
              if (name.includes('popup')) return 'popup/[name]';
              if (name.includes('sidebar')) return 'sidebar/[name]';
              if (name.includes('auth')) return 'auth/[name]';
              return '[name]';
            }
            // Otros assets en carpeta assets
            return 'assets/[name][extname]';
          },
          
          // Configuración para evitar bundling innecesario
          manualChunks: {
            // Código compartido entre módulos
            'utils': [
              './src/shared/logger.js',
              './src/shared/storage.js',
              './src/shared/constants.js'
            ]
          }
        },
        
        // Tree shaking agresivo
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
          unknownGlobalSideEffects: false
        },
        
        // Externos para reducir bundle
        external: [],
        
        // Optimizaciones
        preserveEntrySignatures: false
      },
      
      // Target Chrome 120+
      target: 'chrome120',
      
      // CSS optimizado
      cssMinify: isProd,
      cssCodeSplit: false,
      
      // Chunks pequeños
      chunkSizeWarningLimit: 25,
      
      // Assets inline pequeños
      assetsInlineLimit: 4096,
      
      // Reportes de optimización
      reportCompressedSize: true,
      
      // CommonJS optimizado
      commonjsOptions: {
        transformMixedEsModules: true,
        strictRequires: true
      }
    },
    
    plugins: [
      // Copiar manifest y assets
      viteStaticCopy({
        targets: [
          {
            src: 'manifest.json',
            dest: '.'
          },
          {
            src: 'assets/icons/*',
            dest: 'assets/icons'
          },
          {
            src: 'assets/images/*',
            dest: 'assets/images'
          }
        ]
      }),
      
      // Comprimir assets en producción
      isProd && compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        deleteOriginFile: false
      }),
      
      // Visualizador de bundle (solo en producción)
      isProd && visualizer({
        filename: 'bundle-stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap'
      }),
      
      // Validador de tamaño
      isProd && bundleSizeValidator()
    ].filter(Boolean),
    
    // Alias para imports limpios
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@components': resolve(__dirname, 'src/components'),
        '@utils': resolve(__dirname, 'src/shared/utils'),
        '@services': resolve(__dirname, 'src/shared/services'),
        '@config': resolve(__dirname, 'src/shared/config'),
        '@popup': resolve(__dirname, 'src/popup'),
        '@sidebar': resolve(__dirname, 'src/sidebar'),
        '@content': resolve(__dirname, 'src/content'),
        '@background': resolve(__dirname, 'src/background'),
        '@auth': resolve(__dirname, 'src/auth')
      }
    },
    
    // Variables de entorno
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
      __DEV__: isDev,
      __PROD__: isProd
    },
    
    // Optimizaciones adicionales
    optimizeDeps: {
      exclude: ['chrome']
    },
    
    // Server config para desarrollo
    server: {
      port: 3000,
      open: false,
      hmr: {
        protocol: 'ws',
        host: 'localhost'
      }
    },
    
    // Configuración específica para extension
    experimental: {
      renderBuiltUrl(filename) {
        // URLs relativas para extensión Chrome
        return { relative: true };
      }
    }
  };
});