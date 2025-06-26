/**
 * @fileoverview Ejemplo de uso del módulo de validación
 * Este archivo muestra cómo integrar las validaciones en el proyecto
 */

import {
  validatePromptTitle,
  validatePromptContent,
  validateTags,
  validateSearch,
  validateEmail,
  sanitizeHtml,
  validateForm,
  escapeHtml
} from './validation.js';

/**
 * Ejemplo 1: Validar datos de un prompt antes de guardarlo
 */
export function validatePromptData(promptData) {
  // Validar título
  const titleValidation = validatePromptTitle(promptData.title);
  if (!titleValidation.valid) {
    return { success: false, error: titleValidation.error };
  }

  // Validar contenido
  const contentValidation = validatePromptContent(promptData.content);
  if (!contentValidation.valid) {
    return { success: false, error: contentValidation.error };
  }

  // Validar tags si existen
  if (promptData.tags) {
    const tagsValidation = validateTags(promptData.tags);
    if (!tagsValidation.valid) {
      return { success: false, error: tagsValidation.error };
    }
  }

  // Sanitizar el contenido antes de guardarlo
  const sanitizedData = {
    ...promptData,
    title: escapeHtml(promptData.title.trim()),
    content: sanitizeHtml(promptData.content.trim()),
    tags: promptData.tags?.map(tag => escapeHtml(tag.trim()))
  };

  return { success: true, data: sanitizedData };
}

/**
 * Ejemplo 2: Validar búsqueda antes de ejecutarla
 */
export function processSearch(searchTerm) {
  const validation = validateSearch(searchTerm);

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error
    };
  }

  // Usar el término sanitizado para la búsqueda
  return {
    success: true,
    sanitizedTerm: validation.sanitized
  };
}

/**
 * Ejemplo 3: Validar formulario de configuración
 */
export function validateSettingsForm(formData) {
  const schema = {
    email: {
      label: 'Correo electrónico',
      required: true,
      validator: validateEmail
    },
    displayName: {
      label: 'Nombre para mostrar',
      required: true,
      type: 'string',
      typeOptions: {
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]+$/,
        patternError: 'Solo se permiten letras, números y espacios'
      }
    },
    theme: {
      label: 'Tema',
      required: true,
      type: 'string',
      validator: (value) => {
        const validThemes = ['light', 'dark', 'auto'];
        if (!validThemes.includes(value)) {
          return { valid: false, error: 'Tema no válido' };
        }
        return { valid: true };
      }
    },
    notifications: {
      label: 'Notificaciones',
      required: false,
      type: 'boolean'
    }
  };

  return validateForm(formData, schema);
}

/**
 * Ejemplo 4: Sanitizar contenido generado por el usuario para mostrar
 */
export function prepareUserContent(content) {
  // Opciones más permisivas para contenido del usuario
  const sanitizeOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    // Asegurar que los links externos se abran en nueva ventana
    SANITIZE_DOM: true,
    ADD_ATTR: ['target', 'rel'],
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      })
    }
  };

  return sanitizeHtml(content, sanitizeOptions);
}

/**
 * Ejemplo 5: Validación en tiempo real para feedback inmediato
 */
export class FormValidator {
  constructor(schema) {
    this.schema = schema;
    this.errors = {};
    this.touched = new Set();
  }

  validateField(fieldName, value) {
    this.touched.add(fieldName);

    const fieldSchema = this.schema[fieldName];
    if (!fieldSchema) return;

    // Validar campo individual
    const tempData = { [fieldName]: value };
    const tempSchema = { [fieldName]: fieldSchema };
    const result = validateForm(tempData, tempSchema);

    if (!result.valid) {
      this.errors[fieldName] = result.errors[fieldName];
    } else {
      delete this.errors[fieldName];
    }

    return !this.errors[fieldName];
  }

  validateAll(data) {
    const result = validateForm(data, this.schema);
    this.errors = result.errors;

    // Marcar todos los campos como tocados
    Object.keys(this.schema).forEach(field => this.touched.add(field));

    return result.valid;
  }

  getError(fieldName) {
    return this.touched.has(fieldName) ? this.errors[fieldName] : null;
  }

  isValid() {
    return Object.keys(this.errors).length === 0;
  }

  reset() {
    this.errors = {};
    this.touched.clear();
  }
}

/**
 * Ejemplo 6: Middleware de validación para API
 */
export function createValidationMiddleware(schema) {
  return (data) => {
    const validation = validateForm(data, schema);

    if (!validation.valid) {
      throw new ValidationError('Datos inválidos', validation.errors);
    }

    return data;
  };
}

class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Ejemplo 7: Hook para usar en componentes (simulación)
 */
export function useValidation(schema) {
  const validator = new FormValidator(schema);

  return {
    validate: (field, value) => validator.validateField(field, value),
    validateAll: (data) => validator.validateAll(data),
    getError: (field) => validator.getError(field),
    isValid: () => validator.isValid(),
    reset: () => validator.reset(),
    errors: validator.errors
  };
}

// Exportar ejemplos de uso
export const examples = {
  // Ejemplo de validación de prompt
  promptExample: () => {
    const promptData = {
      title: 'Mi Prompt de Marketing',
      content: 'Crea una campaña de marketing digital para...',
      tags: ['marketing', 'digital', 'campaña']
    };

    const result = validatePromptData(promptData);
    console.log('Validación de prompt:', result);
  },

  // Ejemplo de búsqueda
  searchExample: () => {
    const searches = [
      'búsqueda normal',
      '<script>alert("XSS")</script>',
      '   espacios   múltiples   ',
      ''
    ];

    searches.forEach(term => {
      const result = processSearch(term);
      console.log(`Búsqueda "${term}":`, result);
    });
  },

  // Ejemplo de formulario
  formExample: () => {
    const formData = {
      email: 'usuario@ejemplo.com',
      displayName: 'Juan Pérez',
      theme: 'dark',
      notifications: true
    };

    const result = validateSettingsForm(formData);
    console.log('Validación de formulario:', result);
  }
};
