import Routes from '../../../../constants/navigation/Routes';
import { SOCIAL_TERMS_ACCEPTED } from '../../../../constants/storage';
import ReduxService from '../../../../core/redux/ReduxService';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  SOCIAL_TERMS_VERSION,
  acceptSocialTerms,
  ensureSocialTermsAccepted,
  hasAcceptedSocialTerms,
  hydrateSocialTermsAcceptance,
  resetSocialTermsAcceptance,
} from './socialTermsAcceptance';

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);
const mockGetItem = jest.mocked(StorageWrapper.getItem);
const mockSetItem = jest.mocked(StorageWrapper.setItem);
const mockRemoveItem = jest.mocked(StorageWrapper.removeItem);

describe('socialTermsAcceptance', () => {
  beforeEach(async () => {
    await resetSocialTermsAcceptance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hasAcceptedSocialTerms', () => {
    it('returns true when the stored version matches the current version', () => {
      mockGetItemSync.mockReturnValue(SOCIAL_TERMS_VERSION);

      expect(hasAcceptedSocialTerms()).toBe(true);
      expect(mockGetItemSync).toHaveBeenCalledWith(SOCIAL_TERMS_ACCEPTED);
    });

    it('returns false when nothing is stored', () => {
      mockGetItemSync.mockReturnValue(null);

      expect(hasAcceptedSocialTerms()).toBe(false);
    });

    it('returns false when an older version was accepted', () => {
      mockGetItemSync.mockReturnValue('v0');

      expect(hasAcceptedSocialTerms()).toBe(false);
    });
  });

  it('acceptSocialTerms stores the current version', async () => {
    await acceptSocialTerms();

    expect(mockSetItem).toHaveBeenCalledWith(
      SOCIAL_TERMS_ACCEPTED,
      SOCIAL_TERMS_VERSION,
    );
  });

  it('treats the terms as accepted for the session when storage cannot be read back', async () => {
    mockGetItemSync.mockReturnValue(null);

    await acceptSocialTerms();

    expect(hasAcceptedSocialTerms()).toBe(true);
  });

  describe('hydrateSocialTermsAcceptance', () => {
    it('accepts for the session when async storage holds the current version', async () => {
      mockGetItemSync.mockReturnValue(null);
      mockGetItem.mockResolvedValue(SOCIAL_TERMS_VERSION);

      await hydrateSocialTermsAcceptance();

      expect(mockGetItem).toHaveBeenCalledWith(SOCIAL_TERMS_ACCEPTED);
      expect(hasAcceptedSocialTerms()).toBe(true);
    });

    it('stays not accepted when async storage holds an older version', async () => {
      mockGetItemSync.mockReturnValue(null);
      mockGetItem.mockResolvedValue('v0');

      await hydrateSocialTermsAcceptance();

      expect(hasAcceptedSocialTerms()).toBe(false);
    });

    it('stays not accepted when the async read fails', async () => {
      mockGetItemSync.mockReturnValue(null);
      mockGetItem.mockRejectedValue(new Error('read failed'));

      await hydrateSocialTermsAcceptance();

      expect(hasAcceptedSocialTerms()).toBe(false);
    });
  });

  it('resetSocialTermsAcceptance removes the stored and session acceptance', async () => {
    mockGetItemSync.mockReturnValue(null);
    await acceptSocialTerms();

    await resetSocialTermsAcceptance();

    expect(mockRemoveItem).toHaveBeenCalledWith(SOCIAL_TERMS_ACCEPTED);
    expect(hasAcceptedSocialTerms()).toBe(false);
  });

  describe('ensureSocialTermsAccepted', () => {
    it('returns true without navigating when the terms are accepted', () => {
      mockGetItemSync.mockReturnValue(SOCIAL_TERMS_VERSION);
      const navigate = jest.fn();

      expect(ensureSocialTermsAccepted(navigate)).toBe(true);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('opens profile onboarding and returns false when the terms are not accepted', () => {
      mockGetItemSync.mockReturnValue(null);
      const navigate = jest.fn();

      expect(ensureSocialTermsAccepted(navigate)).toBe(false);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
    });

    it('opens terms-only onboarding for users with an existing profile', () => {
      mockGetItemSync.mockReturnValue(null);
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              ProfileController: { profile: { profileId: 'existing-profile' } },
            },
          },
        }),
      } as typeof ReduxService.store);
      const navigate = jest.fn();

      expect(ensureSocialTermsAccepted(navigate)).toBe(false);
      expect(navigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING, {
        termsOnly: true,
      });
    });
  });
});
