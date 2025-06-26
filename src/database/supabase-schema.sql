-- Esquema de base de datos para Kit IA Emprendedor
-- Supabase Project: EVO (nktqqsbebhoedgookfzu)

-- Tabla de GPTs oficiales
CREATE TABLE IF NOT EXISTS gpts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id),
  chat_link TEXT NOT NULL,
  icon_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de etiquetas/sectores
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('general', 'sector', 'skill')) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de relación GPT-Tags
CREATE TABLE IF NOT EXISTS gpt_tags (
  gpt_id UUID REFERENCES gpts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (gpt_id, tag_id)
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'success', 'warning', 'important')) DEFAULT 'info',
  icon TEXT,
  action_url TEXT,
  action_text TEXT,
  is_dismissible BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de notificaciones leídas por usuario
CREATE TABLE IF NOT EXISTS user_notifications_read (
  user_id UUID NOT NULL,
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_id)
);

-- Índices para mejorar performance
CREATE INDEX idx_gpts_category ON gpts(category_id);
CREATE INDEX idx_gpts_active ON gpts(is_active);
CREATE INDEX idx_gpts_featured ON gpts(is_featured);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_expires ON notifications(expires_at);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gpts_updated_at BEFORE UPDATE ON gpts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS (Row Level Security)
ALTER TABLE gpts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications_read ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de lectura
CREATE POLICY "GPTs públicos" ON gpts FOR SELECT USING (is_active = true);
CREATE POLICY "Categorías públicas" ON categories FOR SELECT USING (true);
CREATE POLICY "Tags públicas" ON tags FOR SELECT USING (true);
CREATE POLICY "Notificaciones activas" ON notifications FOR SELECT 
  USING (expires_at IS NULL OR expires_at > NOW());

-- Política para notificaciones leídas (requiere auth)
CREATE POLICY "Usuario puede marcar sus notificaciones" ON user_notifications_read 
  FOR ALL USING (auth.uid() = user_id);

-- Datos iniciales de categorías
INSERT INTO categories (slug, name, icon, color, order_index) VALUES
  ('creative', 'Creativo', '🎨', '#EC4899', 1),
  ('productivity', 'Productividad', '⚡', '#3B82F6', 2),
  ('programming', 'Programación', '💻', '#10B981', 3),
  ('writing', 'Escritura', '✍️', '#F59E0B', 4),
  ('research', 'Investigación', '🔍', '#8B5CF6', 5)
ON CONFLICT (slug) DO NOTHING;

-- Datos iniciales de sectores/etiquetas
INSERT INTO tags (slug, name, type) VALUES
  ('inmobiliaria', 'Inmobiliaria', 'sector'),
  ('salud', 'Salud y Medicina', 'sector'),
  ('educacion', 'Educación', 'sector'),
  ('marketing', 'Marketing Digital', 'sector'),
  ('ecommerce', 'E-commerce', 'sector'),
  ('finanzas', 'Finanzas', 'sector'),
  ('legal', 'Legal y Abogacía', 'sector'),
  ('turismo', 'Turismo y Hostelería', 'sector'),
  ('tecnologia', 'Tecnología', 'sector'),
  ('consultoria', 'Consultoría', 'sector')
ON CONFLICT (slug) DO NOTHING;