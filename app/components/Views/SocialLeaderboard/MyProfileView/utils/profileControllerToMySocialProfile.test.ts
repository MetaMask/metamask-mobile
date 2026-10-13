import type { Profile, XProfile } from '@metamask/profile-controller';
import { profileControllerToMySocialProfile } from './profileControllerToMySocialProfile';

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
      linkedAccountAddress: '0x123',
      shareTradingActivity: false,
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
    expect(result.linkedAccountAddress).toBeNull();
  });
});
