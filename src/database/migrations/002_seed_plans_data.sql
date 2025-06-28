-- Migration: Seed Initial Data for Plans System
-- Version: 002
-- Date: 2025-01-28
-- Description: Add sample GPTs for Lite and Premium tiers

-- ============================================
-- 1. SEED GPTs LITE (Pago Individual)
-- ============================================

INSERT INTO gpts_lite (slug, name, description, category_id, chat_link, icon_url, is_featured, tags, unlock_price, original_price, discount_percentage, order_index) VALUES
  -- Creativos
  ('logo-generator-pro', 'Logo Generator Pro', 'Crea logos profesionales con IA. Incluye variaciones, mockups y archivos vectoriales.', 
   (SELECT id FROM categories WHERE slug = 'creative'), 
   'https://chat.openai.com/g/g-logo-gen-pro', 
   'https://example.com/icons/logo-gen.svg',
   true,
   ARRAY['diseño', 'branding', 'logos'],
   4.99, 9.99, 50, 1),
   
  ('social-media-designer', 'Social Media Designer', 'Diseña posts, stories y banners optimizados para cada red social.',
   (SELECT id FROM categories WHERE slug = 'creative'),
   'https://chat.openai.com/g/g-social-designer',
   'https://example.com/icons/social-design.svg',
   true,
   ARRAY['diseño', 'redes sociales', 'marketing'],
   4.99, 9.99, 50, 2),

  -- Productividad
  ('email-writer-pro', 'Email Writer Pro', 'Redacta emails profesionales, newsletters y campañas de email marketing.',
   (SELECT id FROM categories WHERE slug = 'productivity'),
   'https://chat.openai.com/g/g-email-writer',
   'https://example.com/icons/email-writer.svg',
   false,
   ARRAY['email', 'marketing', 'comunicación'],
   4.99, 9.99, 50, 3),

  ('meeting-summarizer', 'Meeting Summarizer', 'Transcribe y resume reuniones, extrae acciones y genera minutas profesionales.',
   (SELECT id FROM categories WHERE slug = 'productivity'),
   'https://chat.openai.com/g/g-meeting-sum',
   'https://example.com/icons/meeting.svg',
   false,
   ARRAY['productividad', 'reuniones', 'transcripción'],
   4.99, 9.99, 50, 4),

  -- Programación
  ('code-reviewer-expert', 'Code Reviewer Expert', 'Analiza código, detecta bugs, sugiere mejoras y aplica mejores prácticas.',
   (SELECT id FROM categories WHERE slug = 'programming'),
   'https://chat.openai.com/g/g-code-reviewer',
   'https://example.com/icons/code-review.svg',
   true,
   ARRAY['desarrollo', 'código', 'calidad'],
   4.99, 9.99, 50, 5),

  ('api-doc-generator', 'API Documentation Generator', 'Genera documentación completa de APIs con ejemplos y especificaciones OpenAPI.',
   (SELECT id FROM categories WHERE slug = 'programming'),
   'https://chat.openai.com/g/g-api-doc',
   'https://example.com/icons/api-doc.svg',
   false,
   ARRAY['desarrollo', 'documentación', 'apis'],
   4.99, 9.99, 50, 6),

  -- Escritura
  ('seo-content-optimizer', 'SEO Content Optimizer', 'Optimiza contenido para SEO con keywords, meta descripciones y estructura.',
   (SELECT id FROM categories WHERE slug = 'writing'),
   'https://chat.openai.com/g/g-seo-optimizer',
   'https://example.com/icons/seo.svg',
   true,
   ARRAY['seo', 'contenido', 'marketing'],
   4.99, 9.99, 50, 7),

  ('copywriting-master', 'Copywriting Master', 'Crea copy persuasivo para ventas, landing pages y campañas publicitarias.',
   (SELECT id FROM categories WHERE slug = 'writing'),
   'https://chat.openai.com/g/g-copywriting',
   'https://example.com/icons/copywriting.svg',
   false,
   ARRAY['copywriting', 'ventas', 'marketing'],
   4.99, 9.99, 50, 8),

  -- Investigación
  ('market-research-analyst', 'Market Research Analyst', 'Analiza mercados, competencia y tendencias con datos actualizados.',
   (SELECT id FROM categories WHERE slug = 'research'),
   'https://chat.openai.com/g/g-market-research',
   'https://example.com/icons/market-research.svg',
   false,
   ARRAY['investigación', 'mercado', 'análisis'],
   4.99, 9.99, 50, 9),

  ('academic-paper-helper', 'Academic Paper Helper', 'Ayuda con papers académicos, citas, bibliografía y formato APA/MLA.',
   (SELECT id FROM categories WHERE slug = 'research'),
   'https://chat.openai.com/g/g-academic-paper',
   'https://example.com/icons/academic.svg',
   false,
   ARRAY['académico', 'investigación', 'papers'],
   4.99, 9.99, 50, 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. SEED GPTs PREMIUM (Solo Plan Premium)
-- ============================================

INSERT INTO gpts_premium (slug, name, description, category_id, chat_link, icon_url, is_featured, is_exclusive, tags, premium_features, support_level, update_frequency, order_index) VALUES
  -- Creativos Premium
  ('brand-identity-suite', 'Brand Identity Suite', 'Sistema completo de branding: logo, paleta, tipografía, guías de estilo y aplicaciones.',
   (SELECT id FROM categories WHERE slug = 'creative'),
   'https://chat.openai.com/g/g-brand-suite',
   'https://example.com/icons/brand-suite.svg',
   true, true,
   ARRAY['branding', 'diseño', 'identidad corporativa'],
   ARRAY['Generación ilimitada de variaciones', 'Export en todos los formatos', 'Brand guidelines automáticas', 'Mockups 3D'],
   'priority', 'weekly', 1),

  ('video-content-creator', 'Video Content Creator', 'Crea guiones, storyboards y estrategias completas para video marketing.',
   (SELECT id FROM categories WHERE slug = 'creative'),
   'https://chat.openai.com/g/g-video-creator',
   'https://example.com/icons/video-creator.svg',
   true, true,
   ARRAY['video', 'contenido', 'youtube'],
   ARRAY['Análisis de tendencias en tiempo real', 'Optimización por plataforma', 'Templates de edición', 'Calendario de contenido'],
   'priority', 'weekly', 2),

  -- Productividad Premium
  ('business-automation-expert', 'Business Automation Expert', 'Automatiza procesos empresariales completos con workflows y integraciones.',
   (SELECT id FROM categories WHERE slug = 'productivity'),
   'https://chat.openai.com/g/g-automation',
   'https://example.com/icons/automation.svg',
   true, true,
   ARRAY['automatización', 'procesos', 'eficiencia'],
   ARRAY['Análisis de procesos actual', 'Diseño de workflows', 'Integraciones con 100+ herramientas', 'ROI calculator'],
   'dedicated', 'daily', 3),

  ('project-management-ai', 'Project Management AI', 'Gestiona proyectos complejos con metodologías ágiles y tradicionales.',
   (SELECT id FROM categories WHERE slug = 'productivity'),
   'https://chat.openai.com/g/g-project-mgmt',
   'https://example.com/icons/project-mgmt.svg',
   false, true,
   ARRAY['gestión', 'proyectos', 'scrum'],
   ARRAY['Generación de Gantt', 'Sprint planning', 'Risk assessment', 'Team performance analytics'],
   'priority', 'weekly', 4),

  -- Programación Premium
  ('fullstack-architect', 'Fullstack Architect', 'Diseña arquitecturas completas, desde base de datos hasta frontend.',
   (SELECT id FROM categories WHERE slug = 'programming'),
   'https://chat.openai.com/g/g-fullstack',
   'https://example.com/icons/fullstack.svg',
   true, true,
   ARRAY['arquitectura', 'fullstack', 'diseño de sistemas'],
   ARRAY['Diagramas de arquitectura', 'Stack recommendations', 'Security analysis', 'Performance optimization'],
   'dedicated', 'daily', 5),

  ('ai-ml-consultant', 'AI/ML Consultant', 'Consultor experto en implementación de IA y Machine Learning en tu negocio.',
   (SELECT id FROM categories WHERE slug = 'programming'),
   'https://chat.openai.com/g/g-ai-consultant',
   'https://example.com/icons/ai-ml.svg',
   true, true,
   ARRAY['inteligencia artificial', 'machine learning', 'consultoría'],
   ARRAY['Feasibility analysis', 'Model selection', 'Implementation roadmap', 'ROI projections'],
   'dedicated', 'weekly', 6),

  -- Escritura Premium
  ('book-writing-coach', 'Book Writing Coach', 'Coach personal para escribir y publicar tu libro, desde la idea hasta Amazon.',
   (SELECT id FROM categories WHERE slug = 'writing'),
   'https://chat.openai.com/g/g-book-coach',
   'https://example.com/icons/book-coach.svg',
   false, true,
   ARRAY['escritura', 'libros', 'publicación'],
   ARRAY['Plot development', 'Character sheets', 'Publishing strategy', 'Marketing plan'],
   'priority', 'weekly', 7),

  ('content-strategy-master', 'Content Strategy Master', 'Estratega de contenido integral: calendario editorial, KPIs y análisis.',
   (SELECT id FROM categories WHERE slug = 'writing'),
   'https://chat.openai.com/g/g-content-strategy',
   'https://example.com/icons/content-strategy.svg',
   true, true,
   ARRAY['estrategia', 'contenido', 'marketing'],
   ARRAY['Competitor analysis', 'Content calendar', 'Performance tracking', 'A/B testing recommendations'],
   'priority', 'daily', 8),

  -- Investigación Premium
  ('data-science-analyst', 'Data Science Analyst', 'Análisis avanzado de datos con visualizaciones y modelos predictivos.',
   (SELECT id FROM categories WHERE slug = 'research'),
   'https://chat.openai.com/g/g-data-science',
   'https://example.com/icons/data-science.svg',
   true, true,
   ARRAY['data science', 'análisis', 'visualización'],
   ARRAY['Custom dashboards', 'Predictive models', 'Statistical analysis', 'Real-time data processing'],
   'dedicated', 'daily', 9),

  ('business-intelligence-pro', 'Business Intelligence Pro', 'BI completo para tu negocio: KPIs, dashboards y reportes ejecutivos.',
   (SELECT id FROM categories WHERE slug = 'research'),
   'https://chat.openai.com/g/g-bi-pro',
   'https://example.com/icons/bi-pro.svg',
   false, true,
   ARRAY['business intelligence', 'kpis', 'reportes'],
   ARRAY['Executive dashboards', 'Automated reports', 'Trend analysis', 'Competitive benchmarking'],
   'priority', 'weekly', 10)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 3. UPDATE STATISTICS (Simulate usage)
-- ============================================

-- Update some GPTs Lite with purchase statistics
UPDATE gpts_lite SET 
  times_purchased = 234,
  average_rating = 4.7,
  total_reviews = 89
WHERE slug = 'logo-generator-pro';

UPDATE gpts_lite SET 
  times_purchased = 156,
  average_rating = 4.5,
  total_reviews = 67
WHERE slug = 'social-media-designer';

UPDATE gpts_lite SET 
  times_purchased = 189,
  average_rating = 4.8,
  total_reviews = 92
WHERE slug = 'code-reviewer-expert';

UPDATE gpts_lite SET 
  times_purchased = 167,
  average_rating = 4.6,
  total_reviews = 78
WHERE slug = 'seo-content-optimizer';

-- Update some GPTs Premium with usage statistics
UPDATE gpts_premium SET 
  times_used = 1234,
  average_rating = 4.9,
  total_reviews = 234
WHERE slug = 'brand-identity-suite';

UPDATE gpts_premium SET 
  times_used = 987,
  average_rating = 4.8,
  total_reviews = 189
WHERE slug = 'business-automation-expert';

UPDATE gpts_premium SET 
  times_used = 1456,
  average_rating = 4.9,
  total_reviews = 267
WHERE slug = 'fullstack-architect';

UPDATE gpts_premium SET 
  times_used = 876,
  average_rating = 4.7,
  total_reviews = 156
WHERE slug = 'content-strategy-master';

-- ============================================
-- 4. CREATE SAMPLE NOTIFICATIONS FOR NEW FEATURES
-- ============================================

INSERT INTO notifications (title, message, type, icon, action_url, action_text, priority) VALUES
  ('🎉 Nuevos GPTs Premium Disponibles', 
   'Descubre los nuevos GPTs exclusivos para miembros Premium. Automatización avanzada, análisis de datos y más.',
   'important', '🚀', '/premium', 'Ver GPTs Premium', 100),
   
  ('💎 GPTs Lite con 50% de Descuento', 
   'Desbloquea GPTs especializados por solo $4.99. Oferta limitada en herramientas profesionales.',
   'success', '💰', '/lite', 'Ver Ofertas', 90),
   
  ('🎁 Prueba Premium Gratis por 7 Días', 
   'Accede a todos los GPTs Premium sin costo. Sin tarjeta de crédito requerida.',
   'info', '🎁', '/trial', 'Activar Prueba', 80)
ON CONFLICT DO NOTHING;

-- ============================================
-- End of seed migration
-- ============================================