/**
 * Ejemplos de uso del sistema de notificaciones
 * Kit IA Emprendedor
 */

import notificationManager, { info, success, warning, error } from './notifications.js';

// Ejemplo 1: Notificación simple de información
function showInfoExample() {
  info('Nueva actualización', 'La extensión se ha actualizado a la versión 1.2.0');
}

// Ejemplo 2: Notificación de éxito con auto-dismiss personalizado
function showSuccessExample() {
  success('GPT guardado', 'El GPT "Asistente de Marketing" se ha guardado correctamente', {
    duration: 3000 // 3 segundos
  });
}

// Ejemplo 3: Notificación de advertencia sin auto-dismiss
function showWarningExample() {
  warning('Límite alcanzado', 'Has alcanzado el límite de 50 GPTs guardados', {
    autoDismiss: false
  });
}

// Ejemplo 4: Notificación de error con acciones
function showErrorExample() {
  error('Error de conexión', 'No se pudo conectar con el servidor', {
    actions: [
      {
        label: 'Reintentar',
        primary: true,
        callback: () => {
          console.log('Reintentando conexión...');
          // Lógica de reintento
        }
      },
      {
        label: 'Cancelar',
        dismiss: true // Cierra la notificación
      }
    ]
  });
}

// Ejemplo 5: Notificación con ID único (evita duplicados)
function showUniqueNotification() {
  notificationManager.show({
    id: 'sync-status',
    type: 'info',
    title: 'Sincronizando',
    message: 'Sincronizando tus GPTs con la nube...',
    autoDismiss: false
  });
}

// Ejemplo 6: Actualizar una notificación existente
function updateNotification() {
  // Primero cerrar la notificación anterior
  notificationManager.dismiss('sync-status');
  
  // Mostrar nueva con el mismo ID
  notificationManager.show({
    id: 'sync-status',
    type: 'success',
    title: 'Sincronización completa',
    message: 'Todos tus GPTs están sincronizados',
    duration: 3000
  });
}

// Ejemplo 7: Notificación con múltiples acciones
function showMultiActionNotification() {
  notificationManager.show({
    type: 'info',
    title: 'Nuevo GPT detectado',
    message: '¿Quieres guardar "Asistente de Código Python"?',
    autoDismiss: false,
    actions: [
      {
        label: 'Guardar',
        primary: true,
        callback: () => {
          console.log('Guardando GPT...');
          success('GPT guardado', 'El GPT se ha añadido a tu colección');
        }
      },
      {
        label: 'Ver detalles',
        callback: () => {
          console.log('Mostrando detalles...');
          // No cierra la notificación
        },
        dismiss: false
      },
      {
        label: 'Ignorar',
        callback: () => {
          console.log('GPT ignorado');
        }
      }
    ]
  });
}

// Ejemplo 8: Configuración personalizada
function customConfiguration() {
  // Reinicializar con configuración personalizada
  notificationManager.destroy();
  notificationManager.init({
    maxVisible: 5, // Mostrar hasta 5 notificaciones
    autoDismissTime: 10000 // 10 segundos por defecto
  });
}

// Ejemplo 9: Uso en popup.js
export function setupPopupNotifications() {
  // Mostrar notificación cuando se guarda un GPT
  document.addEventListener('gpt-saved', (event) => {
    success('GPT guardado', `"${event.detail.name}" se ha guardado correctamente`);
  });

  // Mostrar error cuando falla la carga
  document.addEventListener('gpt-load-error', (event) => {
    error('Error al cargar', event.detail.message, {
      actions: [
        {
          label: 'Reintentar',
          primary: true,
          callback: () => location.reload()
        }
      ]
    });
  });
}

// Ejemplo 10: Uso en sidebar.js
export function setupSidebarNotifications() {
  // Notificar cuando se detecta un nuevo GPT
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'new-gpt-detected') {
      info('Nuevo GPT', `Se detectó "${message.gptName}"`, {
        actions: [
          {
            label: 'Guardar',
            primary: true,
            callback: () => {
              // Lógica para guardar
              chrome.runtime.sendMessage({
                type: 'save-gpt',
                gptId: message.gptId
              });
            }
          }
        ]
      });
    }
  });
}

// Ejemplo 11: Manejo de notificaciones no leídas
function checkUnreadNotifications() {
  const unreadCount = notificationManager.getUnreadCount();
  console.log(`Tienes ${unreadCount} notificaciones no leídas`);
}

// Ejemplo 12: Limpiar todas las notificaciones
function clearAllNotifications() {
  notificationManager.dismissAll();
}

// Exportar funciones de ejemplo
export {
  showInfoExample,
  showSuccessExample,
  showWarningExample,
  showErrorExample,
  showUniqueNotification,
  updateNotification,
  showMultiActionNotification,
  customConfiguration,
  checkUnreadNotifications,
  clearAllNotifications
};