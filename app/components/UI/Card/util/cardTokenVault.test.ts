import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';
import {
  storeCardBaanxToken,
  getCardBaanxToken,
  removeCardBaanxToken,
} from './cardTokenVault';

jest.mock('../../../../core/SecureKeychain');
jest.mock('../../../../util/Logger');

const mockSecureKeychain = SecureKeychain as jest.Mocked<typeof SecureKeychain>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('cardTokenVault', () => {
  const mockScopeOptions = {
    service: 'com.metamask.CARD_BAANX_TOKENS',
    accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };

  const FIXED_TIMESTAMP = 1640995200000; // Fixed timestamp
  const mockTokenData = {
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    expiresAt: FIXED_TIMESTAMP + 3600000, // 1 hour from fixed timestamp
    location: 'us' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('storeCardBaanxToken', () => {
    it('stores token successfully', async () => {
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      const result = await storeCardBaanxToken(mockTokenData);

      expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledWith(
        'CARD_BAANX_TOKENS',
        JSON.stringify(mockTokenData),
        mockScopeOptions,
      );
      expect(result).toEqual({
        success: true,
      });
    });

    it('returns error when secure storage fails', async () => {
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(false);

      const result = await storeCardBaanxToken(mockTokenData);

      expect(result).toEqual({
        success: false,
        error: 'Token not stored',
      });
    });

    it('handles exceptions during storage', async () => {
      const error = new Error('Storage exception');
      (mockSecureKeychain.setSecureItem as jest.Mock).mockRejectedValue(error);

      const result = await storeCardBaanxToken(mockTokenData);

      expect(result).toEqual({
        success: false,
        error: 'Storage exception',
      });
    });

    it('stores international location tokens', async () => {
      const internationalTokenData = {
        ...mockTokenData,
        location: 'international' as const,
      };
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      const result = await storeCardBaanxToken(internationalTokenData);

      expect(mockSecureKeychain.setSecureItem).toHaveBeenCalledWith(
        'CARD_BAANX_TOKENS',
        JSON.stringify(internationalTokenData),
        mockScopeOptions,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getCardBaanxToken', () => {
    it('retrieves valid token successfully', async () => {
      const mockSecureItem = {
        key: 'CARD_BAANX_TOKENS',
        value: JSON.stringify(mockTokenData),
      };
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(
        mockSecureItem,
      );

      const result = await getCardBaanxToken();

      expect(mockSecureKeychain.getSecureItem).toHaveBeenCalledWith(
        mockScopeOptions,
      );
      expect(result).toEqual({
        success: true,
        tokenData: mockTokenData,
      });
    });

    it('returns undefined when no token exists', async () => {
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);

      const result = await getCardBaanxToken();

      expect(result).toEqual({
        success: true,
        tokenData: undefined,
      });
    });

    it('handles JSON parsing errors', async () => {
      const mockSecureItem = {
        key: 'CARD_BAANX_TOKENS',
        value: 'invalid-json',
      };
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(
        mockSecureItem,
      );

      const result = await getCardBaanxToken();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Error getting card baanx token:',
        expect.any(Error),
      );
      expect(result).toEqual({
        success: false,
        error: expect.any(String),
      });
    });

    it('handles SecureKeychain exceptions', async () => {
      const error = new Error('Keychain access denied');
      (mockSecureKeychain.getSecureItem as jest.Mock).mockRejectedValue(error);

      const result = await getCardBaanxToken();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Error getting card baanx token:',
        error,
      );
      expect(result).toEqual({
        success: false,
        error: 'Keychain access denied',
      });
    });

    it('handles international location tokens', async () => {
      const internationalTokenData = {
        ...mockTokenData,
        location: 'international' as const,
      };
      const mockSecureItem = {
        key: 'CARD_BAANX_TOKENS',
        value: JSON.stringify(internationalTokenData),
      };
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(
        mockSecureItem,
      );

      const result = await getCardBaanxToken();

      expect(result).toEqual({
        success: true,
        tokenData: internationalTokenData,
      });
    });
  });

  describe('removeCardBaanxToken', () => {
    it('removes token successfully', async () => {
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await removeCardBaanxToken();

      expect(mockSecureKeychain.clearSecureScope).toHaveBeenCalledWith(
        mockScopeOptions,
      );
      expect(result).toEqual({
        success: true,
      });
    });

    it('returns error when removal fails', async () => {
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        false,
      );

      const result = await removeCardBaanxToken();

      expect(result).toEqual({
        success: false,
        error: 'Failed to remove card baanx token',
      });
    });

    it('handles exceptions during removal', async () => {
      const error = new Error('Keychain removal failed');
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockRejectedValue(
        error,
      );

      const result = await removeCardBaanxToken();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Error removing card baanx token:',
        error,
      );
      expect(result).toEqual({
        success: false,
        error: 'Keychain removal failed',
      });
    });
  });

  describe('integration scenarios', () => {
    it('handles store-get-remove lifecycle', async () => {
      // Store token
      (mockSecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);
      const storeResult = await storeCardBaanxToken(mockTokenData);
      expect(storeResult.success).toBe(true);

      // Get token
      const mockSecureItem = {
        key: 'CARD_BAANX_TOKENS',
        value: JSON.stringify(mockTokenData),
      };
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(
        mockSecureItem,
      );
      const getResult = await getCardBaanxToken();
      expect(getResult.success).toBe(true);
      expect(getResult.tokenData).toEqual(mockTokenData);

      // Remove token
      (mockSecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(
        true,
      );
      const removeResult = await removeCardBaanxToken();
      expect(removeResult.success).toBe(true);
    });
  });

  describe('error boundary testing', () => {
    it('handles malformed token data structure', async () => {
      const malformedTokenData = {
        accessToken: 'token',
        // Missing required fields: refreshToken, expiresAt, location
      };
      const mockSecureItem = {
        key: 'CARD_BAANX_TOKENS',
        value: JSON.stringify(malformedTokenData),
      };
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(
        mockSecureItem,
      );

      const result = await getCardBaanxToken();

      // Should still return the malformed data if JSON parsing succeeds
      // The validation happens at usage time, not storage time
      expect(result.success).toBe(true);
      expect(result.tokenData).toEqual(malformedTokenData);
    });

    it('handles extremely large expiration timestamps', async () => {
      const futureTokenData = {
        ...mockTokenData,
        expiresAt: Number.MAX_SAFE_INTEGER,
      };
      const mockSecureItem = {
        key: 'CARD_BAANX_TOKENS',
        value: JSON.stringify(futureTokenData),
      };
      (mockSecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(
        mockSecureItem,
      );

      const result = await getCardBaanxToken();

      expect(result.success).toBe(true);
      expect(result.tokenData).toEqual(futureTokenData);
    });
  });
});
