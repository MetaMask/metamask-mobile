import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { useCanonicalProfileIdTrait } from './useCanonicalProfileIdTrait';
import { UserProfileProperty } from '../../../metrics/UserSettingsAnalyticsMetaData/UserProfileAnalyticsMetaData.types';
import Engine from '../../../../core/Engine';
import { analytics } from '../../../analytics/analytics';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest.fn(),
    },
  },
}));
jest.mock('../../../analytics/analytics', () => ({
  analytics: {
    identify: jest.fn(),
  },
}));

const mockGetSessionProfile = Engine.context.AuthenticationController
  .getSessionProfile as jest.MockedFunction<
  typeof Engine.context.AuthenticationController.getSessionProfile
>;
const mockIdentify = jest.mocked(analytics.identify);

const createState = (isSignedIn: boolean) =>
  ({
    engine: {
      backgroundState: {
        ...backgroundState,
        AuthenticationController: {
          ...backgroundState.AuthenticationController,
          isSignedIn,
        },
      },
    },
  }) as unknown as Record<string, unknown>;

describe('useCanonicalProfileIdTrait', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('identifies with canonical_profile_id on mount when already signed in', async () => {
    mockGetSessionProfile.mockResolvedValue({
      identifierId: 'identifierId',
      profileId: 'profileId',
      canonicalProfileId: 'canonicalProfileId',
      metaMetricsId: 'metaMetricsId',
    });

    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState(true),
    });

    // Flush the async effect body.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetSessionProfile).toHaveBeenCalledTimes(1);
    expect(mockIdentify).toHaveBeenCalledWith({
      [UserProfileProperty.CANONICAL_PROFILE_ID]: 'canonicalProfileId',
    });
  });

  it('does not identify when signed in but canonicalProfileId is missing', async () => {
    mockGetSessionProfile.mockResolvedValue({
      identifierId: 'identifierId',
      profileId: 'profileId',
      canonicalProfileId: '',
      metaMetricsId: 'metaMetricsId',
    });

    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState(true),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('does not read the session profile when not signed in', () => {
    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState(false),
    });

    expect(mockGetSessionProfile).not.toHaveBeenCalled();
    expect(mockIdentify).not.toHaveBeenCalled();
  });

  it('swallows errors from getSessionProfile without identifying', async () => {
    mockGetSessionProfile.mockRejectedValue(new Error('Session error'));

    renderHookWithProvider(() => useCanonicalProfileIdTrait(), {
      state: createState(true),
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(mockIdentify).not.toHaveBeenCalled();
  });
});
