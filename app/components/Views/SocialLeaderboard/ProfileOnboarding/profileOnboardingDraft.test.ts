import {
  MOCK_X_ONBOARDING_PROFILE,
  SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID,
  applyXOnboardingProfile,
  startManualOnboarding,
  buildCreateProfileParams,
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  normalizeUsername,
} from './profileOnboardingDraft';

describe('profileOnboardingDraft', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes a typed handle', () => {
    expect(normalizeUsername('  @Wen-Cat ')).toBe('wen-cat');
  });

  it('starts the draft with a generated username and matching display name', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const draft = createInitialOnboardingDraft();

    expect(draft.username).toBe('bonk-turbo-queen');
    expect(draft.displayName).toBe('Bonk Turbo Queen');
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
      username: 'wen-cat',
      displayName: 'Wen Cat',
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
    expect(profile.connectedToX).toBe(false);
    expect(profile.rankingTag).toBeNull();
    expect(profile.shareUrl).toBe('https://metamask.io/wen-cat');
  });

  it('keeps the mocked X handle and avatar when those toggles stay on', () => {
    const draft = {
      ...applyXOnboardingProfile(createInitialOnboardingDraft()),
      linkedAccountAddress: '0xabc',
    };

    expect(buildOnboardedSocialProfile(draft)).toEqual(
      expect.objectContaining({
        handle: 'degangirl',
        displayName: 'Degan Giri',
        imageUrl: MOCK_X_ONBOARDING_PROFILE.avatarUrl,
        avatarPresetId: null,
        xHandle: 'degangirl',
        connectedToX: true,
      }),
    );
    expect(
      buildCreateProfileParams(draft, SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID)
        .avatar_url,
    ).toBe(MOCK_X_ONBOARDING_PROFILE.avatarUrl);
  });

  it('clears the X path when manual onboarding starts', () => {
    const draft = {
      ...applyXOnboardingProfile(createInitialOnboardingDraft()),
      linkedAccountId: 'acc-1',
      linkedAccountAddress: '0xabc',
    };
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const manual = startManualOnboarding(draft);

    expect(manual.path).toBe('manual');
    expect(manual.useXAvatar).toBe(false);
    expect(manual.xUsername).toBeNull();
    expect(manual.username).toBe('bonk-turbo-queen');
    expect(manual.linkedAccountId).toBe('acc-1');
    expect(buildOnboardedSocialProfile(manual).connectedToX).toBe(false);
    expect(buildOnboardedSocialProfile(manual).xHandle).toBeNull();
  });

  it('keeps an in-progress manual draft', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      username: 'moon-fox',
      displayName: 'Moon Fox',
    };

    expect(startManualOnboarding(draft)).toBe(draft);
  });

  it('maps a draft onto createProfile parameters', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      username: 'wen-cat',
      displayName: 'Wen Cat',
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
      avatar_url: 'foxicon://vr/background3',
      trading_privacy: 'private',
    });
  });
});
