# 🚀 Kit IA Emprendedor - Chrome Extension v0.5.0

> Tu asistente personal para acceder rápidamente a los mejores GPTs oficiales de OpenAI

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/carlosrodera/kit-ia-emprendedor)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://www.google.com/chrome/)

## 📋 Descripción

Kit IA Emprendedor es una extensión de Chrome ligera y potente que te permite acceder rápidamente a los GPTs oficiales de OpenAI, gestionar tus prompts favoritos y mejorar tu productividad con IA.

### ✨ Características principales

- 🤖 **Acceso rápido a GPTs oficiales** - DALL·E, Data Analysis, Code Copilot y más
- ⭐ **Sistema de favoritos mejorado** - Con estrellitas amarillo pastel
- 📝 **Gestión de prompts completa** - Crear, editar, eliminar y copiar
- 🔍 **Búsqueda avanzada** - En GPTs y dentro de filtros
- 🏷️ **Filtros inteligentes** - Por categorías y etiquetas múltiples
- 🎨 **Interfaz moderna** - Tema dark elegante y 100% responsive
- 📱 **Vista adaptativa** - Grid/List según preferencia
- 🔔 **Notificaciones del servicio** - Mantente informado
- ↔️ **Sidebar redimensionable** - Ajusta a tu gusto (320-600px)
- ⌨️ **Atajos de teclado** - `Cmd/Ctrl + Shift + K`
- 🔒 **100% Privado** - Datos locales + Supabase opcional
- ⚡ **Ultra ligero** - <50KB, sin afectar rendimiento

### 🆕 Novedades v0.5.0

- ✨ Buscador integrado en dropdown de filtros
- 🎨 Favoritos con color amarillo pastel más agradable
- 📋 Dropdown de filtros flotante (no desplaza contenido)
- 🔗 Integración completa con Supabase
- 🐛 Modal de prompts arreglado
- 🔗 URLs de GPTs corregidas
- 📱 Mejoras significativas en responsive

### 🏗️ Arquitectura técnica
- **Manifest V3** - Última versión, máxima seguridad
- **Vanilla JavaScript** - Sin frameworks, máximo rendimiento
- **Chrome Storage API** - Persistencia local confiable
- **Supabase Ready** - Backend preparado para escalar
- **CSP Compliant** - Seguridad nivel enterprise
- **Performance First** - <50KB bundle, <100ms carga

## 📁 Estructura del Proyecto

```
kit-ia-emprendedor/
├── dist/                 # 📦 Extensión compilada (lista para usar)
│   ├── manifest.json     # Configuración v0.5.0
│   ├── background/       # Service worker
│   ├── content/          # Content scripts
│   ├── popup/            # Popup UI
│   ├── sidebar/          # Panel principal
│   └── config/           # Configuración Supabase
├── src/                  # 💻 Código fuente
│   ├── manifest.json     # Manifest V3 config
│   ├── background/       # Service Worker
│   ├── content/          # Content Scripts
│   ├── popup/            # Extension Popup
│   ├── sidebar/          # Main UI (sidebar)
│   ├── shared/           # Utilidades compartidas
│   └── assets/           # Iconos e imágenes
├── PROJECT_MEMORY/       # 🧠 Documentación del proyecto
│   ├── CORE/             # Estado actual
│   ├── changelog/        # Historial de cambios
│   └── decisions/        # Decisiones técnicas
└── docs/                 # 📚 Documentación adicional
```

## 🛠️ Instalación

### Opción 1: Instalación rápida (Usuarios)

1. **Descarga la extensión**
   - Descarga la carpeta `dist/` de este repositorio
   - O clona el repo: `git clone https://github.com/carlosrodera/kit-ia-emprendedor.git`

2. **Instala en Chrome**
   - Abre Chrome y ve a `chrome://extensions/`
   - Activa el "Modo desarrollador" (esquina superior derecha)
   - Haz clic en "Cargar extensión sin empaquetar"
   - Selecciona la carpeta `dist/`

3. **¡Listo!** 
   - Verás el icono en la barra de herramientas
   - Usa `Cmd+Shift+K` (Mac) o `Ctrl+Shift+K` (Windows/Linux) para abrir

### Opción 2: Desarrollo (Contribuidores)

```bash
# Clonar repositorio
git clone https://github.com/carlosrodera/kit-ia-emprendedor.git
cd kit-ia-emprendedor

# Instalar dependencias
npm install

# Compilar extensión
npm run build

# Modo desarrollo con watch
npm run dev
```

## 🎯 Uso

### Abrir el panel
- **Click**: En el icono de la extensión
- **Teclado**: `Cmd+Shift+K` (Mac) o `Ctrl+Shift+K` (Windows/Linux)

### Funcionalidades principales

#### 🔍 Búsqueda inteligente
- Busca GPTs por nombre, descripción o etiquetas
- Búsqueda dentro del dropdown de filtros
- Resultados en tiempo real

#### ⭐ Favoritos mejorados
- Click en la estrella amarilla para marcar/desmarcar
- Acceso rápido desde la pestaña "Favoritos"
- Sincronización instantánea

#### 📝 Gestión de prompts
- **Crear**: Botón "Añadir Prompt" con formulario completo
- **Editar**: Click en el icono de lápiz
- **Copiar**: Un click para copiar al portapapeles
- **Organizar**: Sistema de etiquetas

#### 🎨 Personalización
- **Vista**: Toggle entre grid y lista
- **Tamaño**: Arrastra el borde para redimensionar
- **Filtros**: Dropdown flotante que no mueve el contenido

## 🔒 Seguridad y Privacidad

### Almacenamiento
- ✅ **Local por defecto**: Todos tus datos en tu dispositivo
- ✅ **Sin tracking**: No recopilamos datos de uso
- ✅ **Open source**: Código abierto y auditable

### Seguridad técnica
- ✅ **CSP estricto**: Sin eval() ni código dinámico
- ✅ **Validación total**: Todos los inputs sanitizados
- ✅ **HTTPS only**: Conexiones seguras
- ✅ **Manifest V3**: Máxima seguridad de Chrome

### Supabase (Opcional)
- 🔐 Row Level Security (RLS)
- 🔐 Autenticación segura
- 🔐 Datos encriptados en tránsito

## 🚀 Roadmap

### ✅ v0.5.0 (Actual - 25 Enero 2025)
- [x] Buscador en filtros
- [x] Favoritos amarillo pastel
- [x] Dropdown flotante
- [x] Integración Supabase
- [x] Bugs críticos resueltos

### 🔄 v0.6.0 (En desarrollo)
- [ ] Autenticación con Supabase
- [ ] Sincronización entre dispositivos
- [ ] Modo offline mejorado
- [ ] Exportar/importar datos

### 📋 v1.0.0 (Planificado)
- [ ] Compartir prompts con comunidad
- [ ] Temas personalizables
- [ ] Analytics de uso personal
- [ ] API para integraciones

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! 

1. **Fork** el proyecto
2. **Crea** tu feature branch (`git checkout -b feature/NuevaCaracteristica`)
3. **Commit** tus cambios (`git commit -m 'Add: Nueva característica genial'`)
4. **Push** a la branch (`git push origin feature/NuevaCaracteristica`)
5. **Abre** un Pull Request

### Guías de contribución
- Sigue el estilo de código existente
- Añade tests para nuevas funcionalidades
- Actualiza la documentación
- Mantén los commits atómicos

## 📊 Estado del Proyecto

- **Versión**: 0.5.0
- **Estado**: 🟢 Activo
- **Build**: ✅ Passing
- **Coverage**: 🟡 En progreso
- **Licencia**: MIT

## 🐛 Reporte de Bugs

¿Encontraste un problema? 
1. Busca si ya existe en [Issues](https://github.com/carlosrodera/kit-ia-emprendedor/issues)
2. Si no, crea uno nuevo con:
   - Descripción clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Autor

**Carlos Rodera**
- GitHub: [@carlosrodera](https://github.com/carlosrodera)
- LinkedIn: [Carlos Rodera](https://linkedin.com/in/carlosrodera)

## 🙏 Agradecimientos

- OpenAI por los increíbles GPTs
- Comunidad Chrome Extensions
- Claude AI por la asistencia en desarrollo
- Todos los beta testers

---

⭐ **Si te gusta el proyecto, dale una estrella en GitHub!**

🔗 **Links útiles**
- [Documentación completa](./docs)
- [Changelog](./PROJECT_MEMORY/changelog)
- [Decisiones técnicas](./PROJECT_MEMORY/decisions)

---

*Última actualización: 25 de Enero 2025*