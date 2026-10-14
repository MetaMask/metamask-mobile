import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { Profile, XProfile } from '@metamask/profile-controller';
import { useXAuth } from './useXAuth';
import {
  connectX,
  fetchAndUpdateXAccount,
  XAuthError,
  XAuthErrorType,
} from '../core/XAuthService';
import Engine from '../core/Engine';
import {
  selectIsConnectedToX,
  selectProfileControllerProfile,
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
    fetchAndUpdateXAccount: jest.fn(),
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

jest.mock('../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      ProfileController: {
        disconnectX: jest.fn(),
      },
    },
  },
}));

const mockUseSelector = jest.mocked(useSelector);
const mockConnectX = jest.mocked(connectX);
const mockFetchAndUpdateXAccount = jest.mocked(fetchAndUpdateXAccount);
const mockDisconnectX = jest.mocked(Engine.context.ProfileController.disconnectX);

const PROFILE: Profile = {
  profileId: 'profile-1',
  username: 'tester',
  displayName: 'Tester',
  bio: 'bio',
  linkedAddresses: [],
  avatarUrl: 'https://example.com/avatar.png',
  tradingPrivacy: 'public',
  connectedToX: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

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
  profileId = undefined,
}: {
  isConnected?: boolean;
  xProfile?: XProfile;
  profileId?: string;
} = {}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsConnectedToX) {
      return isConnected;
    }
    if (selector === selectProfileControllerXProfile) {
      return xProfile;
    }
    if (selector === selectProfileControllerProfile) {
      return profileId ? { ...PROFILE, profileId } : undefined;
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
      profileId: PROFILE.profileId,
    });

    const { result } = renderHook(() => useXAuth());

    expect(mockUseSelector).toHaveBeenCalledWith(selectIsConnectedToX);
    expect(mockUseSelector).toHaveBeenCalledWith(
      selectProfileControllerXProfile,
    );
    expect(mockUseSelector).toHaveBeenCalledWith(
      selectProfileControllerProfile,
    );
    expect(result.current.isConnected).toBe(true);
    expect(result.current.xProfile).toStrictEqual(X_PROFILE);
    expect(result.current.isConnecting).toBe(false);
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
  });

  describe('disconnect', () => {
    it('calls ProfileController.disconnectX with the current profile id', async () => {
      mockDisconnectX.mockResolvedValue(undefined);
      setSelectorState({ profileId: PROFILE.profileId });

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.disconnect();
      });

      expect(mockDisconnectX).toHaveBeenCalledWith(PROFILE.profileId);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeUndefined();
    });
  });

  describe('refresh', () => {
    it('calls fetchAndUpdateXAccount without args', async () => {
      mockFetchAndUpdateXAccount.mockResolvedValue(X_PROFILE);

      const { result } = renderHook(() => useXAuth());

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledTimes(1);
      expect(mockFetchAndUpdateXAccount).toHaveBeenCalledWith();
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeUndefined();
    });
  });
});
