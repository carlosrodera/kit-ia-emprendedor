# 🎯 Decisión #005: Integración con Supabase

## 📅 Fecha: 25 de Enero 2025

## 🤔 Contexto
El usuario solicitó preparar la extensión para conectarse a Supabase y proporcionó un proyecto específico para usar.

## 🎯 Decisión
Integrar Supabase como backend para la extensión Kit IA Emprendedor.

## 🔍 Opciones Consideradas

### Opción 1: Firebase
- ✅ Popular y bien documentado
- ✅ SDK robusto
- ❌ Más complejo para empezar
- ❌ Vendor lock-in de Google

### Opción 2: Custom Backend
- ✅ Control total
- ✅ Sin dependencias externas
- ❌ Más tiempo de desarrollo
- ❌ Mantener infraestructura

### Opción 3: Supabase ✅ ELEGIDA
- ✅ Open source
- ✅ PostgreSQL (potente y estándar)
- ✅ RLS integrado
- ✅ Realtime incluido
- ✅ Auth incluido
- ✅ Storage incluido
- ✅ Generoso tier gratuito

## 💡 Implementación

### 1. Configuración del Cliente
```javascript
// dist/config/supabase.js
const SUPABASE_CONFIG = {
  url: 'https://nktqqsbebhoedgookfzu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

### 2. Estructura de Base de Datos
```sql
-- 6 tablas principales
CREATE TABLE users (...)
CREATE TABLE official_gpts (...)
CREATE TABLE user_favorites (...)
CREATE TABLE user_prompts (...)
CREATE TABLE user_settings (...)
CREATE TABLE notifications (...)
```

### 3. Row Level Security
```sql
-- Ejemplo para user_favorites
CREATE POLICY "Users can CRUD own favorites"
ON user_favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 4. Integración en Extension
```javascript
// sidebar-v0.5.0.js
async function initializeSupabase() {
  if (window.SUPABASE_CONFIG && window.supabase) {
    window.supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey
    );
  }
}
```

## 📊 Impacto

### Positivo
- ✅ Backend completo sin desarrollo adicional
- ✅ Escalable desde día 1
- ✅ Auth integrado para futuro
- ✅ Realtime para notificaciones
- ✅ PostgreSQL para queries complejas

### Consideraciones
- ⚠️ Dependencia de servicio externo
- ⚠️ Requiere conexión a internet
- ⚠️ Límites en tier gratuito (500MB DB, 1GB storage)

## 🔮 Futuro

### Fase 1 (Actual)
- ✅ Cliente configurado
- ✅ Tablas creadas
- ✅ RLS implementado
- ⏳ Auth pendiente

### Fase 2
- [ ] Login/registro usuarios
- [ ] Sincronización datos locales
- [ ] Notificaciones realtime

### Fase 3
- [ ] Panel admin
- [ ] Analytics
- [ ] Compartir prompts entre usuarios

## 📝 Notas

1. **Proyecto ID**: `nktqqsbebhoedgookfzu`
2. **Región**: No especificada (probablemente US)
3. **Plan**: Free tier
4. **Datos iniciales**: 5 GPTs oficiales insertados

## ✅ Resultado

La integración fue exitosa. El cliente está configurado y la base de datos está lista para usar. La arquitectura permite crecer sin cambios mayores.

---

**Decisión tomada por**: Claude AI + Carlos Rodera  
**Estado**: ✅ Implementada  
**Reversible**: Sí (datos en local storage como fallback)