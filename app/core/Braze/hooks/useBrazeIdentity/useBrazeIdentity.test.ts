import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useBrazeIdentity } from './useBrazeIdentity';
import { setBrazeUser, clearBrazeUser, refreshBrazeBanners } from '../..';
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

const mockSetBrazeUser = jest.mocked(setBrazeUser);
const mockClearBrazeUser = jest.mocked(clearBrazeUser);
const mockRefreshBrazeBanners = jest.mocked(refreshBrazeBanners);
const mockUseSelector = jest.mocked(useSelector);

let mockIsSignedIn = false;
let mockCanonicalProfileId: string | undefined;

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
      },
    },
  }) as unknown as Record<string, unknown>;

describe('useBrazeIdentity', () => {
  beforeEach(() => {
    mockIsSignedIn = false;
    mockCanonicalProfileId = undefined;
    jest.clearAllMocks();
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

  it('calls setBrazeUser and refreshes banners when signed in with a canonical profile ID', () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    renderHook(() => useBrazeIdentity());

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
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

  it('does not clear Braze on initial mount when not signed in', () => {
    renderHook(() => useBrazeIdentity());

    expect(mockClearBrazeUser).not.toHaveBeenCalled();
    expect(mockSetBrazeUser).not.toHaveBeenCalled();
  });

  it('clears Braze after transitioning from signed in to signed out', () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    const { rerender } = renderHook(() => useBrazeIdentity());

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockSetBrazeUser).toHaveBeenCalledWith('canonical-123');
    expect(mockClearBrazeUser).not.toHaveBeenCalled();

    mockIsSignedIn = false;
    mockCanonicalProfileId = undefined;
    rerender({});

    expect(mockClearBrazeUser).toHaveBeenCalledTimes(1);
  });

  it('re-identifies and refreshes when the canonical profile ID changes', () => {
    mockIsSignedIn = true;
    mockCanonicalProfileId = 'canonical-123';
    const { rerender } = renderHook(() => useBrazeIdentity());

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(1);
    expect(mockSetBrazeUser).toHaveBeenCalledWith('canonical-123');
    expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(1);

    mockCanonicalProfileId = 'canonical-456';
    rerender({});

    expect(mockSetBrazeUser).toHaveBeenCalledTimes(2);
    expect(mockSetBrazeUser).toHaveBeenLastCalledWith('canonical-456');
    expect(mockRefreshBrazeBanners).toHaveBeenCalledTimes(2);
  });

  it('does not call refreshBrazeBanners when not signed in', () => {
    renderHook(() => useBrazeIdentity());

    expect(mockRefreshBrazeBanners).not.toHaveBeenCalled();
  });
});
