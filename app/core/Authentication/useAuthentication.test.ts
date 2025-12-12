import { act, renderHook } from '@testing-library/react-hooks';
import Authentication from './';

// Import useAuthentication
import { useAuthentication } from './useAuthentication';

// Create mock function for lockApp
const mockLockApp = jest.fn<Promise<void>, [{ allowRememberMe?: boolean }?]>();

describe('useAuthentication', () => {
  let lockAppSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on the actual lockApp method
    lockAppSpy = jest
      .spyOn(Authentication, 'lockApp')
      .mockImplementation(mockLockApp);
    mockLockApp.mockResolvedValue(undefined);
  });

  afterEach(() => {
    lockAppSpy.mockRestore();
  });

  describe('hook initialization', () => {
    it('returns turnOffRememberMeAndLockApp function', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(result.current.turnOffRememberMeAndLockApp).toBeDefined();
      expect(typeof result.current.turnOffRememberMeAndLockApp).toBe(
        'function',
      );
    });
  });

  describe('turnOffRememberMeAndLockApp', () => {
    it('calls Authentication.lockApp with allowRememberMe set to false', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.turnOffRememberMeAndLockApp();
      });

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('handles lockApp promise resolution', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        const promise = result.current.turnOffRememberMeAndLockApp();
        await expect(promise).resolves.toBeUndefined();
      });
    });

    it('handles lockApp promise rejection', async () => {
      const testError = new Error('Lock app failed');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await expect(
          result.current.turnOffRememberMeAndLockApp(),
        ).rejects.toThrow('Lock app failed');
      });

      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('maintains function reference across re-renders', () => {
      const { result, rerender } = renderHook(() => useAuthentication());
      const firstReference = result.current.turnOffRememberMeAndLockApp;

      rerender();

      expect(result.current.turnOffRememberMeAndLockApp).toBe(firstReference);
    });
  });

  describe('error handling', () => {
    it('calls lockApp with correct parameters even when it throws error', async () => {
      const testError = new Error('Lock app error');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        try {
          await result.current.turnOffRememberMeAndLockApp();
        } catch {
          // Expected to throw
        }
      });

      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('propagates error from lockApp when it fails', async () => {
      const testError = new Error('Authentication service error');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await expect(
          result.current.turnOffRememberMeAndLockApp(),
        ).rejects.toThrow('Authentication service error');
      });
    });
  });

  describe('integration', () => {
    it('completes full flow: calls lockApp with allowRememberMe false', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.turnOffRememberMeAndLockApp();
      });

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });
  });
});
