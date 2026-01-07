import { act, renderHook } from '@testing-library/react-hooks';

// Import useAuthentication
import { useAuthentication } from './useAuthentication';
import { Authentication } from '../Authentication';

// Create mock function for lockApp
const mockLockApp = jest.fn<
  Promise<void>,
  [
    {
      allowRememberMe?: boolean;
      reset?: boolean;
      locked?: boolean;
      navigateToLogin?: boolean;
    }?,
  ]
>();

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
    it('returns lockApp function', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(result.current.lockApp).toBeDefined();
      expect(typeof result.current.lockApp).toBe('function');
    });

    it('does not call Authentication.lockApp on initialization', () => {
      renderHook(() => useAuthentication());

      expect(lockAppSpy).not.toHaveBeenCalled();
    });
  });

  describe('lockApp', () => {
    it('calls Authentication.lockApp with provided arguments', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.lockApp({ allowRememberMe: false });
      });

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('calls Authentication.lockApp with allowRememberMe true when provided', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.lockApp({ allowRememberMe: true });
      });

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: true });
    });

    it('calls Authentication.lockApp with empty object when no arguments provided', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.lockApp({});
      });

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({});
    });

    it('returns promise that resolves when lockApp succeeds', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        const promise = result.current.lockApp({ allowRememberMe: false });
        await expect(promise).resolves.toBeUndefined();
      });
    });

    it('returns promise that rejects when lockApp fails', async () => {
      const testError = new Error('Lock app failed');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await expect(
          result.current.lockApp({ allowRememberMe: false }),
        ).rejects.toThrow('Lock app failed');
      });

      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('returns same function reference across renders', () => {
      const { result, rerender } = renderHook(() => useAuthentication());
      const firstReference = result.current.lockApp;

      rerender();

      expect(result.current.lockApp).toBe(firstReference);
      expect(typeof result.current.lockApp).toBe('function');
    });
  });

  describe('error handling', () => {
    it('calls lockApp with correct parameters even when it throws error', async () => {
      const testError = new Error('Lock app error');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        try {
          await result.current.lockApp({ allowRememberMe: false });
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
          result.current.lockApp({ allowRememberMe: false }),
        ).rejects.toThrow('Authentication service error');
      });
    });
  });

  describe('integration', () => {
    it('completes full flow: calls lockApp with allowRememberMe false', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.lockApp({ allowRememberMe: false });
      });

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });
  });
});
