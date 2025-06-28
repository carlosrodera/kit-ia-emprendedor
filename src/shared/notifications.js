import SecureDOM from '../utils/secure-dom.js';
import logger from '../utils/logger.js';

/**
 * Sistema de Notificaciones - Kit IA Emprendedor
 * @module NotificationManager
 */

class NotificationManager {
  constructor() {
    this.notifications = new Map();
    this.container = null;
    this.maxVisible = 3;
    this.autoDismissTime = 5000; // 5 seconds default
    this.readNotifications = new Set(this.loadReadNotifications());
    this.unreadCount = 0;
    this.initialized = false;
  }

  /**
   * Inicializa el sistema de notificaciones
   * @param {Object} options - Opciones de configuración
   * @param {HTMLElement} options.container - Contenedor personalizado (opcional)
   * @param {number} options.maxVisible - Número máximo de notificaciones visibles
   * @param {number} options.autoDismissTime - Tiempo de auto-dismiss en ms
   */
  init(options = {}) {
    if (this.initialized) return;

    this.maxVisible = options.maxVisible || this.maxVisible;
    this.autoDismissTime = options.autoDismissTime || this.autoDismissTime;

    // Crear contenedor si no existe
    if (options.container) {
      this.container = options.container;
    } else {
      this.createDefaultContainer();
    }

    // Cargar notificaciones pendientes
    this.loadPendingNotifications();
    this.initialized = true;
  }

  /**
   * Crea el contenedor por defecto para las notificaciones
   */
  createDefaultContainer() {
    this.container = document.createElement('div');
    this.container.className = 'kitia-notifications-container';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Notificaciones');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);

    // Agregar estilos si no existen
    this.injectStyles();
  }

  /**
   * Inyecta los estilos necesarios
   */
  injectStyles() {
    if (document.getElementById('kitia-notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'kitia-notification-styles';
    style.textContent = `
      .kitia-notifications-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 380px;
        pointer-events: none;
      }

      .kitia-notification {
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 16px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: all;
        position: relative;
        overflow: hidden;
      }

      .kitia-notification.kitia-notification-show {
        opacity: 1;
        transform: translateX(0);
      }

      .kitia-notification.kitia-notification-hide {
        opacity: 0;
        transform: translateX(100%);
      }

      .kitia-notification-icon {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .kitia-notification-content {
        flex: 1;
        min-width: 0;
      }

      .kitia-notification-title {
        font-weight: 600;
        font-size: 14px;
        line-height: 1.4;
        margin: 0 0 4px 0;
        color: #1a1a1a;
      }

      .kitia-notification-message {
        font-size: 13px;
        line-height: 1.5;
        color: #666666;
        margin: 0;
        word-wrap: break-word;
      }

      .kitia-notification-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .kitia-notification-action {
        background: none;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        padding: 4px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        color: #1a1a1a;
      }

      .kitia-notification-action:hover {
        background: #f5f5f5;
        border-color: #d0d0d0;
      }

      .kitia-notification-action-primary {
        background: #2563eb;
        color: white;
        border-color: #2563eb;
      }

      .kitia-notification-action-primary:hover {
        background: #1d4ed8;
        border-color: #1d4ed8;
      }

      .kitia-notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s;
        color: #999999;
      }

      .kitia-notification-close:hover {
        background: #f0f0f0;
        color: #666666;
      }

      .kitia-notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: currentColor;
        opacity: 0.2;
        transition: width linear;
      }

      /* Tipos de notificación */
      .kitia-notification-info {
        border-left: 4px solid #2563eb;
      }

      .kitia-notification-info .kitia-notification-icon {
        color: #2563eb;
      }

      .kitia-notification-info .kitia-notification-progress {
        color: #2563eb;
      }

      .kitia-notification-success {
        border-left: 4px solid #10b981;
      }

      .kitia-notification-success .kitia-notification-icon {
        color: #10b981;
      }

      .kitia-notification-success .kitia-notification-progress {
        color: #10b981;
      }

      .kitia-notification-warning {
        border-left: 4px solid #f59e0b;
      }

      .kitia-notification-warning .kitia-notification-icon {
        color: #f59e0b;
      }

      .kitia-notification-warning .kitia-notification-progress {
        color: #f59e0b;
      }

      .kitia-notification-error {
        border-left: 4px solid #ef4444;
      }

      .kitia-notification-error .kitia-notification-icon {
        color: #ef4444;
      }

      .kitia-notification-error .kitia-notification-progress {
        color: #ef4444;
      }

      /* Modo oscuro */
      @media (prefers-color-scheme: dark) {
        .kitia-notification {
          background: #1f2937;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .kitia-notification-title {
          color: #f3f4f6;
        }

        .kitia-notification-message {
          color: #9ca3af;
        }

        .kitia-notification-action {
          border-color: #374151;
          color: #f3f4f6;
        }

        .kitia-notification-action:hover {
          background: #374151;
          border-color: #4b5563;
        }

        .kitia-notification-close {
          color: #6b7280;
        }

        .kitia-notification-close:hover {
          background: #374151;
          color: #9ca3af;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Muestra una notificación
   * @param {Object} options - Opciones de la notificación
   * @param {string} options.title - Título de la notificación
   * @param {string} options.message - Mensaje de la notificación
   * @param {string} options.type - Tipo: info, success, warning, error
   * @param {boolean} options.autoDismiss - Si se auto-cierra
   * @param {number} options.duration - Duración personalizada en ms
   * @param {Array} options.actions - Acciones disponibles
   * @param {string} options.id - ID único (opcional)
   * @returns {string} ID de la notificación
   */
  show(options) {
    if (!this.initialized) {
      this.init();
    }

    const id = options.id || this.generateId();
    const notification = {
      id,
      title: this.sanitizeText(options.title || ''),
      message: this.sanitizeText(options.message || ''),
      type: options.type || 'info',
      autoDismiss: options.autoDismiss !== false,
      duration: options.duration || this.autoDismissTime,
      actions: options.actions || [],
      timestamp: Date.now()
    };

    // Guardar notificación
    this.notifications.set(id, notification);
    this.saveNotification(notification);

    // Crear elemento DOM
    const element = this.createNotificationElement(notification);

    // Limitar notificaciones visibles
    this.enforceMaxVisible();

    // Agregar al contenedor
    this.container.appendChild(element);

    // Trigger animation
    requestAnimationFrame(() => {
      element.classList.add('kitia-notification-show');
    });

    // Auto-dismiss si está habilitado
    if (notification.autoDismiss) {
      this.scheduleAutoDismiss(id, notification.duration);
    }

    // Actualizar badge
    this.updateBadge();

    return id;
  }

  /**
   * Crea el elemento DOM de la notificación
   * @param {Object} notification - Datos de la notificación
   * @returns {HTMLElement}
   */
  createNotificationElement(notification) {
    const element = document.createElement('div');
    element.className = `kitia-notification kitia-notification-${notification.type}`;
    element.setAttribute('role', 'alert');
    element.setAttribute('data-notification-id', notification.id);

    // Icono
    const icon = document.createElement('div');
    icon.className = 'kitia-notification-icon';
    icon.innerHTML = this.getIcon(notification.type);
    element.appendChild(icon);

    // Contenido
    const content = document.createElement('div');
    content.className = 'kitia-notification-content';

    if (notification.title) {
      const title = document.createElement('h4');
      title.className = 'kitia-notification-title';
      title.textContent = notification.title;
      content.appendChild(title);
    }

    if (notification.message) {
      const message = document.createElement('p');
      message.className = 'kitia-notification-message';
      message.textContent = notification.message;
      content.appendChild(message);
    }

    // Acciones
    if (notification.actions.length > 0) {
      const actions = document.createElement('div');
      actions.className = 'kitia-notification-actions';

      notification.actions.forEach(action => {
        const button = document.createElement('button');
        button.className = `kitia-notification-action ${action.primary ? 'kitia-notification-action-primary' : ''}`;
        button.textContent = this.sanitizeText(action.label);
        button.addEventListener('click', () => {
          if (action.callback) {
            action.callback();
          }
          if (action.dismiss !== false) {
            this.dismiss(notification.id);
          }
        });
        actions.appendChild(button);
      });

      content.appendChild(actions);
    }

    element.appendChild(content);

    // Botón de cerrar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'kitia-notification-close';
    closeBtn.setAttribute('aria-label', 'Cerrar notificación');
    SecureDOM.setText(closeBtn, '×');
    closeBtn.addEventListener('click', () => this.dismiss(notification.id));
    element.appendChild(closeBtn);

    // Barra de progreso para auto-dismiss
    if (notification.autoDismiss) {
      const progress = document.createElement('div');
      progress.className = 'kitia-notification-progress';
      progress.style.width = '100%';
      progress.style.transitionDuration = `${notification.duration}ms`;
      element.appendChild(progress);

      requestAnimationFrame(() => {
        progress.style.width = '0%';
      });
    }

    // Marcar como leída al hacer clic
    element.addEventListener('click', () => {
      this.markAsRead(notification.id);
    });

    return element;
  }

  /**
   * Obtiene el icono SVG según el tipo
   * @param {string} type - Tipo de notificación
   * @returns {string} SVG HTML
   */
  getIcon(type) {
    const icons = {
      info: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>',
      success: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
      warning: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>',
      error: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
    };
    return icons[type] || icons.info;
  }

  /**
   * Programa el auto-dismiss de una notificación
   * @param {string} id - ID de la notificación
   * @param {number} duration - Duración en ms
   */
  scheduleAutoDismiss(id, duration) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    notification.dismissTimer = setTimeout(() => {
      this.dismiss(id);
    }, duration);
  }

  /**
   * Cierra una notificación
   * @param {string} id - ID de la notificación
   */
  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) return;

    // Cancelar timer si existe
    if (notification.dismissTimer) {
      clearTimeout(notification.dismissTimer);
    }

    // Obtener elemento DOM
    const element = this.container.querySelector(`[data-notification-id="${id}"]`);
    if (!element) return;

    // Animar salida
    element.classList.remove('kitia-notification-show');
    element.classList.add('kitia-notification-hide');

    // Remover después de la animación
    setTimeout(() => {
      element.remove();
      this.notifications.delete(id);
      this.removeStoredNotification(id);
    }, 300);
  }

  /**
   * Cierra todas las notificaciones
   */
  dismissAll() {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.dismiss(id));
  }

  /**
   * Limita el número de notificaciones visibles
   */
  enforceMaxVisible() {
    const visibleNotifications = this.container.querySelectorAll('.kitia-notification:not(.kitia-notification-hide)');
    if (visibleNotifications.length >= this.maxVisible) {
      // Cerrar la más antigua
      const oldest = visibleNotifications[0];
      const id = oldest.getAttribute('data-notification-id');
      this.dismiss(id);
    }
  }

  /**
   * Marca una notificación como leída
   * @param {string} id - ID de la notificación
   */
  markAsRead(id) {
    if (!this.readNotifications.has(id)) {
      this.readNotifications.add(id);
      this.saveReadNotifications();
      this.updateBadge();
    }
  }

  /**
   * Actualiza el badge del icono de la extensión
   */
  async updateBadge() {
    if (typeof chrome !== 'undefined' && chrome.action) {
      const unreadCount = this.getUnreadCount();

      try {
        if (unreadCount > 0) {
          await chrome.action.setBadgeText({ text: String(unreadCount) });
          await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
        } else {
          await chrome.action.setBadgeText({ text: '' });
        }
      } catch (error) {
        logger.error('Error updating badge:', error);
      }
    }
  }

  /**
   * Obtiene el número de notificaciones no leídas
   * @returns {number}
   */
  getUnreadCount() {
    const storedNotifications = this.getStoredNotifications();
    return storedNotifications.filter(n => !this.readNotifications.has(n.id)).length;
  }

  /**
   * Sanitiza texto para prevenir XSS
   * @param {string} text - Texto a sanitizar
   * @returns {string}
   */
  sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Genera un ID único
   * @returns {string}
   */
  generateId() {
    return `kitia-notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Guarda una notificación en el storage
   * @param {Object} notification - Notificación a guardar
   */
  saveNotification(notification) {
    try {
      const stored = this.getStoredNotifications();
      stored.push({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        timestamp: notification.timestamp
      });

      // Mantener solo las últimas 50 notificaciones
      const recent = stored.slice(-50);
      localStorage.setItem('kitia-notifications', JSON.stringify(recent));
    } catch (error) {
      logger.error('Error saving notification:', error);
    }
  }

  /**
   * Obtiene las notificaciones almacenadas
   * @returns {Array}
   */
  getStoredNotifications() {
    try {
      const stored = localStorage.getItem('kitia-notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Error loading notifications:', error);
      return [];
    }
  }

  /**
   * Remueve una notificación del storage
   * @param {string} id - ID de la notificación
   */
  removeStoredNotification(id) {
    try {
      const stored = this.getStoredNotifications();
      const filtered = stored.filter(n => n.id !== id);
      localStorage.setItem('kitia-notifications', JSON.stringify(filtered));
    } catch (error) {
      logger.error('Error removing notification:', error);
    }
  }

  /**
   * Carga las notificaciones leídas
   * @returns {Array}
   */
  loadReadNotifications() {
    try {
      const stored = localStorage.getItem('kitia-notifications-read');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Error loading read notifications:', error);
      return [];
    }
  }

  /**
   * Guarda las notificaciones leídas
   */
  saveReadNotifications() {
    try {
      const readArray = Array.from(this.readNotifications);
      localStorage.setItem('kitia-notifications-read', JSON.stringify(readArray));
    } catch (error) {
      logger.error('Error saving read notifications:', error);
    }
  }

  /**
   * Carga notificaciones pendientes del storage
   */
  loadPendingNotifications() {
    const stored = this.getStoredNotifications();
    const recent = stored.filter(n => {
      // Mostrar notificaciones de las últimas 24 horas no leídas
      const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
      return n.timestamp > dayAgo && !this.readNotifications.has(n.id);
    });

    // Mostrar máximo 3 notificaciones pendientes
    recent.slice(-3).forEach(n => {
      this.show({
        ...n,
        autoDismiss: false // No auto-cerrar notificaciones antiguas
      });
    });
  }

  /**
   * Limpia las notificaciones antiguas
   */
  cleanup() {
    try {
      const stored = this.getStoredNotifications();
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recent = stored.filter(n => n.timestamp > weekAgo);
      localStorage.setItem('kitia-notifications', JSON.stringify(recent));

      // Limpiar IDs de leídas que ya no existen
      const validIds = new Set(recent.map(n => n.id));
      const cleanedRead = Array.from(this.readNotifications).filter(id => validIds.has(id));
      this.readNotifications = new Set(cleanedRead);
      this.saveReadNotifications();
    } catch (error) {
      logger.error('Error cleaning notifications:', error);
    }
  }

  /**
   * Destruye el sistema de notificaciones
   */
  destroy() {
    this.dismissAll();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.initialized = false;
  }
}

// Métodos de conveniencia para tipos específicos
const notificationManager = new NotificationManager();

/**
 * Muestra una notificación de información
 */
export function info(title, message, options = {}) {
  return notificationManager.show({
    ...options,
    title,
    message,
    type: 'info'
  });
}

/**
 * Muestra una notificación de éxito
 */
export function success(title, message, options = {}) {
  return notificationManager.show({
    ...options,
    title,
    message,
    type: 'success'
  });
}

/**
 * Muestra una notificación de advertencia
 */
export function warning(title, message, options = {}) {
  return notificationManager.show({
    ...options,
    title,
    message,
    type: 'warning',
    autoDismiss: false // Las advertencias no se auto-cierran por defecto
  });
}

/**
 * Muestra una notificación de error
 */
export function error(title, message, options = {}) {
  return notificationManager.show({
    ...options,
    title,
    message,
    type: 'error',
    autoDismiss: false // Los errores no se auto-cierran por defecto
  });
}

// Exportar la instancia principal
export default notificationManager;

// Auto-inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      notificationManager.init();
    });
  } else {
    notificationManager.init();
  }
}

// Limpiar notificaciones antiguas cada hora
setInterval(() => {
  notificationManager.cleanup();
}, 60 * 60 * 1000);
