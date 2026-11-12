import type { Profile } from '@metamask/profile-controller';
import { recordSocialTermsAcceptanceForExistingProfile } from '../terms/socialTermsAcceptance';
import { lookUpExistingSocialProfile } from './lookUpExistingSocialProfile';

jest.mock('../terms/socialTermsAcceptance', () => ({
  recordSocialTermsAcceptanceForExistingProfile: jest.fn(),
}));

const PROFILE: Profile = {
  profileId: 'profile-1',
  username: 'RealHandle',
  displayName: 'Real Handle',
  bio: '',
  linkedAddresses: [],
  avatarUrl: '',
  tradingPrivacy: 'public',
  connectedToX: true,
  verified: false,
  createdAt: '',
  updatedAt: '',
};

describe('lookUpExistingSocialProfile', () => {
  const mockRecordTerms = jest.mocked(
    recordSocialTermsAcceptanceForExistingProfile,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([undefined, '', '   '])(
    'returns no-session without fetching for profile id %p',
    async (profileId) => {
      const fetchAndUpdateProfile = jest.fn();

      const result = await lookUpExistingSocialProfile(
        profileId,
        fetchAndUpdateProfile,
      );

      expect(result).toBe('no-session');
      expect(fetchAndUpdateProfile).not.toHaveBeenCalled();
      expect(mockRecordTerms).not.toHaveBeenCalled();
    },
  );

  it('returns found and records terms when the profile exists', async () => {
    const fetchAndUpdateProfile = jest.fn().mockResolvedValue(PROFILE);

    const result = await lookUpExistingSocialProfile(
      ' profile-1 ',
      fetchAndUpdateProfile,
    );

    expect(result).toBe('found');
    expect(fetchAndUpdateProfile).toHaveBeenCalledWith('profile-1');
    expect(mockRecordTerms).toHaveBeenCalledTimes(1);
    expect(mockRecordTerms).toHaveBeenCalledWith({ profileLoaded: true });
  });

  it('returns not-found when the read has no profile id', async () => {
    const fetchAndUpdateProfile = jest
      .fn()
      .mockResolvedValue({ ...PROFILE, profileId: '' });

    const result = await lookUpExistingSocialProfile(
      'profile-1',
      fetchAndUpdateProfile,
    );

    expect(result).toBe('not-found');
    expect(mockRecordTerms).not.toHaveBeenCalled();
  });

  it('returns not-found when the profile API returns 404', async () => {
    const fetchAndUpdateProfile = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('Not found'), { status: 404 }),
      );

    const result = await lookUpExistingSocialProfile(
      'profile-1',
      fetchAndUpdateProfile,
    );

    expect(result).toBe('not-found');
    expect(mockRecordTerms).not.toHaveBeenCalled();
  });

  it('rethrows other errors without recording terms', async () => {
    const error = new Error('network');
    const fetchAndUpdateProfile = jest.fn().mockRejectedValue(error);

    await expect(
      lookUpExistingSocialProfile('profile-1', fetchAndUpdateProfile),
    ).rejects.toBe(error);
    expect(mockRecordTerms).not.toHaveBeenCalled();
  });
});
