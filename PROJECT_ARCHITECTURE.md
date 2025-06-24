# 🏗️ ARQUITECTURA DEL PROYECTO - KIT IA EMPRENDEDOR

## 📐 Visión General

### Objetivo
Crear una extensión Chrome **lite, segura y escalable** para gestionar GPTs oficiales del Kit IA Emprendedor con almacenamiento local de prompts del usuario.

### Principios de Diseño
1. **Seguridad First**: Manifest V3, CSP estricto, sin eval()
2. **Performance**: Bundle <50KB, lazy loading, optimización agresiva
3. **UX Simple**: Interfaz minimalista y clara
4. **Escalable**: Arquitectura modular y extensible
5. **Mantenible**: Código limpio, bien documentado, testeable

## 🎯 Arquitectura Técnica

### Stack Tecnológico
```yaml
Frontend:
  - Vanilla JavaScript ES6+ (sin frameworks para minimizar tamaño)
  - CSS modular con CSS Variables
  - HTML5 semántico
  
Build Tools:
  - Vite (bundling rápido)
  - ESBuild (minificación)
  - PostCSS (optimización CSS)
  
Testing:
  - Vitest (unit tests)
  - Playwright (e2e tests)
  
Backend:
  - Supabase (Auth + Database)
  - PostgreSQL (via Supabase)
  
Storage:
  - Chrome Storage API (local)
  - IndexedDB (para datos grandes si necesario)
```

### Arquitectura de Capas

```
┌─────────────────────────────────────────────┐
│           Chrome Extension UI               │
│         (Popup + Sidebar + Auth)           │
├─────────────────────────────────────────────┤
│           Core Services Layer              │
│    (Auth, Storage, API, Notifications)     │
├─────────────────────────────────────────────┤
│          Message Bus (Chrome API)          │
├─────────────────────────────────────────────┤
│        Background Service Worker           │
│    (Sync, Updates, Message Routing)        │
├─────────────────────────────────────────────┤
│         External Services Layer            │
│         (Supabase Auth & Data)            │
└─────────────────────────────────────────────┘
```

## 📁 Estructura de Archivos Detallada

```
KIT_IA_EMPRENDEDOR/
├── src/
│   ├── manifest.json              # Manifest V3 configuration
│   │
│   ├── background/
│   │   ├── service-worker.js      # Main service worker
│   │   ├── auth-handler.js        # Auth state management
│   │   ├── sync-manager.js        # Data sync logic
│   │   └── message-router.js      # Message handling
│   │
│   ├── content/
│   │   ├── content-script.js      # Main content script
│   │   └── inject-sidebar.js      # Sidebar injection logic
│   │
│   ├── sidebar/
│   │   ├── index.html             # Sidebar HTML
│   │   ├── index.js               # Sidebar entry point
│   │   ├── components/
│   │   │   ├── gpt-list.js        # GPT list component
│   │   │   ├── gpt-card.js        # GPT card component
│   │   │   ├── search-bar.js      # Search component
│   │   │   ├── category-filter.js # Category filter
│   │   │   ├── prompt-manager.js  # Prompt management
│   │   │   └── notifications.js   # Notification system
│   │   ├── styles/
│   │   │   ├── main.css          # Main styles
│   │   │   ├── components.css    # Component styles
│   │   │   └── themes.css        # Theme variables
│   │   └── utils/
│   │       ├── dom.js            # DOM utilities
│   │       └── debounce.js       # Performance utils
│   │
│   ├── popup/
│   │   ├── popup.html            # Extension popup
│   │   ├── popup.js              # Popup logic
│   │   └── popup.css             # Popup styles
│   │
│   ├── auth/
│   │   ├── login.html            # Login page
│   │   ├── login.js              # Login logic
│   │   ├── callback.html         # OAuth callback
│   │   └── auth.css              # Auth styles
│   │
│   ├── shared/
│   │   ├── config.js             # Configuration
│   │   ├── constants.js          # Constants
│   │   ├── storage.js            # Storage abstraction
│   │   ├── api.js                # API client
│   │   ├── supabase-client.js    # Supabase setup
│   │   ├── validators.js         # Input validation
│   │   └── sanitizer.js          # HTML sanitization
│   │
│   └── assets/
│       ├── icons/                # Extension icons
│       ├── images/               # UI images
│       └── fonts/                # Web fonts (if any)
│
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── e2e/                      # End-to-end tests
│   └── fixtures/                 # Test data
│
├── scripts/
│   ├── build.js                  # Build script
│   ├── dev.js                    # Dev server
│   └── package.js                # Package for store
│
├── docs/
│   ├── API.md                    # API documentation
│   ├── SECURITY.md               # Security guidelines
│   └── DEPLOYMENT.md             # Deployment guide
│
└── config/
    ├── vite.config.js            # Vite configuration
    ├── postcss.config.js         # PostCSS config
    └── test.config.js            # Test configuration
```

## 🔄 Flujo de Datos

### 1. Autenticación
```
User → Login Page → Supabase Auth → Token → Chrome Storage
                                          ↓
Service Worker ← Message ← Auth State ← Token Validation
```

### 2. Carga de GPTs
```
Service Worker → Supabase API → GPT Data
        ↓                           ↓
Chrome Storage ← Cache ← Transform ← Response
        ↓
Sidebar UI ← Render ← Local State
```

### 3. Gestión de Prompts (Local)
```
User Input → Validation → Chrome Storage API
                              ↓
                        Local Storage
                              ↓
                     Sync Between Tabs
```

## 🔒 Modelo de Seguridad

### Content Security Policy
```javascript
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Permisos Mínimos
```javascript
{
  "permissions": [
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://*.supabase.co/*"
  ]
}
```

### Validación de Datos
- Todos los inputs validados con esquemas
- Sanitización de HTML con DOMPurify
- Escape de caracteres especiales
- Validación de URLs

## 📊 Modelos de Datos

### GPT Official Model
```typescript
interface GPTOfficial {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  chat_link: string;
  category_id: string;
  category: Category;
  is_featured: boolean;
  metadata: {
    tags?: string[];
    usage_tips?: string;
  };
  created_at: string;
  updated_at: string;
}
```

### Local Prompt Model
```typescript
interface LocalPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: number;
  updated_at: number;
  is_favorite: boolean;
}
```

### Notification Model
```typescript
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  action?: {
    label: string;
    url?: string;
    callback?: string;
  };
  expires_at?: string;
}
```

## 🚀 Estrategia de Optimización

### Bundle Size (<50KB)
1. No frameworks (Vanilla JS)
2. Tree shaking agresivo
3. Minificación extrema
4. Compresión gzip
5. Lazy loading de componentes

### Performance
1. Debouncing en búsquedas
2. Virtual scrolling para listas largas
3. Memoización de cálculos costosos
4. Web Workers para operaciones pesadas
5. Cache inteligente

### UX
1. Skeleton screens
2. Optimistic updates
3. Offline support
4. Instant feedback
5. Progressive enhancement

## 🧪 Estrategia de Testing

### Unit Tests (80% coverage)
- Lógica de negocio
- Utilidades
- Validadores
- Transformadores

### Integration Tests
- API communication
- Storage operations
- Message passing
- Auth flow

### E2E Tests
- User journeys completos
- Cross-browser testing
- Performance benchmarks
- Accessibility checks

## 📦 Plan de Deployment

### Fase 1: Development
- Local development
- Unit tests
- Manual QA

### Fase 2: Staging
- Internal testing
- Security audit
- Performance profiling

### Fase 3: Production
- Chrome Web Store submission
- Gradual rollout
- Monitoring setup
- User feedback loop

## 🔍 Monitoreo y Analytics

### Métricas Clave
- Load time
- Bundle size
- Error rate
- User engagement
- Feature usage

### Herramientas
- Sentry (errors)
- Chrome DevTools
- Lighthouse audits
- User feedback

## 🎯 Principios de Desarrollo

1. **KISS**: Keep It Simple, Stupid
2. **DRY**: Don't Repeat Yourself
3. **YAGNI**: You Aren't Gonna Need It
4. **SOLID**: Principios de diseño OOP
5. **Test First**: TDD approach

---

**Última actualización**: 21/01/2025
**Versión**: 1.0.0
**Estado**: En planificación