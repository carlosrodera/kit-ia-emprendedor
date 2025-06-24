import { defineConfig } from 'vite';
import { resolve } from 'path';
import copy from 'vite-plugin-copy';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        'content/content-script': resolve(__dirname, 'src/content/content-script.js'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.html'),
        'sidebar/index': resolve(__dirname, 'src/sidebar/index.html'),
        'auth/login': resolve(__dirname, 'src/auth/login.html'),
        'auth/callback': resolve(__dirname, 'src/auth/callback.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'shared/[name].[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name.endsWith('.css')) {
            return '[name].css';
          }
          return 'assets/[name].[ext]';
        }
      }
    },
    target: 'chrome120',
    minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  plugins: [
    copy({
      targets: [
        { src: 'manifest.json', dest: '..' },
        { src: 'assets/icons/*', dest: '../assets/icons' }
      ],
      hook: 'writeBundle'
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@components': resolve(__dirname, 'src/sidebar/components'),
      '@utils': resolve(__dirname, 'src/sidebar/utils')
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY)
  }
});