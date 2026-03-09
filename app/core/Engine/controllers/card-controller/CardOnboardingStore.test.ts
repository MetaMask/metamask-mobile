import SecureKeychain from '../../../SecureKeychain';
import {
  CardOnboardingStore,
  EMPTY_ONBOARDING_DATA,
} from './CardOnboardingStore';

jest.mock('../../../SecureKeychain');
jest.mock('../../../../util/Logger');

const mockSecureKeychain = SecureKeychain as jest.Mocked<typeof SecureKeychain>;

describe('CardOnboardingStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns null when no data is stored', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);

      const result = await CardOnboardingStore.get('baanx');

      expect(result).toBeNull();
    });

    it('returns onboarding data merged with defaults', async () => {
      const stored = {
        onboardingId: 'ob-123',
        selectedCountry: 'US',
      };

      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'CARD_ONBOARDING_baanx',
        value: JSON.stringify(stored),
      });

      const result = await CardOnboardingStore.get('baanx');

      expect(result).toStrictEqual({
        onboardingId: 'ob-123',
        contactVerificationId: null,
        consentSetId: null,
        selectedCountry: 'US',
      });
    });

    it('uses the correct keychain scope', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);

      await CardOnboardingStore.get('baanx');

      expect(mockSecureKeychain.getSecureItem).toHaveBeenCalledWith({
        service: 'com.metamask.CARD_ONBOARDING_baanx',
        accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });

    it('throws on keychain error to prevent silent data loss in set()', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockRejectedValue(
        new Error('Keychain error'),
      );

      await expect(CardOnboardingStore.get('baanx')).rejects.toThrow(
        'Keychain error',
      );
    });

    it('returns null on JSON parse error', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'CARD_ONBOARDING_baanx',
        value: 'invalid-json',
      });

      const result = await CardOnboardingStore.get('baanx');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('merges partial data with existing data', async () => {
      const existingData = {
        onboardingId: 'ob-123',
        contactVerificationId: null,
        consentSetId: null,
        selectedCountry: 'US',
      };

      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'CARD_ONBOARDING_baanx',
        value: JSON.stringify(existingData),
      });
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      const result = await CardOnboardingStore.set('baanx', {
        contactVerificationId: 'ver-456',
      });

      expect(result).toBe(true);
      expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledWith(
        'CARD_ONBOARDING_baanx',
        JSON.stringify({
          onboardingId: 'ob-123',
          contactVerificationId: 'ver-456',
          consentSetId: null,
          selectedCountry: 'US',
        }),
        expect.objectContaining({
          service: 'com.metamask.CARD_ONBOARDING_baanx',
        }),
      );
    });

    it('creates from empty when no existing data', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      await CardOnboardingStore.set('baanx', {
        onboardingId: 'ob-new',
      });

      expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledWith(
        'CARD_ONBOARDING_baanx',
        JSON.stringify({
          ...EMPTY_ONBOARDING_DATA,
          onboardingId: 'ob-new',
        }),
        expect.objectContaining({
          service: 'com.metamask.CARD_ONBOARDING_baanx',
        }),
      );
    });

    it('returns false on write error', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);
      (mockSecureKeychain.setSecureItem as jest.Mock).mockRejectedValue(
        new Error('Keychain error'),
      );

      const result = await CardOnboardingStore.set('baanx', {
        onboardingId: 'ob-123',
      });

      expect(result).toBe(false);
    });

    it('returns false on read error to prevent silent data loss', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockRejectedValue(
        new Error('Keychain read error'),
      );

      const result = await CardOnboardingStore.set('baanx', {
        contactVerificationId: 'ver-456',
      });

      expect(result).toBe(false);
      expect(mockSecureKeychain.setSecureItem).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('clears the keychain scope', async () => {
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await CardOnboardingStore.remove('baanx');

      expect(result).toBe(true);
      expect(mockSecureKeychain.clearSecureScope).toHaveBeenCalledWith({
        service: 'com.metamask.CARD_ONBOARDING_baanx',
        accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });

    it('returns false on failure', async () => {
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        false,
      );

      const result = await CardOnboardingStore.remove('baanx');

      expect(result).toBe(false);
    });
  });
});
