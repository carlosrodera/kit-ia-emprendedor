# 📋 PRINCIPIOS DE DESARROLLO - Kit IA Emprendedor

## 🎯 FILOSOFÍA CENTRAL
"Construir software profesional que escale, no parches que se acumulen"

## 🏗️ PRINCIPIOS FUNDAMENTALES

### 1. 📁 UN ARCHIVO, UN PROPÓSITO
- **NUNCA** duplicar archivos (sidebar.js, sidebar-v2.js, sidebar-fixed.js ❌)
- **SIEMPRE** un solo archivo por componente
- **ELIMINAR** código muerto inmediatamente
- **VERSIONADO** a través de Git, no sufijos en nombres

### 2. 🌳 GIT FLOW ESTRICTO
```
main (producción)
  └── develop (integración)
       ├── feature/nueva-funcionalidad
       ├── bugfix/arreglo-bug
       ├── hotfix/parche-urgente
       └── release/v1.0.0
```

**Reglas Git:**
- **NUNCA** commit directo a main
- **SIEMPRE** Pull Request con review
- **COMMITS** atómicos y descriptivos
- **TAGS** para cada release

### 3. 📝 DOCUMENTACIÓN CONTINUA
- **README.md** actualizado con cada cambio
- **CHANGELOG.md** con cada release
- **ARCHITECTURE.md** para decisiones técnicas
- **Comentarios** solo cuando añaden valor
- **JSDoc** para todas las funciones públicas

### 4. 🧪 TESTING OBLIGATORIO
```javascript
// No merge sin tests
- Unit tests: >80% cobertura
- Integration tests: flujos críticos
- E2E tests: user journeys principales
- Performance tests: métricas clave
```

### 5. 🤖 CI/CD AUTOMATIZADO
- **Linting** en cada commit
- **Tests** en cada PR
- **Build** automatizado
- **Deploy** con un click
- **Rollback** inmediato si falla

### 6. 🔐 SEGURIDAD PRIMERO
- **CSP** estricto siempre
- **Validación** en cliente Y servidor
- **Sanitización** de todo input
- **HTTPS** obligatorio
- **Tokens** con expiración
- **Rate limiting** en APIs

### 7. 🎨 CÓDIGO LIMPIO
```javascript
// MAL ❌
function d(x) {
  return x * 0.21 + x;
}

// BIEN ✅
function calculatePriceWithTax(basePrice) {
  const TAX_RATE = 0.21;
  return basePrice * TAX_RATE + basePrice;
}
```

### 8. 🚀 PERFORMANCE OBSESIVA
- **Bundle size** <100KB objetivo
- **Load time** <100ms
- **Lazy loading** cuando sea posible
- **Debounce** en eventos frecuentes
- **Memoización** para cálculos costosos

### 9. 🔄 ITERACIÓN RÁPIDA
- **MVP** primero, perfección después
- **Ship** pequeño y frecuente
- **Feedback** continuo del usuario
- **Métricas** para decisiones
- **Pivote** rápido si no funciona

### 10. 💼 ORIENTACIÓN A NEGOCIO
- **Monetización** desde día 1
- **Analytics** para entender uso
- **A/B testing** para optimizar
- **Soporte** integrado
- **Escalabilidad** planificada

## 🚫 ANTI-PATRONES A EVITAR

### ❌ NUNCA HACER
1. **Parches sobre parches** - Refactorizar en su lugar
2. **Código comentado** - Eliminar, Git lo guarda
3. **console.log en producción** - Usar logger apropiado
4. **Hardcodear valores** - Usar constantes/config
5. **Ignorar warnings** - Resolverlos inmediatamente
6. **"Funciona en mi máquina"** - Probar en CI/CD
7. **Copiar/pegar sin entender** - Comprender el código
8. **Optimización prematura** - Medir primero
9. **Reinventar la rueda** - Usar librerías probadas
10. **"Lo arreglo después"** - Arreglarlo ahora

## 📊 MÉTRICAS DE CALIDAD

### Código
- **Complejidad ciclomática** <10
- **Funciones** <50 líneas
- **Archivos** <300 líneas
- **Dependencias** mínimas necesarias

### Performance
- **First Contentful Paint** <1s
- **Time to Interactive** <2s
- **Bundle size** <100KB
- **Memory leaks** 0

### Proceso
- **PR review time** <24h
- **Bug fix time** <48h
- **Deploy frequency** >1/semana
- **Rollback time** <5min

## 🎯 CHECKLIST PRE-COMMIT

- [ ] ¿El código es autodocumentado?
- [ ] ¿Agregué tests?
- [ ] ¿Actualicé la documentación?
- [ ] ¿Eliminé código muerto?
- [ ] ¿Validé inputs?
- [ ] ¿Manejé errores?
- [ ] ¿Es performante?
- [ ] ¿Es seguro?
- [ ] ¿Sigue los principios?

## 🏁 DEFINICIÓN DE "HECHO"

Una feature está COMPLETA cuando:
1. **Código** escrito y revisado
2. **Tests** escritos y pasando
3. **Documentación** actualizada
4. **PR** aprobado
5. **CI/CD** verde
6. **Desplegado** en producción
7. **Monitoreado** sin errores
8. **Usuario** puede usarlo

---

> "El mejor código es el que no escribes. El segundo mejor es el que eliminas."

**Estos principios son LEY. Seguirlos es no negociable.**

Última actualización: 26 de Enero 2025