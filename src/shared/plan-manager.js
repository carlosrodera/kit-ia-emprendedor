/**
 * Plan Manager - Kit IA Emprendedor
 * Gestiona la detección de planes y características disponibles
 * 
 * @module plan-manager
 */

import { logger } from './logger.js';
import auth from './auth.js';

/**
 * Mock data para desarrollo mientras no tengamos Supabase configurado
 * TODO: Eliminar cuando tengamos las tablas de planes en producción
 */
const MOCK_MODE = true;
const MOCK_USER_PLAN = 'lite'; // Cambiar a 'premium' para testear UI premium

/**
 * Planes disponibles y sus características
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Plan Gratuito',
    price: 0,
    features: {
      maxPrompts: 5,
      maxFavorites: 3,
      gptsAccess: 'basic', // Solo GPTs básicos
      syncEnabled: false,
      exportEnabled: false,
      multiSelectEnabled: false,
      advancedSearch: false,
      customCategories: false,
      prioritySupport: false
    },
    limits: {
      dailyGptUsage: 10,
      promptLength: 500
    }
  },
  lite: {
    id: 'lite',
    name: 'Kit IA Lite',
    price: 4.99,
    monthlyPrice: 4.99,
    features: {
      maxPrompts: 50,
      maxFavorites: 20,
      gptsAccess: 'lite', // GPTs Lite desbloqueables
      syncEnabled: true,
      exportEnabled: true,
      multiSelectEnabled: true,
      advancedSearch: true,
      customCategories: false,
      prioritySupport: false
    },
    limits: {
      dailyGptUsage: 100,
      promptLength: 2000
    }
  },
  premium: {
    id: 'premium',
    name: 'Kit IA Premium',
    price: 19.99,
    monthlyPrice: 19.99,
    features: {
      maxPrompts: -1, // Ilimitado
      maxFavorites: -1, // Ilimitado
      gptsAccess: 'all', // Todos los GPTs
      syncEnabled: true,
      exportEnabled: true,
      multiSelectEnabled: true,
      advancedSearch: true,
      customCategories: true,
      prioritySupport: true
    },
    limits: {
      dailyGptUsage: -1, // Ilimitado
      promptLength: 5000
    }
  }
};

/**
 * Estado del plan actual del usuario
 */
let currentUserPlan = null;
let planSubscribers = new Set();

/**
 * Clase principal del gestor de planes
 */
class PlanManager {
  constructor() {
    this.initialized = false;
    this.userProfile = null;
  }

  /**
   * Inicializa el gestor de planes
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('[PlanManager] Initializing...');

      // En modo mock, usar datos simulados
      if (MOCK_MODE) {
        await this.loadMockData();
      } else {
        await this.loadUserPlan();
      }

      this.initialized = true;
      logger.info('[PlanManager] Initialized successfully');
    } catch (error) {
      logger.error('[PlanManager] Error initializing:', error);
      // Por defecto, asumir plan free si hay error
      currentUserPlan = PLANS.free;
    }
  }

  /**
   * Carga datos simulados para desarrollo
   */
  async loadMockData() {
    logger.warn('[PlanManager] Using MOCK data for development');
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 500));

    // Datos mock del perfil de usuario
    this.userProfile = {
      id: 'mock-user-001',
      email: 'usuario@kitiaemprendedor.com',
      plan: MOCK_USER_PLAN,
      plan_started_at: new Date('2025-01-01').toISOString(),
      plan_expires_at: MOCK_USER_PLAN === 'premium' ? new Date('2025-12-31').toISOString() : null,
      trial_used: false,
      total_spent: MOCK_USER_PLAN === 'premium' ? 19.99 : MOCK_USER_PLAN === 'lite' ? 4.99 : 0,
      // GPTs desbloqueados (solo para plan lite)
      unlocked_gpts: MOCK_USER_PLAN === 'lite' ? ['gpt-001', 'gpt-003'] : []
    };

    currentUserPlan = PLANS[this.userProfile.plan];
    this.notifySubscribers();
  }

  /**
   * Carga el plan real del usuario desde Supabase
   */
  async loadUserPlan() {
    try {
      const user = auth.getCurrentUser();
      if (!user) {
        logger.warn('[PlanManager] No authenticated user');
        currentUserPlan = PLANS.free;
        return;
      }

      // TODO: Implementar llamada real a Supabase
      // const { data, error } = await supabase
      //   .from('users_profile')
      //   .select('*')
      //   .eq('id', user.id)
      //   .single();

      // Por ahora, usar plan free por defecto
      this.userProfile = {
        id: user.id,
        email: user.email,
        plan: 'free',
        plan_started_at: new Date().toISOString()
      };

      currentUserPlan = PLANS[this.userProfile.plan];
      this.notifySubscribers();
    } catch (error) {
      logger.error('[PlanManager] Error loading user plan:', error);
      currentUserPlan = PLANS.free;
    }
  }

  /**
   * Obtiene el plan actual del usuario
   */
  getCurrentPlan() {
    return currentUserPlan || PLANS.free;
  }

  /**
   * Obtiene el ID del plan actual
   */
  getCurrentPlanId() {
    return this.getCurrentPlan().id;
  }

  /**
   * Verifica si el usuario tiene un plan específico o superior
   */
  hasPlan(planId) {
    const planHierarchy = ['free', 'lite', 'premium'];
    const currentIndex = planHierarchy.indexOf(this.getCurrentPlanId());
    const requiredIndex = planHierarchy.indexOf(planId);
    
    return currentIndex >= requiredIndex;
  }

  /**
   * Verifica si el usuario es premium
   */
  isPremium() {
    return this.getCurrentPlanId() === 'premium';
  }

  /**
   * Verifica si el usuario es lite
   */
  isLite() {
    return this.getCurrentPlanId() === 'lite';
  }

  /**
   * Verifica si el usuario es free
   */
  isFree() {
    return this.getCurrentPlanId() === 'free';
  }

  /**
   * Verifica si una característica está disponible
   */
  hasFeature(featureName) {
    const plan = this.getCurrentPlan();
    return plan.features[featureName] === true || 
           (typeof plan.features[featureName] === 'number' && plan.features[featureName] > 0) ||
           plan.features[featureName] === 'all';
  }

  /**
   * Obtiene el límite de una característica
   */
  getFeatureLimit(featureName) {
    const plan = this.getCurrentPlan();
    const value = plan.features[featureName] || plan.limits?.[featureName];
    return value === -1 ? Infinity : (value || 0);
  }

  /**
   * Verifica si el usuario ha desbloqueado un GPT específico (para plan Lite)
   */
  hasUnlockedGPT(gptId) {
    if (this.isPremium()) return true; // Premium tiene acceso a todo
    if (this.isFree()) return false; // Free no tiene acceso a GPTs Lite
    
    // Para plan Lite, verificar si está desbloqueado
    return this.userProfile?.unlocked_gpts?.includes(gptId) || false;
  }

  /**
   * Obtiene información sobre qué plan necesita para una característica
   */
  getRequiredPlanForFeature(featureName) {
    for (const [planId, plan] of Object.entries(PLANS)) {
      if (plan.features[featureName] === true || 
          (typeof plan.features[featureName] === 'number' && plan.features[featureName] > 0) ||
          plan.features[featureName] === 'all') {
        return planId;
      }
    }
    return 'premium'; // Por defecto, premium
  }

  /**
   * Suscribe a cambios de plan
   */
  subscribe(callback) {
    planSubscribers.add(callback);
    return () => planSubscribers.delete(callback);
  }

  /**
   * Notifica a los suscriptores sobre cambios
   */
  notifySubscribers() {
    const plan = this.getCurrentPlan();
    planSubscribers.forEach(callback => {
      try {
        callback(plan);
      } catch (error) {
        logger.error('[PlanManager] Error in subscriber:', error);
      }
    });
  }

  /**
   * Actualiza el plan del usuario (para testing)
   */
  async updateUserPlan(newPlanId) {
    if (!MOCK_MODE) {
      logger.error('[PlanManager] Cannot update plan in production mode');
      return;
    }

    if (!PLANS[newPlanId]) {
      logger.error('[PlanManager] Invalid plan ID:', newPlanId);
      return;
    }

    this.userProfile.plan = newPlanId;
    currentUserPlan = PLANS[newPlanId];
    this.notifySubscribers();
    
    logger.info('[PlanManager] Plan updated to:', newPlanId);
  }

  /**
   * Obtiene estadísticas de uso
   */
  async getUsageStats() {
    // TODO: Implementar con datos reales
    return {
      prompts: {
        used: MOCK_MODE ? 3 : 0,
        limit: this.getFeatureLimit('maxPrompts')
      },
      favorites: {
        used: MOCK_MODE ? 5 : 0,
        limit: this.getFeatureLimit('maxFavorites')
      },
      gptUsageToday: {
        used: MOCK_MODE ? 15 : 0,
        limit: this.getFeatureLimit('dailyGptUsage')
      }
    };
  }
}

// Crear instancia singleton
export const planManager = new PlanManager();

// Exportar utilidades comunes
export const isPremium = () => planManager.isPremium();
export const isLite = () => planManager.isLite();
export const isFree = () => planManager.isFree();
export const hasFeature = (feature) => planManager.hasFeature(feature);
export const getCurrentPlan = () => planManager.getCurrentPlan();
export const hasPlan = (planId) => planManager.hasPlan(planId);

// Exportar por defecto
export default planManager;