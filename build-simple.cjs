#!/usr/bin/env node

/**
 * Simple build script for testing Side Panel
 */

const fs = require('fs-extra');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

async function build() {
  console.log('🚀 Building extension...');
  
  // Clean dist
  await fs.emptyDir(DIST);
  
  // Copy manifest
  await fs.copy(
    path.join(SRC, 'manifest.json'),
    path.join(DIST, 'manifest.json')
  );
  
  // Copy icons
  await fs.copy(
    path.join(SRC, 'assets', 'icons'),
    path.join(DIST, 'assets', 'icons')
  );
  
  // Copy background
  await fs.ensureDir(path.join(DIST, 'background'));
  await fs.copy(
    path.join(SRC, 'background', 'service-worker.js'),
    path.join(DIST, 'background', 'service-worker.js')
  );
  
  // Copy popup
  await fs.ensureDir(path.join(DIST, 'popup'));
  await fs.copy(
    path.join(SRC, 'popup', 'popup.html'),
    path.join(DIST, 'popup', 'popup.html')
  );
  await fs.copy(
    path.join(SRC, 'popup', 'popup.js'),
    path.join(DIST, 'popup', 'popup.js')
  );
  
  // Copy sidepanel
  await fs.ensureDir(path.join(DIST, 'sidepanel'));
  await fs.copy(
    path.join(SRC, 'sidepanel', 'index.html'),
    path.join(DIST, 'sidepanel', 'index.html')
  );
  await fs.copy(
    path.join(SRC, 'sidepanel', 'sidepanel.js'),
    path.join(DIST, 'sidepanel', 'sidepanel.js')
  );
  await fs.copy(
    path.join(SRC, 'sidepanel', 'sidepanel.css'),
    path.join(DIST, 'sidepanel', 'sidepanel.css')
  );
  
  // Create GPTs data
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
      }
    ]
  };
  
  await fs.ensureDir(path.join(DIST, 'data'));
  await fs.writeJSON(
    path.join(DIST, 'data', 'gpts.json'),
    gptsData,
    { spaces: 2 }
  );
  
  console.log('✅ Build completed!');
  console.log('📁 Output in:', DIST);
}

// Run
build().catch(console.error);