import SecureKeychain from '../../../../../core/SecureKeychain';
import {
  getProviderToken,
  resetProviderToken,
  storeProviderToken,
} from './ProviderTokenVault';
import { NativeTransakAccessToken } from '@consensys/native-ramps-sdk';

jest.mock('../../../../../core/SecureKeychain', () => ({
  setDepositProviderKey: jest.fn(),
  getDepositProviderKey: jest.fn(),
  resetDepositProviderKey: jest.fn(),
}));

describe('ProviderTokenVault', () => {
  const mockToken = {
    accessToken: 'test-access-token',
    expiresIn: 3600,
    refreshToken: 'test-refresh-token',
    scope: 'test-scope',
    tokenType: 'Bearer',
  } as unknown as NativeTransakAccessToken;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeProviderToken', () => {
    it('should store token successfully', async () => {
      (SecureKeychain.setDepositProviderKey as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await storeProviderToken(mockToken);

      expect(SecureKeychain.setDepositProviderKey).toHaveBeenCalledWith(
        expect.stringContaining(JSON.stringify(mockToken)),
      );

      expect(result).toEqual({
        success: true,
      });
    });

    it('should return an error when storing token fails', async () => {
      const errorMessage = 'Test error';
      (SecureKeychain.setDepositProviderKey as jest.Mock).mockRejectedValue(
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
    it('should retrieve token successfully', async () => {
      const validToken = {
        token: mockToken,
        expiresAt: Date.now() + 1000,
      };

      (SecureKeychain.getDepositProviderKey as jest.Mock).mockResolvedValue(
        JSON.stringify(validToken),
      );

      const result = await getProviderToken();

      expect(SecureKeychain.getDepositProviderKey).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        token: mockToken,
      });
    });

    it('should return an error when no token is found', async () => {
      (SecureKeychain.getDepositProviderKey as jest.Mock).mockResolvedValue(
        null,
      );

      const result = await getProviderToken();

      expect(result).toEqual({
        success: false,
        error: 'No token found',
      });
    });

    it('should return an error when an exception occurs', async () => {
      const errorMessage = 'Test error';
      (SecureKeychain.getDepositProviderKey as jest.Mock).mockRejectedValue(
        new Error(errorMessage),
      );

      const result = await getProviderToken();

      expect(result).toEqual({
        success: false,
        error: errorMessage,
      });
    });

    it('should return an error when token has expired', async () => {
      const expiredToken = {
        token: mockToken,
        expiresAt: Date.now() - 1000,
      };

      (SecureKeychain.getDepositProviderKey as jest.Mock).mockResolvedValue(
        JSON.stringify(expiredToken),
      );
      (SecureKeychain.resetDepositProviderKey as jest.Mock).mockResolvedValue(
        undefined,
      );

      const result = await getProviderToken();

      expect(SecureKeychain.resetDepositProviderKey).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Token has expired',
      });
    });
  });

  describe('resetProviderToken', () => {
    it('should reset token successfully', async () => {
      (SecureKeychain.resetDepositProviderKey as jest.Mock).mockResolvedValue(
        undefined,
      );

      await resetProviderToken();

      expect(SecureKeychain.resetDepositProviderKey).toHaveBeenCalled();
    });
  });
});
