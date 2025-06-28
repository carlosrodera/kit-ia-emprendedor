/**
 * Sistema de logging configurable para producción
 * NUNCA usar console.log directamente - SIEMPRE usar Logger
 * 
 * @module Logger
 * @since 2025-01-28
 * @version 2.0.0
 */

/**
 * Niveles de log
 * @enum {number}
 */
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4,
  NONE: 5
};

/**
 * Configuración del logger
 */
class LoggerConfig {
  constructor() {
    this.level = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.ERROR;
    this.enableConsole = import.meta.env.DEV;
    this.enableRemote = false; // Para futuro servicio de monitoreo
    this.prefix = '[Kit IA]';
    this.includeTimestamp = true;
    this.includeStackTrace = import.meta.env.DEV;
  }
}

/**
 * Logger principal
 * @class
 */
export class Logger {
  constructor(config = new LoggerConfig()) {
    this.config = config;
    this.buffer = []; // Para almacenar logs si es necesario
    this.maxBufferSize = 100;
  }

  /**
   * Formatea el mensaje de log
   * @private
   */
  _formatMessage(level, message, data) {
    const timestamp = this.config.includeTimestamp 
      ? new Date().toISOString() 
      : '';
    
    const levelName = Object.keys(LogLevel).find(
      key => LogLevel[key] === level
    );
    
    const prefix = [
      timestamp,
      this.config.prefix,
      `[${levelName}]`
    ].filter(Boolean).join(' ');
    
    return { prefix, message, data };
  }

  /**
   * Envía el log a la consola si está habilitado
   * @private
   */
  _logToConsole(level, formatted) {
    if (!this.config.enableConsole) return;
    
    const { prefix, message, data } = formatted;
    const args = [prefix, message];
    
    if (data !== undefined) {
      args.push(data);
    }
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(...args);
        if (this.config.includeStackTrace && data instanceof Error) {
          console.error(data.stack);
        }
        break;
    }
  }

  /**
   * Guarda el log en el buffer
   * @private
   */
  _addToBuffer(level, formatted) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      ...formatted
    };
    
    this.buffer.push(entry);
    
    // Mantener el buffer bajo control
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Envía logs a servicio remoto (para futuro)
   * @private
   */
  async _logToRemote(level, formatted) {
    if (!this.config.enableRemote) return;
    
    // TODO: Implementar cuando tengamos servicio de monitoreo
    // Por ahora, solo preparar la estructura
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      extensionVersion: chrome.runtime.getManifest().version,
      ...formatted
    };
  }

  /**
   * Log genérico
   * @private
   */
  _log(level, message, data) {
    if (level < this.config.level) return;
    
    const formatted = this._formatMessage(level, message, data);
    
    this._logToConsole(level, formatted);
    this._addToBuffer(level, formatted);
    this._logToRemote(level, formatted);
  }

  /**
   * Debug log
   * @param {string} message - Mensaje
   * @param {*} [data] - Datos adicionales
   */
  debug(message, data) {
    this._log(LogLevel.DEBUG, message, data);
  }

  /**
   * Info log
   * @param {string} message - Mensaje
   * @param {*} [data] - Datos adicionales
   */
  info(message, data) {
    this._log(LogLevel.INFO, message, data);
  }

  /**
   * Warning log
   * @param {string} message - Mensaje
   * @param {*} [data] - Datos adicionales
   */
  warn(message, data) {
    this._log(LogLevel.WARN, message, data);
  }

  /**
   * Error log
   * @param {string} message - Mensaje
   * @param {Error|*} [error] - Error o datos adicionales
   */
  error(message, error) {
    this._log(LogLevel.ERROR, message, error);
  }

  /**
   * Critical error log
   * @param {string} message - Mensaje
   * @param {Error|*} [error] - Error o datos adicionales
   */
  critical(message, error) {
    this._log(LogLevel.CRITICAL, message, error);
    
    // En errores críticos, podríamos notificar al usuario
    if (import.meta.env.PROD) {
      // Enviar notificación al usuario sobre error crítico
      chrome.runtime.sendMessage({
        type: 'CRITICAL_ERROR',
        message: 'Ha ocurrido un error crítico. Por favor, recarga la extensión.'
      });
    }
  }

  /**
   * Mide el tiempo de una operación
   * @param {string} label - Etiqueta para la medición
   * @returns {Function} Función para finalizar la medición
   */
  time(label) {
    const start = performance.now();
    
    return (message = 'completed') => {
      const duration = performance.now() - start;
      this.debug(`${label} ${message}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  /**
   * Log de grupo (útil para operaciones complejas)
   * @param {string} label - Etiqueta del grupo
   * @param {Function} fn - Función a ejecutar
   */
  async group(label, fn) {
    this.debug(`${label} - START`);
    const endTimer = this.time(label);
    
    try {
      const result = await fn();
      endTimer('SUCCESS');
      return result;
    } catch (error) {
      this.error(`${label} - FAILED`, error);
      endTimer('FAILED');
      throw error;
    }
  }

  /**
   * Obtiene los logs del buffer
   * @param {number} [count] - Número de logs a obtener
   * @returns {Array}
   */
  getBuffer(count) {
    if (!count) return [...this.buffer];
    return this.buffer.slice(-count);
  }

  /**
   * Limpia el buffer de logs
   */
  clearBuffer() {
    this.buffer = [];
  }

  /**
   * Exporta los logs para debugging
   * @returns {string}
   */
  exportLogs() {
    return JSON.stringify(this.buffer, null, 2);
  }

  /**
   * Configura el nivel de log
   * @param {number} level - Nivel de LogLevel
   */
  setLevel(level) {
    this.config.level = level;
  }

  /**
   * Habilita/deshabilita la consola
   * @param {boolean} enabled
   */
  setConsoleEnabled(enabled) {
    this.config.enableConsole = enabled;
  }
}

// Instancia singleton del logger
const logger = new Logger();

// Exportar métodos individuales para conveniencia
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const critical = logger.critical.bind(logger);
export const time = logger.time.bind(logger);
export const group = logger.group.bind(logger);

// Exportar el logger completo
export default logger;