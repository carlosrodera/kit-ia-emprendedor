# 📋 Sistema de Planes LITE/PREMIUM - Implementación

## 🎯 Resumen

Se ha implementado un sistema completo de gestión de planes para Kit IA Emprendedor con tres niveles:
- **FREE**: Acceso básico con límites
- **LITE**: Plan de pago económico ($4.99/mes)
- **PREMIUM**: Plan completo ($19.99/mes)

## 🏗️ Arquitectura

### 1. Plan Manager (`src/shared/plan-manager.js`)
Módulo central que gestiona:
- Detección del plan actual del usuario
- Verificación de características disponibles
- Control de límites y accesos
- Estado mock para desarrollo

```javascript
import { planManager } from './shared/plan-manager.js';

// Verificar plan actual
const plan = planManager.getCurrentPlan();

// Verificar si tiene una característica
if (planManager.hasFeature('exportEnabled')) {
  // Permitir exportar
}

// Verificar acceso a GPT específico
if (planManager.hasUnlockedGPT(gptId)) {
  // Mostrar GPT
}
```

### 2. Componentes UI (`src/sidepanel/components/plan-ui.js`)
Componentes visuales para mostrar información del plan:

```javascript
import planUI from './sidepanel/components/plan-ui.js';

// Crear badge del plan
const badge = planUI.createPlanBadge();

// Mostrar CTA de upgrade
const cta = planUI.createUpgradeCTA('generic');

// Crear overlay para contenido bloqueado
const overlay = planUI.createLockedOverlay('gpt', 'premium');
```

### 3. Estilos (`src/sidepanel/styles/plan-ui.css`)
Estilos específicos para componentes de planes:
- Badges con gradientes distintivos
- Indicadores de uso con barras de progreso
- CTAs de upgrade animados
- Overlays para contenido bloqueado

## 🎨 Componentes Implementados

### 1. Plan Badge
Muestra el plan actual del usuario en el header:
- **FREE**: Badge gris simple
- **LITE**: Badge azul con icono de diamante
- **PREMIUM**: Badge dorado con icono de corona

### 2. Usage Indicators
Muestra el uso actual vs límites:
```javascript
createUsageIndicator('Prompts', 15, 50) // 15 de 50 usados
```

### 3. Upgrade CTAs
Call-to-actions contextuales para upgrade:
- CTA genérico
- CTA para GPT bloqueado
- CTA para límite alcanzado
- CTA para función bloqueada

### 4. Locked Overlays
Overlay visual sobre contenido bloqueado con:
- Icono de candado
- Mensaje explicativo
- Botón para desbloquear

### 5. Plan Info Panel
Panel completo con:
- Plan actual
- Estadísticas de uso
- Lista de características
- CTA de upgrade si no es Premium

## 🔧 Integración en Sidepanel

### 1. Inicialización
```javascript
// En sidepanel.js
await planManager.initialize();
displayPlanBadge();
```

### 2. Verificación de Acceso a GPTs
```javascript
function checkGPTAccess(gpt) {
  if (gpt.tier === 'basic') return true;
  if (gpt.tier === 'lite') return planManager.hasPlan('lite');
  if (gpt.tier === 'premium') return planManager.hasPlan('premium');
  return true;
}
```

### 3. Renderizado con Restricciones
```javascript
function createGPTCard(gpt) {
  const hasAccess = checkGPTAccess(gpt);
  const isLocked = !hasAccess;
  
  // Añadir clases según tier y estado
  if (gpt.tier === 'lite') card.classList.add('lite-only');
  if (gpt.tier === 'premium') card.classList.add('premium-only');
  if (isLocked) card.classList.add('locked');
  
  // Añadir overlay si está bloqueado
  if (isLocked && planUI) {
    card.innerHTML += planUI.createLockedOverlay('gpt', gpt.tier).outerHTML;
  }
}
```

### 4. Aplicación de Restricciones UI
```javascript
function applyPlanUIRestrictions() {
  // Aplicar restricciones a funciones específicas
  planUI.applyPlanRestrictions(exportBtn, 'exportEnabled');
  planUI.applyPlanRestrictions(multiSelectBtn, 'multiSelectEnabled');
  
  // Mostrar CTA de upgrade si no es Premium
  if (!planManager.isPremium()) {
    const cta = planUI.createUpgradeCTA();
    content.parentNode.insertBefore(cta, content);
  }
}
```

## 📊 Datos de GPTs con Tiers

Los GPTs ahora incluyen información de tier:

```javascript
{
  id: 'dall-e',
  name: 'DALL·E',
  description: 'Generador de imágenes con IA',
  category: 'Creative',
  url: 'https://chatgpt.com/...',
  tier: 'basic' // 'basic' | 'lite' | 'premium'
}
```

## 🧪 Testing

### Página de Test
Se incluye `test-plan-ui.html` para probar todos los componentes:
1. Cambiar entre planes (FREE/LITE/PREMIUM)
2. Ver badges actualizados
3. Verificar indicadores de uso
4. Probar CTAs de upgrade
5. Ver GPTs bloqueados/desbloqueados

### Modo Mock
Por defecto está activado para desarrollo:
```javascript
const MOCK_MODE = true;
const MOCK_USER_PLAN = 'lite'; // Cambiar para testear
```

## 🚀 Próximos Pasos

### 1. Integración con Supabase
- Conectar con tablas reales de planes
- Implementar verificación de suscripción
- Sincronizar GPTs desbloqueados

### 2. Página de Upgrade
- Crear landing para planes
- Integrar con Stripe
- Implementar flujo de compra

### 3. Gestión de Límites
- Implementar contadores reales
- Bloquear al alcanzar límites
- Notificaciones de uso

### 4. Analytics
- Tracking de conversiones
- Métricas de uso por plan
- A/B testing de CTAs

## 📝 Notas Importantes

1. **Mock Mode**: Actualmente usa datos simulados. Cambiar `MOCK_MODE = false` cuando Supabase esté listo.

2. **Tiers de GPTs**: 
   - `basic`: Disponible para todos
   - `lite`: Requiere plan Lite o compra individual
   - `premium`: Solo para plan Premium

3. **Características por Plan**:
   - Ver `PLANS` en `plan-manager.js` para lista completa
   - Límites configurables por característica

4. **UI Responsiva**: Todos los componentes funcionan en móvil y desktop

## 🎯 Beneficios

1. **Para Usuarios Free**:
   - Ven lo que se pierden
   - CTAs contextuales
   - Fácil upgrade

2. **Para Usuarios Lite**:
   - Badge distintivo
   - Acceso a GPTs Lite
   - Incentivo a Premium

3. **Para Usuarios Premium**:
   - Badge exclusivo
   - Acceso total
   - Sin límites

4. **Para el Negocio**:
   - Monetización clara
   - Upselling contextual
   - Métricas de conversión