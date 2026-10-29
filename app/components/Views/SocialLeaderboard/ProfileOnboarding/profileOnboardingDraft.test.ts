import {
  SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID,
  applyXOnboardingProfile,
  startManualOnboarding,
  buildCreateProfileParams,
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  isUneditedXUsername,
  normalizeUsername,
  onboardingProfileFingerprint,
  type XOnboardingIdentity,
} from './profileOnboardingDraft';

const X_IDENTITY: XOnboardingIdentity = {
  username: 'degangirl',
  displayName: 'Degan Giri',
  avatarUrl:
    'https://pbs.twimg.com/profile_images/2079082606717779969/DcvmQxfE_400x400.jpg',
};

describe('profileOnboardingDraft', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes a typed handle', () => {
    expect(normalizeUsername('  @Wen_Cat ')).toBe('wen_cat');
  });

  it('starts the draft with a generated username and matching display name', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const draft = createInitialOnboardingDraft();

    expect(draft.username).toBe('bonk_turbo_queen');
    expect(draft.displayName).toBe('Bonk Turbo Queen');
  });

  it('builds a display name from an underscored handle', () => {
    expect(displayNameFromUsername('wen_cat')).toBe('Wen Cat');
  });

  it('accepts letters, numbers, and underscores between 3 and 16 characters', () => {
    expect(getUsernameStatus('bad-name')).toBe('invalid');
    expect(getUsernameStatus('bad name')).toBe('invalid');
    expect(getUsernameStatus('')).toBe('empty');
    expect(getUsernameStatus('wen_cat')).toBe('available');
    expect(getUsernameStatus('wen_cat_12')).toBe('available');
  });

  it('reports a handle above the maximum length before the pattern', () => {
    expect(getUsernameStatus('a'.repeat(17))).toBe('tooLong');
    expect(getUsernameStatus('a'.repeat(16))).toBe('available');
    // Length outranks the pattern.
    expect(getUsernameStatus('bad-name-that-is-long')).toBe('tooLong');
  });

  it('reports a handle under the minimum length before any other rule', () => {
    expect(getUsernameStatus('a')).toBe('tooShort');
    expect(getUsernameStatus('ab')).toBe('tooShort');
    expect(getUsernameStatus('@a')).toBe('tooShort');
    // Length outranks the pattern.
    expect(getUsernameStatus('a-')).toBe('tooShort');
    expect(getUsernameStatus('abc')).toBe('available');
  });

  it('accepts underscores at the edges and repeated underscores', () => {
    expect(getUsernameStatus('hello_')).toBe('available');
    expect(getUsernameStatus('_hello')).toBe('available');
    expect(getUsernameStatus('hello__world')).toBe('available');
    expect(getUsernameStatus('_bad__name')).toBe('available');
  });

  it('accepts an unedited X handle that fails the username pattern', () => {
    const draft = applyXOnboardingProfile(createInitialOnboardingDraft(), {
      ...X_IDENTITY,
      username: 'bad-name',
    });

    expect(getUsernameStatus(draft.username)).toBe('invalid');
    expect(isUneditedXUsername(draft)).toBe(true);
    expect(canContinueUsernameStep(draft)).toBe(true);
    expect(canContinueUsernameStep({ ...draft, useXUsername: false })).toBe(
      false,
    );
    expect(
      canContinueUsernameStep({
        ...draft,
        useXUsername: false,
        username: 'still-bad-name',
      }),
    ).toBe(false);
  });

  it('changes the profile fingerprint when the username or account changes', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      username: 'wen_cat',
      displayName: 'Wen Cat',
      linkedAccountAddress: '0xabc',
    };

    const fingerprint = onboardingProfileFingerprint(draft);

    expect(fingerprint).toBe(onboardingProfileFingerprint(draft));
    expect(
      onboardingProfileFingerprint({ ...draft, username: 'moon_fox' }),
    ).not.toBe(fingerprint);
    expect(
      onboardingProfileFingerprint(draft, ['eip155:1:0xabc', 'eip155:1:0xdef']),
    ).not.toBe(fingerprint);
    expect(
      onboardingProfileFingerprint({
        ...draft,
        linkedAccountAddress: null,
      }),
    ).toBeNull();
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
      username: 'wen_cat',
      displayName: 'Wen Cat',
      avatarPresetId: 'zombie',
      avatarBackgroundId: 'lime',
      linkedAccountId: 'acc-1',
      linkedAccountAddress: '0xabc',
      shareTradingActivity: false,
    };

    const profile = buildOnboardedSocialProfile(draft);

    expect(profile.handle).toBe('wen_cat');
    expect(profile.displayName).toBe('Wen Cat');
    expect(profile.avatarPresetId).toBe('zombie');
    expect(profile.avatarBackgroundId).toBe('lime');
    expect(profile.linkedAccountId).toBe('acc-1');
    expect(profile.shareTradingActivity).toBe(false);
    expect(profile.xHandle).toBeNull();
    expect(profile.connectedToX).toBe(false);
    expect(profile.rankingTag).toBeNull();
  });

  it('keeps the mocked X handle and avatar when those toggles stay on', () => {
    const draft = {
      ...applyXOnboardingProfile(createInitialOnboardingDraft(), X_IDENTITY),
      linkedAccountAddress: '0xabc',
    };

    expect(buildOnboardedSocialProfile(draft)).toEqual(
      expect.objectContaining({
        handle: 'degangirl',
        displayName: 'Degan Giri',
        imageUrl: X_IDENTITY.avatarUrl,
        avatarPresetId: null,
        xHandle: 'degangirl',
        connectedToX: true,
      }),
    );
    expect(
      buildCreateProfileParams(draft, SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID)
        .avatar_url,
    ).toBe(X_IDENTITY.avatarUrl);
  });

  it('clears the X path when manual onboarding starts', () => {
    const draft = {
      ...applyXOnboardingProfile(createInitialOnboardingDraft(), X_IDENTITY),
      linkedAccountId: 'acc-1',
      linkedAccountAddress: '0xabc',
    };
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const manual = startManualOnboarding(draft);

    expect(manual.path).toBe('manual');
    expect(manual.useXAvatar).toBe(false);
    expect(manual.xUsername).toBeNull();
    expect(manual.username).toBe('bonk_turbo_queen');
    expect(manual.linkedAccountId).toBe('acc-1');
    expect(buildOnboardedSocialProfile(manual).connectedToX).toBe(false);
    expect(buildOnboardedSocialProfile(manual).xHandle).toBeNull();
  });

  it('keeps an in-progress manual draft', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      username: 'moon_fox',
      displayName: 'Moon Fox',
    };

    expect(startManualOnboarding(draft)).toBe(draft);
  });

  it('maps a draft onto createProfile parameters', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      username: 'wen_cat',
      displayName: 'Wen Cat',
      linkedAccountAddress: '0xabc',
      shareTradingActivity: false,
    };

    expect(
      buildCreateProfileParams(draft, SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID),
    ).toEqual({
      profile_id: 'social-v1-profile',
      username: 'wen_cat',
      display_name: 'Wen Cat',
      bio: null,
      linked_addresses: ['eip155:1:0xabc'],
      avatar_url: 'foxicon://vr/background3',
      trading_privacy: 'private',
    });
  });

  it('links every address in the chosen account, Solana included', () => {
    const draft = {
      ...createInitialOnboardingDraft(),
      linkedAccountAddress: '0xabc',
    };
    const linkedAddresses = [
      'eip155:1:0xabc',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
    ] as const;

    expect(
      buildCreateProfileParams(draft, SOCIAL_ONBOARDING_FALLBACK_PROFILE_ID, [
        ...linkedAddresses,
      ]).linked_addresses,
    ).toEqual(linkedAddresses);
  });
});
