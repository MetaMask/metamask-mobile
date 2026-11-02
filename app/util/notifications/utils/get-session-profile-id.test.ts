import Engine from '../../../core/Engine';
import {
  getCanonicalSessionProfileId,
  getSessionProfileId,
} from './get-session-profile-id';

jest.mock('../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getSessionProfile: jest.fn(),
    },
  },
}));

const mockGetSessionProfile = jest.mocked(
  Engine.context.AuthenticationController.getSessionProfile,
);

describe('getSessionProfileId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the profile ID from the session profile', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'test-profile-id',
    } as Awaited<ReturnType<typeof mockGetSessionProfile>>);

    await expect(getSessionProfileId()).resolves.toBe('test-profile-id');
  });

  it('returns undefined when the session profile has no profile ID', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: '',
    } as Awaited<ReturnType<typeof mockGetSessionProfile>>);

    await expect(getSessionProfileId()).resolves.toBeUndefined();
  });

  it('returns undefined when getSessionProfile rejects', async () => {
    mockGetSessionProfile.mockRejectedValue(new Error('not signed in'));

    await expect(getSessionProfileId()).resolves.toBeUndefined();
  });
});

describe('getCanonicalSessionProfileId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the canonical id when pairing rewrote profileId to an alias', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'alias-profile-id',
      canonicalProfileId: 'canonical-profile-id',
    } as Awaited<ReturnType<typeof mockGetSessionProfile>>);

    await expect(getCanonicalSessionProfileId()).resolves.toBe(
      'canonical-profile-id',
    );
  });

  it('falls back to profileId when the canonical id is empty', async () => {
    mockGetSessionProfile.mockResolvedValue({
      profileId: 'solo-profile-id',
      canonicalProfileId: '',
    } as Awaited<ReturnType<typeof mockGetSessionProfile>>);

    await expect(getCanonicalSessionProfileId()).resolves.toBe(
      'solo-profile-id',
    );
  });

  it('returns undefined when getSessionProfile rejects', async () => {
    mockGetSessionProfile.mockRejectedValue(new Error('not signed in'));

    await expect(getCanonicalSessionProfileId()).resolves.toBeUndefined();
  });
});
