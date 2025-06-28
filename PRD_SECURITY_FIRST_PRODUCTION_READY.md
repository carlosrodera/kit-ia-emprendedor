# 🔐 PRD: SECURITY-FIRST PRODUCTION-READY PLAN
## Kit IA Emprendedor - Séptima Iteración - NO MÁS ERRORES

---

## 🚨 PROBLEMA RAÍZ IDENTIFICADO

Después de 7 intentos fallidos, el patrón es claro:
1. **Se empieza bien** → "Security first", "No parches", "Código profesional"
2. **Presión por features** → Se añaden funcionalidades rápidamente
3. **Atajos técnicos** → innerHTML directo, console.logs, TODOs
4. **Deuda técnica** → Parches sobre parches
5. **Proyecto inviable** → Hay que empezar de nuevo

## ⛔ NUNCA MÁS - REGLAS ABSOLUTAS

### 🔴 PROHIBIDO BAJO CUALQUIER CIRCUNSTANCIA:
```javascript
// ❌ NUNCA
element.innerHTML = userContent;
element.innerHTML = `<div>${data}</div>`;
console.log('debug info');
// TODO: fix later
// FIXME: temporary solution
const API_KEY = 'hardcoded-key';
"host_permissions": ["*://*/*"]

// ✅ SIEMPRE
element.textContent = userContent;
setSecureHTML(element, sanitizedContent);
logger.debug('info'); // Sistema de logs configurable
// Implementar ahora o no implementar
const API_KEY = process.env.API_KEY;
"host_permissions": ["https://*.supabase.co/*"]
```

---

## 📋 PLAN DE ACCIÓN DEFINITIVO

### FASE 1: LIMPIEZA TOTAL (2 días)
**Objetivo**: Eliminar TODA la deuda técnica actual

#### Día 1: Seguridad
- [ ] Crear utilidad `secureDOM.js` con funciones seguras
- [ ] Reemplazar TODOS los innerHTML (17 en sidepanel, más en otros)
- [ ] Implementar CSP estricto y verificar
- [ ] Restringir permisos a mínimos necesarios
- [ ] Mover TODAS las configuraciones a .env

#### Día 2: Calidad
- [ ] Sistema de logging configurable (reemplazar console.log)
- [ ] Eliminar TODO/FIXME - implementar o eliminar
- [ ] Eliminar código muerto y archivos mock
- [ ] Documentar cada función pública
- [ ] Tests de seguridad automatizados

### FASE 2: ARQUITECTURA SÓLIDA (3 días)

#### Día 3: Auth Real
- [ ] Investigar chrome.identity.getAuthToken()
- [ ] Implementar auth sin workarounds
- [ ] Sistema de retry robusto
- [ ] Fallback graceful si falla

#### Día 4: Storage Seguro
- [ ] Encriptación para datos sensibles
- [ ] Validación en cada read/write
- [ ] Límites y quotas respetados
- [ ] Migración de datos automática

#### Día 5: Integraciones
- [ ] Supabase: Solo llamadas necesarias
- [ ] GPTs: Cargar desde DB real
- [ ] Stripe: Preparar webhooks seguros
- [ ] Error boundaries en toda la app

### FASE 3: FEATURES SEGURAS (2 días)

#### Día 6: UI Profesional
- [ ] Componentes sin innerHTML
- [ ] Validación en tiempo real
- [ ] Feedback claro al usuario
- [ ] Estados de carga/error

#### Día 7: Testing Final
- [ ] Auditoría de seguridad completa
- [ ] Performance testing
- [ ] Chrome Web Store compliance
- [ ] User acceptance testing

---

## 🛡️ HERRAMIENTAS DE SEGURIDAD A IMPLEMENTAR

### 1. SecureDOM.js
```javascript
// Utilidad central para manipulación segura del DOM
export const SecureDOM = {
  setHTML(element, html, options = {}) {
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: options.tags || ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: options.attrs || ['href', 'class'],
    });
    element.innerHTML = clean;
  },
  
  setText(element, text) {
    element.textContent = text;
  },
  
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') el.className = value;
      else if (key === 'textContent') el.textContent = value;
      else el.setAttribute(key, value);
    });
    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    });
    return el;
  }
};
```

### 2. ConfigManager.js
```javascript
// Gestión segura de configuración
export class ConfigManager {
  static get(key) {
    const value = import.meta.env[key];
    if (!value && this.REQUIRED_KEYS.includes(key)) {
      throw new Error(`Missing required config: ${key}`);
    }
    return value;
  }
  
  static validate() {
    const missing = this.REQUIRED_KEYS.filter(key => !import.meta.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing configs: ${missing.join(', ')}`);
    }
  }
}
```

### 3. Logger.js
```javascript
// Sistema de logs configurable
export class Logger {
  static debug(...args) {
    if (import.meta.env.DEV) console.log(...args);
  }
  
  static error(message, error) {
    if (import.meta.env.DEV) console.error(message, error);
    // En producción, enviar a servicio de monitoreo
  }
}
```

---

## ✅ CHECKLIST DE PRODUCCIÓN

### Seguridad
- [ ] 0 innerHTML directos
- [ ] 0 API keys hardcodeadas
- [ ] CSP implementado y testeado
- [ ] Permisos mínimos necesarios
- [ ] Validación en TODOS los inputs
- [ ] Sanitización en TODAS las salidas
- [ ] Storage encriptado
- [ ] HTTPS only

### Calidad de Código
- [ ] 0 console.log
- [ ] 0 TODO/FIXME
- [ ] 0 código comentado
- [ ] 0 funciones > 50 líneas
- [ ] 100% funciones documentadas
- [ ] Tests para funciones críticas
- [ ] Linter sin warnings
- [ ] Bundle < 50KB

### Integraciones
- [ ] Supabase funcionando sin workarounds
- [ ] Stripe sandbox testeado
- [ ] GPTs cargando desde DB real
- [ ] Auth flow completo
- [ ] Error handling robusto

### UX/UI
- [ ] Tiempo de carga < 2s
- [ ] Feedback inmediato en acciones
- [ ] Estados de error claros
- [ ] Accesibilidad básica
- [ ] Responsive en diferentes tamaños

### Compliance
- [ ] Chrome Web Store policies
- [ ] GDPR compliance
- [ ] Privacy policy actualizada
- [ ] Terms of service
- [ ] Licencias de dependencias OK

---

## 🚀 CRITERIOS DE ÉXITO

1. **Pasar auditoría de seguridad** sin vulnerabilidades críticas
2. **Chrome Web Store** aprobación en primer intento
3. **0 errores** en consola en uso normal
4. **Performance** score > 90 en Lighthouse
5. **Usuario puede** completar flujo completo sin bugs

---

## 📅 TIMELINE

- **Días 1-2**: Limpieza y seguridad (BLOQUEANTE)
- **Días 3-5**: Arquitectura sólida
- **Días 6-7**: Features y testing
- **Día 8**: Deployment a producción

**TOTAL**: 8 días para versión production-ready

---

## 🎯 MANTRA DEL PROYECTO

> "Si no es seguro, no se hace.
> Si es un parche, no se hace.
> Si tiene TODO, se hace ahora o no se hace."

---

**Firmado**: Carlos Rodera
**Fecha**: 28 de Junio 2025
**Versión**: DEFINITIVA - NO MÁS CAMBIOS