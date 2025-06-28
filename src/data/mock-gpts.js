/**
 * Mock GPTs Data - Kit IA Emprendedor
 * Datos simulados de GPTs con información de tiers para testing
 * 
 * @module mock-gpts
 */

export const MOCK_GPTS = [
  // GPTs Básicos (disponibles para todos)
  {
    id: 'gpt-basic-001',
    name: 'ChatGPT Clásico',
    description: 'El asistente de IA original para conversaciones generales',
    category: 'Productivity',
    url: 'https://chat.openai.com/g/g-basic-001',
    tier: 'basic',
    tags: ['general', 'chat', 'asistente']
  },
  {
    id: 'gpt-basic-002',
    name: 'Escritor Creativo',
    description: 'Ayuda con redacción creativa y generación de contenido',
    category: 'Writing',
    url: 'https://chat.openai.com/g/g-basic-002',
    tier: 'basic',
    tags: ['escritura', 'creatividad', 'contenido']
  },
  
  // GPTs Lite (requieren plan Lite o compra individual)
  {
    id: 'gpt-lite-001',
    name: 'SEO Master Pro',
    description: 'Optimización avanzada de contenido para motores de búsqueda',
    category: 'Marketing',
    url: 'https://chat.openai.com/g/g-lite-001',
    tier: 'lite',
    tags: ['seo', 'marketing', 'optimización'],
    price: 4.99
  },
  {
    id: 'gpt-lite-002',
    name: 'Code Review Expert',
    description: 'Análisis profesional de código y mejores prácticas',
    category: 'Programming',
    url: 'https://chat.openai.com/g/g-lite-002',
    tier: 'lite',
    tags: ['código', 'programación', 'review'],
    price: 4.99
  },
  {
    id: 'gpt-lite-003',
    name: 'Business Plan Generator',
    description: 'Crea planes de negocio profesionales paso a paso',
    category: 'Business',
    url: 'https://chat.openai.com/g/g-lite-003',
    tier: 'lite',
    tags: ['negocios', 'emprendimiento', 'planificación'],
    price: 4.99
  },
  
  // GPTs Premium (solo para usuarios Premium)
  {
    id: 'gpt-premium-001',
    name: 'AI Business Consultant',
    description: 'Consultoría empresarial avanzada con IA para estrategias de crecimiento',
    category: 'Business',
    url: 'https://chat.openai.com/g/g-premium-001',
    tier: 'premium',
    tags: ['consultoría', 'estrategia', 'premium'],
    premiumFeatures: ['Análisis SWOT', 'Proyecciones financieras', 'Estrategias de mercado']
  },
  {
    id: 'gpt-premium-002',
    name: 'Legal Assistant Pro',
    description: 'Asistente legal avanzado para contratos y documentación',
    category: 'Legal',
    url: 'https://chat.openai.com/g/g-premium-002',
    tier: 'premium',
    tags: ['legal', 'contratos', 'premium'],
    premiumFeatures: ['Revisión de contratos', 'Plantillas legales', 'Análisis de riesgos']
  },
  {
    id: 'gpt-premium-003',
    name: 'Data Science Master',
    description: 'Análisis de datos avanzado y machine learning',
    category: 'Data Science',
    url: 'https://chat.openai.com/g/g-premium-003',
    tier: 'premium',
    tags: ['datos', 'análisis', 'ml', 'premium'],
    premiumFeatures: ['Análisis predictivo', 'Visualizaciones avanzadas', 'Modelos ML']
  }
];

/**
 * Simula la carga de GPTs desde el servidor
 */
export async function loadMockGPTs(userPlan = 'free') {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Devolver todos los GPTs pero con información de acceso
  return MOCK_GPTS.map(gpt => ({
    ...gpt,
    hasAccess: checkMockAccess(gpt, userPlan),
    isNew: Math.random() > 0.8, // 20% de probabilidad de ser nuevo
    isFeatured: Math.random() > 0.9 // 10% de probabilidad de ser destacado
  }));
}

/**
 * Verifica el acceso simulado según el plan
 */
function checkMockAccess(gpt, userPlan) {
  if (gpt.tier === 'basic') return true;
  if (gpt.tier === 'lite' && (userPlan === 'lite' || userPlan === 'premium')) return true;
  if (gpt.tier === 'premium' && userPlan === 'premium') return true;
  return false;
}

// Export default
export default {
  MOCK_GPTS,
  loadMockGPTs
};