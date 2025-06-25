// Generador de iconos para Kit IA Emprendedor
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Función para generar icono
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Fondo con gradiente
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#4F46E5');
  gradient.addColorStop(1, '#6366F1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Dibujar logo estilizado (3 capas representando IA)
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  const center = size / 2;
  const layerSize = size * 0.3;
  
  // Primera capa (base)
  ctx.beginPath();
  ctx.moveTo(center - layerSize, center + layerSize * 0.5);
  ctx.lineTo(center, center - layerSize * 0.5);
  ctx.lineTo(center + layerSize, center + layerSize * 0.5);
  ctx.stroke();
  
  // Segunda capa
  ctx.beginPath();
  ctx.moveTo(center - layerSize, center);
  ctx.lineTo(center, center - layerSize * 0.8);
  ctx.lineTo(center + layerSize, center);
  ctx.stroke();
  
  // Tercera capa (top)
  ctx.beginPath();
  ctx.moveTo(center - layerSize, center - layerSize * 0.5);
  ctx.lineTo(center, center - layerSize * 1.1);
  ctx.lineTo(center + layerSize, center - layerSize * 0.5);
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
}

// Crear directorio si no existe
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

// Generar iconos
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const buffer = generateIcon(size);
  fs.writeFileSync(path.join(assetsDir, `icon-${size}.png`), buffer);
  console.log(`✅ Generado icon-${size}.png`);
});

console.log('✨ Todos los iconos generados exitosamente');