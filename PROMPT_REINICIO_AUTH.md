# 🔄 PROMPT DE REINICIO - PROBLEMA DE AUTENTICACIÓN

## CONTEXTO CRÍTICO
Estoy trabajando en Kit IA Emprendedor, una Chrome Extension que está bloqueada por un problema de autenticación con Supabase. El código actual usa el flujo web estándar que NO funciona en extensiones Chrome.

## ARCHIVOS CLAVE PARA LEER PRIMERO

### 1. Estado Actual
```bash
# Leer el informe completo de la situación
cat INFORME_SITUACION_ACTUAL.md

# Leer el PRD del sistema de autenticación
cat PRD_AUTENTICACION_CHROME_EXTENSION.md

# Ver la solución documentada
cat docs/SUPABASE_AUTH_SOLUTION.md
```

### 2. Código Principal
```bash
# El módulo actual que FALLA
cat src/shared/auth.js

# La solución propuesta
cat src/shared/chrome-auth.js

# Dónde se usa auth
cat src/sidepanel/sidepanel.js | grep -A 5 -B 5 "auth"
```

### 3. Configuración
```bash
# Manifest actual (falta permiso identity)
cat src/manifest.json

# Configuración de Supabase
cat src/shared/config.js
```

## PROBLEMA ESPECÍFICO

### Síntoma
```
[Auth] [ERROR] Auth initialization failed:
Error: Auth initialization timeout
```

### Causa
1. **NO tiene permiso `identity` en manifest.json**
2. **Usa localStorage en vez de chrome.storage**
3. **No usa chrome.identity para OAuth**
4. **CORS bloquea chrome-extension://**

### Evidencia
- Supabase responde OK (curl funciona)
- Credenciales correctas en config.js
- Falla solo en contexto de extensión

## TAREAS PENDIENTES

### 🔴 URGENTE - Bloqueadores
1. [ ] Añadir `"identity"` a permissions en manifest.json
2. [ ] Ejecutar migración: `node scripts/migrate-to-chrome-auth.js`
3. [ ] Actualizar imports de auth.js → chrome-auth.js
4. [ ] Rebuild y test con `npm run build`

### 🟡 IMPORTANTE - Post-fix
1. [ ] Probar login email/password
2. [ ] Probar OAuth con Google
3. [ ] Verificar persistencia de sesión
4. [ ] Documentar cambios

### 🟢 NICE TO HAVE
1. [ ] Auto-refresh de tokens
2. [ ] Mejor UI de loading
3. [ ] Sync entre tabs

## INFORMACIÓN ADICIONAL CON MCPs

### Con MCP de Supabase
```typescript
// Buscar en docs de Supabase:
// - "chrome extension authentication"
// - "browser extension oauth"
// - "pkce flow extensions"
// - "chrome.identity integration"
```

### Con MCP de Chrome Extensions
```typescript
// Buscar en docs de Chrome:
// - "identity API"
// - "launchWebAuthFlow"
// - "chrome.storage vs localStorage"
// - "manifest v3 authentication"
```

## DECISIONES TOMADAS

1. **NO usar parches** - Solución definitiva
2. **Crear módulo específico** - chrome-auth.js
3. **Mantener compatibilidad** - No romper auth.js
4. **Automatizar migración** - Script incluido

## COMANDOS PARA EMPEZAR

```bash
# 1. Ver el estado actual
cd /Users/carlosrodera/KIT_IA_EMPRENDEDOR/KIT_IA_EMPRENDEDOR
git status

# 2. Leer los archivos clave
cat INFORME_SITUACION_ACTUAL.md
cat src/shared/chrome-auth.js

# 3. Verificar qué falta
grep -n "identity" src/manifest.json
grep -n "chrome-auth" src/sidepanel/sidepanel.js

# 4. Si los MCPs están instalados, buscar docs
# Supabase: auth for chrome extensions
# Chrome: identity API examples
```

## RESULTADO ESPERADO

Cuando esté arreglado:
1. Login funciona sin timeout
2. Sesión persiste entre reinicios
3. OAuth abre popup correctamente
4. No hay errores de CORS
5. UI muestra estado autenticado

## NOTAS IMPORTANTES

- **NO hacer parches temporales**
- **NO bypasear autenticación**
- **NO cambiar timeouts arbitrariamente**
- **SÍ seguir arquitectura propuesta**
- **SÍ usar chrome.identity API**
- **SÍ testear exhaustivamente**

---

**Pregunta clave al reiniciar**: ¿Los MCPs de Supabase y Chrome Extensions están instalados? Si es así, buscar documentación específica sobre autenticación en extensiones antes de proceder con la implementación.