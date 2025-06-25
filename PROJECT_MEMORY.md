# 🧠 MEMORIA DEL PROYECTO - KIT IA EMPRENDEDOR

## 📅 INFORMACIÓN GENERAL

- **Proyecto**: Kit IA Emprendedor Chrome Extension
- **Inicio**: 21 de Enero 2025
- **Estado**: En planificación
- **Versión**: 0.1.0
- **Owner**: Carlos Rodera

## 🎯 CONTEXTO Y OBJETIVO

### Problema
Los usuarios del Kit IA Emprendedor necesitan una forma rápida y eficiente de acceder a los GPTs oficiales sin tener que entrar a Notion constantemente.

### Solución
Extensión Chrome lite que:
- Muestra GPTs oficiales desde Supabase
- Permite guardar prompts localmente
- Sistema de favoritos
- Notificaciones del sistema
- Sin almacenamiento de datos del usuario en la nube

### Diferencias con Kit IA Pro
- **Kit IA Pro**: Versión completa, permite guardar GPTs del usuario
- **Kit IA Emprendedor**: Versión lite, solo GPTs oficiales

## 🏗️ DECISIONES ARQUITECTÓNICAS

### 1. Vanilla JavaScript vs Framework
**Decisión**: Vanilla JavaScript
**Razón**: Mantener bundle <50KB, mejor performance, menos dependencias
**Trade-off**: Más código boilerplate pero control total

### 2. Almacenamiento Local Only
**Decisión**: Chrome Storage API para datos del usuario
**Razón**: Privacidad, simplicidad, sin costos de servidor
**Trade-off**: Datos no sincronizados entre dispositivos

### 3. Supabase para Auth y GPTs
**Decisión**: Usar infraestructura existente
**Razón**: Ya configurado, auth robusto, RLS activo
**Trade-off**: Dependencia externa

### 4. Manifest V3
**Decisión**: Cumplir con estándares modernos
**Razón**: Requerido por Chrome, mejor seguridad
**Trade-off**: Algunas limitaciones vs V2

## 📊 ESTADO ACTUAL

### Completado ✅
- [x] Análisis de requerimientos
- [x] Revisión de código legacy
- [x] Arquitectura definida
- [x] Checklist de desarrollo creado
- [x] Estructura de proyecto documentada
- [x] URLs de GPTs oficiales corregidas (25/06/2025)
  - Scholar GPT: g-kZ0eYXlJe-scholar-gpt
  - Creative Writing: g-DWjSCKn8z-creative-writing-coach

### En Progreso 🔄
- [ ] Setup inicial del proyecto
- [ ] Configuración de herramientas
- [ ] Resolver error de build con Vite

### Pendiente ⏳
- [ ] Implementación
- [ ] Testing
- [ ] Deployment

## 🔍 INFORMACIÓN DE SUPABASE

### Estructura de Datos Encontrada
- **GPTs**: Tabla completa con categorías, metadata, favoritos
- **Categorías**: 8 categorías predefinidas con colores
- **Notificaciones**: Sistema completo con tipos y acciones
- **Auth**: Integrado con planes de suscripción

### Proyecto Supabase
- **ID**: nktqqsbebhoedgookfzu (proyecto EVO)
- **Auth**: Configurado y funcionando
- **RLS**: Activo en todas las tablas

## 💡 LECCIONES APRENDIDAS DEL CÓDIGO LEGACY

### Problemas Identificados
1. **Complejidad excesiva**: 320+ archivos para funcionalidad básica
2. **Acoplamiento alto**: Dependencias circulares
3. **Sin tests**: 0% coverage
4. **Vulnerabilidades**: XSS, CSRF, privilege escalation

### Mejoras a Implementar
1. **Arquitectura simple**: <50 archivos totales
2. **Módulos independientes**: Sin dependencias circulares
3. **Test-first**: 80%+ coverage objetivo
4. **Seguridad by design**: Validación en todos los puntos

## 📝 NOTAS TÉCNICAS

### Chrome APIs a Usar
- `chrome.storage.local`: Almacenamiento de datos
- `chrome.runtime`: Mensajería
- `chrome.tabs`: Gestión de pestañas
- `chrome.action`: Popup control

### Librerías Externas Mínimas
- DOMPurify: Sanitización HTML
- Supabase JS Client: Auth y data
- Vite: Build tool (dev dependency)

### Performance Targets
- Bundle size: <50KB
- First paint: <100ms
- Interactive: <300ms
- Full load: <1s

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Crear repositorio GitHub**
   - Nombre: `kit-ia-emprendedor-extension`
   - Privado inicialmente
   - Branch protection en main

2. **Setup del proyecto**
   - npm init
   - Instalar dependencias
   - Configurar build tools

3. **Implementar base**
   - Manifest.json
   - Service worker básico
   - Estructura de carpetas

## 🔗 REFERENCIAS

### Documentación
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Supabase Docs](https://supabase.com/docs)
- [Web Security Guidelines](https://owasp.org/)

### Código de Referencia
- Auth system: `/OLD_OUTDATED_KIT_IAPRO/content/modules/auth/`
- Notifications: `/OLD_OUTDATED_KIT_IAPRO/content/modules/ui/notifications/`

## 📋 TAREAS PARA PRÓXIMA SESIÓN

1. Revisar este documento
2. Crear repositorio en GitHub
3. Comenzar implementación según checklist
4. Actualizar esta memoria con progreso

---

**Última actualización**: 21/01/2025 - Sesión de planificación inicial
**Próxima revisión**: Al completar Fase 0 del checklist