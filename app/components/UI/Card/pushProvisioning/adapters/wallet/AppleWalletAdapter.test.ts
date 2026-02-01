import { Platform } from 'react-native';
import { AppleWalletAdapter } from './AppleWalletAdapter';
import {
  ProvisionCardParams,
  ProvisioningErrorCode,
  ApplePayEncryptedPayload,
} from '../../types';

// Mock react-native-wallet module functions
const mockAddCardToAppleWallet = jest.fn();
const mockGetCardStatusBySuffix = jest.fn();
const mockCheckWalletAvailability = jest.fn();
const mockAddListener = jest.fn();

const mockWalletModule = {
  addCardToAppleWallet: mockAddCardToAppleWallet,
  getCardStatusBySuffix: mockGetCardStatusBySuffix,
  checkWalletAvailability: mockCheckWalletAvailability,
  addListener: mockAddListener,
};

// Mock Logger
jest.mock('../../../../../../util/Logger', () => ({
  log: jest.fn(),
}));

// Mock i18n
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

/**
 * Helper to inject mock wallet module into adapter
 */
function injectMockModule(adapter: AppleWalletAdapter): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).walletModule = mockWalletModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).moduleLoadPromise = Promise.resolve();
}

describe('AppleWalletAdapter', () => {
  let adapter: AppleWalletAdapter;
  const originalPlatform = Platform.OS;

  const mockEncryptedPayload: ApplePayEncryptedPayload = {
    encryptedPassData: 'encrypted-pass-data',
    activationData: 'activation-data',
    ephemeralPublicKey: 'ephemeral-public-key',
  };

  const mockIssuerEncryptCallback = jest
    .fn()
    .mockResolvedValue(mockEncryptedPayload);

  const mockProvisionParams: ProvisionCardParams = {
    cardNetwork: 'MASTERCARD',
    cardholderName: 'John Doe',
    lastFourDigits: '1234',
    cardDescription: 'MetaMask Card ending in 1234',
    encryptedPayload: {}, // Empty for Apple Pay - data comes via callback
    issuerEncryptCallback: mockIssuerEncryptCallback,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set platform to iOS for most tests
    Object.defineProperty(Platform, 'OS', {
      value: 'ios',
      writable: true,
    });
    adapter = new AppleWalletAdapter();
    injectMockModule(adapter);
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('properties', () => {
    it('has correct walletType', () => {
      expect(adapter.walletType).toBe('apple_wallet');
    });

    it('has correct platform', () => {
      expect(adapter.platform).toBe('ios');
    });
  });

  describe('checkAvailability', () => {
    it('returns false on non-iOS platforms', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      const androidAdapter = new AppleWalletAdapter();

      const result = await androidAdapter.checkAvailability();
      expect(result).toBe(false);
    });

    it('returns true when wallet is available', async () => {
      mockCheckWalletAvailability.mockResolvedValue(true);

      const result = await adapter.checkAvailability();
      expect(result).toBe(true);
    });

    it('returns false when wallet is not available', async () => {
      mockCheckWalletAvailability.mockResolvedValue(false);

      const result = await adapter.checkAvailability();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockCheckWalletAvailability.mockRejectedValue(new Error('SDK error'));

      const result = await adapter.checkAvailability();
      expect(result).toBe(false);
    });
  });

  describe('getCardStatus', () => {
    it('returns mapped card status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('active');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('active');
      expect(mockGetCardStatusBySuffix).toHaveBeenCalledWith('1234');
    });

    it('returns not_found on error', async () => {
      mockGetCardStatusBySuffix.mockRejectedValue(new Error('Card not found'));

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('not_found');
    });
  });

  describe('provisionCard', () => {
    describe('platform checks', () => {
      it('returns error on non-iOS platforms', async () => {
        Object.defineProperty(Platform, 'OS', {
          value: 'android',
          writable: true,
        });
        const androidAdapter = new AppleWalletAdapter();
        injectMockModule(androidAdapter);

        const result = await androidAdapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
        );
      });
    });

    describe('validation', () => {
      it('returns error when issuerEncryptCallback is missing', async () => {
        const params = {
          ...mockProvisionParams,
          issuerEncryptCallback: undefined,
        };

        const result = await adapter.provisionCard(params);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.INVALID_CARD_DATA,
        );
      });
    });

    describe('successful provisioning', () => {
      beforeEach(() => {
        mockAddCardToAppleWallet.mockResolvedValue('success');
      });

      it('calls addCardToAppleWallet with correct data and callback', async () => {
        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('success');
        expect(mockAddCardToAppleWallet).toHaveBeenCalledWith(
          {
            network: 'mastercard', // Apple Wallet uses lowercase network names
            cardHolderName: 'John Doe',
            lastDigits: '1234',
            cardDescription: 'MetaMask Card ending in 1234',
          },
          expect.any(Function),
        );
      });

      it('returns canceled status when user cancels', async () => {
        mockAddCardToAppleWallet.mockResolvedValue('canceled');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('canceled');
      });
    });
  });

  describe('getEligibility', () => {
    beforeEach(() => {
      mockCheckWalletAvailability.mockResolvedValue(true);
    });

    it('returns not available when wallet is not available', async () => {
      mockCheckWalletAvailability.mockResolvedValue(false);

      const result = await adapter.getEligibility('1234');

      expect(result.isAvailable).toBe(false);
      expect(result.canAddCard).toBe(false);
    });

    it('returns canAddCard true when card not found', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('not found');

      const result = await adapter.getEligibility('1234');

      expect(result.isAvailable).toBe(true);
      expect(result.canAddCard).toBe(true);
      expect(result.recommendedAction).toBe('add_card');
    });

    it('returns canAddCard false when card is active', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('active');

      const result = await adapter.getEligibility('1234');

      expect(result.isAvailable).toBe(true);
      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('none');
    });

    it('returns wait action when card is pending', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('pending');

      const result = await adapter.getEligibility('1234');

      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('wait');
    });

    it('returns contact_support action when card is suspended', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('suspended');

      const result = await adapter.getEligibility('1234');

      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('contact_support');
    });

    it('handles requireActivation as add_card for Apple (no Yellow Path)', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');

      const result = await adapter.getEligibility('1234');

      // Apple Wallet doesn't have Yellow Path, so requireActivation means add_card
      expect(result.canAddCard).toBe(true);
      expect(result.recommendedAction).toBe('add_card');
    });
  });

  describe('addActivationListener', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = adapter.addActivationListener(callback);

      expect(typeof unsubscribe).toBe('function');
    });
  });
});
