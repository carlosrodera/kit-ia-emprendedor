# 📧 Plantillas de Email para Supabase - KIT IA EMPRENDEDOR

Esta carpeta contiene todas las plantillas de email HTML para configurar en Supabase Auth.

## 🎯 Plantillas Incluidas

1. **confirm-signup.html** - Confirmación de registro
2. **invite-user.html** - Invitación de usuario
3. **magic-link.html** - Enlace mágico para login
4. **change-email.html** - Confirmación de cambio de email
5. **reset-password.html** - Restablecimiento de contraseña
6. **reauthentication.html** - Código de verificación para reautenticación

## 🔧 Cómo Configurar en Supabase

### Paso 1: Acceder a la configuración
1. Ir a [supabase.com](https://supabase.com)
2. Seleccionar tu proyecto
3. Navegar a **Authentication** → **Email Templates**

### Paso 2: Configurar cada plantilla
Para cada tipo de email:

1. Selecciona el tipo de plantilla (ej: "Confirm signup")
2. Activa **"Enable custom email"**
3. Copia todo el contenido del archivo HTML correspondiente
4. Pégalo en el editor de Supabase
5. Guarda los cambios

### Paso 3: Configurar URLs de redirect
En **Authentication** → **URL Configuration**:

```
Site URL: chrome-extension://[EXTENSION_ID]
```

Redirect URLs permitidas:
```
chrome-extension://[EXTENSION_ID]/auth/callback.html
chrome-extension://[EXTENSION_ID]/auth/login.html
chrome-extension://[EXTENSION_ID]/sidepanel/sidepanel.html
```

## 📝 Variables Disponibles

Las plantillas usan estas variables de Supabase:

- `{{ .SiteURL }}` - URL base del sitio
- `{{ .TokenHash }}` - Token de verificación
- `{{ .Token }}` - Código de verificación (para reautenticación)
- `{{ .Email }}` - Email actual del usuario
- `{{ .NewEmail }}` - Nuevo email (para cambio de email)

## 🎨 Personalización

Todas las plantillas mantienen:
- **Diseño oscuro** consistente con la extensión
- **Logo y branding** de KIT IA EMPRENDEDOR
- **Enlaces** a iaemprendedor.com
- **Soporte** en iaemprendedor.com/soporte

## ⚠️ Importante

1. **NO modificar** las variables `{{ .Variable }}`
2. **Probar** cada plantilla después de configurar
3. **Verificar** que los enlaces funcionen correctamente
4. **Actualizar** el EXTENSION_ID con el ID real de tu extensión

## 🧪 Testing

Para probar las plantillas:
1. Crear un usuario de prueba
2. Realizar cada acción (registro, reset password, etc.)
3. Verificar que los emails lleguen correctamente
4. Comprobar que los enlaces funcionen

---

**Última actualización**: 27 Junio 2025
**Proyecto**: KIT IA EMPRENDEDOR
**URL**: https://iaemprendedor.com