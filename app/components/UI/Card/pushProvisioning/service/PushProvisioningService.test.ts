import {
  PushProvisioningService,
  createPushProvisioningService,
  ProvisioningOptions,
} from './PushProvisioningService';
import {
  ProvisioningErrorCode,
  ProvisioningError,
  UserAddress,
  CardDetails,
} from '../types';
import { ICardProviderAdapter } from '../adapters/card/ICardProviderAdapter';
import { IWalletProviderAdapter } from '../adapters/wallet/IWalletProviderAdapter';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock constants
jest.mock('../constants', () => ({
  getWalletName: () => 'Google Wallet',
}));

describe('PushProvisioningService', () => {
  // Mock adapters
  const mockCardAdapter: jest.Mocked<ICardProviderAdapter> = {
    providerId: 'galileo',
    getOpaquePaymentCard: jest.fn(),
    getApplePayEncryptedPayload: jest.fn(),
  };

  const mockWalletAdapter: jest.Mocked<IWalletProviderAdapter> = {
    walletType: 'google_wallet',
    platform: 'android',
    checkAvailability: jest.fn(),
    getEligibility: jest.fn(),
    getCardStatus: jest.fn(),
    provisionCard: jest.fn(),
    addActivationListener: jest.fn(),
  };

  const mockCardDetails: CardDetails = {
    id: 'card-123',
    holderName: 'John Doe',
    panLast4: '1234',
    status: 'ACTIVE',
    expiryDate: '12/25',
  };

  const mockUserAddress: UserAddress = {
    name: 'John Doe',
    addressOne: '123 Main St',
    addressTwo: 'Apt 4B',
    administrativeArea: 'NY',
    locality: 'New York',
    countryCode: 'US',
    postalCode: '10001',
    phoneNumber: '5551234567',
  };

  const mockProvisioningOptions: ProvisioningOptions = {
    cardDetails: mockCardDetails,
    userAddress: mockUserAddress,
  };

  let service: PushProvisioningService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushProvisioningService(mockCardAdapter, mockWalletAdapter);
  });

  describe('createPushProvisioningService', () => {
    it('creates a service with provided adapters', () => {
      const createdService = createPushProvisioningService(
        mockCardAdapter,
        mockWalletAdapter,
      );
      expect(createdService).toBeInstanceOf(PushProvisioningService);
    });

    it('creates a service with null adapters', () => {
      const createdService = createPushProvisioningService(null, null);
      expect(createdService).toBeInstanceOf(PushProvisioningService);
    });
  });

  describe('initiateProvisioning', () => {
    describe('adapter validation', () => {
      it('returns error when card adapter is null', async () => {
        service = new PushProvisioningService(null, mockWalletAdapter);

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.CARD_PROVIDER_NOT_FOUND,
        );
      });

      it('returns error when wallet adapter is null', async () => {
        service = new PushProvisioningService(mockCardAdapter, null);

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        );
      });
    });

    describe('wallet availability check', () => {
      it('returns error when wallet is not available', async () => {
        mockWalletAdapter.checkAvailability.mockResolvedValue(false);

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.WALLET_NOT_AVAILABLE,
        );
      });
    });

    describe('Google Wallet flow', () => {
      beforeEach(() => {
        mockWalletAdapter.checkAvailability.mockResolvedValue(true);
      });

      it('provisions card successfully', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockResolvedValue({
          success: true,
          encryptedPayload: { opaquePaymentCard: 'encrypted-data' },
          cardNetwork: 'MASTERCARD',
          lastFourDigits: '1234',
          cardholderName: 'John Doe',
        });
        mockWalletAdapter.provisionCard.mockResolvedValue({
          status: 'success',
        });

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('success');
        expect(mockCardAdapter.getOpaquePaymentCard).toHaveBeenCalled();
        expect(mockWalletAdapter.provisionCard).toHaveBeenCalledWith({
          cardNetwork: 'MASTERCARD',
          cardholderName: 'John Doe',
          lastFourDigits: '1234',
          cardDescription: 'MetaMask Card ending in 1234',
          encryptedPayload: { opaquePaymentCard: 'encrypted-data' },
          userAddress: mockUserAddress,
        });
      });

      it('returns error when getOpaquePaymentCard fails', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockResolvedValue({
          success: false,
          encryptedPayload: {},
          cardNetwork: 'MASTERCARD',
          lastFourDigits: '1234',
          cardholderName: 'John Doe',
        });

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
        );
      });

      it('returns error when opaquePaymentCard is missing', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockResolvedValue({
          success: true,
          encryptedPayload: {}, // Missing opaquePaymentCard
          cardNetwork: 'MASTERCARD',
          lastFourDigits: '1234',
          cardholderName: 'John Doe',
        });

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.ENCRYPTION_FAILED,
        );
      });

      it('returns canceled when user cancels provisioning', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockResolvedValue({
          success: true,
          encryptedPayload: { opaquePaymentCard: 'encrypted-data' },
          cardNetwork: 'MASTERCARD',
          lastFourDigits: '1234',
          cardholderName: 'John Doe',
        });
        mockWalletAdapter.provisionCard.mockResolvedValue({
          status: 'canceled',
        });

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('canceled');
      });

      it('works without userAddress', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockResolvedValue({
          success: true,
          encryptedPayload: { opaquePaymentCard: 'encrypted-data' },
          cardNetwork: 'MASTERCARD',
          lastFourDigits: '1234',
          cardholderName: 'John Doe',
        });
        mockWalletAdapter.provisionCard.mockResolvedValue({
          status: 'success',
        });

        const result = await service.initiateProvisioning({
          cardDetails: mockCardDetails,
        });

        expect(result.status).toBe('success');
        expect(mockWalletAdapter.provisionCard).toHaveBeenCalledWith(
          expect.objectContaining({
            userAddress: undefined,
          }),
        );
      });
    });

    describe('Apple Wallet flow', () => {
      const mockAppleWalletAdapter: jest.Mocked<IWalletProviderAdapter> = {
        ...mockWalletAdapter,
        walletType: 'apple_wallet',
        platform: 'ios',
      };

      beforeEach(() => {
        mockAppleWalletAdapter.checkAvailability.mockResolvedValue(true);
        service = new PushProvisioningService(
          mockCardAdapter,
          mockAppleWalletAdapter,
        );
      });

      it('provisions card with issuerEncryptCallback', async () => {
        mockCardAdapter.getApplePayEncryptedPayload = jest
          .fn()
          .mockResolvedValue({
            encryptedPassData: 'encrypted-pass',
            activationData: 'activation',
            ephemeralPublicKey: 'public-key',
          });
        mockAppleWalletAdapter.provisionCard.mockResolvedValue({
          status: 'success',
        });

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('success');
        expect(mockAppleWalletAdapter.provisionCard).toHaveBeenCalledWith(
          expect.objectContaining({
            cardNetwork: 'MASTERCARD',
            cardholderName: 'John Doe',
            lastFourDigits: '1234',
            encryptedPayload: {},
            issuerEncryptCallback: expect.any(Function),
          }),
        );
      });

      it('issuerEncryptCallback calls card adapter correctly', async () => {
        const mockEncryptedPayload = {
          encryptedPassData: 'encrypted-pass',
          activationData: 'activation',
          ephemeralPublicKey: 'public-key',
        };
        mockCardAdapter.getApplePayEncryptedPayload = jest
          .fn()
          .mockResolvedValue(mockEncryptedPayload);

        // Capture the callback
        let capturedCallback:
          | ((
              nonce: string,
              nonceSignature: string,
              certificates: string[],
            ) => Promise<unknown>)
          | undefined;
        mockAppleWalletAdapter.provisionCard.mockImplementation(
          async (params) => {
            capturedCallback = params.issuerEncryptCallback;
            // Simulate calling the callback
            if (capturedCallback) {
              await capturedCallback('nonce', 'signature', ['cert1', 'cert2']);
            }
            return { status: 'success' };
          },
        );

        await service.initiateProvisioning(mockProvisioningOptions);

        expect(
          mockCardAdapter.getApplePayEncryptedPayload,
        ).toHaveBeenCalledWith('nonce', 'signature', ['cert1', 'cert2']);
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockWalletAdapter.checkAvailability.mockResolvedValue(true);
      });

      it('wraps ProvisioningError correctly', async () => {
        const provisioningError = new ProvisioningError(
          ProvisioningErrorCode.INVALID_CARD_DATA,
          'Invalid card',
        );
        mockCardAdapter.getOpaquePaymentCard.mockRejectedValue(
          provisioningError,
        );

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error).toBe(provisioningError);
      });

      it('wraps generic Error with UNKNOWN_ERROR code', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockRejectedValue(
          new Error('Network error'),
        );

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(ProvisioningErrorCode.UNKNOWN_ERROR);
        expect(result.error?.message).toBe('Network error');
      });

      it('handles non-Error throws', async () => {
        mockCardAdapter.getOpaquePaymentCard.mockRejectedValue('string error');

        const result = await service.initiateProvisioning(
          mockProvisioningOptions,
        );

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(ProvisioningErrorCode.UNKNOWN_ERROR);
      });
    });
  });

  describe('addActivationListener', () => {
    it('adds listener via wallet adapter', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      mockWalletAdapter.addActivationListener.mockReturnValue(unsubscribe);

      const result = service.addActivationListener(callback);

      expect(mockWalletAdapter.addActivationListener).toHaveBeenCalledWith(
        callback,
      );
      expect(result).toBe(unsubscribe);
    });

    it('returns noop function when wallet adapter is null', () => {
      service = new PushProvisioningService(mockCardAdapter, null);
      const callback = jest.fn();

      const result = service.addActivationListener(callback);

      expect(typeof result).toBe('function');
      // Should not throw when called
      result();
    });
  });
});
