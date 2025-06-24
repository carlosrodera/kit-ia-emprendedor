/**
 * Tests para el sistema de notificaciones
 * Kit IA Emprendedor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import notificationManager, { info, success, warning, error } from '../src/shared/notifications.js';

describe('NotificationManager', () => {
  beforeEach(() => {
    // Limpiar el DOM
    document.body.innerHTML = '';
    
    // Reinicializar el manager
    notificationManager.destroy();
    notificationManager.notifications.clear();
    notificationManager.readNotifications.clear();
    
    // Mock de localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      clear: vi.fn()
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Inicialización', () => {
    it('debe inicializar correctamente', () => {
      notificationManager.init();
      
      expect(notificationManager.initialized).toBe(true);
      expect(document.querySelector('.kitia-notifications-container')).toBeTruthy();
      expect(document.getElementById('kitia-notification-styles')).toBeTruthy();
    });

    it('debe usar configuración personalizada', () => {
      notificationManager.init({
        maxVisible: 5,
        autoDismissTime: 10000
      });
      
      expect(notificationManager.maxVisible).toBe(5);
      expect(notificationManager.autoDismissTime).toBe(10000);
    });

    it('no debe inicializar dos veces', () => {
      notificationManager.init();
      const container1 = notificationManager.container;
      
      notificationManager.init();
      const container2 = notificationManager.container;
      
      expect(container1).toBe(container2);
    });
  });

  describe('Mostrar notificaciones', () => {
    beforeEach(() => {
      notificationManager.init();
    });

    it('debe mostrar notificación de información', () => {
      const id = info('Título', 'Mensaje');
      
      expect(id).toBeTruthy();
      expect(notificationManager.notifications.has(id)).toBe(true);
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      expect(element).toBeTruthy();
      expect(element.classList.contains('kitia-notification-info')).toBe(true);
    });

    it('debe mostrar notificación de éxito', () => {
      const id = success('Éxito', 'Operación completada');
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      expect(element).toBeTruthy();
      expect(element.classList.contains('kitia-notification-success')).toBe(true);
    });

    it('debe mostrar notificación de advertencia', () => {
      const id = warning('Advertencia', 'Ten cuidado');
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      expect(element).toBeTruthy();
      expect(element.classList.contains('kitia-notification-warning')).toBe(true);
    });

    it('debe mostrar notificación de error', () => {
      const id = error('Error', 'Algo salió mal');
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      expect(element).toBeTruthy();
      expect(element.classList.contains('kitia-notification-error')).toBe(true);
    });

    it('debe sanitizar el texto para prevenir XSS', () => {
      const maliciousTitle = '<script>alert("XSS")</script>';
      const maliciousMessage = '<img src=x onerror=alert("XSS")>';
      
      const id = info(maliciousTitle, maliciousMessage);
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      const title = element.querySelector('.kitia-notification-title');
      const message = element.querySelector('.kitia-notification-message');
      
      expect(title.innerHTML).not.toContain('<script>');
      expect(message.innerHTML).not.toContain('<img');
      expect(title.textContent).toContain('alert("XSS")');
    });
  });

  describe('Acciones', () => {
    beforeEach(() => {
      notificationManager.init();
    });

    it('debe mostrar botones de acción', () => {
      const callback = vi.fn();
      
      const id = notificationManager.show({
        type: 'info',
        title: 'Confirmar',
        message: '¿Estás seguro?',
        actions: [
          {
            label: 'Sí',
            primary: true,
            callback
          },
          {
            label: 'No'
          }
        ]
      });
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      const buttons = element.querySelectorAll('.kitia-notification-action');
      
      expect(buttons.length).toBe(2);
      expect(buttons[0].classList.contains('kitia-notification-action-primary')).toBe(true);
      expect(buttons[0].textContent).toBe('Sí');
      expect(buttons[1].textContent).toBe('No');
    });

    it('debe ejecutar callback de acción', () => {
      const callback = vi.fn();
      
      const id = notificationManager.show({
        type: 'info',
        title: 'Test',
        actions: [{
          label: 'Click me',
          callback
        }]
      });
      
      const button = document.querySelector('.kitia-notification-action');
      button.click();
      
      expect(callback).toHaveBeenCalled();
    });

    it('debe cerrar notificación si dismiss no es false', () => {
      const id = notificationManager.show({
        type: 'info',
        title: 'Test',
        actions: [{
          label: 'Close',
          dismiss: true
        }]
      });
      
      const button = document.querySelector('.kitia-notification-action');
      button.click();
      
      setTimeout(() => {
        expect(notificationManager.notifications.has(id)).toBe(false);
      }, 400);
    });
  });

  describe('Auto-dismiss', () => {
    beforeEach(() => {
      notificationManager.init();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debe auto-cerrar después del tiempo especificado', () => {
      const id = info('Test', 'Auto-dismiss', { duration: 1000 });
      
      expect(notificationManager.notifications.has(id)).toBe(true);
      
      vi.advanceTimersByTime(1000);
      
      expect(notificationManager.notifications.has(id)).toBe(false);
    });

    it('no debe auto-cerrar si autoDismiss es false', () => {
      const id = warning('Test', 'No auto-dismiss');
      
      vi.advanceTimersByTime(10000);
      
      expect(notificationManager.notifications.has(id)).toBe(true);
    });

    it('debe mostrar barra de progreso para auto-dismiss', () => {
      const id = info('Test', 'Con progreso');
      
      const element = document.querySelector(`[data-notification-id="${id}"]`);
      const progress = element.querySelector('.kitia-notification-progress');
      
      expect(progress).toBeTruthy();
    });
  });

  describe('Límite de notificaciones visibles', () => {
    beforeEach(() => {
      notificationManager.init({ maxVisible: 3 });
    });

    it('debe limitar las notificaciones visibles', () => {
      // Crear 4 notificaciones
      const id1 = info('Test 1', 'Mensaje 1');
      const id2 = info('Test 2', 'Mensaje 2');
      const id3 = info('Test 3', 'Mensaje 3');
      const id4 = info('Test 4', 'Mensaje 4');
      
      // Esperar a que se procesen las animaciones
      setTimeout(() => {
        const visibleNotifications = document.querySelectorAll('.kitia-notification:not(.kitia-notification-hide)');
        expect(visibleNotifications.length).toBe(3);
        
        // La primera debe haber sido cerrada
        expect(notificationManager.notifications.has(id1)).toBe(false);
        expect(notificationManager.notifications.has(id4)).toBe(true);
      }, 100);
    });
  });

  describe('Cerrar notificaciones', () => {
    beforeEach(() => {
      notificationManager.init();
    });

    it('debe cerrar una notificación específica', () => {
      const id = info('Test', 'Para cerrar');
      
      notificationManager.dismiss(id);
      
      setTimeout(() => {
        expect(notificationManager.notifications.has(id)).toBe(false);
        expect(document.querySelector(`[data-notification-id="${id}"]`)).toBeFalsy();
      }, 400);
    });

    it('debe cerrar todas las notificaciones', () => {
      info('Test 1', 'Mensaje 1');
      info('Test 2', 'Mensaje 2');
      info('Test 3', 'Mensaje 3');
      
      expect(notificationManager.notifications.size).toBe(3);
      
      notificationManager.dismissAll();
      
      setTimeout(() => {
        expect(notificationManager.notifications.size).toBe(0);
        expect(document.querySelectorAll('.kitia-notification').length).toBe(0);
      }, 400);
    });

    it('debe cerrar al hacer clic en el botón de cerrar', () => {
      const id = info('Test', 'Click para cerrar');
      
      const closeBtn = document.querySelector('.kitia-notification-close');
      closeBtn.click();
      
      setTimeout(() => {
        expect(notificationManager.notifications.has(id)).toBe(false);
      }, 400);
    });
  });

  describe('Persistencia', () => {
    beforeEach(() => {
      notificationManager.init();
    });

    it('debe guardar notificaciones en localStorage', () => {
      info('Test', 'Persistente');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'kitia-notifications',
        expect.any(String)
      );
    });

    it('debe cargar notificaciones del localStorage', () => {
      const storedNotifications = [
        {
          id: 'test-1',
          title: 'Notificación antigua',
          message: 'Del storage',
          type: 'info',
          timestamp: Date.now() - 1000
        }
      ];
      
      localStorage.getItem.mockReturnValue(JSON.stringify(storedNotifications));
      
      notificationManager.destroy();
      notificationManager.init();
      
      expect(localStorage.getItem).toHaveBeenCalledWith('kitia-notifications');
    });

    it('debe marcar notificaciones como leídas', () => {
      const id = info('Test', 'Para leer');
      
      notificationManager.markAsRead(id);
      
      expect(notificationManager.readNotifications.has(id)).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'kitia-notifications-read',
        expect.any(String)
      );
    });
  });

  describe('Integración con badge', () => {
    beforeEach(() => {
      // Mock de chrome.action
      global.chrome = {
        action: {
          setBadgeText: vi.fn().mockResolvedValue(undefined),
          setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined)
        }
      };
      
      notificationManager.init();
    });

    it('debe actualizar el badge con notificaciones no leídas', async () => {
      info('Test', 'No leída');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '1' });
      expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ef4444' });
    });

    it('debe limpiar el badge cuando no hay notificaciones no leídas', async () => {
      const id = info('Test', 'Para leer');
      notificationManager.markAsRead(id);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('Limpieza', () => {
    beforeEach(() => {
      notificationManager.init();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debe limpiar notificaciones antiguas', () => {
      const oldNotifications = [
        {
          id: 'old-1',
          timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000) // 8 días
        },
        {
          id: 'recent-1',
          timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000) // 1 día
        }
      ];
      
      localStorage.getItem.mockReturnValue(JSON.stringify(oldNotifications));
      
      notificationManager.cleanup();
      
      const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
      expect(savedData.length).toBe(1);
      expect(savedData[0].id).toBe('recent-1');
    });
  });

  describe('Destroy', () => {
    it('debe destruir el sistema correctamente', () => {
      notificationManager.init();
      info('Test', 'Para destruir');
      
      notificationManager.destroy();
      
      expect(notificationManager.initialized).toBe(false);
      expect(notificationManager.notifications.size).toBe(0);
      expect(document.querySelector('.kitia-notifications-container')).toBeFalsy();
    });
  });
});