import { GalileoCardAdapter } from './GalileoCardAdapter';
import { ProvisioningErrorCode } from '../../types';
import { CardSDK } from '../../../sdk/CardSDK';

// Mock i18n
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('GalileoCardAdapter', () => {
  let adapter: GalileoCardAdapter;
  let mockCardSDK: jest.Mocked<CardSDK>;

  beforeEach(() => {
    mockCardSDK = {
      createGoogleWalletProvisioningRequest: jest.fn(),
      createApplePayProvisioningRequest: jest.fn(),
    } as unknown as jest.Mocked<CardSDK>;

    adapter = new GalileoCardAdapter(mockCardSDK);
  });

  describe('properties', () => {
    it('has correct providerId', () => {
      expect(adapter.providerId).toBe('galileo');
    });
  });

  describe('getOpaquePaymentCard', () => {
    it('returns successful response with encrypted payload', async () => {
      const mockResponse = {
        opaquePaymentCard: 'encrypted-opaque-card-data',
        cardNetwork: 'MASTERCARD',
        lastFourDigits: '1234',
        cardholderName: 'John Doe',
        cardDescription: 'MetaMask Card',
      };
      mockCardSDK.createGoogleWalletProvisioningRequest.mockResolvedValue(
        mockResponse,
      );

      const result = await adapter.getOpaquePaymentCard();

      expect(result.success).toBe(true);
      expect(result.encryptedPayload?.opaquePaymentCard).toBe(
        'encrypted-opaque-card-data',
      );
      expect(result.cardNetwork).toBe('MASTERCARD');
      expect(result.lastFourDigits).toBe('1234');
      expect(result.cardholderName).toBe('John Doe');
    });

    it('throws ProvisioningError when opaquePaymentCard is missing', async () => {
      // Test edge case where SDK returns invalid data
      mockCardSDK.createGoogleWalletProvisioningRequest.mockResolvedValue({
        opaquePaymentCard: '',
        cardNetwork: 'MASTERCARD',
        lastFourDigits: '1234',
        cardholderName: 'John Doe',
      });

      await expect(adapter.getOpaquePaymentCard()).rejects.toThrow();
    });

    it('throws ProvisioningError when SDK returns undefined', async () => {
      // Test edge case where SDK returns null/undefined - use type assertion for testing
      mockCardSDK.createGoogleWalletProvisioningRequest.mockResolvedValue(
        undefined as unknown as {
          cardNetwork: string;
          lastFourDigits: string;
          cardholderName: string;
          opaquePaymentCard: string;
        },
      );

      await expect(adapter.getOpaquePaymentCard()).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('wraps SDK errors in ProvisioningError', async () => {
      mockCardSDK.createGoogleWalletProvisioningRequest.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(adapter.getOpaquePaymentCard()).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });
  });

  describe('getApplePayEncryptedPayload', () => {
    const mockNonce = 'test-nonce';
    const mockNonceSignature = 'test-signature';
    const mockCertificates = ['cert1', 'cert2'];

    it('returns successful response with encrypted payload', async () => {
      const mockResponse = {
        encryptedPassData: 'encrypted-pass-data',
        activationData: 'activation-data',
        ephemeralPublicKey: 'ephemeral-key',
      };
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue(
        mockResponse,
      );

      const result = await adapter.getApplePayEncryptedPayload(
        mockNonce,
        mockNonceSignature,
        mockCertificates,
      );

      expect(result.encryptedPassData).toBe('encrypted-pass-data');
      expect(result.activationData).toBe('activation-data');
      expect(result.ephemeralPublicKey).toBe('ephemeral-key');
      expect(
        mockCardSDK.createApplePayProvisioningRequest,
      ).toHaveBeenCalledWith({
        nonce: mockNonce,
        nonceSignature: mockNonceSignature,
        certificates: mockCertificates,
      });
    });

    it('throws ProvisioningError when encryptedPassData is missing', async () => {
      // Test edge case - use type assertion for testing invalid data
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue({
        encryptedPassData: '',
        activationData: 'activation-data',
        ephemeralPublicKey: 'ephemeral-key',
      });

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonce,
          mockNonceSignature,
          mockCertificates,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError when activationData is missing', async () => {
      // Test edge case - use type assertion for testing invalid data
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue({
        encryptedPassData: 'encrypted-pass-data',
        activationData: '',
        ephemeralPublicKey: 'ephemeral-key',
      });

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonce,
          mockNonceSignature,
          mockCertificates,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError when ephemeralPublicKey is missing', async () => {
      // Test edge case - use type assertion for testing invalid data
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue({
        encryptedPassData: 'encrypted-pass-data',
        activationData: 'activation-data',
        ephemeralPublicKey: '',
      });

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonce,
          mockNonceSignature,
          mockCertificates,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('wraps SDK errors in ProvisioningError', async () => {
      mockCardSDK.createApplePayProvisioningRequest.mockRejectedValue(
        new Error('Network error'),
      );

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonce,
          mockNonceSignature,
          mockCertificates,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });
  });
});
