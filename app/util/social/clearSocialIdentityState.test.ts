import {
  getDefaultSocialControllerState,
  type SocialController,
  type SocialControllerState,
} from '@metamask/social-controllers';
import {
  SOCIAL_LAST_TRADE_AT,
  SOCIAL_LEADERBOARD_ONBOARDING_SHOWN,
  SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX,
  SOCIAL_POST_TRADE_PROMPTS,
  SOCIAL_TAB_VISITED,
  SOCIAL_TERMS_ACCEPTED,
} from '../../constants/storage';
import {
  getLocalSocialProfileSnapshot,
  saveLocalSocialProfile,
} from '../../components/Views/SocialLeaderboard/MyProfileView/hooks/localSocialProfileStore';
import {
  acceptSocialTerms,
  hasAcceptedSocialTerms,
  resetSocialTermsAcceptance,
} from '../../components/Views/SocialLeaderboard/terms/socialTermsAcceptance';
import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import { clearSocialIdentityState } from './clearSocialIdentityState';

const mockStorage = new Map<string, string>();

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn((key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
    getAllKeys: jest.fn(async () => [...mockStorage.keys()]),
  },
}));

jest.mock('../Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const onboardedProfile = {
  profileId: 'old-profile',
  displayName: 'Flash Sky Monk',
  handle: 'flash_sky_monk',
  bio: null,
  imageUrl: null,
  avatarPresetId: 'fox',
  rankingTag: null,
  xHandle: null,
  followerCount: 0,
  linkedAccountId: 'account-1',
  shareTradingActivity: true,
};

const populatedSocialState = (): SocialControllerState => ({
  leaderboardEntries: [
    {
      rank: 1,
      addresses: ['0xabc'],
      profileId: 'old-profile',
      name: 'flash_sky_monk',
      pnl30d: 1,
      pnlPerChain: {},
      followerCount: 0,
      socialHandles: {},
    },
  ],
  followingAddresses: ['0xabc'],
  followingProfileIds: ['old-profile'],
});

describe('clearSocialIdentityState', () => {
  const clearState = jest.fn();
  let socialState = populatedSocialState();

  const socialController = {
    update: jest.fn((recipe: () => SocialControllerState) => {
      socialState = recipe();
    }),
  };

  beforeEach(async () => {
    mockStorage.clear();
    socialState = populatedSocialState();
    clearState.mockReset();
    socialController.update.mockClear();
    jest.mocked(Logger.error).mockClear();
    await resetSocialTermsAcceptance();
    saveLocalSocialProfile(onboardedProfile);
  });

  it('clears the persisted profile, follow list, and in-memory overlay', async () => {
    await clearSocialIdentityState({
      ProfileController: { clearState },
      SocialController: socialController as unknown as SocialController,
    });

    expect(clearState).toHaveBeenCalledTimes(1);
    expect(socialState).toEqual(getDefaultSocialControllerState());
    expect(getLocalSocialProfileSnapshot().profile).toBeNull();
  });

  it('removes per-identity social storage, including leaderboard snapshots', async () => {
    mockStorage.set(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN, 'true');
    mockStorage.set(SOCIAL_TAB_VISITED, 'true');
    mockStorage.set(SOCIAL_LAST_TRADE_AT, '1700000000000');
    mockStorage.set(SOCIAL_POST_TRADE_PROMPTS, '{}');
    mockStorage.set(SOCIAL_TERMS_ACCEPTED, 'v1');
    mockStorage.set(
      `${SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX}pnl:desc:7d`,
      '{"timestamp":1,"traders":[]}',
    );
    mockStorage.set('@MetaMask:unrelated', 'keep');

    await clearSocialIdentityState({
      ProfileController: { clearState },
      SocialController: socialController as unknown as SocialController,
    });

    expect(mockStorage.has(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN)).toBe(false);
    expect(mockStorage.has(SOCIAL_TAB_VISITED)).toBe(false);
    expect(mockStorage.has(SOCIAL_LAST_TRADE_AT)).toBe(false);
    expect(mockStorage.has(SOCIAL_POST_TRADE_PROMPTS)).toBe(false);
    expect(mockStorage.has(SOCIAL_TERMS_ACCEPTED)).toBe(false);
    expect(
      mockStorage.has(`${SOCIAL_LEADERBOARD_SNAPSHOT_PREFIX}pnl:desc:7d`),
    ).toBe(false);
    expect(mockStorage.get('@MetaMask:unrelated')).toBe('keep');
    expect(StorageWrapper.removeItem).toHaveBeenCalledWith(
      SOCIAL_TERMS_ACCEPTED,
    );
  });

  it('forgets an in-process terms acceptance that storage no longer has', async () => {
    await acceptSocialTerms();

    expect(hasAcceptedSocialTerms()).toBe(true);

    mockStorage.delete(SOCIAL_TERMS_ACCEPTED);

    await clearSocialIdentityState({
      ProfileController: { clearState },
      SocialController: socialController as unknown as SocialController,
    });

    expect(hasAcceptedSocialTerms()).toBe(false);
  });

  it('still removes storage when clearing the profile controller throws', async () => {
    clearState.mockImplementation(() => {
      throw new Error('profile clear failed');
    });
    mockStorage.set(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN, 'true');

    await expect(
      clearSocialIdentityState({
        ProfileController: { clearState },
        SocialController: socialController as unknown as SocialController,
      }),
    ).resolves.toBeUndefined();

    expect(mockStorage.has(SOCIAL_LEADERBOARD_ONBOARDING_SHOWN)).toBe(false);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'profile clear failed' }),
      'Failed to clear ProfileController during wallet reset',
    );
  });
});
