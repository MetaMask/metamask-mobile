import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { XProfile } from '@metamask/profile-controller';
import { useXAuth } from './useXAuth';
import {
  connectX,
  disconnectXAccount,
  fetchAndUpdateXAccount,
  XAuthError,
  XAuthErrorType,
} from '../core/XAuthService';
import {
  selectIsConnectedToX,
  selectProfileControllerXProfile,
} from '../selectors/profileController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../core/XAuthService', () => {
  class MockXAuthError extends Error {
    type: string;

    constructor(type: string, message: string) {
      super(message);
      this.type = type;
      this.name = 'XAuthError';
    }
  }

  return {
    __esModule: true,
    connectX: jest.fn(),
    disconnectXAccount: jest.fn(),
    fetchAndUpdateXAccount: jest.fn(),
    getErrorMessage: (error: unknown): string =>
      error instanceof Error ? error.message : String(error),
    XAuthError: MockXAuthError,
    XAuthErrorType: {
      UserCancelled: 'USER_CANCELLED',
      NetworkFailure: 'NETWORK_FAILURE',
      StateMismatch: 'STATE_MISMATCH',
      MissingCode: 'MISSING_CODE',
      BackendError: 'BACKEND_ERROR',
      NotSignedIn: 'NOT_SIGNED_IN',
      NoEvmAccount: 'NO_EVM_ACCOUNT',
    },
  };
});

const mockUseSelector = jest.mocked(useSelector);
const mockConnectX = jest.mocked(connectX);
const mockDisconnectXAccount = jest.mocked(disconnectXAccount);
const mockFetchAndUpdateXAccount = jest.mocked(fetchAndUpdateXAccount);

const X_PROFILE: XProfile = {
  xUserId: 'x-user-1',
  xProfileUrl: 'https://x.com/tester',
  username: 'tester',
  displayName: 'Tester',
  avatarUrl: 'https://example.com/x.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const setSelectorState = ({
  isConnected = false,
  xProfile = undefined,
}: {
  isConnected?: boolean;
  xProfile?: XProfile;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsConnectedToX) {
      return isConnected;
    }
    if (selector === selectProfileControllerXProfile) {
      return xProfile;
    }
    throw new Error('Unexpected selector');
  });
};

describe('useXAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectorState();
  });

  it('returns the derived connection state from the selectors', () => {
    setSelectorState({
      isConnected: true,
      xProfile: X_PROFILE,
    });

    const { result } = renderHook(() => useXAuth());

    expect(mockUseSelector).toHaveBeenCalledWith(selectIsConnectedToX);
    expect(mockUseSelector).toHaveBeenCalledWith(
      selectProfileControllerXProfile,
    );
    expect(result.current.isConnected).toBe(true);
    expect(result.current.xProfile).toStrictEqual(X_PROFILE);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isDisconnecting).toBe(false);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  describe('connect', () => {
    it('sets isConnecting while connecting, then clears it on success and clears a prior error', async () => {
      mockConnectX.mockRejectedValueOnce(
        new XAuthError(XAuthErrorType.BackendError, 'backend down'),
      );
      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error?.type).toBe(XAuthErrorType.BackendError);

      let resolveConnect!: () => void;
      mockConnectX.mockImplementationOnce(
        () =>
          new Promise<XProfile>((resolve) => {
            resolveConnect = () => resolve(X_PROFILE);
          }),
      );

      let connectPromise!: Promise<void>;
      act(() => {
        connectPromise = result.current.connect();
      });

      expect(result.current.isConnecting).toBe(true);
      expect(result.current.error).toBeUndefined();

      await act(async () => {
        resolveConnect();
        await connectPromise;
      });

      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(mockConnectX).toHaveBeenCalledTimes(2);
    });

    it('records the XAuthError when connectX rejects', async () => {
      const failure = new XAuthError(
        XAuthErrorType.UserCancelled,
        'User cancelled the X authorization process',
      );
      mockConnectX.mockRejectedValue(failure);

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toBe(failure);
      expect(result.current.isConnecting).toBe(false);
    });

    it('wraps unknown errors in a network-failure XAuthError', async () => {
      mockConnectX.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toBeInstanceOf(XAuthError);
      expect(result.current.error?.type).toBe(XAuthErrorType.NetworkFailure);
      expect(result.current.error?.message).toBe('boom');
    });

    it('stringifies non-Error rejection values into the wrapped error message', async () => {
      mockConnectX.mockRejectedValue('literal failure');

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toBeInstanceOf(XAuthError);
      expect(result.current.error?.type).toBe(XAuthErrorType.NetworkFailure);
      expect(result.current.error?.message).toBe('literal failure');
    });
  });

  describe('disconnect', () => {
    it('sets isDisconnecting while disconnecting, then clears it on success and clears a prior error', async () => {
      mockDisconnectXAccount.mockRejectedValueOnce(
        new XAuthError(XAuthErrorType.BackendError, 'backend down'),
      );
      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.error?.type).toBe(XAuthErrorType.BackendError);

      let resolveDisconnect!: () => void;
      mockDisconnectXAccount.mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveDisconnect = () => resolve(undefined);
          }),
      );

      let disconnectPromise!: Promise<void>;
      act(() => {
        disconnectPromise = result.current.disconnect();
      });

      expect(result.current.isDisconnecting).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeUndefined();

      await act(async () => {
        resolveDisconnect();
        await disconnectPromise;
      });

      expect(result.current.isDisconnecting).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(mockDisconnectXAccount).toHaveBeenCalledTimes(2);
    });

    it('delegates to disconnectXAccount and clears the disconnecting state', async () => {
      mockDisconnectXAccount.mockResolvedValue(undefined);

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockDisconnectXAccount).toHaveBeenCalledTimes(1);
      expect(mockDisconnectXAccount).toHaveBeenCalledWith();
      expect(result.current.isDisconnecting).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('records the XAuthError and clears isDisconnecting when disconnectXAccount rejects', async () => {
      const failure = new XAuthError(
        XAuthErrorType.BackendError,
        'Failed to disconnect the X account',
      );
      mockDisconnectXAccount.mockRejectedValue(failure);

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.error).toBe(failure);
      expect(result.current.isDisconnecting).toBe(false);
    });

    it('wraps unknown disconnectXAccount errors in a network-failure XAuthError', async () => {
      mockDisconnectXAccount.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.error).toBeInstanceOf(XAuthError);
      expect(result.current.error?.type).toBe(XAuthErrorType.NetworkFailure);
      expect(result.current.error?.message).toBe('boom');
      expect(result.current.isDisconnecting).toBe(false);
    });
  });

  describe('refresh', () => {
    it('sets isRefreshing while refreshing, then clears it on success and clears a prior error', async () => {
      mockFetchAndUpdateXAccount.mockRejectedValueOnce(
        new XAuthError(XAuthErrorType.NetworkFailure, 'backend down'),
      );
      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error?.type).toBe(XAuthErrorType.NetworkFailure);

      let resolveRefresh!: () => void;
      mockFetchAndUpdateXAccount.mockImplementationOnce(
        () =>
          new Promise<XProfile>((resolve) => {
            resolveRefresh = () => resolve(X_PROFILE);
          }),
      );

      let refreshPromise!: Promise<void>;
      act(() => {
        refreshPromise = result.current.refresh();
      });

      expect(result.current.isRefreshing).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isDisconnecting).toBe(false);
      expect(result.current.error).toBeUndefined();

      await act(async () => {
        resolveRefresh();
        await refreshPromise;
      });

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(2);
    });

    it('calls fetchAndUpdateXAccount without args', async () => {
      mockFetchAndUpdateXAccount.mockResolvedValue(X_PROFILE);

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(1);
      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledWith();
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeUndefined();
    });

    it('records the XAuthError and clears isRefreshing when fetchAndUpdateXAccount rejects', async () => {
      const failure = new XAuthError(
        XAuthErrorType.NetworkFailure,
        'Failed to fetch the X profile',
      );
      mockFetchAndUpdateXAccount.mockRejectedValue(failure);

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBe(failure);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('wraps unknown fetchAndUpdateXAccount errors in a network-failure XAuthError', async () => {
      mockFetchAndUpdateXAccount.mockRejectedValue(new Error('boom'));

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeInstanceOf(XAuthError);
      expect(result.current.error?.type).toBe(XAuthErrorType.NetworkFailure);
      expect(result.current.error?.message).toBe('boom');
      expect(result.current.isRefreshing).toBe(false);
    });
  });
});
