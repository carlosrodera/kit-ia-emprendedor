/**
 * Plan UI Components - Kit IA Emprendedor
 * Componentes de UI para mostrar características del plan
 * 
 * @module plan-ui
 */

import { planManager, PLANS } from '../../shared/plan-manager.js';
import { logger } from '../../shared/logger.js';

/**
 * Crea el badge del plan actual
 */
export function createPlanBadge() {
  const plan = planManager.getCurrentPlan();
  const badge = document.createElement('div');
  badge.className = `plan-badge plan-badge-${plan.id}`;
  
  if (plan.id === 'premium') {
    badge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span>PREMIUM</span>
    `;
  } else if (plan.id === 'lite') {
    badge.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
      </svg>
      <span>LITE</span>
    `;
  } else {
    badge.innerHTML = `<span>GRATIS</span>`;
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
  
  indicator.innerHTML = `
    <div class="usage-label">
      <span>${feature}</span>
      <span class="usage-count">${current}${isUnlimited ? '' : `/${limit}`}</span>
    </div>
    ${!isUnlimited ? `
      <div class="usage-bar">
        <div class="usage-progress ${isNearLimit ? 'near-limit' : ''}" style="width: ${percentage}%"></div>
      </div>
    ` : '<div class="usage-unlimited">Ilimitado</div>'}
  `;
  
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
  
  // Determinar el plan objetivo
  const targetPlan = currentPlan.id === 'free' ? PLANS.lite : PLANS.premium;
  
  // Mensajes contextuales
  const messages = {
    generic: {
      title: currentPlan.id === 'free' ? '🚀 Desbloquea más funciones' : '⭐ Hazte Premium',
      subtitle: currentPlan.id === 'free' 
        ? 'Accede a más GPTs y características avanzadas' 
        : 'Acceso ilimitado a todos los GPTs y funciones'
    },
    gpt_locked: {
      title: '🔒 GPT Bloqueado',
      subtitle: currentPlan.id === 'free'
        ? 'Hazte LITE para desbloquear este GPT por solo $4.99'
        : 'Este GPT requiere el plan Premium'
    },
    limit_reached: {
      title: '⚠️ Límite alcanzado',
      subtitle: `Has alcanzado el límite de tu plan ${currentPlan.name}`
    },
    feature_locked: {
      title: '🔐 Función Premium',
      subtitle: 'Esta función requiere un plan superior'
    }
  };
  
  const message = messages[context] || messages.generic;
  
  cta.innerHTML = `
    <div class="upgrade-cta-content">
      <div class="upgrade-cta-icon">
        ${targetPlan.id === 'premium' ? '👑' : '💎'}
      </div>
      <div class="upgrade-cta-text">
        <h4>${message.title}</h4>
        <p>${message.subtitle}</p>
      </div>
      <button class="btn btn-upgrade" data-target-plan="${targetPlan.id}">
        ${targetPlan.id === 'premium' ? 'Upgrade a Premium' : 'Hazte LITE'}
        <span class="price">$${targetPlan.monthlyPrice}/mes</span>
      </button>
    </div>
  `;
  
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
  
  overlay.innerHTML = `
    <div class="locked-content">
      <div class="locked-icon">${icon}</div>
      <h3>Contenido Bloqueado</h3>
      <p>Requiere ${plan.name}</p>
      <button class="btn btn-small btn-unlock" data-plan="${requiredPlan}">
        Desbloquear por $${plan.monthlyPrice}
      </button>
    </div>
  `;
  
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
    panel.innerHTML = `
      <div class="plan-info-header">
        <h3>Tu Plan: ${currentPlan.name}</h3>
        ${createPlanBadge().outerHTML}
      </div>
      
      <div class="plan-usage-stats">
        ${createUsageIndicator('Prompts', stats.prompts.used, stats.prompts.limit).outerHTML}
        ${createUsageIndicator('Favoritos', stats.favorites.used, stats.favorites.limit).outerHTML}
        ${createUsageIndicator('Uso diario GPTs', stats.gptUsageToday.used, stats.gptUsageToday.limit).outerHTML}
      </div>
      
      <div class="plan-features">
        <h4>Características de tu plan:</h4>
        <ul class="feature-list">
          ${getFeaturesList(currentPlan).map(feature => `
            <li class="${feature.available ? 'available' : 'unavailable'}">
              ${feature.available ? '✓' : '✗'} ${feature.name}
            </li>
          `).join('')}
        </ul>
      </div>
      
      ${currentPlan.id !== 'premium' ? `
        <div class="plan-upgrade-section">
          ${createUpgradeCTA().outerHTML}
        </div>
      ` : ''}
    `;
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
  
  tooltip.innerHTML = `
    <div class="tooltip-arrow"></div>
    <div class="tooltip-content">
      <strong>Requiere ${plan.name}</strong>
      <p>$${plan.monthlyPrice}/mes</p>
    </div>
  `;
  
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
  return [
    { name: 'Sincronización en la nube', available: plan.features.syncEnabled },
    { name: 'Exportar prompts', available: plan.features.exportEnabled },
    { name: 'Selección múltiple', available: plan.features.multiSelectEnabled },
    { name: 'Búsqueda avanzada', available: plan.features.advancedSearch },
    { name: 'Categorías personalizadas', available: plan.features.customCategories },
    { name: 'Soporte prioritario', available: plan.features.prioritySupport },
    { name: `${plan.features.maxPrompts === -1 ? 'Prompts ilimitados' : `Hasta ${plan.features.maxPrompts} prompts`}`, available: true },
    { name: `${plan.features.maxFavorites === -1 ? 'Favoritos ilimitados' : `Hasta ${plan.features.maxFavorites} favoritos`}`, available: true }
  ];
}

function handleUpgradeClick(targetPlan) {
  logger.info('[PlanUI] Upgrade clicked:', targetPlan);
  
  // En desarrollo, cambiar el plan mock
  if (planManager.updateUserPlan) {
    planManager.updateUserPlan(targetPlan);
    showToast(`✅ Plan actualizado a ${PLANS[targetPlan].name} (MODO DESARROLLO)`, 'success');
    
    // Recargar la página para aplicar cambios
    setTimeout(() => location.reload(), 1500);
    return;
  }
  
  // En producción, abrir página de upgrade
  const upgradeUrl = `https://kitiaemprendedor.com/upgrade?plan=${targetPlan}&from=extension`;
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