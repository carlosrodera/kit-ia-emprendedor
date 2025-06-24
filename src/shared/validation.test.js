/**
 * @fileoverview Tests para el módulo de validación y sanitización
 */

import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeHtml,
  validatePromptTitle,
  validatePromptContent,
  validateTags,
  validateSearch,
  validateUrl,
  validateEmail,
  validateType,
  sanitizeObject,
  validateForm,
  LIMITS
} from './validation.js';

describe('escapeHtml', () => {
  it('debe escapar caracteres HTML peligrosos', () => {
    expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeHtml("It's a test")).toBe('It&#x27;s a test');
    expect(escapeHtml('"Hello"')).toBe('&quot;Hello&quot;');
  });

  it('debe manejar strings vacíos y tipos incorrectos', () => {
    expect(escapeHtml('')).toBe('');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(123)).toBe('');
  });

  it('debe preservar texto seguro', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
    expect(escapeHtml('áéíóúñ ÁÉÍÓÚÑ')).toBe('áéíóúñ ÁÉÍÓÚÑ');
  });
});

describe('sanitizeHtml', () => {
  it('debe permitir solo tags seguros por defecto', () => {
    const html = '<p>Hello <script>alert("XSS")</script><b>World</b></p>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toBe('<p>Hello <b>World</b></p>');
  });

  it('debe preservar atributos permitidos', () => {
    const html = '<a href="https://example.com" onclick="alert()">Link</a>';
    const sanitized = sanitizeHtml(html);
    expect(sanitized).toBe('<a href="https://example.com">Link</a>');
  });

  it('debe manejar tipos incorrectos', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml(123)).toBe('');
  });
});

describe('validatePromptTitle', () => {
  it('debe validar títulos correctos', () => {
    expect(validatePromptTitle('Mi Prompt')).toEqual({ valid: true });
    expect(validatePromptTitle('Prompt-123')).toEqual({ valid: true });
    expect(validatePromptTitle('Prompt_Test')).toEqual({ valid: true });
    expect(validatePromptTitle('Título con espacios')).toEqual({ valid: true });
    expect(validatePromptTitle('Título con ñ y acentos áéíóú')).toEqual({ valid: true });
  });

  it('debe rechazar títulos muy cortos', () => {
    const result = validatePromptTitle('AB');
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.TITLE_MIN} caracteres`);
  });

  it('debe rechazar títulos muy largos', () => {
    const longTitle = 'A'.repeat(LIMITS.TITLE_MAX + 1);
    const result = validatePromptTitle(longTitle);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.TITLE_MAX} caracteres`);
  });

  it('debe rechazar caracteres especiales', () => {
    const result = validatePromptTitle('Mi <Prompt>');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('letras, números, espacios');
  });

  it('debe manejar tipos incorrectos', () => {
    const result = validatePromptTitle(123);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('debe ser un texto');
  });

  it('debe hacer trim de espacios', () => {
    expect(validatePromptTitle('   Mi Prompt   ')).toEqual({ valid: true });
    const result = validatePromptTitle('   AB   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.TITLE_MIN} caracteres`);
  });
});

describe('validatePromptContent', () => {
  it('debe validar contenido correcto', () => {
    expect(validatePromptContent('Este es un contenido válido.')).toEqual({ valid: true });
    expect(validatePromptContent('Contenido con <html> y caracteres especiales!')).toEqual({ valid: true });
  });

  it('debe rechazar contenido muy corto', () => {
    const result = validatePromptContent('Corto');
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.CONTENT_MIN} caracteres`);
  });

  it('debe rechazar contenido muy largo', () => {
    const longContent = 'A'.repeat(LIMITS.CONTENT_MAX + 1);
    const result = validatePromptContent(longContent);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.CONTENT_MAX} caracteres`);
  });

  it('debe manejar tipos incorrectos', () => {
    const result = validatePromptContent({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain('debe ser un texto');
  });
});

describe('validateTags', () => {
  it('debe validar arrays de tags correctos', () => {
    expect(validateTags(['tag1', 'tag2', 'tag3'])).toEqual({ valid: true });
    expect(validateTags(['Marketing', 'Ventas', 'SEO'])).toEqual({ valid: true });
    expect(validateTags(['Tag con espacios'])).toEqual({ valid: true });
    expect(validateTags([])).toEqual({ valid: true }); // Array vacío es válido
  });

  it('debe rechazar más de 10 tags', () => {
    const tooManyTags = Array(LIMITS.TAG_MAX_COUNT + 1).fill('tag');
    const result = validateTags(tooManyTags);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.TAG_MAX_COUNT} tags`);
  });

  it('debe rechazar tags muy largos', () => {
    const longTag = 'A'.repeat(LIMITS.TAG_MAX_LENGTH + 1);
    const result = validateTags([longTag]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.TAG_MAX_LENGTH} caracteres`);
  });

  it('debe rechazar tags vacíos', () => {
    const result = validateTags(['tag1', '', 'tag3']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('está vacío');
  });

  it('debe rechazar tags duplicados', () => {
    const result = validateTags(['tag1', 'TAG1', 'tag2']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('duplicados');
  });

  it('debe rechazar caracteres especiales en tags', () => {
    const result = validateTags(['tag@123']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('caracteres no válidos');
  });

  it('debe manejar tipos incorrectos', () => {
    expect(validateTags('not an array').valid).toBe(false);
    expect(validateTags(['tag1', 123, 'tag3']).valid).toBe(false);
  });
});

describe('validateSearch', () => {
  it('debe validar y sanitizar búsquedas correctas', () => {
    const result = validateSearch('búsqueda normal');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('búsqueda normal');
  });

  it('debe normalizar espacios múltiples', () => {
    const result = validateSearch('  búsqueda   con   espacios  ');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('búsqueda con espacios');
  });

  it('debe escapar caracteres HTML', () => {
    const result = validateSearch('<script>alert("xss")</script>');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('debe rechazar búsquedas vacías', () => {
    const result = validateSearch('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('no puede estar vacía');
  });

  it('debe rechazar búsquedas muy largas', () => {
    const longSearch = 'A'.repeat(LIMITS.SEARCH_MAX_LENGTH + 1);
    const result = validateSearch(longSearch);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${LIMITS.SEARCH_MAX_LENGTH} caracteres`);
  });
});

describe('validateUrl', () => {
  it('debe validar URLs correctas', () => {
    expect(validateUrl('https://example.com')).toEqual({ valid: true });
    expect(validateUrl('http://example.com/path?query=value')).toEqual({ valid: true });
    expect(validateUrl('https://sub.example.com:8080/path')).toEqual({ valid: true });
    expect(validateUrl('https://example.com/path#anchor')).toEqual({ valid: true });
  });

  it('debe rechazar URLs sin protocolo', () => {
    const result = validateUrl('example.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('http:// o https://');
  });

  it('debe rechazar URLs locales', () => {
    expect(validateUrl('http://localhost:3000').valid).toBe(false);
    expect(validateUrl('https://127.0.0.1').valid).toBe(false);
  });

  it('debe rechazar URLs inválidas', () => {
    expect(validateUrl('not a url').valid).toBe(false);
    expect(validateUrl('ftp://example.com').valid).toBe(false);
    expect(validateUrl('javascript:alert()').valid).toBe(false);
  });

  it('debe manejar tipos incorrectos y vacíos', () => {
    expect(validateUrl(null).valid).toBe(false);
    expect(validateUrl('').valid).toBe(false);
  });
});

describe('validateEmail', () => {
  it('debe validar emails correctos', () => {
    expect(validateEmail('user@example.com')).toEqual({ valid: true });
    expect(validateEmail('user.name@example.com')).toEqual({ valid: true });
    expect(validateEmail('user+tag@example.co.uk')).toEqual({ valid: true });
    expect(validateEmail('USER@EXAMPLE.COM')).toEqual({ valid: true }); // Case insensitive
  });

  it('debe rechazar emails sin @', () => {
    const result = validateEmail('userexample.com');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('formato del email no es válido');
  });

  it('debe rechazar emails con puntos consecutivos', () => {
    expect(validateEmail('user..name@example.com').valid).toBe(false);
    expect(validateEmail('user@example..com').valid).toBe(false);
  });

  it('debe rechazar emails que empiezan o terminan con punto', () => {
    expect(validateEmail('.user@example.com').valid).toBe(false);
    expect(validateEmail('user.@example.com').valid).toBe(false);
  });

  it('debe rechazar emails muy largos', () => {
    const longEmail = 'a'.repeat(250) + '@example.com';
    const result = validateEmail(longEmail);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('demasiado largo');
  });
});

describe('validateType', () => {
  describe('string validation', () => {
    it('debe validar strings correctamente', () => {
      expect(validateType('hello', 'string')).toEqual({ valid: true });
      expect(validateType('', 'string')).toEqual({ valid: true });
    });

    it('debe validar longitud de strings', () => {
      const options = { minLength: 3, maxLength: 10 };
      expect(validateType('hello', 'string', options)).toEqual({ valid: true });
      expect(validateType('hi', 'string', options).valid).toBe(false);
      expect(validateType('hello world', 'string', options).valid).toBe(false);
    });

    it('debe validar patrones', () => {
      const options = { pattern: /^[A-Z]+$/, patternError: 'Solo mayúsculas' };
      expect(validateType('HELLO', 'string', options)).toEqual({ valid: true });
      expect(validateType('Hello', 'string', options).error).toContain('Solo mayúsculas');
    });
  });

  describe('number validation', () => {
    it('debe validar números correctamente', () => {
      expect(validateType(123, 'number')).toEqual({ valid: true });
      expect(validateType(12.34, 'number')).toEqual({ valid: true });
      expect(validateType(0, 'number')).toEqual({ valid: true });
    });

    it('debe validar rangos', () => {
      const options = { min: 0, max: 100 };
      expect(validateType(50, 'number', options)).toEqual({ valid: true });
      expect(validateType(-1, 'number', options).valid).toBe(false);
      expect(validateType(101, 'number', options).valid).toBe(false);
    });

    it('debe validar enteros', () => {
      const options = { integer: true };
      expect(validateType(123, 'number', options)).toEqual({ valid: true });
      expect(validateType(12.34, 'number', options).valid).toBe(false);
    });

    it('debe rechazar NaN', () => {
      expect(validateType(NaN, 'number').valid).toBe(false);
    });
  });

  describe('array validation', () => {
    it('debe validar arrays correctamente', () => {
      expect(validateType([], 'array')).toEqual({ valid: true });
      expect(validateType([1, 2, 3], 'array')).toEqual({ valid: true });
    });

    it('debe validar cantidad de elementos', () => {
      const options = { minItems: 1, maxItems: 3 };
      expect(validateType([1, 2], 'array', options)).toEqual({ valid: true });
      expect(validateType([], 'array', options).valid).toBe(false);
      expect(validateType([1, 2, 3, 4], 'array', options).valid).toBe(false);
    });
  });

  describe('object validation', () => {
    it('debe validar objetos correctamente', () => {
      expect(validateType({}, 'object')).toEqual({ valid: true });
      expect(validateType({ a: 1 }, 'object')).toEqual({ valid: true });
    });

    it('debe rechazar null', () => {
      expect(validateType(null, 'object').valid).toBe(false);
    });

    it('debe validar propiedades requeridas', () => {
      const options = { requiredKeys: ['name', 'email'] };
      expect(validateType({ name: 'John', email: 'john@example.com' }, 'object', options)).toEqual({ valid: true });
      expect(validateType({ name: 'John' }, 'object', options).error).toContain('email');
    });
  });

  it('debe detectar tipos incorrectos', () => {
    expect(validateType('string', 'number').valid).toBe(false);
    expect(validateType(123, 'string').valid).toBe(false);
    expect(validateType({}, 'array').valid).toBe(false);
  });
});

describe('sanitizeObject', () => {
  it('debe sanitizar strings en objetos', () => {
    const obj = {
      name: 'John <script>alert()</script>',
      description: 'Test & demo'
    };
    const sanitized = sanitizeObject(obj);
    expect(sanitized.name).toBe('John &lt;script&gt;alert()&lt;/script&gt;');
    expect(sanitized.description).toBe('Test &amp; demo');
  });

  it('debe sanitizar arrays', () => {
    const arr = ['<b>Bold</b>', 'Normal', '<script>XSS</script>'];
    const sanitized = sanitizeObject(arr);
    expect(sanitized[0]).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    expect(sanitized[1]).toBe('Normal');
    expect(sanitized[2]).toBe('&lt;script&gt;XSS&lt;/script&gt;');
  });

  it('debe sanitizar objetos anidados', () => {
    const nested = {
      user: {
        name: 'John<script>',
        tags: ['<tag1>', 'tag2']
      }
    };
    const sanitized = sanitizeObject(nested);
    expect(sanitized.user.name).toBe('John&lt;script&gt;');
    expect(sanitized.user.tags[0]).toBe('&lt;tag1&gt;');
  });

  it('debe respetar límite de profundidad', () => {
    const deepObj = { a: { b: { c: { d: { e: '<script>' } } } } };
    const sanitized = sanitizeObject(deepObj, 2);
    expect(sanitized.a.b.c).toEqual({ d: { e: '<script>' } }); // Sin sanitizar después del límite
  });

  it('debe sanitizar claves del objeto', () => {
    const obj = { '<script>key': 'value' };
    const sanitized = sanitizeObject(obj);
    expect(sanitized['&lt;script&gt;key']).toBe('value');
  });

  it('debe preservar tipos no-string', () => {
    const obj = { number: 123, bool: true, null: null };
    const sanitized = sanitizeObject(obj);
    expect(sanitized.number).toBe(123);
    expect(sanitized.bool).toBe(true);
    expect(sanitized.null).toBe(null);
  });
});

describe('validateForm', () => {
  const schema = {
    name: {
      label: 'Nombre',
      required: true,
      type: 'string',
      typeOptions: { minLength: 3, maxLength: 50 }
    },
    email: {
      label: 'Email',
      required: true,
      validator: validateEmail
    },
    age: {
      label: 'Edad',
      required: false,
      type: 'number',
      typeOptions: { min: 18, max: 120, integer: true }
    },
    tags: {
      label: 'Tags',
      required: false,
      validator: validateTags
    }
  };

  it('debe validar formulario completo correcto', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 25,
      tags: ['tag1', 'tag2']
    };
    const result = validateForm(data, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('debe detectar campos requeridos faltantes', () => {
    const data = {
      age: 25
    };
    const result = validateForm(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toContain('Nombre es requerido');
    expect(result.errors.email).toContain('Email es requerido');
  });

  it('debe validar tipos de datos', () => {
    const data = {
      name: 'Jo', // Muy corto
      email: 'john@example.com',
      age: 'not a number'
    };
    const result = validateForm(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toContain('3 caracteres');
    expect(result.errors.age).toContain('esperaba number');
  });

  it('debe usar validadores personalizados', () => {
    const data = {
      name: 'John Doe',
      email: 'invalid-email',
      tags: ['tag1', 'tag1'] // Duplicados
    };
    const result = validateForm(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.email).toContain('formato del email');
    expect(result.errors.tags).toContain('duplicados');
  });

  it('debe ignorar campos opcionales vacíos', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com'
      // age y tags omitidos
    };
    const result = validateForm(data, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('debe manejar valores null y undefined', () => {
    const data = {
      name: null,
      email: undefined,
      age: null,
      tags: undefined
    };
    const result = validateForm(data, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
    expect(result.errors.age).toBeUndefined(); // Opcional
    expect(result.errors.tags).toBeUndefined(); // Opcional
  });
});