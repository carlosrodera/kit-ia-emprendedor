# Guía de Integración - Sistema de Notificaciones

## Descripción General

El sistema de notificaciones del Kit IA Emprendedor proporciona una forma consistente y elegante de mostrar mensajes al usuario. Soporta diferentes tipos de notificaciones, acciones personalizadas, y persistencia de estado.

## Características

- 🎨 **4 tipos de notificaciones**: info, success, warning, error
- ⏱️ **Auto-dismiss configurable**: Control total sobre la duración
- 📚 **Stack de notificaciones**: Máximo 3 visibles simultáneamente
- 🎬 **Animaciones suaves**: Entrada y salida con CSS transforms
- 🔘 **Acciones personalizables**: Botones con callbacks
- 💾 **Persistencia**: Estado de leído/no leído
- 🔴 **Badge integration**: Actualiza el icono de la extensión
- 🛡️ **Seguro contra XSS**: Sanitización automática de texto
- 🌙 **Dark mode**: Soporte automático

## Instalación

El módulo está ubicado en `/src/shared/notifications.js` y se puede importar en cualquier parte de la extensión:

```javascript
import notificationManager, { info, success, warning, error } from '../shared/notifications.js';
```

## Uso Básico

### 1. Notificaciones Simples

```javascript
// Información
info('Nueva actualización', 'La extensión se ha actualizado');

// Éxito
success('Guardado', 'GPT guardado correctamente');

// Advertencia
warning('Atención', 'Estás cerca del límite');

// Error
error('Error', 'No se pudo conectar al servidor');
```

### 2. Opciones Avanzadas

```javascript
// Con duración personalizada
info('Mensaje temporal', 'Este mensaje durará 3 segundos', {
  duration: 3000
});

// Sin auto-dismiss
warning('Importante', 'Este mensaje permanecerá hasta que lo cierres', {
  autoDismiss: false
});

// Con ID único (evita duplicados)
notificationManager.show({
  id: 'sync-status',
  type: 'info',
  title: 'Sincronizando',
  message: 'Tus GPTs se están sincronizando...'
});
```

### 3. Notificaciones con Acciones

```javascript
error('Error de conexión', 'No se pudo guardar el GPT', {
  actions: [
    {
      label: 'Reintentar',
      primary: true, // Botón primario (azul)
      callback: () => {
        // Lógica de reintento
        retryOperation();
      }
    },
    {
      label: 'Cancelar',
      dismiss: true // Cierra la notificación
    }
  ]
});
```

## Integración en Popup

```javascript
// popup.js
import { success, error } from '../shared/notifications.js';

// Al guardar un GPT
async function saveGPT(gptData) {
  try {
    await chrome.storage.sync.set({ [gptData.id]: gptData });
    success('GPT Guardado', `"${gptData.name}" se guardó correctamente`);
  } catch (err) {
    error('Error al guardar', err.message, {
      actions: [{
        label: 'Reintentar',
        primary: true,
        callback: () => saveGPT(gptData)
      }]
    });
  }
}
```

## Integración en Sidebar

```javascript
// sidebar.js
import notificationManager, { info, warning } from '../shared/notifications.js';

// Detectar nuevo GPT
function onNewGPTDetected(gptInfo) {
  info('Nuevo GPT detectado', `Se encontró "${gptInfo.name}"`, {
    actions: [
      {
        label: 'Guardar',
        primary: true,
        callback: async () => {
          await saveGPT(gptInfo);
          success('Guardado', 'GPT añadido a tu colección');
        }
      },
      {
        label: 'Ignorar',
        dismiss: true
      }
    ]
  });
}
```

## Integración en Service Worker

```javascript
// service-worker.js
import { info, error } from '../shared/notifications.js';

// Notificar actualizaciones
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    info('Actualización', `Kit IA actualizado a v${chrome.runtime.getManifest().version}`);
  }
});

// Errores de sincronización
chrome.storage.sync.onChanged.addListener((changes, area) => {
  if (chrome.runtime.lastError) {
    error('Error de sincronización', chrome.runtime.lastError.message);
  }
});
```

## Configuración Personalizada

```javascript
// Inicializar con opciones personalizadas
notificationManager.init({
  maxVisible: 5,        // Mostrar hasta 5 notificaciones
  autoDismissTime: 10000, // 10 segundos por defecto
  container: document.getElementById('custom-container') // Contenedor personalizado
});
```

## API Completa

### notificationManager.show(options)

Muestra una notificación con opciones completas:

```javascript
notificationManager.show({
  id: 'unique-id',           // ID único (opcional)
  type: 'info',              // info | success | warning | error
  title: 'Título',           // Título de la notificación
  message: 'Mensaje',        // Mensaje descriptivo
  autoDismiss: true,         // Auto-cerrar (default: true)
  duration: 5000,            // Duración en ms (default: 5000)
  actions: [                 // Array de acciones (opcional)
    {
      label: 'Acción',       // Texto del botón
      primary: false,        // Estilo primario
      callback: () => {},    // Función a ejecutar
      dismiss: true          // Cerrar notificación al click
    }
  ]
});
```

### Métodos Útiles

```javascript
// Cerrar una notificación específica
notificationManager.dismiss('notification-id');

// Cerrar todas las notificaciones
notificationManager.dismissAll();

// Marcar como leída
notificationManager.markAsRead('notification-id');

// Obtener número de no leídas
const unread = notificationManager.getUnreadCount();

// Limpiar notificaciones antiguas
notificationManager.cleanup();

// Destruir el sistema
notificationManager.destroy();
```

## Mejores Prácticas

### 1. Usar el tipo correcto

- **info**: Información general, actualizaciones
- **success**: Operaciones completadas exitosamente
- **warning**: Advertencias que requieren atención
- **error**: Errores que requieren acción

### 2. Mensajes claros y concisos

```javascript
// ✅ Bueno
success('GPT guardado', 'Marketing Assistant añadido a tu colección');

// ❌ Evitar
success('Operación completada', 'La operación de guardado del GPT seleccionado se ha completado exitosamente y ahora está disponible en tu colección personal');
```

### 3. Acciones significativas

```javascript
// ✅ Bueno - Acciones claras
error('Error de red', 'No se pudo conectar', {
  actions: [
    { label: 'Reintentar', primary: true, callback: retry },
    { label: 'Trabajar offline', callback: goOffline }
  ]
});

// ❌ Evitar - Acciones genéricas
error('Error', 'Algo salió mal', {
  actions: [{ label: 'OK' }]
});
```

### 4. Evitar spam de notificaciones

```javascript
// Usar IDs únicos para actualizar en lugar de crear nuevas
notificationManager.show({
  id: 'sync-progress',
  type: 'info',
  title: 'Sincronizando',
  message: '50% completado...'
});

// Actualizar la misma notificación
setTimeout(() => {
  notificationManager.dismiss('sync-progress');
  notificationManager.show({
    id: 'sync-progress',
    type: 'success',
    title: 'Sincronización completa',
    message: 'Todos los GPTs actualizados'
  });
}, 2000);
```

### 5. Considerar el contexto

```javascript
// En operaciones críticas, no usar auto-dismiss
error('Pérdida de datos', 'Los cambios no guardados se perderán', {
  autoDismiss: false,
  actions: [
    {
      label: 'Guardar ahora',
      primary: true,
      callback: saveChanges
    },
    {
      label: 'Descartar cambios',
      callback: discardChanges
    }
  ]
});
```

## Personalización de Estilos

Si necesitas personalizar los estilos, puedes sobrescribir las variables CSS:

```css
/* En tu archivo CSS personalizado */
.kitia-notifications-container {
  --notification-bg: #ffffff;
  --notification-border: #e0e0e0;
  --notification-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --notification-gap: 10px;
}

/* Personalizar por tipo */
.kitia-notification-success {
  --notification-color: #10b981;
}
```

## Solución de Problemas

### Las notificaciones no aparecen

1. Verifica que el DOM esté cargado
2. Asegúrate de que no haya errores de importación
3. Revisa la consola para errores

### Las notificaciones aparecen detrás de otros elementos

Ajusta el z-index del contenedor:

```css
.kitia-notifications-container {
  z-index: 10000 !important;
}
```

### El badge no se actualiza

Verifica los permisos en manifest.json:

```json
{
  "permissions": ["storage", "notifications"]
}
```

## Ejemplo Completo

```javascript
// notifications-setup.js
import notificationManager, { info, success, error } from './notifications.js';

// Configurar al inicio
export function setupNotifications() {
  // Configuración inicial
  notificationManager.init({
    maxVisible: 4,
    autoDismissTime: 6000
  });

  // Escuchar eventos globales
  window.addEventListener('gpt-saved', (e) => {
    success('GPT Guardado', e.detail.message);
  });

  window.addEventListener('gpt-error', (e) => {
    error('Error', e.detail.message, {
      actions: [{
        label: 'Ver detalles',
        callback: () => console.error(e.detail)
      }]
    });
  });

  // Notificar cuando esté listo
  info('Kit IA Emprendedor', 'Extensión cargada y lista para usar');
}

// Llamar al cargar
document.addEventListener('DOMContentLoaded', setupNotifications);
```

## Conclusión

El sistema de notificaciones está diseñado para ser flexible, seguro y fácil de usar. Sigue las mejores prácticas y personaliza según las necesidades de tu implementación.