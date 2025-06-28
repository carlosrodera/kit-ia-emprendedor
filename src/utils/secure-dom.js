/**
 * Utilidad central para manipulación segura del DOM
 * NUNCA usar innerHTML directamente - SIEMPRE usar estas funciones
 * 
 * @module SecureDOM
 * @since 2025-01-28
 * @version 2.0.0
 */

import DOMPurify from 'dompurify';

/**
 * Configuración por defecto para DOMPurify
 */
const DEFAULT_PURIFY_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'div', 'p', 'a', 'br'],
  ALLOWED_ATTR: ['class', 'href', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
};

/**
 * Clase para manipulación segura del DOM
 * @class
 */
export class SecureDOM {
  /**
   * Establece HTML de forma segura en un elemento
   * @param {HTMLElement} element - Elemento DOM
   * @param {string} html - HTML a insertar
   * @param {Object} options - Opciones de sanitización
   * @returns {void}
   * @throws {Error} Si element no es un HTMLElement válido
   */
  static setHTML(element, html, options = {}) {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Element must be a valid HTMLElement');
    }

    if (typeof html !== 'string') {
      throw new Error('HTML content must be a string');
    }

    const config = { ...DEFAULT_PURIFY_CONFIG, ...options };
    const clean = DOMPurify.sanitize(html, config);
    
    // Usar innerHTML solo después de sanitizar
    element.innerHTML = clean;
  }

  /**
   * Establece texto de forma segura (sin interpretar HTML)
   * @param {HTMLElement} element - Elemento DOM
   * @param {string} text - Texto a insertar
   * @returns {void}
   */
  static setText(element, text) {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Element must be a valid HTMLElement');
    }
    
    element.textContent = String(text);
  }

  /**
   * Crea un elemento DOM de forma segura
   * @param {string} tag - Nombre del tag
   * @param {Object} attrs - Atributos del elemento
   * @param {Array} children - Elementos hijos
   * @returns {HTMLElement}
   */
  static createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);
    
    // Establecer atributos de forma segura
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = String(value);
      } else if (key === 'textContent') {
        element.textContent = String(value);
      } else if (key === 'innerHTML') {
        // Si necesitan innerHTML, forzar uso de setHTML
        throw new Error('Use SecureDOM.setHTML() instead of innerHTML attribute');
      } else if (key.startsWith('on')) {
        // Prevenir event handlers inline
        throw new Error(`Inline event handlers not allowed: ${key}`);
      } else {
        element.setAttribute(key, String(value));
      }
    });
    
    // Añadir hijos
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      } else {
        throw new Error('Child must be string or HTMLElement');
      }
    });
    
    return element;
  }

  /**
   * Crea múltiples elementos de forma segura
   * @param {string} tag - Nombre del tag
   * @param {Array} items - Array de configuraciones
   * @returns {Array<HTMLElement>}
   */
  static createElements(tag, items) {
    return items.map(item => {
      if (typeof item === 'string') {
        return this.createElement(tag, { textContent: item });
      } else if (typeof item === 'object') {
        const { children, ...attrs } = item;
        return this.createElement(tag, attrs, children || []);
      }
      throw new Error('Invalid item configuration');
    });
  }

  /**
   * Inserta HTML de forma segura usando templates
   * @param {HTMLElement} element - Elemento contenedor
   * @param {string} template - Template string
   * @param {Object} data - Datos para el template
   * @returns {void}
   */
  static setTemplate(element, template, data = {}) {
    // Escapar datos antes de insertar en template
    const escaped = {};
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        escaped[key] = this.escapeHtml(value);
      } else {
        escaped[key] = value;
      }
    });
    
    // Reemplazar placeholders
    let html = template;
    Object.entries(escaped).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
    });
    
    // Insertar de forma segura
    this.setHTML(element, html);
  }

  /**
   * Escapa caracteres HTML peligrosos
   * @param {string} text - Texto a escapar
   * @returns {string}
   */
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Limpia todos los hijos de un elemento
   * @param {HTMLElement} element - Elemento a limpiar
   * @returns {void}
   */
  static clear(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Element must be a valid HTMLElement');
    }
    
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Añade HTML de forma segura al final del elemento
   * @param {HTMLElement} element - Elemento contenedor
   * @param {string} html - HTML a añadir
   * @param {Object} options - Opciones de sanitización
   * @returns {void}
   */
  static appendHTML(element, html, options = {}) {
    const temp = document.createElement('div');
    this.setHTML(temp, html, options);
    
    while (temp.firstChild) {
      element.appendChild(temp.firstChild);
    }
  }

  /**
   * Reemplaza un elemento con HTML seguro
   * @param {HTMLElement} oldElement - Elemento a reemplazar
   * @param {string} html - HTML nuevo
   * @param {Object} options - Opciones de sanitización
   * @returns {void}
   */
  static replaceWithHTML(oldElement, html, options = {}) {
    const temp = document.createElement('div');
    this.setHTML(temp, html, options);
    
    if (temp.childNodes.length === 1) {
      oldElement.replaceWith(temp.firstChild);
    } else {
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
      oldElement.replaceWith(fragment);
    }
  }

  /**
   * Verifica si un HTML es seguro sin insertarlo
   * @param {string} html - HTML a verificar
   * @param {Object} options - Opciones de verificación
   * @returns {boolean}
   */
  static isSafeHTML(html, options = {}) {
    const config = { ...DEFAULT_PURIFY_CONFIG, ...options };
    const clean = DOMPurify.sanitize(html, config);
    return clean === html;
  }

  /**
   * Obtiene el HTML sanitizado sin insertarlo
   * @param {string} html - HTML a sanitizar
   * @param {Object} options - Opciones de sanitización
   * @returns {string}
   */
  static getSafeHTML(html, options = {}) {
    const config = { ...DEFAULT_PURIFY_CONFIG, ...options };
    return DOMPurify.sanitize(html, config);
  }
}

/**
 * Funciones helper para uso rápido
 */
export const setHTML = SecureDOM.setHTML.bind(SecureDOM);
export const setText = SecureDOM.setText.bind(SecureDOM);
export const createElement = SecureDOM.createElement.bind(SecureDOM);
export const createElements = SecureDOM.createElements.bind(SecureDOM);
export const setTemplate = SecureDOM.setTemplate.bind(SecureDOM);
export const escapeHtml = SecureDOM.escapeHtml.bind(SecureDOM);
export const clear = SecureDOM.clear.bind(SecureDOM);
export const appendHTML = SecureDOM.appendHTML.bind(SecureDOM);
export const replaceWithHTML = SecureDOM.replaceWithHTML.bind(SecureDOM);
export const isSafeHTML = SecureDOM.isSafeHTML.bind(SecureDOM);
export const getSafeHTML = SecureDOM.getSafeHTML.bind(SecureDOM);

// Exportar por defecto la clase
export default SecureDOM;