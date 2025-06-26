/**
 * Tests para el módulo de autenticación
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auth, setupAutoRefresh, stopAutoRefresh } from '../auth.js';
import storage from '../storage.js';
import { STORAGE_KEYS, CUSTOM_EVENTS } from '../constants.js';

// Mock de Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }))
}));

// Mock de chrome.identity
global.chrome = {
  identity: {
    getRedirectURL: vi.fn(() => 'chrome-extension://test/callback'),
    launchWebAuthFlow: vi.fn()
  },
  runtime: {
    lastError: null
  }
};

// Mock de storage
vi.mock('../storage.js', () => ({
  default: {
    auth: {
      getToken: vi.fn(),
      saveToken: vi.fn(),
      removeToken: vi.fn()
    },
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
}));

describe('Auth Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window events
    window.dispatchEvent = vi.fn();
  });

  afterEach(async () => {
    await auth.reset();
    stopAutoRefresh();
  });

  describe('initialize', () => {
    it('should initialize auth module successfully', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      await auth.initialize();

      expect(mockClient.auth.getSession).toHaveBeenCalled();
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getCurrentUser()).toEqual(mockSession.user);
    });

    it('should handle initialization without session', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      await auth.initialize();

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getCurrentUser()).toBe(null);
    });

    it('should handle initialization error', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();
      mockClient.auth.getSession.mockResolvedValue({
        data: null,
        error: new Error('Network error')
      });

      await expect(auth.initialize()).rejects.toThrow('Network error');
    });
  });

  describe('loginWithOAuth', () => {
    it('should login successfully with Google', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123'
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.signInWithOAuth.mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth/authorize?...' },
        error: null
      });

      mockClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: mockSession,
        error: null
      });

      // Mock chrome.identity.launchWebAuthFlow
      chrome.identity.launchWebAuthFlow.mockImplementation((options, callback) => {
        callback('chrome-extension://test/callback?code=auth_code_123');
      });

      const result = await auth.loginWithOAuth('google');

      expect(mockClient.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'chrome-extension://test/callback',
          skipBrowserRedirect: true
        }
      });

      expect(chrome.identity.launchWebAuthFlow).toHaveBeenCalled();
      expect(result.user).toEqual(mockSession.user);
    });

    it('should handle OAuth error', async () => {
      chrome.identity.launchWebAuthFlow.mockImplementation((options, callback) => {
        chrome.runtime.lastError = { message: 'User cancelled' };
        callback();
      });

      await expect(auth.loginWithOAuth('google')).rejects.toThrow('User cancelled');

      chrome.runtime.lastError = null;
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear data', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.signOut.mockResolvedValue({ error: null });

      await auth.logout();

      expect(mockClient.auth.signOut).toHaveBeenCalled();
      expect(storage.remove).toHaveBeenCalledWith([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.GPTS_CACHE,
        STORAGE_KEYS.FAVORITES,
        STORAGE_KEYS.PROMPTS,
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.NOTIFICATIONS_READ
      ]);
    });

    it('should handle logout error', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.signOut.mockResolvedValue({
        error: new Error('Logout failed')
      });

      await expect(auth.logout()).rejects.toThrow('Logout failed');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const newSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'new_token',
        expires_at: Math.floor(Date.now() / 1000) + 7200
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null
      });

      await auth.refreshSession();

      expect(mockClient.auth.refreshSession).toHaveBeenCalled();
    });

    it('should handle refresh error and logout on token expiry', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.refreshSession.mockResolvedValue({
        data: null,
        error: new Error('refresh_token is expired')
      });

      mockClient.auth.signOut.mockResolvedValue({ error: null });

      await expect(auth.refreshSession()).rejects.toThrow('refresh_token is expired');
      expect(mockClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('hasActiveSubscription', () => {
    it('should return true for active subscription', async () => {
      // First initialize with a user
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123'
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock subscription query
      const mockSubscription = {
        id: 'sub_123',
        user_id: '123',
        status: 'active'
      };

      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockSubscription,
                error: null
              })
            })
          })
        })
      });

      await auth.initialize();
      const hasSubscription = await auth.hasActiveSubscription();

      expect(hasSubscription).toBe(true);
    });

    it('should return false when no user is authenticated', async () => {
      const hasSubscription = await auth.hasActiveSubscription();
      expect(hasSubscription).toBe(false);
    });
  });

  describe('onAuthStateChange', () => {
    it('should add and call auth listeners', async () => {
      const listener = vi.fn();
      const unsubscribe = auth.onAuthStateChange(listener);

      // Simulate auth state change
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      // Get the callback that was passed to onAuthStateChange
      const authChangeCallback = mockClient.auth.onAuthStateChange.mock.calls[0]?.[0];

      if (authChangeCallback) {
        const mockSession = {
          user: { id: '123', email: 'test@example.com' },
          access_token: 'token123'
        };

        await authChangeCallback('SIGNED_IN', mockSession);

        expect(listener).toHaveBeenCalledWith('SIGNED_IN', mockSession);
      }

      // Test unsubscribe
      unsubscribe();
      listener.mockClear();

      if (authChangeCallback) {
        await authChangeCallback('SIGNED_OUT', null);
        expect(listener).not.toHaveBeenCalled();
      }
    });

    it('should emit custom event on auth state change', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      const authChangeCallback = mockClient.auth.onAuthStateChange.mock.calls[0]?.[0];

      if (authChangeCallback) {
        await authChangeCallback('SIGNED_IN', { user: { id: '123' } });

        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: CUSTOM_EVENTS.AUTH_STATE_CHANGED
          })
        );
      }
    });
  });

  describe('checkAuthStatus', () => {
    it('should return true for valid session', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123',
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      await auth.initialize();
      const isValid = await auth.checkAuthStatus();

      expect(isValid).toBe(true);
    });

    it('should refresh token when expiring soon', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123',
        expires_at: Math.floor(Date.now() / 1000) + 240 // 4 minutes from now
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();

      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      mockClient.auth.refreshSession.mockResolvedValue({
        data: { session: { ...mockSession, expires_at: Math.floor(Date.now() / 1000) + 3600 } },
        error: null
      });

      await auth.initialize();
      const isValid = await auth.checkAuthStatus();

      expect(mockClient.auth.refreshSession).toHaveBeenCalled();
      expect(isValid).toBe(true);
    });
  });

  describe('setupAutoRefresh', () => {
    it('should setup auto refresh interval', () => {
      vi.useFakeTimers();

      setupAutoRefresh();

      // Fast forward 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);

      // Auto refresh should have been called
      // Note: In real implementation, checkAuthStatus would be called

      vi.useRealTimers();
    });

    it('should stop auto refresh', () => {
      setupAutoRefresh();
      stopAutoRefresh();

      // Verify interval is cleared (implementation specific)
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when authenticated', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' },
        access_token: 'token123'
      };

      const { createClient } = await import('@supabase/supabase-js');
      const mockClient = createClient();
      mockClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      await auth.initialize();

      expect(auth.getAccessToken()).toBe('token123');
    });

    it('should return null when not authenticated', () => {
      expect(auth.getAccessToken()).toBe(null);
    });
  });
});
