import SecureKeychain from '../../../SecureKeychain';
import { CardTokenStore } from './CardTokenStore';

jest.mock('../../../SecureKeychain');
jest.mock('../../../../util/Logger');

const mockSecureKeychain = SecureKeychain as jest.Mocked<typeof SecureKeychain>;

describe('CardTokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns null when no token is stored', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);

      const result = await CardTokenStore.get('baanx');

      expect(result).toBeNull();
    });

    it('returns token set for baanx provider using legacy scope', async () => {
      const tokenData = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        accessTokenExpiresAt: Date.now() + 3600000,
        refreshTokenExpiresAt: Date.now() + 86400000,
        location: 'us',
      };

      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'CARD_TOKENS_baanx',
        value: JSON.stringify(tokenData),
      });

      const result = await CardTokenStore.get('baanx');

      expect(result).toStrictEqual(tokenData);
      expect(mockSecureKeychain.getSecureItem).toHaveBeenCalledWith({
        service: 'com.metamask.CARD_BAANX_TOKENS',
        accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });

    it('uses provider-specific scope for non-baanx providers', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);

      await CardTokenStore.get('providerB');

      expect(mockSecureKeychain.getSecureItem).toHaveBeenCalledWith({
        service: 'com.metamask.CARD_TOKENS_providerB',
        accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });

    it('returns null when token data is missing accessToken', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'CARD_TOKENS_baanx',
        value: JSON.stringify({ accessTokenExpiresAt: Date.now() + 3600000 }),
      });

      const result = await CardTokenStore.get('baanx');

      expect(result).toBeNull();
    });

    it('returns null on keychain error', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockRejectedValue(
        new Error('Keychain error'),
      );

      const result = await CardTokenStore.get('baanx');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('stores token set successfully', async () => {
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      const tokenSet = {
        accessToken: 'access-123',
        accessTokenExpiresAt: Date.now() + 3600000,
      };

      const result = await CardTokenStore.set('baanx', tokenSet);

      expect(result).toBe(true);
      expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledWith(
        'CARD_TOKENS_baanx',
        JSON.stringify(tokenSet),
        {
          service: 'com.metamask.CARD_BAANX_TOKENS',
          accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        },
      );
    });

    it('returns false when storage fails', async () => {
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(false);

      const result = await CardTokenStore.set('baanx', {
        accessToken: 'test',
        accessTokenExpiresAt: 0,
      });

      expect(result).toBe(false);
    });

    it('returns false on keychain error', async () => {
      (mockSecureKeychain.setSecureItem as jest.Mock).mockRejectedValue(
        new Error('Keychain error'),
      );

      const result = await CardTokenStore.set('baanx', {
        accessToken: 'test',
        accessTokenExpiresAt: 0,
      });

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes token successfully', async () => {
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await CardTokenStore.remove('baanx');

      expect(result).toBe(true);
      expect(mockSecureKeychain.clearSecureScope).toHaveBeenCalledWith({
        service: 'com.metamask.CARD_BAANX_TOKENS',
        accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    });

    it('returns false on failure', async () => {
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        false,
      );

      const result = await CardTokenStore.remove('baanx');

      expect(result).toBe(false);
    });
  });
});
