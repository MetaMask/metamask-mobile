import { act, renderHook } from '@testing-library/react-hooks';
import Authentication from './';

// Import useAuthentication
import { useAuthentication } from './useAuthentication';

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
    it('calls Authentication.lockApp with allowRememberMe set to false', () => {
      renderHook(() => useAuthentication());

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('returns turnOffRememberMeAndLockApp as a Promise', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(result.current.turnOffRememberMeAndLockApp).toBeDefined();
      expect(result.current.turnOffRememberMeAndLockApp).toBeInstanceOf(
        Promise,
      );
    });
  });

  describe('turnOffRememberMeAndLockApp', () => {
    it('returns promise that resolves when lockApp succeeds', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await expect(
          result.current.turnOffRememberMeAndLockApp,
        ).resolves.toBeUndefined();
      });
    });

    it('returns promise that rejects when lockApp fails', async () => {
      const testError = new Error('Lock app failed');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await expect(
          result.current.turnOffRememberMeAndLockApp,
        ).rejects.toThrow('Lock app failed');
      });

      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });

    it('calls lockApp on each hook render', () => {
      const { rerender } = renderHook(() => useAuthentication());

      expect(lockAppSpy).toHaveBeenCalledTimes(1);

      rerender();

      expect(lockAppSpy).toHaveBeenCalledTimes(2);
      expect(lockAppSpy).toHaveBeenNthCalledWith(1, {
        allowRememberMe: false,
      });
      expect(lockAppSpy).toHaveBeenNthCalledWith(2, {
        allowRememberMe: false,
      });
    });
  });

  describe('error handling', () => {
    it('calls lockApp with correct parameters even when it throws error', async () => {
      const testError = new Error('Lock app error');
      mockLockApp.mockRejectedValue(testError);
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        try {
          await result.current.turnOffRememberMeAndLockApp;
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
          result.current.turnOffRememberMeAndLockApp,
        ).rejects.toThrow('Authentication service error');
      });
    });
  });

  describe('integration', () => {
    it('completes full flow: calls lockApp with allowRememberMe false on initialization', () => {
      renderHook(() => useAuthentication());

      expect(lockAppSpy).toHaveBeenCalledTimes(1);
      expect(lockAppSpy).toHaveBeenCalledWith({ allowRememberMe: false });
    });
  });
});
