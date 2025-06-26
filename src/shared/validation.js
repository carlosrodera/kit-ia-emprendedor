/**
 * @fileoverview Módulo de validación y sanitización para Kit IA Emprendedor
 * Proporciona validadores seguros para prevenir XSS y otros ataques
 * @module shared/validation
 */

import DOMPurify from 'dompurify';

// Función auxiliar para obtener DOMPurify según el entorno
const getPurify = () => {
  // En tests, usar la instancia global configurada
  if (typeof global !== 'undefined' && global.DOMPurify) {
    return global.DOMPurify;
  }

  // En el navegador, DOMPurify funciona directamente
  if (typeof window !== 'undefined') {
    return DOMPurify(window);
  }

  // Fallback
  return DOMPurify;
};

/**
 * Configuración de límites para validaciones
 */
const LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 100,
  CONTENT_MIN: 10,
  CONTENT_MAX: 5000,
  TAG_MAX_COUNT: 10,
  TAG_MAX_LENGTH: 30,
  SEARCH_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 254
};

/**
 * Expresiones regulares seguras para validaciones
 */
const REGEX = {
  // Alfanumérico con espacios, guiones y underscores
  ALPHANUMERIC: /^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\-_]+$/,
  // Email básico pero seguro
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  // URL válida con protocolo obligatorio
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  // Tag individual (sin espacios al inicio/fin)
  TAG: /^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ][a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\-_]*[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]$|^[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]$/,
  // Caracteres peligrosos para escape
  DANGEROUS_CHARS: /[<>'"&]/g
};

/**
 * Escapa caracteres especiales HTML para prevenir XSS
 * @param {string} str - String a escapar
 * @returns {string} String con caracteres escapados
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };

  return str.replace(REGEX.DANGEROUS_CHARS, char => map[char]);
}

/**
 * Sanitiza HTML usando DOMPurify
 * @param {string} html - HTML a sanitizar
 * @param {Object} options - Opciones para DOMPurify
 * @returns {string} HTML sanitizado
 */
export function sanitizeHtml(html, options = {}) {
  if (typeof html !== 'string') return '';

  // Configuración segura por defecto
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true
  };

  try {
    const purify = getPurify();
    return purify.sanitize(html, { ...defaultOptions, ...options });
  } catch (error) {
    // Fallback básico si DOMPurify falla
    // Eliminar solo los tags peligrosos más comunes
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Eliminar event handlers
      .replace(/javascript:/gi, ''); // Eliminar javascript: URLs

    // Si aún así no tenemos contenido, devolver el HTML escapado
    if (!cleaned.trim()) {
      return escapeHtml(html);
    }

    return cleaned;
  }
}

/**
 * Valida el título de un prompt
 * @param {string} title - Título a validar
 * @returns {{valid: boolean, error?: string}} Resultado de validación
 */
export function validatePromptTitle(title) {
  if (typeof title !== 'string') {
    return { valid: false, error: 'El título debe ser un texto' };
  }

  const trimmed = title.trim();

  if (trimmed.length < LIMITS.TITLE_MIN) {
    return { valid: false, error: `El título debe tener al menos ${LIMITS.TITLE_MIN} caracteres` };
  }

  if (trimmed.length > LIMITS.TITLE_MAX) {
    return { valid: false, error: `El título no puede superar los ${LIMITS.TITLE_MAX} caracteres` };
  }

  if (!REGEX.ALPHANUMERIC.test(trimmed)) {
    return { valid: false, error: 'El título solo puede contener letras, números, espacios, guiones y guiones bajos' };
  }

  return { valid: true };
}

/**
 * Valida el contenido de un prompt
 * @param {string} content - Contenido a validar
 * @returns {{valid: boolean, error?: string}} Resultado de validación
 */
export function validatePromptContent(content) {
  if (typeof content !== 'string') {
    return { valid: false, error: 'El contenido debe ser un texto' };
  }

  const trimmed = content.trim();

  if (trimmed.length < LIMITS.CONTENT_MIN) {
    return { valid: false, error: `El contenido debe tener al menos ${LIMITS.CONTENT_MIN} caracteres` };
  }

  if (trimmed.length > LIMITS.CONTENT_MAX) {
    return { valid: false, error: `El contenido no puede superar los ${LIMITS.CONTENT_MAX} caracteres` };
  }

  // No aplicamos restricciones de caracteres al contenido, solo lo sanitizamos
  return { valid: true };
}

/**
 * Valida un array de tags
 * @param {string[]} tags - Array de tags a validar
 * @returns {{valid: boolean, error?: string}} Resultado de validación
 */
export function validateTags(tags) {
  if (!Array.isArray(tags)) {
    return { valid: false, error: 'Los tags deben ser un array' };
  }

  if (tags.length > LIMITS.TAG_MAX_COUNT) {
    return { valid: false, error: `No se pueden agregar más de ${LIMITS.TAG_MAX_COUNT} tags` };
  }

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i];

    if (typeof tag !== 'string') {
      return { valid: false, error: `El tag #${i + 1} no es válido` };
    }

    const trimmed = tag.trim();

    if (trimmed.length === 0) {
      return { valid: false, error: `El tag #${i + 1} está vacío` };
    }

    if (trimmed.length > LIMITS.TAG_MAX_LENGTH) {
      return { valid: false, error: `El tag "${trimmed}" supera los ${LIMITS.TAG_MAX_LENGTH} caracteres` };
    }

    if (!REGEX.TAG.test(trimmed)) {
      return { valid: false, error: `El tag "${trimmed}" contiene caracteres no válidos` };
    }
  }

  // Verificar tags duplicados (case-insensitive)
  const uniqueTags = new Set(tags.map(t => t.trim().toLowerCase()));
  if (uniqueTags.size !== tags.length) {
    return { valid: false, error: 'No se permiten tags duplicados' };
  }

  return { valid: true };
}

/**
 * Sanitiza y valida una búsqueda
 * @param {string} search - Término de búsqueda
 * @returns {{valid: boolean, sanitized?: string, error?: string}} Resultado
 */
export function validateSearch(search) {
  if (typeof search !== 'string') {
    return { valid: false, error: 'La búsqueda debe ser un texto' };
  }

  // Sanitizar: eliminar espacios múltiples y trim
  const sanitized = search.trim().replace(/\s+/g, ' ');

  if (sanitized.length === 0) {
    return { valid: false, error: 'La búsqueda no puede estar vacía' };
  }

  if (sanitized.length > LIMITS.SEARCH_MAX_LENGTH) {
    return { valid: false, error: `La búsqueda no puede superar los ${LIMITS.SEARCH_MAX_LENGTH} caracteres` };
  }

  // Escapar caracteres especiales para prevenir inyecciones
  const escaped = escapeHtml(sanitized);

  return { valid: true, sanitized: escaped };
}

/**
 * Valida una URL
 * @param {string} url - URL a validar
 * @returns {{valid: boolean, error?: string}} Resultado de validación
 */
export function validateUrl(url) {
  if (typeof url !== 'string') {
    return { valid: false, error: 'La URL debe ser un texto' };
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'La URL no puede estar vacía' };
  }

  if (!REGEX.URL.test(trimmed)) {
    return { valid: false, error: 'La URL no es válida. Debe comenzar con http:// o https://' };
  }

  // Validación adicional: no permitir localhost en producción
  if (trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
    return { valid: false, error: 'Las URLs locales no están permitidas' };
  }

  return { valid: true };
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {{valid: boolean, error?: string}} Resultado de validación
 */
export function validateEmail(email) {
  if (typeof email !== 'string') {
    return { valid: false, error: 'El email debe ser un texto' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length === 0) {
    return { valid: false, error: 'El email no puede estar vacío' };
  }

  if (trimmed.length > LIMITS.EMAIL_MAX_LENGTH) {
    return { valid: false, error: 'El email es demasiado largo' };
  }

  if (!REGEX.EMAIL.test(trimmed)) {
    return { valid: false, error: 'El formato del email no es válido' };
  }

  // Validaciones adicionales
  const [localPart, domain] = trimmed.split('@');

  // No permitir puntos consecutivos
  if (localPart.includes('..') || domain.includes('..')) {
    return { valid: false, error: 'El email contiene puntos consecutivos' };
  }

  // No permitir que empiece o termine con punto
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return { valid: false, error: 'El email no puede empezar o terminar con punto' };
  }

  return { valid: true };
}

/**
 * Valida un tipo de dato genérico
 * @param {*} value - Valor a validar
 * @param {string} type - Tipo esperado ('string', 'number', 'boolean', 'array', 'object')
 * @param {Object} options - Opciones adicionales de validación
 * @returns {{valid: boolean, error?: string}} Resultado de validación
 */
export function validateType(value, type, options = {}) {
  const actualType = Array.isArray(value) ? 'array' : typeof value;

  if (actualType !== type) {
    return { valid: false, error: `Se esperaba ${type} pero se recibió ${actualType}` };
  }

  // Validaciones adicionales según el tipo
  switch (type) {
    case 'string':
      if (options.minLength && value.length < options.minLength) {
        return { valid: false, error: `El texto debe tener al menos ${options.minLength} caracteres` };
      }
      if (options.maxLength && value.length > options.maxLength) {
        return { valid: false, error: `El texto no puede superar los ${options.maxLength} caracteres` };
      }
      if (options.pattern && !options.pattern.test(value)) {
        return { valid: false, error: options.patternError || 'El formato no es válido' };
      }
      break;

    case 'number':
      if (isNaN(value)) {
        return { valid: false, error: 'El valor no es un número válido' };
      }
      if (options.min !== undefined && value < options.min) {
        return { valid: false, error: `El valor debe ser mayor o igual a ${options.min}` };
      }
      if (options.max !== undefined && value > options.max) {
        return { valid: false, error: `El valor debe ser menor o igual a ${options.max}` };
      }
      if (options.integer && !Number.isInteger(value)) {
        return { valid: false, error: 'El valor debe ser un número entero' };
      }
      break;

    case 'array':
      if (options.minItems && value.length < options.minItems) {
        return { valid: false, error: `El array debe tener al menos ${options.minItems} elementos` };
      }
      if (options.maxItems && value.length > options.maxItems) {
        return { valid: false, error: `El array no puede tener más de ${options.maxItems} elementos` };
      }
      break;

    case 'object':
      if (value === null) {
        return { valid: false, error: 'El objeto no puede ser null' };
      }
      if (options.requiredKeys) {
        for (const key of options.requiredKeys) {
          if (!(key in value)) {
            return { valid: false, error: `Falta la propiedad requerida: ${key}` };
          }
        }
      }
      break;
  }

  return { valid: true };
}

/**
 * Sanitiza un objeto completo recursivamente
 * @param {Object} obj - Objeto a sanitizar
 * @param {number} maxDepth - Profundidad máxima de recursión
 * @returns {Object} Objeto sanitizado
 */
export function sanitizeObject(obj, maxDepth = 5) {
  if (maxDepth <= 0) return obj;

  if (typeof obj === 'string') {
    return escapeHtml(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, maxDepth - 1));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizar también las claves
      const sanitizedKey = escapeHtml(key);
      sanitized[sanitizedKey] = sanitizeObject(value, maxDepth - 1);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validador compuesto para formularios completos
 * @param {Object} data - Datos del formulario
 * @param {Object} schema - Esquema de validación
 * @returns {{valid: boolean, errors: Object}} Resultado con todos los errores
 */
export function validateForm(data, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Validar requerido
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${rules.label || field} es requerido`;
      isValid = false;
      continue;
    }

    // Si no es requerido y está vacío, continuar
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Validar según tipo
    if (rules.type) {
      const typeValidation = validateType(value, rules.type, rules.typeOptions);
      if (!typeValidation.valid) {
        errors[field] = typeValidation.error;
        isValid = false;
        continue;
      }
    }

    // Validador personalizado
    if (rules.validator) {
      const customValidation = rules.validator(value);
      if (!customValidation.valid) {
        errors[field] = customValidation.error;
        isValid = false;
      }
    }
  }

  return { valid: isValid, errors };
}

// Exportar constantes útiles para tests y otros módulos
export { LIMITS, REGEX };
