import Engine from '../../core/Engine';
import {
  getSocialProfileId,
  resolveSocialProfileId,
} from './getSocialProfileId';

jest.mock('../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest.fn(),
    },
  },
}));

const mockGetSessionProfile = jest.mocked(
  Engine.context.AuthenticationController.getSessionProfile,
);

type SessionProfile = Awaited<ReturnType<typeof mockGetSessionProfile>>;

describe('resolveSocialProfileId', () => {
  it('prefers the canonical profile ID', () => {
    expect(
      resolveSocialProfileId({
        profileId: 'alias-profile-id',
        canonicalProfileId: 'canonical-profile-id',
      }),
    ).toBe('canonical-profile-id');
  });

  it('falls back to the session profile ID when the canonical ID is empty', () => {
    expect(
      resolveSocialProfileId({
        profileId: 'session-profile-id',
        canonicalProfileId: '',
      }),
    ).toBe('session-profile-id');
  });

  it('returns undefined without a session profile', () => {
    expect(resolveSocialProfileId(undefined)).toBeUndefined();
  });
});

describe('getSocialProfileId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the canonical profile ID when it differs from the session profile ID', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'alias-profile-id',
      canonicalProfileId: 'canonical-profile-id',
    } as SessionProfile);

    await expect(getSocialProfileId()).resolves.toBe('canonical-profile-id');
  });

  it('falls back to the session profile ID when the canonical ID is empty', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'session-profile-id',
      canonicalProfileId: '',
    } as SessionProfile);

    await expect(getSocialProfileId()).resolves.toBe('session-profile-id');
  });

  it('returns undefined when the session profile has no IDs', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: '',
      canonicalProfileId: '',
    } as SessionProfile);

    await expect(getSocialProfileId()).resolves.toBeUndefined();
  });

  it('returns undefined when getSessionProfile rejects', async () => {
    mockGetSessionProfile.mockRejectedValue(new Error('not signed in'));

    await expect(getSocialProfileId()).resolves.toBeUndefined();
  });
});
