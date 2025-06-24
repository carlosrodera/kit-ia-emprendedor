# 🏗️ ARQUITECTURA FUNCIONAL - KIT IA EMPRENDEDOR EXTENSION

## 📊 FLUJO DE DATOS

### 1. Flujo de Autenticación
```
Usuario → Click Login → Popup.js → Service Worker → Supabase Auth
                                                    ↓
                                              OAuth Provider
                                                    ↓
Chrome Storage ← Service Worker ← Callback ← Redirect con Token
      ↓
Actualizar UI → Usuario Autenticado
```

### 2. Flujo de Carga de GPTs
```
Login Success → Service Worker → Fetch GPTs desde Supabase
                                         ↓
                              Tabla: gpts + gpt_categories
                                         ↓
                    Chrome Storage (cache con TTL 1 hora)
                                         ↓
         Sidebar/Popup ← Message Passing ← GPTs Disponibles
```

### 3. Flujo de Gestión de Favoritos
```
Usuario → Click ⭐ → Content Script → Chrome Storage Local
                                            ↓
                           Actualizar Array de Favoritos
                                            ↓
                    Sincronizar entre tabs → Update UI
```

### 4. Flujo de Prompts Locales
```
Usuario → Crear/Editar Prompt → Validación Local
                                       ↓
                              Chrome Storage Local
                                       ↓
                              {
                                id: uuid,
                                title: string,
                                content: string,
                                tags: array,
                                gptId: string|null,
                                createdAt: timestamp,
                                updatedAt: timestamp
                              }
                                       ↓
                              Update UI + Badge
```

## 🗄️ ESTRUCTURA DE DATOS

### Chrome Storage Schema
```javascript
{
  // chrome.storage.local
  "kitia_auth_token": "eyJ...",
  "kitia_user_data": {
    "id": "uuid",
    "email": "user@example.com",
    "avatar_url": "https://...",
    "subscription_status": "active"
  },
  "kitia_gpts_cache": {
    "data": [
      {
        "id": "uuid",
        "name": "GPT Name",
        "description": "...",
        "icon_url": "https://...",
        "chat_link": "https://chat.openai.com/g/...",
        "category_id": "productivity",
        "is_featured": true,
        "metadata": {}
      }
    ],
    "timestamp": 1706117600000,
    "ttl": 3600000 // 1 hora
  },
  "kitia_favorites": ["gpt-id-1", "gpt-id-2"],
  "kitia_prompts": [
    {
      "id": "prompt-uuid",
      "title": "Mi Prompt",
      "content": "Actúa como...",
      "tags": ["marketing", "copywriting"],
      "gptId": "gpt-uuid",
      "createdAt": 1706117600000,
      "updatedAt": 1706117600000
    }
  ],
  "kitia_preferences": {
    "theme": "light",
    "viewMode": "card",
    "showNotifications": true,
    "autoSync": true
  },
  "kitia_notifications_read": ["notif-id-1", "notif-id-2"]
}

// chrome.storage.sync (para sincronización entre dispositivos)
{
  "kitia_user_preferences": {
    "language": "es",
    "compactMode": false
  }
}
```

### Supabase Tables Structure
```sql
-- Tabla gpts (solo lectura para la extensión)
CREATE TABLE gpts (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url TEXT,
  chat_link TEXT NOT NULL,
  category_id VARCHAR(50),
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla gpt_categories (solo lectura)
CREATE TABLE gpt_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  color VARCHAR(7),
  order_index INTEGER
);

-- Tabla notifications (solo lectura)
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(20), -- info, success, warning, error
  action_url TEXT,
  action_text VARCHAR(100),
  is_global BOOLEAN DEFAULT true,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 CICLO DE VIDA DE COMPONENTES

### 1. Service Worker Lifecycle
```
Install → Activate → Idle
           ↓
    Message/Event/Alarm
           ↓
    Process & Respond
           ↓
        Idle
```

### 2. Content Script Lifecycle
```
Page Load → Inject Script → Check Auth State
                              ↓
                    Authenticated? → Show Toggle Button
                              ↓
                     User Clicks → Inject Sidebar
                              ↓
                    Load GPTs & UI → Ready
```

### 3. Popup Lifecycle
```
Icon Click → Load popup.html → Check Auth
                                  ↓
                          Show Appropriate UI
                                  ↓
                          User Interaction → Close
```

## 📨 MENSAJERÍA ENTRE COMPONENTES

### Message Flow Patterns
```
1. Popup ↔ Service Worker (Direct)
   - chrome.runtime.sendMessage()
   - Responses via Promise

2. Content Script ↔ Service Worker (Direct)
   - chrome.runtime.sendMessage()
   - chrome.runtime.onMessage

3. Popup ↔ Content Script (Via Service Worker)
   - chrome.tabs.sendMessage()
   - Requires active tab

4. Storage Changes (Broadcast)
   - chrome.storage.onChanged
   - All components listen
```

### Message Types Reference
```javascript
// Auth Messages
{ type: "CHECK_AUTH" }
{ type: "LOGIN" }
{ type: "LOGOUT" }
{ type: "AUTH_SUCCESS", data: { user, token } }

// GPT Messages
{ type: "GET_GPTS", data: { category?, search? } }
{ type: "SYNC_GPTS" }
{ type: "GET_GPT_STATS" }

// Storage Messages
{ type: "SAVE_PROMPT", data: { prompt } }
{ type: "DELETE_PROMPT", data: { id } }
{ type: "ADD_FAVORITE", data: { gptId } }
{ type: "REMOVE_FAVORITE", data: { gptId } }

// UI Messages
{ type: "TOGGLE_SIDEBAR", data: { show: boolean } }
{ type: "UPDATE_BADGE", data: { text, color } }
```

## 🔐 SEGURIDAD Y VALIDACIÓN

### Input Validation Rules
```javascript
// Prompt Validation
{
  title: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_áéíóúñÁÉÍÓÚÑ]+$/
  },
  content: {
    required: true,
    minLength: 10,
    maxLength: 5000
  },
  tags: {
    maxItems: 10,
    itemMaxLength: 30
  }
}

// Search Validation
{
  query: {
    maxLength: 100,
    sanitize: true // Remove HTML/scripts
  }
}
```

### Security Checkpoints
1. **Content Script Injection**
   - Verificar origen del mensaje
   - Sandbox del iframe
   - CSP headers

2. **Storage Access**
   - Encriptar tokens
   - Limpiar en logout
   - Validar antes de guardar

3. **API Calls**
   - Rate limiting
   - Token validation
   - Error handling

## 🎯 ESTADOS DE LA APLICACIÓN

### Global State Machine
```
INITIAL
  ↓
CHECKING_AUTH → AUTHENTICATED → READY
  ↓                              ↓
UNAUTHENTICATED            [User Actions]
  ↓                              ↓
[Login] ←─────────────────[Logout]
```

### Component States
```
Sidebar:
- CLOSED
- OPENING
- OPEN
- CLOSING

GPTs:
- LOADING
- LOADED
- ERROR
- SYNCING

Prompts:
- VIEWING
- CREATING
- EDITING
- DELETING
```

## 📱 RESPONSIVE BEHAVIOR

### Breakpoints
```css
/* Sidebar Width Management */
320px-359px: Compact mode (icons only)
360px-479px: Normal mode
480px+: Extended mode

/* Content Adaptation */
< 360px: Single column, minimal padding
≥ 360px: Full layout
```

### Adaptive Features
1. **Compact Mode (< 360px)**
   - Icons only in navigation
   - Condensed cards
   - Hidden descriptions

2. **Normal Mode (360-479px)**
   - Full navigation
   - Standard cards
   - Truncated descriptions

3. **Extended Mode (≥ 480px)**
   - Enhanced spacing
   - Full descriptions
   - Additional metadata

## 🚀 PERFORMANCE OPTIMIZATIONS

### Loading Strategy
```
1. Critical Path:
   - Load auth state
   - Show appropriate UI
   - Fetch visible content

2. Deferred Loading:
   - Images (lazy load)
   - Non-visible GPTs
   - Analytics

3. Preloading:
   - Next page of results
   - Common user paths
```

### Caching Strategy
```
Cache Levels:
1. Memory (Runtime)
   - Current session data
   - Computed values

2. Chrome Storage (Persistent)
   - GPTs (1 hour TTL)
   - User preferences
   - Favorites

3. No Cache:
   - Auth tokens (security)
   - Real-time notifications
```

## 🔄 SYNC STRATEGY

### Data Sync Rules
1. **On Login**: Full sync of GPTs
2. **On Demand**: Manual sync button
3. **On Error**: Retry with backoff
4. **On Update**: Incremental sync
5. **On Idle**: Background sync (optional)

### Conflict Resolution
- **Favorites**: Last write wins
- **Prompts**: Local always wins
- **Preferences**: Merge strategy
- **GPTs**: Server always wins

---

**Última actualización**: 24/01/2025
**Versión**: 1.0.0