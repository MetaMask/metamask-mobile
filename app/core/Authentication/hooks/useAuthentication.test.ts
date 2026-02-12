import { renderHook } from '@testing-library/react-hooks';

// Import useAuthentication
import useAuthentication from './useAuthentication';

describe('useAuthentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hook initialization', () => {
    it('returns all Authentication service methods', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(result.current.unlockWallet).toBeDefined();
      expect(result.current.lockApp).toBeDefined();
      expect(result.current.reauthenticate).toBeDefined();
      expect(result.current.revealSRP).toBeDefined();
      expect(result.current.revealPrivateKey).toBeDefined();
      expect(result.current.getAuthType).toBeDefined();
      expect(result.current.componentAuthenticationType).toBeDefined();
      expect(result.current.updateAuthPreference).toBeDefined();
      expect(result.current.getAuthCapabilities).toBeDefined();
      expect(result.current.updateOsAuthEnabled).toBeDefined();

      expect(typeof result.current.unlockWallet).toBe('function');
      expect(typeof result.current.lockApp).toBe('function');
      expect(typeof result.current.reauthenticate).toBe('function');
      expect(typeof result.current.revealSRP).toBe('function');
      expect(typeof result.current.revealPrivateKey).toBe('function');
      expect(typeof result.current.getAuthType).toBe('function');
      expect(typeof result.current.componentAuthenticationType).toBe(
        'function',
      );
      expect(typeof result.current.updateAuthPreference).toBe('function');
      expect(typeof result.current.getAuthCapabilities).toBe('function');
      expect(typeof result.current.updateOsAuthEnabled).toBe('function');
    });
  });
});
