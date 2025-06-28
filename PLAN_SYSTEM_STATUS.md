# 📊 ESTADO ACTUAL DEL SISTEMA DE PLANES

**Fecha**: 28 de Junio 2025  
**Estado**: Sistema base implementado, falta integración de pagos

## 🏗️ LO QUE YA ESTÁ IMPLEMENTADO

### 1. **Estructura de 3 Planes** ✅
- **FREE**: 5 prompts, 3 favoritos, GPTs básicos
- **LITE** ($4.99): 50 prompts, 20 favoritos, GPTs desbloqueables individualmente
- **PREMIUM** ($19.99): Todo ilimitado, todos los GPTs

### 2. **Plan Manager** ✅
- `src/shared/plan-manager.js`
- Gestiona detección de planes
- Control de acceso a features
- Verificación de GPTs desbloqueados
- **PERO**: En modo MOCK (no conectado a base de datos real)

### 3. **UI Components** ✅
- `src/sidepanel/components/plan-ui.js`
- Badges de plan (FREE/LITE/PREMIUM)
- Indicadores de uso
- CTAs de upgrade
- Overlays de contenido bloqueado

### 4. **Base de Datos** ✅
- `src/database/migrations/001_add_plans_system.sql`
- Tablas completas para:
  - `users_profile`: Info del plan del usuario
  - `gpts_lite`: GPTs comprables individualmente
  - `gpts_premium`: GPTs exclusivos premium
  - `user_purchases`: Historial de compras
  - `user_unlocked_gpts`: GPTs desbloqueados por usuario
- Campos para Stripe (`stripe_customer_id`, `stripe_subscription_id`)

### 5. **Integración Visual** ✅
- Badge del plan en el header del sidepanel
- Verificación de acceso a GPTs por tier
- Overlays visuales para contenido restringido

## ❌ LO QUE FALTA

### 1. **Integración de Pagos**
- NO hay código de Stripe
- NO hay código de ThriveCart
- NO hay webhooks de pago
- NO hay flujo de checkout

### 2. **Conexión Real con Supabase**
- Plan Manager en MOCK MODE
- No lee datos reales de la base de datos
- No actualiza planes en la DB

### 3. **Flujo de Pago Único**
Como mencionas que es un pago único por ThriveCart:
- Necesitamos webhook endpoint para recibir notificación de pago
- Actualizar `users_profile` cuando se complete el pago
- Cambiar de plan FREE → LITE o PREMIUM

## 🎯 PROPUESTA DE IMPLEMENTACIÓN

### Opción 1: ThriveCart Webhook Simple
```javascript
// Nuevo archivo: src/api/thrivecart-webhook.js
export async function handleThriveCartWebhook(payload) {
  // 1. Verificar firma del webhook
  // 2. Extraer email del comprador
  // 3. Determinar plan comprado (lite o premium)
  // 4. Actualizar users_profile en Supabase
  // 5. Enviar email de confirmación
}
```

### Opción 2: Verificación Manual con Token
```javascript
// En plan-manager.js
async verifyPurchaseToken(token) {
  // 1. Verificar token contra base de datos
  // 2. Si válido, actualizar plan del usuario
  // 3. Marcar token como usado
}
```

### Pasos Inmediatos:
1. **Cambiar MOCK_MODE a false** en plan-manager.js
2. **Conectar con datos reales** de Supabase
3. **Crear endpoint webhook** para ThriveCart
4. **Implementar verificación** de compra

## 📝 PREGUNTAS CLAVE

1. **¿ThriveCart envía webhooks?** Si sí, necesitamos el formato
2. **¿Cómo identificamos al usuario?** ¿Por email?
3. **¿Un solo pago desbloquea LITE o PREMIUM?** ¿O son productos separados?
4. **¿Necesitamos manejar reembolsos?**

---

**Conclusión**: La base está sólida. Solo falta conectar el sistema de pagos y cambiar de mock a producción.