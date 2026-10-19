import {
  SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID,
  buildCreateProfileParams,
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  normalizeUsername,
} from './profileOnboardingDraft';

describe('profileOnboardingDraft', () => {
  it('normalizes a typed handle', () => {
    expect(normalizeUsername('  @Wen-Cat ')).toBe('wen-cat');
  });

  it('builds a display name from a hyphenated handle', () => {
    expect(displayNameFromUsername('wen-cat')).toBe('Wen Cat');
  });

  it('marks short handles as unusable', () => {
    expect(getUsernameStatus('ab')).toBe('invalid');
    expect(getUsernameStatus('bad_name')).toBe('invalid');
    expect(getUsernameStatus('')).toBe('empty');
    expect(getUsernameStatus('wen-cat')).toBe('available');
  });

  it('blocks continue until the handle and display name are filled', () => {
    const draft = createInitialOnboardingDraft();

    expect(canContinueUsernameStep(draft)).toBe(true);
    expect(
      canContinueUsernameStep({ ...draft, username: 'no', displayName: '' }),
    ).toBe(false);
  });

  it('writes onboarding choices onto a local profile', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      avatarPresetId: 'zombie',
      avatarBackgroundId: 'lime',
      linkedAccountId: 'acc-1',
      linkedAccountAddress: '0xabc',
      shareTradingActivity: false,
    };

    const profile = buildOnboardedSocialProfile(draft);

    expect(profile.handle).toBe('wen-cat');
    expect(profile.displayName).toBe('Wen Cat');
    expect(profile.avatarPresetId).toBe('zombie');
    expect(profile.avatarBackgroundId).toBe('lime');
    expect(profile.linkedAccountId).toBe('acc-1');
    expect(profile.shareTradingActivity).toBe(false);
    expect(profile.xHandle).toBeNull();
    expect(profile.rankingTag).toBeNull();
    expect(profile.shareUrl).toBe('https://metamask.io/wen-cat');
  });

  it('maps a draft onto createProfile parameters', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      linkedAccountAddress: '0xabc',
      shareTradingActivity: false,
    };

    expect(
      buildCreateProfileParams(draft, SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID),
    ).toEqual({
      profile_id: 'social-v1-profile',
      username: 'wen-cat',
      display_name: 'Wen Cat',
      bio: null,
      linked_addresses: ['eip155:1:0xabc'],
      avatar_url: 'foxicon://visor/purple',
      trading_privacy: 'private',
    });
  });
});
