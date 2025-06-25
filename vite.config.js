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
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      sourcemap: isDev ? 'inline' : false,
      
      // Optimización para producción
      minify: isProd ? 'terser' : false,
      terserOptions: isProd ? {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.debug']
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
          // Service Worker (background script) - usando versión simplificada por ahora
          'service-worker': resolve(__dirname, 'src/background/service-worker-simple.js'),
          
          // Content Script
          'content-script': resolve(__dirname, 'src/content/content-script.js'),
          
          // Popup JS
          'popup': resolve(__dirname, 'src/popup/popup.js'),
          
          // Side Panel JS
          'sidepanel-js': resolve(__dirname, 'src/sidepanel/sidepanel.js'),
          
          // HTML pages
          'popup-html': resolve(__dirname, 'src/popup/popup.html'),
          'sidepanel-html': resolve(__dirname, 'src/sidepanel/index.html'),
          'auth-login': resolve(__dirname, 'src/auth/login.html'),
          'auth-callback': resolve(__dirname, 'src/auth/callback.html')
        },
        output: {
          // Para content scripts y service worker - IIFE format
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
        
        // Optimizaciones
        preserveEntrySignatures: false
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