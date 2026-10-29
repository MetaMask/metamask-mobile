import type { MySocialProfile } from './useMyProfile';
import {
  clearLocalSocialProfile,
  getLocalSocialProfileSnapshot,
  saveLocalSocialProfile,
  subscribeLocalSocialProfile,
} from './localSocialProfileStore';

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
  linkedAccountId: 'acc-1',
  shareTradingActivity: true,
};

describe('localSocialProfileStore', () => {
  afterEach(() => {
    clearLocalSocialProfile();
  });

  it('starts empty', () => {
    expect(getLocalSocialProfileSnapshot().profile).toBeNull();
  });

  it('stores the profile saved by onboarding', () => {
    saveLocalSocialProfile(onboardedProfile);

    expect(getLocalSocialProfileSnapshot().profile).toEqual(onboardedProfile);
  });

  it('notifies subscribers when a profile is saved', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeLocalSocialProfile(listener);

    saveLocalSocialProfile(onboardedProfile);
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
