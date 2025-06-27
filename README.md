# Kit IA Emprendedor Extension

Extensión de Chrome para gestionar y acceder rápidamente a GPTs oficiales de OpenAI.

## 🚀 Características

- ✅ **Favoritos funcionales**: Marca tus GPTs y prompts favoritos con sincronización en tiempo real
- ✅ **Multi-select de prompts**: Selecciona múltiples prompts para exportar o eliminar
- ✅ **Exportar a TXT**: Descarga tus prompts seleccionados en formato texto
- 🔧 **Autenticación**: Sistema email/password (actualmente en modo desarrollo)
- 📱 **Diseño responsive**: Interfaz moderna con modo oscuro

## 📦 Instalación

```bash
npm install
npm run build
```

Luego carga la carpeta `dist` como extensión descomprimida en Chrome.

## 🛠️ Desarrollo

```bash
npm run dev    # Modo desarrollo con hot reload
npm run build  # Build para producción
npm run test   # Ejecutar tests
```

## 📁 Estructura

```
src/
├── background/        # Service Worker
├── sidepanel/         # Panel lateral principal
│   ├── modules/       # Módulos independientes
│   └── sidepanel.js   # Controlador principal
├── shared/            # Código compartido
└── content/           # Content scripts
```

## 🔐 Seguridad

- Manifest V3 con CSP estricto
- Sin eval() ni código dinámico
- Validación completa de inputs
- Storage local para datos sensibles

## 📝 Estado del Proyecto

### ✅ Completado
- Sistema de favoritos para GPTs y Prompts
- Multi-select y exportación de prompts
- Arquitectura modular
- UI/UX moderna con dark mode

### 🚧 En Desarrollo
- Integración completa con Supabase
- Sistema de ordenamiento avanzado
- Sincronización de favoritos en la nube
- Tests automatizados completos

## 🤝 Contribuir

Este es un proyecto privado. Para contribuir, contacta al equipo de desarrollo.

## 📄 Licencia

Propiedad de Kit IA Emprendedor. Todos los derechos reservados.