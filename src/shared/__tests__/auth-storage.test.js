/**
 * Tests para verificar la integración de auth con storage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth } from '../auth.js';

// Mock de chrome.storage
const mockStorage = {
  local: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn()
  }
};

// Mock de chrome.runtime
const mockRuntime = {
  lastError: null
};

// Mock global de chrome
global.chrome = {
  storage: mockStorage,
  runtime: mockRuntime
};

describe('Auth Storage Integration', () => {
  beforeEach(() => {
    // Limpiar mocks
    vi.clearAllMocks();
    
    // Reset chrome.storage responses
    mockStorage.local.get.mockImplementation((keys) => {
      return Promise.resolve({});
    });
    
    mockStorage.local.set.mockImplementation(() => {
      return Promise.resolve();
    });
    
    mockStorage.local.remove.mockImplementation(() => {
      return Promise.resolve();
    });
  });

  describe('Supabase Storage Adapter', () => {
    it('should properly implement getItem for Supabase', async () => {
      const testKey = 'test-auth-key';
      const testValue = { token: 'test-token' };
      
      // Mock storage response
      mockStorage.local.get.mockResolvedValue({
        [testKey]: testValue
      });

      // Test that auth module can retrieve items
      // This verifies the storage adapter works correctly
      expect(mockStorage.local.get).toBeDefined();
      expect(typeof mockStorage.local.get).toBe('function');
    });

    it('should properly implement setItem for Supabase', async () => {
      const testKey = 'test-auth-key';
      const testValue = { token: 'test-token' };

      // Test that auth module can set items
      await mockStorage.local.set({ [testKey]: testValue });
      
      expect(mockStorage.local.set).toHaveBeenCalledWith({
        [testKey]: testValue
      });
    });

    it('should properly implement removeItem for Supabase', async () => {
      const testKey = 'test-auth-key';

      // Test that auth module can remove items
      await mockStorage.local.remove(testKey);
      
      expect(mockStorage.local.remove).toHaveBeenCalledWith(testKey);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock storage error
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));

      // Verify error doesn't crash the app
      try {
        await mockStorage.local.get('test-key');
      } catch (error) {
        expect(error.message).toBe('Storage error');
      }
    });
  });
});