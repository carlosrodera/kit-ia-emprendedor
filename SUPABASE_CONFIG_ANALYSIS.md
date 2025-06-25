# Análisis de Configuración Supabase - Kit IA Pro

## 📊 Proyectos Supabase Existentes

### 1. KIT IA PRO (Original)
- **ID**: armtymmsjhfjrghgfmyc
- **Región**: eu-central-1
- **PostgreSQL**: v15.8.1
- **Estado**: ACTIVE_HEALTHY
- **Creado**: 21/03/2025

### 2. KIT IA PRO EVO
- **ID**: nktqqsbebhoedgookfzu
- **Región**: eu-central-2
- **PostgreSQL**: v17.4.1
- **Estado**: ACTIVE_HEALTHY
- **Creado**: 19/06/2025

## 🗃️ Estructura de Tablas (KIT IA PRO Original)

### 1. **profiles** (Usuarios)
- `id`: UUID (FK → auth.users)
- `email`: Text
- `plan_id`: Text (default: 'free')
- `gpt_count`: Integer
- `folder_count`: Integer
- `database_count`: Integer
- RLS habilitado ✅

### 2. **official_gpts** (GPTs Oficiales)
- `id`: Text (PK)
- `name`: Text
- `creator`: Text
- `description`: Text
- `url`: Text
- `icon_url`: Text
- `category`: Text
- `tags`: Array
- `min_plan`: Text (Free/Plus/Pro)
- **87 GPTs almacenados**

### 3. **user_official_gpts** (Favoritos)
- `user_id`: UUID
- `gpt_id`: Text
- `is_favorite`: Boolean (siempre true)
- Solo almacena favoritos

### 4. **gpts** (GPTs Personalizados)
- `id`: UUID
- `user_id`: UUID
- `name`, `description`: Text
- `data`: JSONB
- `folder_id`: UUID
- `url`, `category`: Text
- `tags`: JSONB

### 5. **folders** (Carpetas)
- Organización jerárquica
- `parent_id` para subcarpetas
- `icon`, `color` personalizables

### 6. **databases** (Bases de Prompts)
- `id`: UUID
- `name`, `content`: Text
- `category`: Text
- `tags`: JSONB
- `prompt_count`: Integer

### 7. **prompts** (Prompts Individuales)
- `id`: UUID
- `database_id`: UUID (FK)
- `name`, `content`: Text
- `model`: Text (default: 'gpt-4')
- `data`: JSONB

### 8. **plans** & **subscriptions**
- Plans: Free, Plus, Pro
- Subscriptions con Stripe/manual
- Límites en JSONB

### 9. **announcements** (Notificaciones)
- Sistema de anuncios
- Tipos: info, success, warning, error, update, feature
- Control de vistas por usuario

## 🔐 Seguridad

- **RLS (Row Level Security)**: Habilitado en todas las tablas
- **Políticas**: Usuarios solo acceden a sus propios datos
- **Auth**: Integrado con Supabase Auth

## 💡 Recomendaciones para Kit IA Emprendedor

### Opción 1: Reutilizar Proyecto Existente
- **Ventajas**: 
  - Ya tiene estructura
  - 87 GPTs oficiales cargados
  - Auth configurado
- **Desventajas**:
  - Puede tener datos legacy
  - Estructura más compleja de lo necesario

### Opción 2: Crear Proyecto Nuevo Simplificado
- **Tablas esenciales**:
  1. `profiles` - Usuarios
  2. `official_gpts` - Solo GPTs oficiales
  3. `user_favorites` - Favoritos simples
  4. `prompts` - Prompts del usuario

### Estructura Simplificada Propuesta
```sql
-- Usuarios
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  device_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPTs Oficiales (solo lectura)
CREATE TABLE official_gpts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT,
  category TEXT,
  tags TEXT[]
);

-- Favoritos
CREATE TABLE user_favorites (
  user_id UUID REFERENCES profiles(id),
  gpt_id TEXT REFERENCES official_gpts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, gpt_id)
);

-- Prompts del Usuario
CREATE TABLE user_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Integración con Extension

### Variables de Entorno Necesarias
```javascript
// .env
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_ANON_KEY=[ANON_KEY]
```

### Service Worker Integration
```javascript
// Auth check
const { data: { user } } = await supabase.auth.getUser();

// Sync GPTs
const { data: gpts } = await supabase
  .from('official_gpts')
  .select('*')
  .order('name');

// Save favorites
await supabase
  .from('user_favorites')
  .upsert({ user_id, gpt_id });
```

## 📌 Decisión Recomendada

**Crear proyecto nuevo** con estructura simplificada porque:
1. Kit IA Emprendedor es más ligero
2. No necesita folders ni databases complejas
3. Enfoque en GPTs oficiales solamente
4. Menor costo de mantenimiento
5. Más fácil de escalar

---

**Próximos pasos**:
1. Decidir si crear nuevo proyecto o reutilizar
2. Configurar Supabase Auth
3. Cargar GPTs oficiales
4. Implementar sync en service worker