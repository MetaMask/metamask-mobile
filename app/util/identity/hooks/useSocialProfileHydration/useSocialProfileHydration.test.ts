import type { Profile } from '@metamask/profile-controller';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useProfileController } from '../../../../components/Views/SocialLeaderboard/ManageProfileView/hooks/useProfileController';
import { lookUpExistingSocialProfile } from '../../../../components/Views/SocialLeaderboard/hooks/lookUpExistingSocialProfile';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import {
  selectCanonicalProfileId,
  selectIsSignedIn,
  selectSessionProfileId,
} from '../../../../selectors/identity';
import { useSocialProfileHydration } from './useSocialProfileHydration';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock(
  '../../../../components/Views/SocialLeaderboard/ManageProfileView/hooks/useProfileController',
  () => ({ useProfileController: jest.fn() }),
);
jest.mock(
  '../../../../components/Views/SocialLeaderboard/hooks/lookUpExistingSocialProfile',
  () => ({ lookUpExistingSocialProfile: jest.fn() }),
);

const CACHED_PROFILE = { profileId: 'profile-1' } as Profile;

interface SelectorValues {
  isSignedIn: boolean;
  canonicalProfileId: string | undefined;
  sessionProfileId: string | undefined;
  isSocialEnabled: boolean;
}

const DEFAULT_SELECTORS: SelectorValues = {
  isSignedIn: true,
  canonicalProfileId: 'canonical-1',
  sessionProfileId: 'session-1',
  isSocialEnabled: true,
};

const mockSelectors = (overrides: Partial<SelectorValues> = {}) => {
  const values = { ...DEFAULT_SELECTORS, ...overrides };
  jest.mocked(useSelector).mockImplementation((selector) => {
    switch (selector) {
      case selectIsSignedIn:
        return values.isSignedIn;
      case selectCanonicalProfileId:
        return values.canonicalProfileId;
      case selectSessionProfileId:
        return values.sessionProfileId;
      case selectSocialLeaderboardEnabled:
        return values.isSocialEnabled;
      default:
        return undefined;
    }
  });
};

const fetchAndUpdateProfile = jest.fn();

const mockProfileController = (profile: Profile | undefined) => {
  jest.mocked(useProfileController).mockReturnValue({
    profile,
    fetchAndUpdateProfile,
  } as unknown as ReturnType<typeof useProfileController>);
};

const renderHydration = () => renderHook(() => useSocialProfileHydration());

describe('useSocialProfileHydration', () => {
  const mockLookUp = jest.mocked(lookUpExistingSocialProfile);

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectors();
    mockProfileController(undefined);
    mockLookUp.mockResolvedValue('found');
  });

  it('looks up the canonical profile id when signed in with no cached profile', async () => {
    renderHydration();

    await waitFor(() => {
      expect(mockLookUp).toHaveBeenCalledWith(
        'canonical-1',
        fetchAndUpdateProfile,
      );
    });
  });

  it('falls back to the session profile id when there is no canonical id', async () => {
    mockSelectors({ canonicalProfileId: undefined });

    renderHydration();

    await waitFor(() => {
      expect(mockLookUp).toHaveBeenCalledWith(
        'session-1',
        fetchAndUpdateProfile,
      );
    });
  });

  it.each([
    ['signed out', { isSignedIn: false }],
    ['Social is disabled', { isSocialEnabled: false }],
    [
      'there is no session profile id',
      { canonicalProfileId: undefined, sessionProfileId: undefined },
    ],
  ])('does not look up when %s', async (_label, overrides) => {
    mockSelectors(overrides);

    renderHydration();

    await new Promise(process.nextTick);
    expect(mockLookUp).not.toHaveBeenCalled();
  });

  it('does not look up when ProfileController already has a profile', async () => {
    mockProfileController(CACHED_PROFILE);

    renderHydration();

    await new Promise(process.nextTick);
    expect(mockLookUp).not.toHaveBeenCalled();
  });

  it('does not throw when the lookup fails', async () => {
    mockLookUp.mockRejectedValue(new Error('network'));

    const { result } = renderHydration();

    await waitFor(() => {
      expect(mockLookUp).toHaveBeenCalledTimes(1);
    });
    expect(result.current).toBeUndefined();
  });
});
