// Componente de gestión de dispositivos
(function() {
  'use strict';

  window.DeviceManager = {
    /**
     * Muestra el modal de gestión de dispositivos
     */
    async showDeviceModal(deviceInfo) {
      const existingModal = document.getElementById('device-manager-modal');
      if (existingModal) {
        existingModal.remove();
      }

      const modal = document.createElement('div');
      modal.id = 'device-manager-modal';
      modal.className = 'device-modal-overlay';
      
      const isLimitExceeded = !deviceInfo.authorized && deviceInfo.reason === 'DEVICE_LIMIT_EXCEEDED';
      
      modal.innerHTML = `
        <div class="device-modal">
          <div class="device-modal-header">
            <h2 class="device-modal-title">
              ${isLimitExceeded ? '⚠️ Límite de Dispositivos Alcanzado' : '📱 Gestión de Dispositivos'}
            </h2>
            <button class="device-modal-close" id="close-device-modal">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          
          <div class="device-modal-content">
            ${isLimitExceeded ? `
              <div class="device-limit-warning">
                <p>Has alcanzado el límite de <strong>${deviceInfo.limit} dispositivos</strong> para tu plan <strong>${deviceInfo.plan || 'Free'}</strong>.</p>
                <p>Para usar la extensión en este dispositivo, debes:</p>
                <ul>
                  <li>Desactivar la extensión en otro dispositivo</li>
                  <li>O actualizar a un plan superior</li>
                </ul>
              </div>
            ` : `
              <div class="device-info">
                <p>Dispositivos activos: <strong>${deviceInfo.deviceCount}/${deviceInfo.limit}</strong></p>
              </div>
            `}
            
            <div class="device-list" id="device-list">
              <div class="loading-devices">
                <div class="spinner"></div>
                <p>Cargando dispositivos...</p>
              </div>
            </div>
            
            <div class="device-plans">
              <h3>Límites por Plan</h3>
              <div class="plan-grid">
                <div class="plan-card ${deviceInfo.plan === 'free' ? 'current' : ''}">
                  <h4>Free</h4>
                  <p class="device-limit">2 dispositivos</p>
                  ${deviceInfo.plan === 'free' ? '<span class="current-plan">Plan actual</span>' : ''}
                </div>
                <div class="plan-card ${deviceInfo.plan === 'pro' ? 'current' : ''}">
                  <h4>Pro</h4>
                  <p class="device-limit">5 dispositivos</p>
                  ${deviceInfo.plan === 'pro' ? '<span class="current-plan">Plan actual</span>' : ''}
                </div>
                <div class="plan-card ${deviceInfo.plan === 'teams' ? 'current' : ''}">
                  <h4>Teams</h4>
                  <p class="device-limit">20 dispositivos</p>
                  ${deviceInfo.plan === 'teams' ? '<span class="current-plan">Plan actual</span>' : ''}
                </div>
              </div>
              
              ${deviceInfo.plan === 'free' ? `
                <div class="upgrade-cta">
                  <button class="btn-upgrade" id="upgrade-plan-btn">
                    🚀 Actualizar Plan
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      // Agregar estilos
      this._addStyles();
      
      // Agregar al DOM
      document.body.appendChild(modal);
      
      // Event listeners
      const closeBtn = document.getElementById('close-device-modal');
      closeBtn.addEventListener('click', () => this.closeModal());
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
      
      const upgradeBtn = document.getElementById('upgrade-plan-btn');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          window.open('https://kit-ia-pro.com/pricing', '_blank');
        });
      }
      
      // Cargar lista de dispositivos
      await this._loadDeviceList();
    },
    
    /**
     * Carga y muestra la lista de dispositivos
     */
    async _loadDeviceList() {
      try {
        // Enviar mensaje al service worker
        const response = await chrome.runtime.sendMessage({
          type: 'GET_USER_DEVICES'
        });
        
        const deviceListEl = document.getElementById('device-list');
        
        if (!response.success) {
          deviceListEl.innerHTML = '<p class="error-message">Error al cargar dispositivos</p>';
          return;
        }
        
        const devices = response.data || [];
        
        if (devices.length === 0) {
          deviceListEl.innerHTML = '<p class="no-devices">No hay dispositivos registrados</p>';
          return;
        }
        
        deviceListEl.innerHTML = devices.map(device => `
          <div class="device-item ${device.isCurrent ? 'current-device' : ''}">
            <div class="device-info">
              <div class="device-name">
                ${device.isCurrent ? '✓ ' : ''}${device.deviceName}
              </div>
              <div class="device-meta">
                Registrado: ${new Date(device.registeredAt).toLocaleDateString()}
                ${device.isCurrent ? ' (Este dispositivo)' : ''}
              </div>
              <div class="device-meta">
                Última actividad: ${this._formatLastActive(device.lastActive)}
              </div>
            </div>
            ${!device.isCurrent ? `
              <button class="btn-remove-device" data-device-id="${device.deviceId}">
                🗑️ Eliminar
              </button>
            ` : ''}
          </div>
        `).join('');
        
        // Agregar event listeners a botones de eliminar
        deviceListEl.querySelectorAll('.btn-remove-device').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const deviceId = e.target.dataset.deviceId;
            if (confirm('¿Estás seguro de que quieres eliminar este dispositivo?')) {
              await this._removeDevice(deviceId);
            }
          });
        });
      } catch (error) {
        console.error('Error loading device list:', error);
        const deviceListEl = document.getElementById('device-list');
        deviceListEl.innerHTML = '<p class="error-message">Error al cargar dispositivos</p>';
      }
    },
    
    /**
     * Formatea la última actividad
     */
    _formatLastActive(dateString) {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 60) {
        return `hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
      } else if (hours < 24) {
        return `hace ${hours} hora${hours !== 1 ? 's' : ''}`;
      } else {
        return `hace ${days} día${days !== 1 ? 's' : ''}`;
      }
    },
    
    /**
     * Elimina un dispositivo
     */
    async _removeDevice(deviceId) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'REMOVE_DEVICE',
          data: { deviceId }
        });
        
        if (response.success) {
          // Recargar lista
          await this._loadDeviceList();
          
          // Mostrar notificación
          if (window.showToast) {
            window.showToast('Dispositivo eliminado correctamente', 'success');
          }
        } else {
          if (window.showToast) {
            window.showToast('Error al eliminar dispositivo', 'error');
          }
        }
      } catch (error) {
        console.error('Error removing device:', error);
        if (window.showToast) {
          window.showToast('Error al eliminar dispositivo', 'error');
        }
      }
    },
    
    /**
     * Cierra el modal
     */
    closeModal() {
      const modal = document.getElementById('device-manager-modal');
      if (modal) {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 300);
      }
    },
    
    /**
     * Agrega los estilos necesarios
     */
    _addStyles() {
      if (document.getElementById('device-manager-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'device-manager-styles';
      style.textContent = `
        .device-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }
        
        .device-modal-overlay.closing {
          animation: fadeOut 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .device-modal {
          background: var(--bg-primary, #0f0f0f);
          border: 1px solid var(--border-color, #2d2d2d);
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .device-modal-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #2d2d2d);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .device-modal-title {
          margin: 0;
          font-size: 20px;
          color: var(--text-primary, #e3e3e3);
        }
        
        .device-modal-close {
          background: none;
          border: none;
          color: var(--text-secondary, #a0a0a0);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .device-modal-close:hover {
          background: var(--bg-hover, #262626);
          color: var(--text-primary, #e3e3e3);
        }
        
        .device-modal-content {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        
        .device-limit-warning {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          color: var(--text-primary, #e3e3e3);
        }
        
        .device-limit-warning p {
          margin: 0 0 8px 0;
        }
        
        .device-limit-warning ul {
          margin: 8px 0 0 20px;
          padding: 0;
        }
        
        .device-info {
          margin-bottom: 20px;
          color: var(--text-primary, #e3e3e3);
        }
        
        .device-list {
          margin-bottom: 24px;
          min-height: 100px;
        }
        
        .loading-devices {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          color: var(--text-secondary, #a0a0a0);
        }
        
        .spinner {
          width: 24px;
          height: 24px;
          border: 2px solid var(--border-color, #2d2d2d);
          border-top-color: var(--accent-color, #4F46E5);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .device-item {
          background: var(--bg-secondary, #1a1a1a);
          border: 1px solid var(--border-color, #2d2d2d);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
        }
        
        .device-item.current-device {
          border-color: var(--accent-color, #4F46E5);
          background: rgba(79, 70, 229, 0.1);
        }
        
        .device-name {
          font-weight: 500;
          color: var(--text-primary, #e3e3e3);
          margin-bottom: 4px;
        }
        
        .device-meta {
          font-size: 12px;
          color: var(--text-secondary, #a0a0a0);
          margin-bottom: 2px;
        }
        
        .btn-remove-device {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #EF4444;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }
        
        .btn-remove-device:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }
        
        .device-plans {
          margin-top: 24px;
        }
        
        .device-plans h3 {
          margin: 0 0 16px 0;
          color: var(--text-primary, #e3e3e3);
          font-size: 16px;
        }
        
        .plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        
        .plan-card {
          background: var(--bg-secondary, #1a1a1a);
          border: 1px solid var(--border-color, #2d2d2d);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          position: relative;
        }
        
        .plan-card.current {
          border-color: var(--accent-color, #4F46E5);
          background: rgba(79, 70, 229, 0.1);
        }
        
        .plan-card h4 {
          margin: 0 0 8px 0;
          color: var(--text-primary, #e3e3e3);
        }
        
        .device-limit {
          margin: 0;
          color: var(--text-secondary, #a0a0a0);
          font-size: 14px;
        }
        
        .current-plan {
          position: absolute;
          top: 4px;
          right: 8px;
          font-size: 10px;
          color: var(--accent-color, #4F46E5);
          background: rgba(79, 70, 229, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }
        
        .upgrade-cta {
          text-align: center;
        }
        
        .btn-upgrade {
          background: var(--accent-color, #4F46E5);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-upgrade:hover {
          background: var(--accent-hover, #6366F1);
          transform: translateY(-1px);
        }
        
        .error-message, .no-devices {
          text-align: center;
          color: var(--text-secondary, #a0a0a0);
          padding: 20px;
        }
      `;
      
      document.head.appendChild(style);
    }
  };
})();