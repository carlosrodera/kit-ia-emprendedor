/**
 * Script para eliminar datos mock y código de desarrollo
 */

import fs from 'fs';
import path from 'path';

// Archivos a eliminar completamente
const filesToDelete = [
  'src/data/mock-gpts.js',
  'src/data/dummy-gpts.js'
];

// Eliminar archivos mock
filesToDelete.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`✅ Eliminado: ${file}`);
  }
});

// Reemplazar notificaciones mock con sistema real
const serviceWorkerPath = path.join(process.cwd(), 'src/background/service-worker.js');
let serviceWorkerContent = fs.readFileSync(serviceWorkerPath, 'utf8');

// Reemplazar función de notificaciones mock
const notificationReplacement = `// Sistema de notificaciones
async function getNotifications(userId) {
  try {
    // TODO: Implementar sistema real de notificaciones desde Supabase
    // Por ahora retornar array vacío
    return {
      success: true,
      data: {
        notifications: [],
        unread: 0
      }
    };
  } catch (error) {
    logger.error('[SW] Error getting notifications:', error);
    return { success: false, error: error.message };
  }
}`;

// Buscar y reemplazar la función completa
const notificationStart = serviceWorkerContent.indexOf('// Sistema de notificaciones');
const notificationEnd = serviceWorkerContent.indexOf('async function markNotificationRead');
if (notificationStart !== -1 && notificationEnd !== -1) {
  serviceWorkerContent = 
    serviceWorkerContent.substring(0, notificationStart) +
    notificationReplacement + '\n\n' +
    serviceWorkerContent.substring(notificationEnd);
  
  fs.writeFileSync(serviceWorkerPath, serviceWorkerContent);
  console.log('✅ Actualizado: Notificaciones en service-worker.js');
}

// Eliminar código de desarrollo en plan-ui.js
const planUiPath = path.join(process.cwd(), 'src/sidepanel/components/plan-ui.js');
let planUiContent = fs.readFileSync(planUiPath, 'utf8');

// Buscar y eliminar el bloque de desarrollo
const devBlockStart = planUiContent.indexOf('// En desarrollo, cambiar el plan mock');
const devBlockEnd = planUiContent.indexOf('// En producción, abrir página de upgrade');
if (devBlockStart !== -1 && devBlockEnd !== -1) {
  planUiContent = 
    planUiContent.substring(0, devBlockStart) +
    planUiContent.substring(devBlockEnd);
  
  fs.writeFileSync(planUiPath, planUiContent);
  console.log('✅ Actualizado: Eliminado código de desarrollo en plan-ui.js');
}

// Verificar que config.js no tenga mockData habilitado
const configPath = path.join(process.cwd(), 'src/shared/config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

if (configContent.includes('mockData: true')) {
  configContent = configContent.replace(/mockData:\s*true/g, 'mockData: false');
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Actualizado: mockData deshabilitado en config.js');
}

if (configContent.includes('bypassAuth: true')) {
  configContent = configContent.replace(/bypassAuth:\s*true/g, 'bypassAuth: false');
  fs.writeFileSync(configPath, configContent);
  console.log('✅ Actualizado: bypassAuth deshabilitado en config.js');
}

console.log('\n✨ Limpieza completada - Datos mock eliminados');