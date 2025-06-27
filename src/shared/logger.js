/**
 * Sistema de logging para la extensión
 */

import { DEV_CONFIG, isDevelopment } from './config.js';

class Logger {
  constructor(module = 'General') {
    this.module = module;
    // Solo habilitar logging en desarrollo
    this.enabled = isDevelopment && (DEV_CONFIG?.enableLogging ?? true);
    this.level = DEV_CONFIG?.logLevel ?? (isDevelopment ? 'debug' : 'error');
    this.includeTimestamp = true;
    this.includeStackTrace = isDevelopment && (DEV_CONFIG?.showDebugInfo ?? false);
  }

  /**
   * Formatea el mensaje con metadata
   */
  formatMessage(level, message, data) {
    const parts = [];

    if (this.includeTimestamp) {
      parts.push(new Date().toISOString());
    }

    parts.push(`[${this.module}]`);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * Obtiene el stack trace si está habilitado
   */
  getStackTrace() {
    if (!this.includeStackTrace) return null;

    const error = new Error();
    const stack = error.stack?.split('\n').slice(3).join('\n');
    return stack;
  }

  /**
   * Verifica si el nivel de log está permitido
   */
  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Log de nivel debug
   */
  debug(message, data = null) {
    if (!this.enabled || !this.shouldLog('debug')) return;

    const formattedMessage = this.formatMessage('debug', message, data);
    console.log(formattedMessage);

    if (data) {
      console.log('Data:', data);
    }
  }

  /**
   * Log de nivel info
   */
  info(message, data = null) {
    if (!this.enabled || !this.shouldLog('info')) return;

    const formattedMessage = this.formatMessage('info', message, data);
    console.info(formattedMessage);

    if (data) {
      console.info('Data:', data);
    }
  }

  /**
   * Log de nivel warning
   */
  warn(message, data = null) {
    if (!this.enabled || !this.shouldLog('warn')) return;

    const formattedMessage = this.formatMessage('warn', message, data);
    console.warn(formattedMessage);

    if (data) {
      console.warn('Data:', data);
    }

    const stack = this.getStackTrace();
    if (stack) {
      console.warn('Stack:', stack);
    }
  }

  /**
   * Log de nivel error
   */
  error(message, error = null, data = null) {
    // Los errores siempre se loguean, incluso en producción
    const formattedMessage = this.formatMessage('error', message, data);
    console.error(formattedMessage);

    if (error) {
      console.error('Error:', error);
      if (error.stack) {
        console.error('Stack:', error.stack);
      }
    }

    if (data && isDevelopment) {
      console.error('Additional data:', data);
    }

    // En producción, reportar errores para monitoreo
    if (!isDevelopment) {
      this.reportError(message, error, data);
    }
  }

  /**
   * Reporta errores a un servicio externo (para futuro)
   */
  reportError(message, error, data) {
    // TODO: Implementar envío a servicio de monitoreo como Sentry
    // Por ahora solo guardamos en storage local para debug
    const errorReport = {
      timestamp: new Date().toISOString(),
      module: this.module,
      message,
      error: error
        ? {
          message: error.message,
          stack: error.stack
        }
        : null,
      data,
      userAgent: navigator.userAgent,
      extensionVersion: chrome.runtime.getManifest().version
    };

    // Guardar últimos 10 errores
    chrome.storage.local.get(['error_logs'], (result) => {
      const logs = result.error_logs || [];
      logs.unshift(errorReport);

      // Mantener solo los últimos 10
      if (logs.length > 10) {
        logs.splice(10);
      }

      chrome.storage.local.set({ error_logs: logs });
    });
  }

  /**
   * Mide el tiempo de ejecución de una función
   */
  async time(label, fn) {
    if (!this.enabled || !this.shouldLog('debug')) {
      return await fn();
    }

    const startTime = performance.now();
    const startLabel = `${label} - Started`;
    this.debug(startLabel);

    try {
      const result = await fn();
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      this.debug(`${label} - Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      this.error(`${label} - Failed after ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Crea un grupo de logs colapsable
   */
  group(label) {
    if (!this.enabled) return;
    console.group(label);
  }

  /**
   * Cierra el grupo de logs
   */
  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }

  /**
   * Limpia la consola
   */
  clear() {
    if (!this.enabled) return;
    console.clear();
  }
}

/**
 * Factory para crear loggers por módulo
 */
export function createLogger(module) {
  return new Logger(module);
}

// Exportar la clase Logger
export { Logger };

// Logger por defecto
export const logger = new Logger('App');

// Loggers específicos pre-creados
export const authLogger = new Logger('Auth');
export const storageLogger = new Logger('Storage');
export const apiLogger = new Logger('API');
export const uiLogger = new Logger('UI');
export const syncLogger = new Logger('Sync');
export const serviceWorkerLogger = new Logger('ServiceWorker');

export default logger;
