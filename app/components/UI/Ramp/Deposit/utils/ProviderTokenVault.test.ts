import SecureKeychain from '../../../../../core/SecureKeychain';
import {
  getProviderToken,
  resetProviderToken,
  storeProviderToken,
} from './ProviderTokenVault';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';

jest.mock('../../../../../core/SecureKeychain', () => ({
  setSecureItem: jest.fn(),
  getSecureItem: jest.fn(),
  clearSecureScope: jest.fn(),
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  },
}));

describe('ProviderTokenVault', () => {
  const mockToken = {
    accessToken: 'test-access-token',
    ttl: 3600,
    refreshToken: 'test-refresh-token',
    scope: 'test-scope',
    tokenType: 'Bearer',
    id: 'test-id',
    created: new Date('2024-01-01T00:00:00Z'),
    userId: 'test-user-id',
  } as NativeTransakAccessToken;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('storeProviderToken', () => {
    it('stores token with calculated expiration time', async () => {
      (SecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      const result = await storeProviderToken(mockToken);

      expect(SecureKeychain.setSecureItem).toHaveBeenCalledWith(
        'TRANSAK_ACCESS_TOKEN',
        expect.stringContaining('"expiresAt":4600000'),
        expect.objectContaining({
          service: 'com.metamask.TRANSAK_ACCESS_TOKEN',
          accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );

      expect(result).toEqual({
        success: true,
      });
    });

    it('stores token with correct JSON structure', async () => {
      (SecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(true);

      await storeProviderToken(mockToken);

      const storedData = JSON.parse(
        (SecureKeychain.setSecureItem as jest.Mock).mock.calls[0][1],
      );

      expect(storedData).toEqual({
        token: {
          ...mockToken,
          created: mockToken.created.toISOString(),
        },
        expiresAt: 4600000,
      });
    });

    it('returns error when storage fails', async () => {
      (SecureKeychain.setSecureItem as jest.Mock).mockResolvedValue(false);

      const result = await storeProviderToken(mockToken);

      expect(result).toEqual({
        success: false,
        error: 'Failed to store Provider token',
      });
    });

    it('returns error when exception occurs', async () => {
      const errorMessage = 'Storage error';
      (SecureKeychain.setSecureItem as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      const result = await storeProviderToken(mockToken);

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });
  });

  describe('getProviderToken', () => {
    it('retrieves valid unexpired token', async () => {
      const storedData = {
        token: mockToken,
        expiresAt: 2000000, // Future time
      };

      (SecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'TRANSAK_ACCESS_TOKEN',
        value: JSON.stringify(storedData),
      });

      const result = await getProviderToken();

      expect(SecureKeychain.getSecureItem).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'com.metamask.TRANSAK_ACCESS_TOKEN',
          accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );

      expect(result).toEqual({
        success: true,
        token: {
          ...mockToken,
          created: mockToken.created.toISOString(),
        },
      });
    });

    it('resets and returns error when token is expired', async () => {
      const expiredData = {
        token: mockToken,
        expiresAt: 500000, // Past time
      };

      (SecureKeychain.getSecureItem as jest.Mock).mockResolvedValue({
        key: 'TRANSAK_ACCESS_TOKEN',
        value: JSON.stringify(expiredData),
      });

      const result = await getProviderToken();

      expect(SecureKeychain.clearSecureScope).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'com.metamask.TRANSAK_ACCESS_TOKEN',
          accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );

      expect(result).toEqual({
        success: false,
        error: 'Token has expired',
      });
    });

    it('returns error when no token found', async () => {
      (SecureKeychain.getSecureItem as jest.Mock).mockResolvedValue(null);

      const result = await getProviderToken();

      expect(result).toEqual({
        success: false,
        error: 'No token found',
      });
    });

    it('returns error when exception occurs', async () => {
      const errorMessage = 'Retrieval error';
      (SecureKeychain.getSecureItem as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      const result = await getProviderToken();

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });
  });

  describe('resetProviderToken', () => {
    it('calls SecureKeychain clear scope with correct options', async () => {
      (SecureKeychain.clearSecureScope as jest.Mock).mockResolvedValue(true);

      await resetProviderToken();

      expect(SecureKeychain.clearSecureScope).toHaveBeenCalledWith(
        expect.objectContaining({
          service: 'com.metamask.TRANSAK_ACCESS_TOKEN',
          accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
    });
  });
});
