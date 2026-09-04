import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useBrazeIdentity } from './useBrazeIdentity';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';
import { registerBrazePush } from '../../registerPush';
import { retryPendingBrazePushUnregistration } from '../../unregisterPush';
import { hasPendingBrazePushUnregistrationSync } from '../../pushRegistrationState';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
} from '../../../../selectors/identity';
import { backgroundState } from '../../../../util/test/initial-root-state';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../..', () => ({
  setBrazeUser: jest.fn(),
  clearBrazeUser: jest.fn(),
  refreshBrazeBanners: jest.fn(),
}));

jest.mock('../../registerPush', () => ({
  registerBrazePush: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../unregisterPush', () => ({
  retryPendingBrazePushUnregistration: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../pushRegistrationState', () => ({
  hasPendingBrazePushUnregistrationSync: jest.fn().mockReturnValue(false),
}));

const mockSetBrazeUser = jest.mocked(setBrazeUser);
const mockClearBrazeUser = jest.mocked(clearBrazeUser);
const mockRefreshBrazeBanners = jest.mocked(refreshBrazeBanners);
const mockRegisterBrazePush = jest.mocked(registerBrazePush);
const mockRetryPendingBrazePushUnregistration = jest.mocked(
  retryPendingBrazePushUnregistration,
);
const mockHasPendingBrazePushUnregistrationSync = jest.mocked(
  hasPendingBrazePushUnregistrationSync,
);
const mockUseSelector = jest.mocked(useSelector);

let mockIsSignedIn = false;
let mockCanonicalProfileId: string | undefined;
let mockIsPushEnabled = false;
let mockFcmToken = '';

const createState = (isSignedIn: boolean, canonicalProfileId?: string) =>
  ({
    engine: {
      backgroundState: {
        ...backgroundState,
        AuthenticationController: {
          isSignedIn,
          ...(canonicalProfileId
            ? {
                srpSessionData: {
                  'entropy-1': {
                    profile: {
                      profileId: 'per-srp-id',
                      canonicalProfileId,
                      identifierId: 'id',
                      metaMetricsId: 'mm-id',
                    },
                    token: {
                      accessToken: 'token',
                      expiresIn: 3600,
                      obtainedAt: Date.now(),
                    },
                  },
                },
              }
            : {}),
        },
        NotificationServicesPushController: {
          isPushEnabled: mockIsPushEnabled,
          fcmToken: mockFcmToken,
          isUpdatingFCMToken: false,
        },
      },
    },
  }) as unknown as Record<string, unknown>;

describe('useBrazeIdentity', () => {
  beforeEach(() => {
    mockIsSignedIn = false;
    mockCanonicalProfileId = undefined;
    mockIsPushEnabled = false;
    mockFcmToken = '';
    jest.clearAllMocks();
    mockClearBrazeUser.mockResolvedValue(true);
    mockRetryPendingBrazePushUnregistration.mockResolvedValue(true);
    mockHasPendingBrazePushUnregistrationSync.mockReturnValue(false);
    mockUseSelector.mockImplementation((selector) => {
      const state = createState(
        mockIsSignedIn,
        mockCanonicalProfileId,
      ) as never;
      if (selector === selectIsSignedIn) {
        return selectIsSignedIn(state);
      }
      if (selector === selectCanonicalProfileId) {
        return selectCanonicalProfileId(state);
      }
      return selector(state);
    });
  });

  it('calls setBrazeUser and refreshes banners when signed in with a canonical profile ID', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    renderHook(() => useBrazeIdentity());

    await waitFor(() => expect(mockSetBrazeUser).toHaveBeenCalledTimes(1));
    expect(mockSetBrazeUser).toHaveBeenCalledWith('canonical-123');
    expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(1);
    expect(mockClearBrazeUser).not.toHaveBeenCalled();
  });

  it('does not set Braze when signed in but canonical profile ID is missing', () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = undefined;
    renderHook(() => useBrazeIdentity());

    expect(mockSetBrazeUser).not.toHaveBeenCalled();
    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });

  it('registers push after Braze identifies the signed-in profile', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    mockIsPushEnabled = true;
    mockFcmToken = 'fcm-token';

    renderHook(() => useBrazeIdentity());

    await waitFor(() =>
      expect(mockRegisterBrazePush).toHaveBeenCalledWith('fcm-token'),
    );
    expect(mockRetryPendingBrazePushUnregistration).not.toHaveBeenCalled();
    expect(mockSetBrazeUser.mock.invocationCallOrder[0]).toBeLessThan(
      mockRegisterBrazePush.mock.invocationCallOrder[0],
    );
  });

  it('does not register push when NaaP push is disabled', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    mockFcmToken = 'fcm-token';

    renderHook(() => useBrazeIdentity());

    await waitFor(() => expect(mockSetBrazeUser).toHaveBeenCalledTimes(1));
    expect(mockRegisterBrazePush).not.toHaveBeenCalled();
  });

  it('does not clear Braze on initial mount when not signed in', () => {
    renderHook(() => useBrazeIdentity());

    expect(mockClearBrazeUser).not.toHaveBeenCalled();
    expect(mockSetBrazeUser).not.toHaveBeenCalled();
  });

  it('clears Braze after transitioning from signed in to signed out', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    const { rerender } = renderHook(() => useBrazeIdentity());

    await waitFor(() => expect(mockSetBrazeUser).toHaveBeenCalledTimes(1));
    expect(mockSetBrazeUser).toHaveBeenCalledWith('canonical-123');
    expect(mockClearBrazeUser).not.toHaveBeenCalled();

    mockIsSignedIn = false;
    mockCanonicalProfileId = undefined;
    rerender({});

    await waitFor(() => expect(mockClearBrazeUser).toHaveBeenCalledTimes(1));
  });

  it('re-identifies and refreshes when the canonical profile ID changes', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    const { rerender } = renderHook(() => useBrazeIdentity());

    await waitFor(() => expect(mockSetBrazeUser).toHaveBeenCalledTimes(1));
    expect(mockSetBrazeUser).toHaveBeenCalledWith('canonical-123');
    expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(1);

    mockCanonicalProfileId = 'canonical-456';
    rerender({});

    await waitFor(() => expect(mockSetBrazeUser).toHaveBeenCalledTimes(2));
    expect(mockSetBrazeUser).toHaveBeenLastCalledWith('canonical-456');
    expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(2);
  });

  it('does not call refreshBrazeBanners when not signed in', () => {
    renderHook(() => useBrazeIdentity());

    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });

  it('defers identity changes while push unregistration remains pending', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    mockRetryPendingBrazePushUnregistration.mockResolvedValue(false);

    renderHook(() => useBrazeIdentity());

    await waitFor(() =>
      expect(mockRetryPendingBrazePushUnregistration).toHaveBeenCalled(),
    );
    expect(mockSetBrazeUser).not.toHaveBeenCalled();
    expect(mockRegisterBrazePush).not.toHaveBeenCalled();
  });

  it('checks pending unregistration only once per app session', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    mockRetryPendingBrazePushUnregistration.mockResolvedValue(false);
    const { rerender } = renderHook(() => useBrazeIdentity());

    await waitFor(() =>
      expect(mockRetryPendingBrazePushUnregistration).toHaveBeenCalledTimes(1),
    );

    mockCanonicalProfileId = 'canonical-456';
    rerender({});

    expect(mockRetryPendingBrazePushUnregistration).toHaveBeenCalledTimes(1);
    expect(mockSetBrazeUser).not.toHaveBeenCalled();
  });

  it('supersedes a failed launch retry when push is re-enabled', async () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    mockFcmToken = 'fcm-token';
    mockRetryPendingBrazePushUnregistration.mockResolvedValue(false);
    const { rerender } = renderHook(() => useBrazeIdentity());

    await waitFor(() =>
      expect(mockRetryPendingBrazePushUnregistration).toHaveBeenCalledTimes(1),
    );

    mockIsPushEnabled = true;
    rerender({});

    await waitFor(() =>
      expect(mockRegisterBrazePush).toHaveBeenCalledWith('fcm-token'),
    );
    expect(mockRetryPendingBrazePushUnregistration).toHaveBeenCalledTimes(1);
  });

  it('clears deferred Braze data after a launch retry succeeds', async () => {
    mockHasPendingBrazePushUnregistrationSync.mockReturnValue(true);

    renderHook(() => useBrazeIdentity());

    await waitFor(() => expect(mockClearBrazeUser).toHaveBeenCalledTimes(1));
    expect(
      mockRetryPendingBrazePushUnregistration.mock.invocationCallOrder[0],
    ).toBeLessThan(mockClearBrazeUser.mock.invocationCallOrder[0]);
  });
});
