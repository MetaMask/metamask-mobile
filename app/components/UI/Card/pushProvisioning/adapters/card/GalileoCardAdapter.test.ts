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
    // Base64-encoded test data (simulating PassKit output)
    // "test-nonce" in Base64
    const mockNonceBase64 = 'dGVzdC1ub25jZQ==';
    // "test-signature" in Base64
    const mockNonceSignatureBase64 = 'dGVzdC1zaWduYXR1cmU=';
    // "leaf-cert" and "intermediate-cert" in Base64
    const mockCertificatesBase64 = ['bGVhZi1jZXJ0', 'aW50ZXJtZWRpYXRlLWNlcnQ='];

    // Expected hex-encoded values
    const expectedNonceHex = '746573742d6e6f6e6365';
    const expectedNonceSignatureHex = '746573742d7369676e6174757265';
    const expectedLeafCertHex = '6c6561662d63657274';
    const expectedIntermediateCertHex = '696e7465726d6564696174652d63657274';

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
        mockNonceBase64,
        mockNonceSignatureBase64,
        mockCertificatesBase64,
      );

      expect(result.encryptedPassData).toBe('encrypted-pass-data');
      expect(result.activationData).toBe('activation-data');
      expect(result.ephemeralPublicKey).toBe('ephemeral-key');
      expect(
        mockCardSDK.createApplePayProvisioningRequest,
      ).toHaveBeenCalledWith({
        leafCertificate: expectedLeafCertHex,
        intermediateCertificate: expectedIntermediateCertHex,
        nonce: expectedNonceHex,
        nonceSignature: expectedNonceSignatureHex,
      });
    });

    it('throws ProvisioningError when certificates array is empty', async () => {
      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          [],
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError when certificates array has only one element', async () => {
      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          ['bGVhZi1jZXJ0'],
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError when encryptedPassData is missing', async () => {
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue({
        encryptedPassData: '',
        activationData: 'activation-data',
        ephemeralPublicKey: 'ephemeral-key',
      });

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          mockCertificatesBase64,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError when activationData is missing', async () => {
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue({
        encryptedPassData: 'encrypted-pass-data',
        activationData: '',
        ephemeralPublicKey: 'ephemeral-key',
      });

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          mockCertificatesBase64,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError when ephemeralPublicKey is missing', async () => {
      mockCardSDK.createApplePayProvisioningRequest.mockResolvedValue({
        encryptedPassData: 'encrypted-pass-data',
        activationData: 'activation-data',
        ephemeralPublicKey: '',
      });

      await expect(
        adapter.getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          mockCertificatesBase64,
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
          mockNonceBase64,
          mockNonceSignatureBase64,
          mockCertificatesBase64,
        ),
      ).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });
  });
});
