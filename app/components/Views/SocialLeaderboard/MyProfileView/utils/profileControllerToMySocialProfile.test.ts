import type { Profile, XProfile } from '@metamask/profile-controller';
import type { MySocialProfile } from '../hooks/useMyProfile';
import {
  profileControllerToMySocialProfile,
  withLocalAvatarPreset,
} from './profileControllerToMySocialProfile';

const profile: Profile = {
  profileId: 'profile-123',
  username: 'alice',
  displayName: 'Alice',
  bio: 'Trading in the open.',
  linkedAddresses: ['eip155:1:0x123'] as Profile['linkedAddresses'],
  avatarUrl: 'https://example.com/avatar.png',
  tradingPrivacy: 'private',
  connectedToX: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const xProfile: XProfile = {
  xUserId: 'x-user-123',
  xProfileUrl: 'https://x.com/alice',
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: 'https://example.com/x-avatar.png',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

describe('profileControllerToMySocialProfile', () => {
  it('maps controller identity fields to the social profile shape', () => {
    const result = profileControllerToMySocialProfile(profile, xProfile);

    expect(result).toMatchObject({
      profileId: 'profile-123',
      displayName: 'Alice',
      handle: 'alice',
      bio: 'Trading in the open.',
      imageUrl: 'https://example.com/avatar.png',
      xHandle: 'alice',
      connectedToX: true,
      linkedAccountAddress: '0x123',
      shareTradingActivity: false,
      joinedAt: '2026-01-01T00:00:00Z',
    });
  });

  it('maps missing X profile and empty optional values', () => {
    const result = profileControllerToMySocialProfile(
      {
        ...profile,
        bio: '',
        avatarUrl: '',
        connectedToX: false,
        linkedAddresses: [],
      },
      undefined,
    );

    expect(result.bio).toBeNull();
    expect(result.imageUrl).toBeNull();
    expect(result.xHandle).toBeNull();
    expect(result.connectedToX).toBe(false);
    expect(result.linkedAccountAddress).toBeNull();
  });

  it('stays connected to X when the X account failed to load', () => {
    const result = profileControllerToMySocialProfile(profile, undefined);

    expect(result.connectedToX).toBe(true);
    expect(result.xHandle).toBeNull();
  });

  it('reads a foxicon avatar URL as a preset and backdrop', () => {
    const result = profileControllerToMySocialProfile({
      ...profile,
      avatarUrl: 'foxicon://zombie/background7',
    });

    expect(result.imageUrl).toBeNull();
    expect(result.avatarPresetId).toBe('zombie');
    expect(result.avatarBackgroundId).toBe('background7');
  });

  it('translates a legacy foxicon avatar URL to the current ids', () => {
    const result = profileControllerToMySocialProfile({
      ...profile,
      avatarUrl: 'foxicon://visor/lime',
    });

    expect(result.avatarPresetId).toBe('vr');
    expect(result.avatarBackgroundId).toBe('background7');
  });
});

describe('withLocalAvatarPreset', () => {
  const controllerProfile = {
    profileId: 'profile-123',
    displayName: 'Wen Cat',
    handle: 'wen-cat',
    shareUrl: 'https://metamask.io/wen-cat',
    imageUrl: null,
    avatarPresetId: null,
    avatarBackgroundId: null,
  } as MySocialProfile;

  it('keeps the onboarding preset when the handles match', () => {
    const result = withLocalAvatarPreset(controllerProfile, {
      ...controllerProfile,
      avatarPresetId: 'zombie',
      avatarBackgroundId: 'lime',
      linkedAccountId: 'acc-1',
    });

    expect(result.avatarPresetId).toBe('zombie');
    expect(result.avatarBackgroundId).toBe('lime');
    expect(result.linkedAccountId).toBe('acc-1');
  });

  it('keeps the controller preset when the foxicon URL already set one', () => {
    const result = withLocalAvatarPreset(
      {
        ...controllerProfile,
        avatarPresetId: 'hero',
        avatarBackgroundId: 'sky',
      },
      {
        ...controllerProfile,
        avatarPresetId: 'zombie',
        avatarBackgroundId: 'lime',
      },
    );

    expect(result.avatarPresetId).toBe('hero');
    expect(result.avatarBackgroundId).toBe('sky');
  });

  it('leaves a remote avatar in place', () => {
    const result = withLocalAvatarPreset(
      { ...controllerProfile, imageUrl: 'https://example.com/avatar.png' },
      { ...controllerProfile, avatarPresetId: 'zombie' },
    );

    expect(result.avatarPresetId).toBeNull();
    expect(result.imageUrl).toBe('https://example.com/avatar.png');
  });
});
