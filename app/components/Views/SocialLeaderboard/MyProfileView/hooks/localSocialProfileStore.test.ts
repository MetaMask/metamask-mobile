import type { MySocialProfile } from './useMyProfile';
import {
  getLocalSocialProfileSnapshot,
  resetLocalSocialProfile,
  restoreDefaultLocalSocialProfile,
  saveLocalSocialProfile,
} from './localSocialProfileStore';
import { isRecentSocialActivityTimestamp } from '../../../../../util/social/socialActivityStorage';

const onboardedProfile: MySocialProfile = {
  profileId: 'current-user',
  displayName: 'Wen Cat',
  handle: 'wen-cat',
  bio: null,
  imageUrl: null,
  avatarPresetId: 'zombie',
  rankingTag: null,
  xHandle: null,
  followerCount: 0,
  shareUrl: 'https://metamask.io/wen-cat',
  linkedAccountId: 'acc-1',
  shareTradingActivity: true,
};

describe('localSocialProfileStore', () => {
  afterEach(() => {
    restoreDefaultLocalSocialProfile();
  });

  it('starts with the giga-whale mock', () => {
    const { profile } = getLocalSocialProfileSnapshot();

    expect(profile?.handle).toBe('giga-whale');
    expect(profile?.displayName).toBe('Giga Whale');
    expect(profile?.createdAt).toEqual(expect.any(String));
  });

  it('keeps the default profile outside the recent activity window', () => {
    const { profile } = getLocalSocialProfileSnapshot();

    expect(
      isRecentSocialActivityTimestamp(profile?.createdAt, Date.now()),
    ).toBe(false);
  });

  it('clears the profile on reset', () => {
    resetLocalSocialProfile();

    expect(getLocalSocialProfileSnapshot().profile).toBeNull();
  });

  it('replaces the mock when onboarding saves a profile', () => {
    resetLocalSocialProfile();

    saveLocalSocialProfile(onboardedProfile);

    expect(getLocalSocialProfileSnapshot().profile).toEqual(onboardedProfile);
  });
});
