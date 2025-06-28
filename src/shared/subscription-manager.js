/**
 * Subscription Manager - Kit IA Emprendedor
 * Gestiona el estado de suscripción y verifica acceso premium
 * 
 * @module subscription-manager
 */

import logger from '../utils/logger.js';
import { STORAGE_KEYS } from './constants.js';
import configManager from '../utils/config-manager.js';

class SubscriptionManager {
  constructor() {
    this.subscriptionCache = null;
    this.cacheExpiry = null;
    this.CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
  }

  /**
   * Verifica si el usuario tiene acceso premium
   * @param {string} userId - ID del usuario
   * @returns {Promise<{hasAccess: boolean, licenseType: string, expiresAt: string|null}>}
   */
  async checkUserAccess(userId) {
    try {
      logger.debug('[SubscriptionManager] Checking access for user:', userId);

      // Verificar cache primero
      if (this.isValidCache()) {
        logger.debug('[SubscriptionManager] Returning cached subscription data');
        return this.subscriptionCache;
      }

      // En producción, esto llamaría a la API de Stripe
      // Por ahora, verificar en Supabase si el usuario tiene un registro de pago
      const subscriptionData = await this.fetchSubscriptionFromSupabase(userId);
      
      // Actualizar cache
      this.subscriptionCache = subscriptionData;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;

      return subscriptionData;
    } catch (error) {
      logger.error('[SubscriptionManager] Error checking user access:', error);
      // En caso de error, asumir LITE para no bloquear al usuario
      return {
        hasAccess: false,
        licenseType: 'lite',
        expiresAt: null
      };
    }
  }

  /**
   * Obtiene datos de suscripción desde Supabase
   * @private
   */
  async fetchSubscriptionFromSupabase(userId) {
    try {
      // TODO: Implementar cuando se configure la tabla de suscripciones
      // Por ahora, retornar LITE por defecto
      return {
        hasAccess: false,
        licenseType: 'lite',
        expiresAt: null
      };
    } catch (error) {
      logger.error('[SubscriptionManager] Error fetching from Supabase:', error);
      throw error;
    }
  }

  /**
   * Verifica si un usuario puede usar una característica específica
   * @param {string} userId - ID del usuario
   * @param {string} feature - Nombre de la característica
   * @returns {Promise<boolean>}
   */
  async canUseFeature(userId, feature) {
    const subscription = await this.checkUserAccess(userId);
    
    // Definir qué características requieren premium
    const premiumFeatures = [
      'premium_gpts',
      'unlimited_gpt_usage',
      'priority_support',
      'no_ads'
    ];

    if (premiumFeatures.includes(feature)) {
      return subscription.licenseType === 'premium';
    }

    // Por defecto, las características están disponibles para todos
    return true;
  }

  /**
   * Valida si el cache es válido
   * @private
   */
  isValidCache() {
    return this.subscriptionCache && this.cacheExpiry && Date.now() < this.cacheExpiry;
  }

  /**
   * Limpia el cache de suscripción
   */
  clearCache() {
    this.subscriptionCache = null;
    this.cacheExpiry = null;
    logger.debug('[SubscriptionManager] Cache cleared');
  }

  /**
   * Procesa un webhook de Stripe (para cuando se implemente)
   * @param {Object} event - Evento de Stripe
   */
  async handleStripeWebhook(event) {
    logger.info('[SubscriptionManager] Processing Stripe webhook:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        // Usuario completó el pago
        await this.activatePremium(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        // Suscripción actualizada
        await this.updateSubscription(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        // Suscripción cancelada
        await this.deactivatePremium(event.data.object);
        break;
        
      default:
        logger.debug('[SubscriptionManager] Unhandled webhook type:', event.type);
    }
    
    // Limpiar cache para forzar actualización
    this.clearCache();
  }

  /**
   * Activa acceso premium para un usuario
   * @private
   */
  async activatePremium(session) {
    // TODO: Implementar cuando se configure Stripe
    logger.info('[SubscriptionManager] Premium would be activated for session:', session.id);
  }

  /**
   * Actualiza datos de suscripción
   * @private
   */
  async updateSubscription(subscription) {
    // TODO: Implementar cuando se configure Stripe
    logger.info('[SubscriptionManager] Subscription would be updated:', subscription.id);
  }

  /**
   * Desactiva acceso premium
   * @private
   */
  async deactivatePremium(subscription) {
    // TODO: Implementar cuando se configure Stripe
    logger.info('[SubscriptionManager] Premium would be deactivated:', subscription.id);
  }

  /**
   * Obtiene URL de checkout de Stripe
   * @param {string} userId - ID del usuario
   * @param {string} priceId - ID del precio en Stripe
   * @returns {Promise<string>} URL de checkout
   */
  async getCheckoutUrl(userId, priceId) {
    try {
      // TODO: Implementar cuando se configure Stripe
      // Por ahora, retornar URL del sitio web
      const baseUrl = configManager.get('WEBSITE_URL', 'https://kitiaemprendedor.com');
      return `${baseUrl}/premium?userId=${userId}`;
    } catch (error) {
      logger.error('[SubscriptionManager] Error creating checkout URL:', error);
      throw error;
    }
  }
}

// Crear instancia singleton
const subscriptionManager = new SubscriptionManager();

// Exportar métodos
export default {
  checkUserAccess: (userId) => subscriptionManager.checkUserAccess(userId),
  canUseFeature: (userId, feature) => subscriptionManager.canUseFeature(userId, feature),
  clearCache: () => subscriptionManager.clearCache(),
  handleStripeWebhook: (event) => subscriptionManager.handleStripeWebhook(event),
  getCheckoutUrl: (userId, priceId) => subscriptionManager.getCheckoutUrl(userId, priceId)
};

export { subscriptionManager };