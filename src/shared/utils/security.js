// Security utilities for Kit IA Emprendedor
(function () {
  'use strict';

  // Exportar utilidades de seguridad
  window.SecurityUtils = {
    /**
     * Escapa caracteres HTML para prevenir XSS
     */
    escapeHtml(text) {
      if (typeof text !== 'string') {
        return '';
      }

      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Sanitiza contenido HTML básico
     */
    sanitizeHtml(html) {
      if (typeof html !== 'string') {
        return '';
      }

      // Lista blanca de tags seguros
      const allowedTags = ['b', 'i', 'em', 'strong', 'span', 'div', 'p', 'br'];
      const allowedAttributes = ['class'];

      // Crear elemento temporal
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Función recursiva para limpiar
      const cleanElement = (element) => {
        if (element.nodeType === Node.TEXT_NODE) {
          return element;
        }

        if (element.nodeType === Node.ELEMENT_NODE) {
          const tagName = element.tagName.toLowerCase();

          // Si el tag no está permitido, reemplazar por span
          if (!allowedTags.includes(tagName)) {
            const span = document.createElement('span');
            span.textContent = element.textContent;
            return span;
          }

          // Limpiar atributos
          const attributes = Array.from(element.attributes);
          attributes.forEach(attr => {
            if (!allowedAttributes.includes(attr.name.toLowerCase())) {
              element.removeAttribute(attr.name);
            }
          });

          // Limpiar hijos recursivamente
          const children = Array.from(element.childNodes);
          children.forEach(child => {
            const cleaned = cleanElement(child);
            if (cleaned !== child) {
              element.replaceChild(cleaned, child);
            }
          });

          return element;
        }

        // Eliminar otros tipos de nodos
        return document.createTextNode('');
      };

      // Limpiar todos los elementos
      const children = Array.from(temp.childNodes);
      children.forEach(child => {
        cleanElement(child);
      });

      return temp.innerHTML;
    },

    /**
     * Valida que una cadena sea segura para usar como ID
     */
    validateId(id) {
      if (typeof id !== 'string') {
        return false;
      }

      // Solo permitir letras, números, guiones y guiones bajos
      return /^[a-zA-Z0-9_-]+$/.test(id);
    },

    /**
     * Valida que una URL sea segura
     */
    validateUrl(url) {
      if (typeof url !== 'string') {
        return false;
      }

      try {
        const urlObj = new URL(url);
        // Solo permitir HTTP y HTTPS
        return ['http:', 'https:'].includes(urlObj.protocol);
      } catch {
        return false;
      }
    },

    /**
     * Crea un elemento HTML de forma segura
     */
    createElement(tag, options = {}) {
      const element = document.createElement(tag);

      // Añadir clases de forma segura
      if (options.className) {
        element.className = this.escapeHtml(options.className);
      }

      // Añadir ID de forma segura
      if (options.id && this.validateId(options.id)) {
        element.id = options.id;
      }

      // Añadir texto de forma segura
      if (options.textContent) {
        element.textContent = options.textContent;
      }

      // Añadir atributos de forma segura
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          if (typeof key === 'string' && typeof value === 'string') {
            element.setAttribute(key, this.escapeHtml(value));
          }
        });
      }

      return element;
    },

    /**
     * Añade event listener de forma segura
     */
    addSafeEventListener(element, event, handler, options = {}) {
      if (!element || typeof handler !== 'function') {
        return false;
      }

      // Wrapper para capturar y loggear errores
      const safeHandler = (e) => {
        try {
          return handler(e);
        } catch (error) {
          console.error('Error in event handler:', error);
          return false;
        }
      };

      element.addEventListener(event, safeHandler, options);
      return true;
    },

    /**
     * Copia texto al portapapeles de forma segura
     */
    async copyToClipboard(text) {
      if (typeof text !== 'string') {
        throw new Error('Text must be a string');
      }

      try {
        // Intentar usar la API moderna del portapapeles
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        } else {
          // Fallback para contextos no seguros
          return this.fallbackCopyToClipboard(text);
        }
      } catch (error) {
        console.warn('Clipboard API failed, using fallback:', error);
        return this.fallbackCopyToClipboard(text);
      }
    },

    /**
     * Método fallback para copiar al portapapeles
     */
    fallbackCopyToClipboard(text) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      } catch (error) {
        console.error('Fallback copy failed:', error);
        return false;
      }
    },

    /**
     * Valida entrada de usuario para prompts
     */
    validatePromptInput(input) {
      const errors = [];

      if (!input) {
        errors.push('El input es requerido');
        return { valid: false, errors };
      }

      // Validar título
      if (!input.title || typeof input.title !== 'string') {
        errors.push('El título es requerido');
      } else if (input.title.length > 100) {
        errors.push('El título no puede exceder 100 caracteres');
      } else if (input.title.trim().length === 0) {
        errors.push('El título no puede estar vacío');
      }

      // Validar contenido
      if (!input.content || typeof input.content !== 'string') {
        errors.push('El contenido es requerido');
      } else if (input.content.length > 20000) {
        errors.push('El contenido no puede exceder 20,000 caracteres');
      } else if (input.content.trim().length === 0) {
        errors.push('El contenido no puede estar vacío');
      }

      // Validar ID si está presente
      if (input.id && !this.validateId(input.id)) {
        errors.push('ID inválido');
      }

      return {
        valid: errors.length === 0,
        errors
      };
    },

    /**
     * Valida datos de GPT
     */
    validateGPTData(gpt) {
      const errors = [];

      if (!gpt || typeof gpt !== 'object') {
        errors.push('GPT data es requerido');
        return { valid: false, errors };
      }

      // Validar campos requeridos
      const requiredFields = ['id', 'name', 'description'];
      requiredFields.forEach(field => {
        if (!gpt[field] || typeof gpt[field] !== 'string') {
          errors.push(`${field} es requerido`);
        }
      });

      // Validar ID
      if (gpt.id && !this.validateId(gpt.id)) {
        errors.push('ID del GPT inválido');
      }

      // Validar URL si está presente
      if (gpt.url && !this.validateUrl(gpt.url)) {
        errors.push('URL del GPT inválida');
      }

      // Validar tags si están presentes
      if (gpt.tags && Array.isArray(gpt.tags)) {
        gpt.tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            errors.push(`Tag ${index} debe ser una cadena`);
          }
        });
      }

      return {
        valid: errors.length === 0,
        errors
      };
    },

    /**
     * Logger seguro para debugging
     */
    safeLog(level, message, data = {}) {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message: this.escapeHtml(String(message)),
        data: typeof data === 'object' ? data : { value: data }
      };

      if (level === 'error') {
        console.error('[SECURITY]', logEntry);
      } else if (level === 'warn') {
        console.warn('[SECURITY]', logEntry);
      } else {
        console.log('[SECURITY]', logEntry);
      }
    }
  };

  // Alias para compatibilidad
  window.SecUtils = window.SecurityUtils;
})();
