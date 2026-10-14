import { ControllerCardAdapter } from './ControllerCardAdapter';
import { ProvisioningError, ProvisioningErrorCode } from '../../types';
import Engine from '../../../../../../core/Engine';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    CardController: {
      createGoogleWalletProvisioningRequest: jest.fn(),
      createApplePayProvisioningRequest: jest.fn(),
    },
  },
}));

const mockCreateGoogleWallet = Engine.context.CardController
  .createGoogleWalletProvisioningRequest as jest.Mock;
const mockCreateApplePay = Engine.context.CardController
  .createApplePayProvisioningRequest as jest.Mock;

describe('ControllerCardAdapter', () => {
  let adapter: ControllerCardAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new ControllerCardAdapter();
  });

  describe('properties', () => {
    it('has correct providerId', () => {
      expect(adapter.providerId).toBe('galileo');
    });
  });

  describe('getOpaquePaymentCard', () => {
    it('returns opaquePaymentCard from controller response', async () => {
      mockCreateGoogleWallet.mockResolvedValue({
        opaquePaymentCard: 'encrypted-opaque-card-data',
      });

      const result = await adapter.getOpaquePaymentCard();

      expect(result).toEqual({
        opaquePaymentCard: 'encrypted-opaque-card-data',
      });
      expect(mockCreateGoogleWallet).toHaveBeenCalledTimes(1);
    });

    it('throws ProvisioningError(ENCRYPTION_FAILED) when response has no opaquePaymentCard', async () => {
      mockCreateGoogleWallet.mockResolvedValue({});

      await expect(adapter.getOpaquePaymentCard()).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('throws ProvisioningError(ENCRYPTION_FAILED) when response is null', async () => {
      mockCreateGoogleWallet.mockResolvedValue(null);

      await expect(adapter.getOpaquePaymentCard()).rejects.toMatchObject({
        code: ProvisioningErrorCode.ENCRYPTION_FAILED,
      });
    });

    it('wraps non-ProvisioningError from controller into ProvisioningError(ENCRYPTION_FAILED)', async () => {
      mockCreateGoogleWallet.mockRejectedValue(new Error('Network error'));

      const err = await adapter.getOpaquePaymentCard().catch((e) => e);
      expect(err).toBeInstanceOf(ProvisioningError);
      expect(err.code).toBe(ProvisioningErrorCode.ENCRYPTION_FAILED);
    });

    it('re-throws ProvisioningError as-is (no double-wrapping)', async () => {
      const original = new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        'original error',
      );
      mockCreateGoogleWallet.mockRejectedValue(original);

      const err = await adapter.getOpaquePaymentCard().catch((e) => e);
      expect(err).toBe(original);
    });
  });

  describe('getApplePayEncryptedPayload', () => {
    // Base64-encoded test data
    const mockNonceBase64 = 'dGVzdC1ub25jZQ=='; // "test-nonce"
    const mockNonceSignatureBase64 = 'dGVzdC1zaWduYXR1cmU='; // "test-signature"
    const mockCertificatesBase64 = ['bGVhZi1jZXJ0', 'aW50ZXJtZWRpYXRlLWNlcnQ=']; // "leaf-cert", "intermediate-cert"

    const mockSuccessResponse = {
      encryptedPassData: 'encrypted-pass-data',
      activationData: 'activation-data',
      ephemeralPublicKey: 'ephemeral-key',
    };

    it('forwards raw PassKit values to the controller', async () => {
      mockCreateApplePay.mockResolvedValue(mockSuccessResponse);

      await adapter.getApplePayEncryptedPayload(
        mockNonceBase64,
        mockNonceSignatureBase64,
        mockCertificatesBase64,
      );

      expect(mockCreateApplePay).toHaveBeenCalledWith({
        nonce: mockNonceBase64,
        nonceSignature: mockNonceSignatureBase64,
        certificates: mockCertificatesBase64,
      });
    });

    it('returns encryptedPassData, activationData, ephemeralPublicKey from response', async () => {
      mockCreateApplePay.mockResolvedValue(mockSuccessResponse);

      const result = await adapter.getApplePayEncryptedPayload(
        mockNonceBase64,
        mockNonceSignatureBase64,
        mockCertificatesBase64,
      );

      expect(result.encryptedPassData).toBe('encrypted-pass-data');
      expect(result.activationData).toBe('activation-data');
      expect(result.ephemeralPublicKey).toBe('ephemeral-key');
    });

    it('throws ProvisioningError(ENCRYPTION_FAILED) when response is missing encryptedPassData', async () => {
      mockCreateApplePay.mockResolvedValue({
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

    it('throws ProvisioningError(ENCRYPTION_FAILED) when response is missing activationData', async () => {
      mockCreateApplePay.mockResolvedValue({
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

    it('throws ProvisioningError(ENCRYPTION_FAILED) when response is missing ephemeralPublicKey', async () => {
      mockCreateApplePay.mockResolvedValue({
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

    it('wraps non-ProvisioningError from controller into ProvisioningError', async () => {
      mockCreateApplePay.mockRejectedValue(new Error('Network error'));

      const err = await adapter
        .getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          mockCertificatesBase64,
        )
        .catch((e) => e);

      expect(err).toBeInstanceOf(ProvisioningError);
      expect(err.code).toBe(ProvisioningErrorCode.ENCRYPTION_FAILED);
    });

    it('re-throws ProvisioningError as-is (no double-wrapping)', async () => {
      const original = new ProvisioningError(
        ProvisioningErrorCode.ENCRYPTION_FAILED,
        'original error',
      );
      mockCreateApplePay.mockRejectedValue(original);

      const err = await adapter
        .getApplePayEncryptedPayload(
          mockNonceBase64,
          mockNonceSignatureBase64,
          mockCertificatesBase64,
        )
        .catch((e) => e);

      expect(err).toBe(original);
    });
  });
});
