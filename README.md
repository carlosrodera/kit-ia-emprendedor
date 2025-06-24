# Kit IA Emprendedor - Chrome Extension

## 🎯 Descripción
Extensión de Chrome lite para gestionar GPTs oficiales del Kit IA Emprendedor. Versión simplificada y segura con autenticación Supabase.

## 🚀 Características

### Core Features
- ✅ Login con Supabase Auth
- ✅ Visualización de GPTs oficiales
- ✅ Búsqueda y filtrado por categorías
- ✅ Sistema de favoritos
- ✅ Vista tarjeta/lista
- ✅ Gestión de prompts locales
- ✅ Sistema de notificaciones
- ✅ Sincronización entre pestañas

### Arquitectura
- **Manifest V3** compliant
- **Almacenamiento**: Chrome Storage API (local)
- **Backend**: Supabase (solo auth y GPTs oficiales)
- **Seguridad**: Content Security Policy estricta
- **Performance**: <50KB bundle size

## 📁 Estructura del Proyecto

```
KIT_IA_EMPRENDEDOR/
├── src/
│   ├── manifest.json           # Manifest V3 config
│   ├── background/            # Service Worker
│   ├── content/              # Content Scripts
│   ├── popup/               # Extension Popup
│   ├── sidebar/            # Main UI (sidebar)
│   ├── auth/              # Auth pages
│   ├── shared/           # Shared utilities
│   └── assets/          # Icons, images
├── tests/              # Testing suite
├── docs/              # Documentation
├── scripts/          # Build scripts
└── dist/            # Build output
```

## 🔒 Seguridad

- Sin almacenamiento de datos sensibles
- Autenticación vía Supabase
- CSP restrictivo
- Sin eval() o código dinámico
- Validación de inputs
- Sanitización de outputs

## 🛠️ Desarrollo

### Requisitos
- Node.js 18+
- npm 9+
- Chrome 120+

### Setup
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
npm run build:prod
```

### Testing
```bash
npm test
npm run test:e2e
```

## 📋 Checklist de Cumplimiento

### Manifest V3
- [ ] Service Worker en lugar de background pages
- [ ] No remote code
- [ ] CSP declarativo
- [ ] Permisos mínimos

### Chrome Web Store
- [ ] Descripción clara de funcionalidad
- [ ] Política de privacidad
- [ ] Screenshots de alta calidad
- [ ] Sin código ofuscado

### Seguridad
- [ ] Validación de todos los inputs
- [ ] Sanitización de HTML
- [ ] HTTPS para todas las conexiones
- [ ] Token rotation

## 📄 Licencia
Propiedad de Carlos Rodera - Kit IA Emprendedor