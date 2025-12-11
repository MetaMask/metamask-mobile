import { act, renderHook } from '@testing-library/react-hooks';
import { useDispatch } from 'react-redux';
import { useAuthentication } from './useAuthentication';
import {
  setAllowLoginWithRememberMe,
  ActionType,
} from '../../actions/security';

jest.mock('react-redux');
jest.mock('../../actions/security');

// Create mock function that will be used in both the mock factory and tests
let mockLockApp: jest.MockedFunction<() => Promise<void>>;

jest.mock('./Authentication', () => {
  const lockAppMock = jest.fn<Promise<void>, []>();
  mockLockApp = lockAppMock;
  return {
    __esModule: true,
    default: {
      lockApp: lockAppMock,
    },
  };
});

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetAllowLoginWithRememberMe =
  setAllowLoginWithRememberMe as jest.MockedFunction<
    typeof setAllowLoginWithRememberMe
  >;

describe('useAuthentication', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetAllowLoginWithRememberMe.mockReturnValue({
      type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
      enabled: false,
    });
    mockLockApp.mockResolvedValue(undefined);
  });

  describe('hook initialization', () => {
    it('returns turnOffRememberMeAndLockApp function', () => {
      const { result } = renderHook(() => useAuthentication());

      expect(result.current.turnOffRememberMeAndLockApp).toBeDefined();
      expect(typeof result.current.turnOffRememberMeAndLockApp).toBe(
        'function',
      );
    });

    it('calls useDispatch on initialization', () => {
      renderHook(() => useAuthentication());

      expect(mockUseDispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('turnOffRememberMeAndLockApp', () => {
    it('dispatches setAllowLoginWithRememberMe with false', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.turnOffRememberMeAndLockApp();
      });

      expect(mockSetAllowLoginWithRememberMe).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalledWith({
        type: ActionType.SET_ALLOW_LOGIN_WITH_REMEMBER_ME,
        enabled: false,
      });
    });

    it('calls Authentication.lockApp after dispatching action', async () => {
      const { result } = renderHook(() => useAuthentication());

      await act(async () => {
        await result.current.turnOffRememberMeAndLockApp();
      });

      expect(mockLockApp).toHaveBeenCalledTimes(1);
      expect(mockLockApp).toHaveBeenCalledWith();
    });

    it('dispatches action before calling lockApp', async () => {
      const { result } = renderHook(() => useAuthentication());
      const callOrder: string[] = [];

      mockDispatch.mockImplementation(() => {
        callOrder.push('dispatch');
      });

      mockLockApp.mockImplementation(async () => {
        callOrder.push('lockApp');
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.turnOffRememberMeAndLockApp();
      });

      expect(callOrder).toEqual(['dispatch', 'lockApp']);
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

      expect(mockSetAllowLoginWithRememberMe).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalled();
    });

    it('maintains function reference across re-renders when dispatch does not change', () => {
      const { result, rerender } = renderHook(() => useAuthentication());
      const firstReference = result.current.turnOffRememberMeAndLockApp;

      rerender();

      expect(result.current.turnOffRememberMeAndLockApp).toBe(firstReference);
    });

    it('creates new function reference when dispatch changes', () => {
      const { result, rerender } = renderHook(() => useAuthentication());
      const firstReference = result.current.turnOffRememberMeAndLockApp;

      const newMockDispatch = jest.fn();
      mockUseDispatch.mockReturnValue(newMockDispatch);
      rerender();

      expect(result.current.turnOffRememberMeAndLockApp).not.toBe(
        firstReference,
      );
    });
  });

  describe('error handling', () => {
    it('dispatches action even when lockApp throws error', async () => {
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

      expect(mockSetAllowLoginWithRememberMe).toHaveBeenCalledWith(false);
      expect(mockDispatch).toHaveBeenCalled();
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
    it('completes full flow: dispatch action then lock app', async () => {
      const { result } = renderHook(() => useAuthentication());
      const callOrder: string[] = [];

      mockDispatch.mockImplementation(() => {
        callOrder.push('dispatch');
      });

      mockLockApp.mockImplementation(async () => {
        callOrder.push('lockApp');
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.turnOffRememberMeAndLockApp();
      });

      expect(callOrder).toEqual(['dispatch', 'lockApp']);
      expect(mockSetAllowLoginWithRememberMe).toHaveBeenCalledWith(false);
      expect(mockLockApp).toHaveBeenCalledTimes(1);
    });
  });
});
