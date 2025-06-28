# 🔐 Páginas de Autenticación - KIT IA EMPRENDEDOR

Esta carpeta contiene las páginas HTML necesarias para manejar los callbacks de autenticación desde los emails de Supabase.

## 📄 Páginas Incluidas

### 1. **auth-callback.html**
- **Propósito**: Procesar callbacks generales de autenticación
- **Casos de uso**:
  - Login con enlace mágico
  - Cambio de email
  - Invitaciones de usuario
- **URL**: `chrome-extension://[EXTENSION_ID]/auth/auth-callback.html`

### 2. **confirm-email.html**
- **Propósito**: Confirmar registro de nuevos usuarios
- **Casos de uso**:
  - Confirmación de email después del registro
- **URL**: `chrome-extension://[EXTENSION_ID]/auth/confirm-email.html`

### 3. **reset-password.html**
- **Propósito**: Restablecer contraseña olvidada
- **Casos de uso**:
  - Usuario solicita nueva contraseña
- **URL**: `chrome-extension://[EXTENSION_ID]/auth/reset-password.html`

## 🔧 Configuración en Supabase

### URLs de Redirect
En el dashboard de Supabase, agrega estas URLs a la lista de redirects permitidos:

```
chrome-extension://[EXTENSION_ID]/auth/auth-callback.html
chrome-extension://[EXTENSION_ID]/auth/confirm-email.html
chrome-extension://[EXTENSION_ID]/auth/reset-password.html
chrome-extension://[EXTENSION_ID]/auth/login.html
chrome-extension://[EXTENSION_ID]/sidepanel/sidepanel.html
```

### Site URL
```
chrome-extension://[EXTENSION_ID]
```

## 🌐 Funcionamiento

### En Contexto de Extensión
Si el usuario tiene la extensión instalada:
1. Las páginas se cargan dentro del contexto de la extensión
2. Pueden comunicarse con el service worker
3. La autenticación se procesa automáticamente
4. El usuario es redirigido al panel principal

### Sin Extensión (Web)
Si el usuario NO tiene la extensión:
1. Las páginas funcionan de forma independiente usando Supabase JS
2. Se muestra un prompt para instalar la extensión
3. La autenticación se completa pero con funcionalidad limitada

## 🔑 Credenciales de Supabase

Las páginas usan las mismas credenciales que la extensión:
```javascript
const SUPABASE_URL = 'https://nktqqsbebhoedgookfzu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## 🧪 Testing

Para probar las páginas:

### 1. Confirmación de Email
```
http://localhost:5173/src/auth/confirm-email.html?token=TEST_TOKEN&type=signup
```

### 2. Reset Password
```
http://localhost:5173/src/auth/reset-password.html?token=TEST_TOKEN&type=recovery
```

### 3. Auth Callback
```
http://localhost:5173/src/auth/auth-callback.html?token=TEST_TOKEN&type=magiclink
```

## 📝 Notas Importantes

1. **EXTENSION_ID**: Reemplazar con el ID real de tu extensión
2. **HTTPS**: Las páginas funcionan tanto en HTTP (desarrollo) como HTTPS (producción)
3. **CORS**: No hay problemas de CORS al usar dentro de la extensión
4. **Fallback**: Si falla la comunicación con la extensión, se usa Supabase JS directamente

## 🚀 Próximos Pasos

1. Obtener el EXTENSION_ID real después de publicar
2. Configurar todas las URLs en Supabase
3. Probar cada flujo de autenticación
4. Verificar que los emails lleguen correctamente

---

**Última actualización**: 27 Junio 2025
**Proyecto**: KIT IA EMPRENDEDOR
**URL**: https://iaemprendedor.com