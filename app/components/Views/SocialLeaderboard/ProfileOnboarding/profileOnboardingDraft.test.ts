import {
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  nextUsernameSuggestion,
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

  it('cycles username suggestions', () => {
    expect(nextUsernameSuggestion('wen-cat')).toBe('moon-fox');
    expect(nextUsernameSuggestion('not-in-list')).toBe('wen-cat');
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
      avatarPresetId: 'fox-emoji',
      linkedAccountId: 'acc-1',
      linkedAccountAddress: '0xabc',
      shareTradingActivity: false,
    };

    const profile = buildOnboardedSocialProfile(draft);

    expect(profile.handle).toBe('wen-cat');
    expect(profile.displayName).toBe('Wen Cat');
    expect(profile.avatarPresetId).toBe('fox-emoji');
    expect(profile.linkedAccountId).toBe('acc-1');
    expect(profile.shareTradingActivity).toBe(false);
    expect(profile.xHandle).toBeNull();
    expect(profile.rankingTag).toBeNull();
    expect(profile.shareUrl).toBe('https://metamask.io/wen-cat');
  });
});
