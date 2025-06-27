# 🚀 PLAN DE DESARROLLO - KIT IA EMPRENDEDOR

## 📅 Fecha: 27 de Enero 2025
## 🎯 Objetivo: Resolver problemas críticos y agregar funcionalidades

## 🔥 FASE 1: PROBLEMAS CRÍTICOS (Hoy)

### 1.1 Arreglar Error de Autenticación
**Problema**: La variable de entorno no se está inyectando en el build
**Solución**:
- [ ] Modificar vite.config.js para leer correctamente .env
- [ ] Implementar modo desarrollo temporal sin auth
- [ ] Permitir acceso sin bloqueo mientras desarrollamos

### 1.2 Arreglar Bug Visual de Favoritos
**Problema**: La estrella no se desmarca visualmente
**Análisis**: El problema está en que se actualiza solo el botón clickeado, no todos
**Solución**:
- [ ] Debuggear el flujo de actualización de favoritos
- [ ] Asegurar que updateAllFavoriteButtons funcione
- [ ] Verificar que los IDs coincidan correctamente

## 🎨 FASE 2: NUEVAS FUNCIONALIDADES

### 2.1 Favoritos en Prompts
- [ ] Agregar estrella a cada prompt card
- [ ] Modificar schema de prompts para incluir is_favorite
- [ ] Implementar toggle de favoritos
- [ ] Filtrar por favoritos en tab de prompts

### 2.2 Selección Múltiple de Prompts
- [ ] Agregar checkbox a cada prompt
- [ ] Barra de acciones para selección múltiple
- [ ] Copiar múltiples prompts al portapapeles
- [ ] Seleccionar/Deseleccionar todos

### 2.3 Exportar Prompts a TXT
- [ ] Función para generar archivo TXT
- [ ] Formato: nombre + contenido + tags
- [ ] Descargar automáticamente
- [ ] Opción de exportar todos o seleccionados

## 🛡️ FASE 3: SEGURIDAD Y CALIDAD

### 3.1 Migrar a DOMPurify
- [ ] Instalar DOMPurify
- [ ] Reemplazar todos los innerHTML
- [ ] Mantener funcionalidad idéntica
- [ ] Verificar XSS protection

### 3.2 Implementar Tests
- [ ] Tests unitarios para favoritos
- [ ] Tests de integración para auth
- [ ] Tests E2E con Playwright
- [ ] Coverage > 80%

## 📚 FASE 4: DOCUMENTACIÓN

### 4.1 Documentación de Usuario
- [ ] README.md con instalación
- [ ] Guía de uso con screenshots
- [ ] FAQ
- [ ] Troubleshooting

### 4.2 Documentación Técnica
- [ ] Arquitectura completa
- [ ] Flujo de datos
- [ ] API Reference
- [ ] Guía de contribución

## 🚀 FASE 5: CI/CD

### 5.1 GitHub Actions
- [ ] Build automático en PR
- [ ] Tests automáticos
- [ ] Linting y formatting
- [ ] Release automation

## 📊 ESTIMACIÓN DE TIEMPO

| Fase | Tiempo Estimado | Prioridad |
|------|----------------|-----------|
| FASE 1 | 2-3 horas | 🔴 CRÍTICA |
| FASE 2 | 4-5 horas | 🟡 ALTA |
| FASE 3 | 3-4 horas | 🟡 ALTA |
| FASE 4 | 2-3 horas | 🟢 MEDIA |
| FASE 5 | 1-2 horas | 🟢 MEDIA |

## 🎯 ORDEN DE EJECUCIÓN

1. **AHORA**: Arreglar auth para desbloquear desarrollo
2. **SIGUIENTE**: Fix visual favoritos
3. **DESPUÉS**: Nuevas funcionalidades de prompts
4. **FINAL**: Seguridad, tests y docs

---

**Última actualización**: 27/01/2025 - 10:00