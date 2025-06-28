# Configuración de Supabase para Chrome Extension - Kit IA Emprendedor

## 🎯 Problema Actual
Los emails de verificación redirigen a `http://localhost:3000/?code=...` lo cual no funciona en una Chrome Extension. Necesitamos configurar las URLs de redirect correctas para que la autenticación funcione.

## 🔧 Configuración Requerida en Supabase

### 1. Site URLs (Obligatorio)
En el panel de Supabase > Authentication > URL Configuration:

```
Site URL: chrome-extension://[EXTENSION_ID]
```

### 2. Redirect URLs (Crítico)
Añadir estas URLs a la lista de redirect URLs permitidas:

```
chrome-extension://[EXTENSION_ID]/auth/callback.html
chrome-extension://[EXTENSION_ID]/auth/login.html  
chrome-extension://[EXTENSION_ID]/sidepanel/sidepanel.html
```

### 3. Configuración PKCE
Asegurar que PKCE esté habilitado (ya configurado en nuestro código):

```javascript
// En src/shared/config.js
auth: {
  autoRefreshToken: true,
  persistSession: true, 
  detectSessionInUrl: true,
  flowType: 'pkce'  // ✅ Ya configurado
}
```

## 📋 Pasos de Configuración

### Paso 1: Obtener Extension ID
1. Cargar la extensión en Chrome en modo desarrollo
2. Ir a `chrome://extensions/`
3. Copiar el ID de la extensión (ejemplo: `abcdefghijklmnopqrstuvwxyz123456`)

### Paso 2: Configurar Supabase Dashboard
1. Ir a [supabase.com](https://supabase.com) → Tu proyecto
2. Navegar a **Authentication** → **URL Configuration**
3. En **Site URL** poner: `chrome-extension://[TU_EXTENSION_ID]`
4. En **Redirect URLs** añadir:
   ```
   chrome-extension://[TU_EXTENSION_ID]/auth/callback.html
   chrome-extension://[TU_EXTENSION_ID]/auth/login.html
   chrome-extension://[TU_EXTENSION_ID]/sidepanel/sidepanel.html
   ```
5. Guardar cambios

### Paso 3: Verificar callback.html
Asegurar que existe el archivo `/src/auth/callback.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Authentication Callback</title>
</head>
<body>
    <div id="loading">Procesando autenticación...</div>
    
    <script type="module">
        import { auth } from '../shared/auth.js';
        
        // Procesar callback de autenticación
        window.addEventListener('load', async () => {
            try {
                const { data, error } = await auth.getSession();
                
                if (error) {
                    console.error('Auth callback error:', error);
                    document.getElementById('loading').textContent = 'Error en autenticación';
                    return;
                }
                
                if (data.session) {
                    // Notificar al service worker
                    await chrome.runtime.sendMessage({
                        type: 'AUTH_SUCCESS',
                        session: data.session
                    });
                    
                    // Cerrar ventana de callback
                    window.close();
                } else {
                    document.getElementById('loading').textContent = 'No se encontró sesión';
                }
                
            } catch (error) {
                console.error('Callback processing error:', error);
                document.getElementById('loading').textContent = 'Error procesando autenticación';
            }
        });
    </script>
</body>
</html>
```

## 🧪 Testing del Flujo de Autenticación

### Test 1: License Token Activation
```javascript
// En la consola del navegador (DevTools de la extensión)
chrome.runtime.sendMessage({
    type: 'VERIFY_LICENSE',
    email: 'test@example.com',
    token: 'KIT-DEMO-TEST-2025'
});
```

### Test 2: Email Registration
1. Usar email real en el formulario de activación
2. Verificar que el email de confirmación llega
3. Verificar que el link de confirmación redirige correctamente

### Test 3: Login Flow
1. Intentar login con credenciales creadas
2. Verificar persistencia de sesión
3. Verificar que el estado se mantiene al recargar

## ⚠️ Problemas Comunes y Soluciones

### Problema: "Invalid redirect URL"
**Solución**: Verificar que todas las URLs están añadidas exactamente como se especifica arriba.

### Problema: "PKCE verification failed"
**Solución**: Asegurar que `flowType: 'pkce'` está configurado en auth options.

### Problema: "Session not found"
**Solución**: Verificar que `persistSession: true` y que el storage funciona correctamente.

### Problema: "Extension ID changes"
**Solución**: En desarrollo, el ID cambia. Para producción, usar un ID fijo publishable.

## 🚀 Próximos Pasos Después de la Configuración

1. **Configurar Webhook de Stripe** para sincronizar compras
2. **Implementar verificación real de licencias** contra la base de datos
3. **Crear tabla de user_licenses** en Supabase
4. **Configurar RLS policies** para seguridad
5. **Testear flujo completo** de compra → activación

## 📊 Variables de Entorno Necesarias

Asegurar que estas variables están configuradas:

```bash
# En .env o similar
VITE_SUPABASE_URL=https://nktqqsbebhoedgookfzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔐 Schema de Base de Datos Sugerido

```sql
-- Tabla de suscripciones de usuario
CREATE TABLE user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    license_token TEXT UNIQUE NOT NULL,
    license_type TEXT NOT NULL DEFAULT 'premium',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);
```

---

**Nota**: Esta configuración es crítica para que funcione la autenticación. Sin estos redirects configurados correctamente, los usuarios no podrán completar el proceso de registro/login.