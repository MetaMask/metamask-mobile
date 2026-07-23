import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { useCanonicalProfileIdTrait } from './useCanonicalProfileIdTrait';
import { UserProfileProperty } from '../../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import { analytics } from '../../../analytics/analytics';

jest.mock('../../../analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
  },
}));

const mockIdentify = jest.mocked(analytics.identify);

const sessionProfile = {
  identifierId: 'identifierId',
  profileId: 'profileId',
  canonicalProfileId: 'canonicalProfileId',
  metaMetricsId: 'metaMetricsId',
};

const createState = ({
  isSignedIn,
  canonicalProfileId,
}: {
  isSignedIn: boolean;
  canonicalProfileId?: string;
}) =>
  ({
    engine: {
      backgroundState: {
        ...backgroundState,
        AuthenticationController: {
          ...backgroundState.AuthenticationController,
          isSignedIn,
          ...(canonicalProfileId !== undefined
            ? {
                srpSessionData: {
                  entropySourceId1: {
                    profile: { ...sessionProfile, canonicalProfileId },
                  },
                },
              }
            : {}),
        },
      },
    },
  }) as unknown as Record<string, unknown>;

describe('useCanonicalProfileIdTrait', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('identifies with canonical_profile_id on mount when signed in', () => {
    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState({
        isSignedIn: true,
        canonicalProfileId: 'canonicalProfileId',
      }),
    });

    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.CANONICAL_PROFILE_ID]: 'canonicalProfileId',
    });
  });

  it('does not identify when signed in but canonicalProfileId is missing', () => {
    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState({ isSignedIn: true }),
    });

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('does not identify when not signed in', () => {
    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState({
        isSignedIn: false,
        canonicalProfileId: 'canonicalProfileId',
      }),
    });

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('identifies with the current canonical_profile_id for each distinct value', () => {
    // Two separate renders with different canonical ids exercise the
    // effect's dependency on canonicalProfileId (the effect re-fires
    // whenever the selector value changes while signed in).
    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState({
        isSignedIn: true,
        canonicalProfileId: 'canonicalProfileId-1',
      }),
    });

    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.CANONICAL_PROFILE_ID]: 'canonicalProfileId-1',
    });

    jest.clearAllMocks();

    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState({
        isSignedIn: true,
        canonicalProfileId: 'canonicalProfileId-2',
      }),
    });

    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.CANONICAL_PROFILE_ID]: 'canonicalProfileId-2',
    });
  });
});
