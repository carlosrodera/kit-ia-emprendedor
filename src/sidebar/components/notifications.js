// Sistema de notificaciones para Kit IA Emprendedor
export class NotificationSystem {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.notificationId = 0;
    this.init();
  }

  init() {
    // Crear contenedor de notificaciones si no existe
    if (!document.getElementById('kitia-notifications')) {
      this.container = document.createElement('div');
      this.container.id = 'kitia-notifications';
      this.container.className = 'kitia-notifications-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('kitia-notifications');
    }
  }

  show(message, type = 'info', duration = 3000) {
    const id = ++this.notificationId;

    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `kitia-notification kitia-notification-${type}`;
    notification.id = `notification-${id}`;

    // Icono según tipo
    const icons = {
      success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
      error: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>',
      warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
      info: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
    };

    notification.innerHTML = `
      <div class="kitia-notification-icon">${icons[type]}</div>
      <div class="kitia-notification-content">${message}</div>
      <button class="kitia-notification-close" data-id="${id}">
        <svg viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
        </svg>
      </button>
    `;

    // Agregar al contenedor
    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Animar entrada
    requestAnimationFrame(() => {
      notification.classList.add('kitia-notification-show');
    });

    // Auto-cerrar después del tiempo especificado
    if (duration > 0) {
      setTimeout(() => this.hide(id), duration);
    }

    // Event listener para cerrar manual
    notification.querySelector('.kitia-notification-close').addEventListener('click', () => {
      this.hide(id);
    });

    return id;
  }

  hide(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Animar salida
    notification.classList.remove('kitia-notification-show');
    notification.classList.add('kitia-notification-hide');

    // Remover después de la animación
    setTimeout(() => {
      notification.remove();
      this.notifications.delete(id);
    }, 300);
  }

  clear() {
    this.notifications.forEach((notification, id) => {
      this.hide(id);
    });
  }

  // Métodos de conveniencia
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Singleton global
let notificationSystem = null;

export function getNotificationSystem() {
  if (!notificationSystem) {
    notificationSystem = new NotificationSystem();
  }
  return notificationSystem;
}

// Función helper para mostrar notificaciones rápidamente
export function notify(message, type = 'info', duration = 3000) {
  return getNotificationSystem().show(message, type, duration);
}
