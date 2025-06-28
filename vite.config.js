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

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  return {
    root: 'src',
    base: './', // Usar rutas relativas para Chrome Extension
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false,
      
      // Optimización para producción
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: false, // Mantener console.log para debugging
          drop_debugger: true,
          pure_funcs: ['console.debug']
        },
        mangle: {
          toplevel: true
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
          
          // Popup JS
          'popup': resolve(__dirname, 'src/popup/popup.js'),
          
          // Side Panel JS
          'sidepanel-js': resolve(__dirname, 'src/sidepanel/sidepanel.js'),
          
          // Side Panel Modules
          'module-loader': resolve(__dirname, 'src/sidepanel/modules/module-loader.js'),
          'favorites-module': resolve(__dirname, 'src/sidepanel/modules/favorites.js'),
          
          // Plan System
          'plan-manager': resolve(__dirname, 'src/shared/plan-manager.js'),
          'plan-ui': resolve(__dirname, 'src/sidepanel/components/plan-ui.js'),
          
          // Shared Modules
          'auth': resolve(__dirname, 'src/shared/auth.js'),
          'chrome-auth': resolve(__dirname, 'src/shared/chrome-auth.js'),
          'config': resolve(__dirname, 'src/shared/config.js'),
          'constants': resolve(__dirname, 'src/shared/constants.js'),
          'logger': resolve(__dirname, 'src/shared/logger.js'),
          'storage': resolve(__dirname, 'src/shared/storage.js'),
          
          // HTML pages
          'popup-html': resolve(__dirname, 'src/popup/popup.html'),
          'sidepanel-html': resolve(__dirname, 'src/sidepanel/index.html')
        },
        output: {
          // ES modules para compatibilidad con Chrome Extensions modernas
          format: 'es',
          inlineDynamicImports: false, // Permitir múltiples entry points
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'service-worker') {
              return 'background/[name].js';
            }
            if (chunkInfo.name === 'content-script') {
              return 'content/[name].js';
            }
            if (chunkInfo.name === 'popup') {
              return 'popup/[name].js';
            }
            if (chunkInfo.name === 'sidepanel-js') {
              return 'sidepanel/sidepanel.js';
            }
            if (chunkInfo.name === 'module-loader') {
              return 'sidepanel/modules/module-loader.js';
            }
            if (chunkInfo.name === 'favorites-module') {
              return 'sidepanel/modules/favorites.js';
            }
            // Plan system
            if (chunkInfo.name === 'plan-manager') {
              return 'shared/plan-manager.js';
            }
            if (chunkInfo.name === 'plan-ui') {
              return 'sidepanel/components/plan-ui.js';
            }
            // Shared modules
            if (['auth', 'chrome-auth', 'config', 'constants', 'logger', 'storage'].includes(chunkInfo.name)) {
              return `shared/${chunkInfo.name}.js`;
            }
            return '[name]/[name].js';
          },
          chunkFileNames: 'shared/[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.css')) {
              const name = assetInfo.name.replace('.css', '');
              if (name.includes('popup')) return 'popup/[name]';
              if (name.includes('sidebar')) return 'sidebar/[name]';
              if (name.includes('auth')) return 'auth/[name]';
              return '[name]';
            }
            return 'assets/[name][extname]';
          }
        },
        
        // Tree shaking
        treeshake: {
          preset: 'recommended',
          moduleSideEffects: false
        },
        
        // Optimizaciones para módulos
        preserveEntrySignatures: 'strict',
        
        // Configuración específica para Chrome Extensions
        plugins: [
          // Plugin personalizado para resolver módulos internos
          {
            name: 'chrome-extension-modules',
            generateBundle(options, bundle) {
              // Procesar módulos para Chrome Extensions
              Object.keys(bundle).forEach(fileName => {
                const chunk = bundle[fileName];
                if (chunk.type === 'chunk' && fileName.includes('sidepanel')) {
                  // Asegurar que los módulos se resuelvan correctamente
                  chunk.code = chunk.code.replace(
                    /import\s+.*?from\s+['"]\.\/modules\/(.*?)['"];?/g,
                    '// Module $1 will be loaded via module loader'
                  );
                }
              });
            }
          }
        ]
      },
      
      // Target Chrome 120+
      target: 'chrome120',
      
      // CSS optimizado
      cssMinify: isProd,
      cssCodeSplit: false,
      
      // Chunks pequeños
      chunkSizeWarningLimit: 50,
      
      // Assets inline pequeños
      assetsInlineLimit: 4096,
      
      // Reportes de optimización
      reportCompressedSize: true
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
          },
          {
            src: 'content/content-styles.css',
            dest: 'content'
          },
          {
            src: 'sidepanel/sidepanel.css',
            dest: 'sidepanel'
          },
          {
            src: 'sidepanel/styles/plan-ui.css',
            dest: 'sidepanel/styles'
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
      })
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