// Device Fingerprinting para Kit IA Emprendedor
(function () {
  'use strict';

  // Exportar para uso en otros módulos
  window.DeviceFingerprint = {
    /**
     * Genera un fingerprint único del dispositivo
     * Usa múltiples factores para crear un ID estable
     */
    async generate() {
      try {
        const factors = [];

        // 1. User Agent
        factors.push(navigator.userAgent);

        // 2. Idioma del navegador
        factors.push(navigator.language || navigator.userLanguage);

        // 3. Zona horaria
        factors.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

        // 4. Resolución de pantalla
        factors.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

        // 5. Plataforma
        factors.push(navigator.platform);

        // 6. Número de CPUs
        factors.push(navigator.hardwareConcurrency || 0);

        // 7. Memoria del dispositivo (si está disponible)
        if (navigator.deviceMemory) {
          factors.push(navigator.deviceMemory);
        }

        // 8. WebGL vendor y renderer
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            factors.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
            factors.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          }
        }

        // 9. Plugins instalados (para navegadores que lo soporten)
        if (navigator.plugins && navigator.plugins.length > 0) {
          const pluginNames = [];
          for (let i = 0; i < navigator.plugins.length; i++) {
            pluginNames.push(navigator.plugins[i].name);
          }
          factors.push(pluginNames.join(','));
        }

        // 10. Canvas fingerprint
        const canvasFingerprint = this._getCanvasFingerprint();
        factors.push(canvasFingerprint);

        // Combinar todos los factores
        const combined = factors.join('|');

        // Generar hash SHA-256
        const hash = await this._sha256(combined);

        // Tomar los primeros 16 caracteres para un ID más manejable
        const deviceId = hash.substring(0, 16);

        return {
          deviceId,
          factors: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        };
      } catch (error) {
        console.error('Error generating device fingerprint:', error);
        // Fallback: usar timestamp + random
        return {
          deviceId: `fallback-${Date.now().toString(36)}${Math.random().toString(36).substr(2, 9)}`,
          factors: { error: error.message }
        };
      }
    },

    /**
     * Canvas fingerprinting para mayor unicidad
     */
    _getCanvasFingerprint() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;

        // Texto con diferentes fuentes y estilos
        ctx.textBaseline = 'top';
        ctx.font = '14px "Arial"';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Kit IA Pro 🚀', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Kit IA Pro 🚀', 4, 17);

        // Obtener data URL
        return canvas.toDataURL();
      } catch (e) {
        return 'canvas-error';
      }
    },

    /**
     * Función hash SHA-256
     */
    async _sha256(message) {
      // Codificar como UTF-8
      const msgBuffer = new TextEncoder().encode(message);

      // Hash el mensaje
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

      // Convertir ArrayBuffer a hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      return hashHex;
    },

    /**
     * Verifica si el dispositivo actual está autorizado
     */
    async checkDeviceAuthorization(userId, userPlan = 'free') {
      try {
        const { deviceId, factors } = await this.generate();

        // Obtener dispositivos registrados del storage
        const stored = await chrome.storage.local.get(['registeredDevices']);
        const registeredDevices = stored.registeredDevices || {};

        // Dispositivos del usuario
        const userDevices = registeredDevices[userId] || [];

        // Límites por plan
        const deviceLimits = {
          free: 2,
          pro: 5,
          teams: 20,
          enterprise: -1 // Sin límite
        };

        const limit = deviceLimits[userPlan] || 2;

        // Verificar si este dispositivo ya está registrado
        const isRegistered = userDevices.some(device => device.deviceId === deviceId);

        if (isRegistered) {
          // Actualizar última actividad
          const updatedDevices = userDevices.map(device =>
            device.deviceId === deviceId
              ? { ...device, lastActive: new Date().toISOString() }
              : device
          );

          registeredDevices[userId] = updatedDevices;
          await chrome.storage.local.set({ registeredDevices });

          return {
            authorized: true,
            deviceId,
            deviceCount: userDevices.length,
            limit
          };
        }

        // Verificar si hay espacio para nuevo dispositivo
        if (limit !== -1 && userDevices.length >= limit) {
          return {
            authorized: false,
            reason: 'DEVICE_LIMIT_EXCEEDED',
            deviceId,
            deviceCount: userDevices.length,
            limit,
            message: `Has alcanzado el límite de ${limit} dispositivos para tu plan ${userPlan}. Por favor, desactiva la extensión en otro dispositivo o actualiza a un plan superior.`
          };
        }

        // Registrar nuevo dispositivo
        const newDevice = {
          deviceId,
          factors,
          registeredAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          deviceName: this._generateDeviceName(factors)
        };

        userDevices.push(newDevice);
        registeredDevices[userId] = userDevices;
        await chrome.storage.local.set({ registeredDevices });

        return {
          authorized: true,
          deviceId,
          deviceCount: userDevices.length,
          limit,
          newDevice: true
        };
      } catch (error) {
        console.error('Error checking device authorization:', error);
        return {
          authorized: false,
          reason: 'ERROR',
          error: error.message
        };
      }
    },

    /**
     * Genera un nombre descriptivo para el dispositivo
     */
    _generateDeviceName(factors) {
      const os = this._detectOS(factors.platform, factors.userAgent);
      const browser = this._detectBrowser(factors.userAgent);
      return `${os} - ${browser}`;
    },

    /**
     * Detecta el sistema operativo
     */
    _detectOS(platform, userAgent) {
      if (platform.includes('Win')) return 'Windows';
      if (platform.includes('Mac')) return 'macOS';
      if (platform.includes('Linux')) return 'Linux';
      if (platform.includes('Android')) return 'Android';
      if (platform.includes('iOS') || platform.includes('iPhone')) return 'iOS';
      return 'Unknown OS';
    },

    /**
     * Detecta el navegador
     */
    _detectBrowser(userAgent) {
      if (userAgent.includes('Chrome')) return 'Chrome';
      if (userAgent.includes('Firefox')) return 'Firefox';
      if (userAgent.includes('Safari')) return 'Safari';
      if (userAgent.includes('Edge')) return 'Edge';
      if (userAgent.includes('Opera')) return 'Opera';
      return 'Unknown Browser';
    },

    /**
     * Elimina un dispositivo de la lista
     */
    async removeDevice(userId, deviceIdToRemove) {
      try {
        const stored = await chrome.storage.local.get(['registeredDevices']);
        const registeredDevices = stored.registeredDevices || {};
        const userDevices = registeredDevices[userId] || [];

        // Filtrar el dispositivo
        const updatedDevices = userDevices.filter(device => device.deviceId !== deviceIdToRemove);

        registeredDevices[userId] = updatedDevices;
        await chrome.storage.local.set({ registeredDevices });

        return {
          success: true,
          remainingDevices: updatedDevices.length
        };
      } catch (error) {
        console.error('Error removing device:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    /**
     * Obtiene la lista de dispositivos del usuario
     */
    async getUserDevices(userId) {
      try {
        const stored = await chrome.storage.local.get(['registeredDevices']);
        const registeredDevices = stored.registeredDevices || {};
        const userDevices = registeredDevices[userId] || [];

        // Obtener el ID del dispositivo actual
        const { deviceId } = await this.generate();

        // Marcar el dispositivo actual
        return userDevices.map(device => ({
          ...device,
          isCurrent: device.deviceId === deviceId
        }));
      } catch (error) {
        console.error('Error getting user devices:', error);
        return [];
      }
    }
  };
})();
