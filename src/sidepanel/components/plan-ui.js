/**
 * Plan UI Components - Kit IA Emprendedor
 * Componentes de UI para mostrar características del plan
 * 
 * @module plan-ui
 */

import { planManager, PLANS } from '../../shared/plan-manager.js';
import SecureDOM from '../../utils/secure-dom.js';
import logger from '../../utils/logger.js';

/**
 * Crea el badge del plan actual
 */
export function createPlanBadge() {
  const plan = planManager.getCurrentPlan();
  const badge = document.createElement('div');
  badge.className = `plan-badge plan-badge-${plan.id}`;
  
  if (plan.id === 'premium') {
    SecureDOM.setHTML(badge, `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span>PREMIUM</span>
    `);
  } else if (plan.id === 'lite') {
    SecureDOM.setHTML(badge, `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      <span>LITE</span>
    `);
  }
  
  return badge;
}

/**
 * Crea el indicador de uso/límites
 */
export function createUsageIndicator(feature, current, limit) {
  const indicator = document.createElement('div');
  indicator.className = 'usage-indicator';
  
  const isUnlimited = limit === Infinity;
  const percentage = isUnlimited ? 0 : (current / limit) * 100;
  const isNearLimit = percentage >= 80;
  
  SecureDOM.setHTML(indicator, `
    <div class="usage-label">
      <span>${feature}</span>
      <span class="usage-count">${current}${isUnlimited ? '' : `/${limit}`}</span>
    </div>
    ${!isUnlimited ? `
      <div class="usage-bar">
        <div class="usage-progress ${isNearLimit ? 'near-limit' : ''}" style="width: ${percentage}%"></div>
      </div>
    ` : '<div class="usage-unlimited">Ilimitado</div>'}
  `);
  
  return indicator;
}

/**
 * Crea el CTA de upgrade para usuarios LITE/FREE
 */
export function createUpgradeCTA(context = 'generic') {
  const currentPlan = planManager.getCurrentPlan();
  
  // No mostrar CTA si ya es premium
  if (currentPlan.id === 'premium') return null;
  
  const cta = document.createElement('div');
  cta.className = 'upgrade-cta';
  
  // Solo hay LITE y PREMIUM, así que el objetivo siempre es PREMIUM
  const targetPlan = PLANS.premium;
  
  // Mensajes contextuales (solo para LITE -> PREMIUM)
  const messages = {
    generic: {
      title: '🚀 Desbloquea Todo el Potencial',
      subtitle: '✨ Acceso ilimitado a +50 GPTs Premium especializados para emprendedores'
    },
    gpt_locked: {
      title: '👑 GPT Premium Exclusivo',
      subtitle: 'Desbloquea este GPT especializado con el Plan Premium - Pago único de $47'
    },
    limit_reached: {
      title: '📈 ¡Es hora de crecer!',
      subtitle: `Maximiza tu productividad con acceso ilimitado a todos los GPTs`
    },
    feature_locked: {
      title: '💎 Función Premium',
      subtitle: 'Accede a herramientas avanzadas para llevar tu negocio al siguiente nivel'
    }
  };
  
  const message = messages[context] || messages.generic;
  
  SecureDOM.setHTML(cta, `
    <div class="upgrade-cta-content">
      <div class="upgrade-cta-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="url(#gradient-premium)" stroke-width="2">
          <defs>
            <linearGradient id="gradient-premium" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#FF6B00;stop-opacity:1" />
            </linearGradient>
          </defs>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      </div>
      <div class="upgrade-cta-text">
        <h4>${message.title}</h4>
        <p>${message.subtitle}</p>
      </div>
      <button class="btn btn-upgrade" data-target-plan="${targetPlan.id}">
        ${targetPlan.id === 'premium' ? '✨ Hazte Premium Ahora' : 'Hazte LITE'}
        <span class="price">${targetPlan.price === 0 ? 'GRATIS' : `$${targetPlan.price} (pago único)`}</span>
      </button>
    </div>
  `);
  
  // Event listener para el botón
  const upgradeBtn = cta.querySelector('.btn-upgrade');
  upgradeBtn.addEventListener('click', () => handleUpgradeClick(targetPlan.id));
  
  return cta;
}

/**
 * Crea un overlay para contenido bloqueado
 */
export function createLockedOverlay(type = 'gpt', requiredPlan = 'lite') {
  const overlay = document.createElement('div');
  overlay.className = 'locked-overlay';
  
  const plan = PLANS[requiredPlan];
  const icon = type === 'gpt' ? '🤖' : '🔐';
  
  SecureDOM.setHTML(overlay, `
    <div class="locked-content">
      <div class="locked-icon">${icon}</div>
      <h3>Contenido Bloqueado</h3>
      <p>Requiere ${plan.name}</p>
      <button class="btn btn-small btn-unlock" data-plan="${requiredPlan}">
        ${plan.price === 0 ? 'Plan Gratuito' : `Desbloquear por $${plan.price}`}
      </button>
    </div>
  `);
  
  const unlockBtn = overlay.querySelector('.btn-unlock');
  unlockBtn.addEventListener('click', () => handleUpgradeClick(requiredPlan));
  
  return overlay;
}

/**
 * Crea el panel de información del plan
 */
export function createPlanInfoPanel() {
  const currentPlan = planManager.getCurrentPlan();
  const panel = document.createElement('div');
  panel.className = 'plan-info-panel';
  
  // Obtener estadísticas de uso
  planManager.getUsageStats().then(stats => {
    SecureDOM.setHTML(panel, `
      <div class="plan-info-header">
        <h3>Tu Plan: ${currentPlan.name}</h3>
        ${createPlanBadge().outerHTML}
      </div>
      
      <div class="plan-usage-stats">
        ${stats.prompts.limit !== Infinity ? createUsageIndicator('Prompts', stats.prompts.used, stats.prompts.limit).outerHTML : ''}
        ${stats.favorites.limit !== Infinity ? createUsageIndicator('Favoritos', stats.favorites.used, stats.favorites.limit).outerHTML : ''}
        ${stats.gptUsageToday.limit !== Infinity ? createUsageIndicator('Uso diario GPTs', stats.gptUsageToday.used, stats.gptUsageToday.limit).outerHTML : ''}
      </div>
      
      <div class="plan-features">
        <h4>${currentPlan.id === 'premium' ? 'Tus beneficios Premium:' : 'Incluido en tu plan:'}</h4>
        <ul class="feature-list">
          ${getFeaturesList(currentPlan).map(feature => `
            <li class="available">
              ${feature.name}
            </li>
          `).join('')}
        </ul>
      </div>
      
      ${currentPlan.id !== 'premium' ? `
        <div class="plan-upgrade-section">
          ${createUpgradeCTA().outerHTML}
        </div>
      ` : ''}
    `);
  });
  
  return panel;
}

/**
 * Crea un tooltip de plan requerido
 */
export function createPlanTooltip(requiredPlan) {
  const plan = PLANS[requiredPlan];
  const tooltip = document.createElement('div');
  tooltip.className = 'plan-tooltip';
  
  SecureDOM.setHTML(tooltip, `
    <div class="tooltip-arrow"></div>
    <div class="tooltip-content">
      <strong>Requiere ${plan.name}</strong>
      <p>${plan.price === 0 ? 'GRATIS' : `$${plan.price} (pago único)`}</p>
    </div>
  `);
  
  return tooltip;
}

/**
 * Aplica restricciones de UI según el plan
 */
export function applyPlanRestrictions(element, feature) {
  const hasAccess = planManager.hasFeature(feature);
  
  if (!hasAccess) {
    element.classList.add('restricted');
    element.setAttribute('data-restricted', 'true');
    
    // Añadir tooltip o mensaje
    const requiredPlan = planManager.getRequiredPlanForFeature(feature);
    element.setAttribute('data-required-plan', requiredPlan);
    
    // Deshabilitar interacciones si es necesario
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
      element.disabled = true;
    }
  }
  
  return hasAccess;
}

/**
 * Helpers internos
 */

function getFeaturesList(plan) {
  // Mostrar solo los beneficios del plan actual, no las limitaciones
  const allFeatures = [];
  
  // Características principales según el plan
  if (plan.id === 'lite') {
    allFeatures.push(
      { name: '✓ Prompts ilimitados', available: true },
      { name: '✓ Favoritos ilimitados', available: true },
      { name: '✓ Exportar prompts', available: true },
      { name: '✓ Búsqueda avanzada', available: true },
      { name: '✓ Categorías personalizadas', available: true },
      { name: '✓ GPTs básicos gratuitos', available: true }
    );
  } else if (plan.id === 'premium') {
    allFeatures.push(
      { name: '✓ TODO lo del plan Lite', available: true },
      { name: '✓ Acceso a TODOS los GPTs Premium', available: true },
      { name: '✓ Soporte prioritario directo', available: true },
      { name: '✓ Actualizaciones anticipadas', available: true },
      { name: '✓ Comunidad exclusiva', available: true },
      { name: '✓ Sin anuncios ni promociones', available: true }
    );
  }
  
  return allFeatures;
}

function handleUpgradeClick(targetPlan) {
  logger.info('[PlanUI] Upgrade clicked:', targetPlan);
  
  // En producción, abrir página de upgrade
  const upgradeUrl = `https://iaemprendedor.com/kit-ia-extension-premium?from=extension&plan=${targetPlan}`;
  chrome.tabs.create({ url: upgradeUrl });
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'success' ? '#10B981' : '#3B82F6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: 10000;
    animation: slideUp 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Exportar funciones
export default {
  createPlanBadge,
  createUsageIndicator,
  createUpgradeCTA,
  createLockedOverlay,
  createPlanInfoPanel,
  createPlanTooltip,
  applyPlanRestrictions
};