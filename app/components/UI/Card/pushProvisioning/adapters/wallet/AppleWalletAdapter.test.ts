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

// Mock constants
jest.mock('../../constants', () => ({
  getWalletName: () => 'Apple Wallet',
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

    it('maps "not found" to not_found', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('not found');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('not_found');
    });

    it('maps "requireActivation" to requires_activation', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('requires_activation');
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

      it('returns error when cardNetwork is empty', async () => {
        mockAddCardToAppleWallet.mockResolvedValue('success');
        // Force empty network for testing validation
        const params = {
          ...mockProvisionParams,
          cardNetwork: '' as 'MASTERCARD',
        };

        const result = await adapter.provisionCard(params);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.INVALID_CARD_DATA,
        );
      });

      it('returns error when lastFourDigits is empty', async () => {
        mockAddCardToAppleWallet.mockResolvedValue('success');
        const params = {
          ...mockProvisionParams,
          lastFourDigits: '',
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

      it('uses fallback cardholderName when not provided', async () => {
        const params = {
          ...mockProvisionParams,
          cardholderName: '',
        };

        await adapter.provisionCard(params);

        expect(mockAddCardToAppleWallet).toHaveBeenCalledWith(
          expect.objectContaining({
            cardHolderName: 'Card Holder',
          }),
          expect.any(Function),
        );
      });

      it('generates cardDescription when not provided', async () => {
        const params = {
          ...mockProvisionParams,
          cardDescription: undefined,
        };

        await adapter.provisionCard(params);

        expect(mockAddCardToAppleWallet).toHaveBeenCalledWith(
          expect.objectContaining({
            cardDescription: 'MetaMask Card ending in 1234',
          }),
          expect.any(Function),
        );
      });

      it('returns canceled status when user cancels', async () => {
        mockAddCardToAppleWallet.mockResolvedValue('canceled');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('canceled');
      });

      it('returns error status when SDK returns error', async () => {
        mockAddCardToAppleWallet.mockResolvedValue('error');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
      });

      it('invokes issuerEncryptCallback with correct parameters', async () => {
        // Capture the callback passed to addCardToAppleWallet
        let capturedCallback:
          | ((
              nonce: string,
              nonceSignature: string,
              certificates: string[],
            ) => Promise<unknown>)
          | undefined;
        mockAddCardToAppleWallet.mockImplementation(async (_data, callback) => {
          capturedCallback = callback;
          // Simulate native SDK calling the callback
          await callback('nonce-value', 'signature-value', ['cert1', 'cert2']);
          return 'success';
        });

        await adapter.provisionCard(mockProvisionParams);

        expect(capturedCallback).toBeDefined();
        expect(mockIssuerEncryptCallback).toHaveBeenCalledWith(
          'nonce-value',
          'signature-value',
          ['cert1', 'cert2'],
        );
      });

      it('passes encrypted payload from callback to native SDK', async () => {
        mockAddCardToAppleWallet.mockImplementation(async (_data, callback) => {
          const result = await callback('nonce', 'sig', ['cert']);
          expect(result).toEqual({
            encryptedPassData: 'encrypted-pass-data',
            activationData: 'activation-data',
            ephemeralPublicKey: 'ephemeral-public-key',
          });
          return 'success';
        });

        await adapter.provisionCard(mockProvisionParams);
      });
    });

    describe('error handling', () => {
      it('returns error result when SDK throws', async () => {
        mockAddCardToAppleWallet.mockRejectedValue(new Error('SDK failed'));

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(ProvisioningErrorCode.UNKNOWN_ERROR);
      });

      it('returns error result when callback throws', async () => {
        const errorCallback = jest
          .fn()
          .mockRejectedValue(new Error('Callback failed'));
        const params = {
          ...mockProvisionParams,
          issuerEncryptCallback: errorCallback,
        };
        mockAddCardToAppleWallet.mockImplementation(async (_data, callback) => {
          await callback('nonce', 'sig', ['cert']);
          return 'success';
        });

        const result = await adapter.provisionCard(params);

        expect(result.status).toBe('error');
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

    it('returns contact_support action when card is deactivated', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('deactivated');

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

    it('returns eligibility without checking card status when no lastFourDigits', async () => {
      const result = await adapter.getEligibility();

      expect(result.isAvailable).toBe(true);
      expect(result.canAddCard).toBe(true);
      expect(mockGetCardStatusBySuffix).not.toHaveBeenCalled();
    });
  });

  describe('addActivationListener', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = adapter.addActivationListener(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('removes listener on unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = adapter.addActivationListener(callback);

      unsubscribe();

      // Verify listener is removed by checking internal state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((adapter as any).activationListeners.size).toBe(0);
    });

    it('sets up native listener when listener is added', async () => {
      mockAddListener.mockReturnValue({ remove: jest.fn() });

      adapter.addActivationListener(jest.fn());

      // Wait for async setup
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockAddListener).toHaveBeenCalledWith(
        'onCardActivated',
        expect.any(Function),
      );
    });
  });

  describe('activation event handling', () => {
    beforeEach(() => {
      mockAddListener.mockReturnValue({ remove: jest.fn() });
    });

    it('notifies listeners on activated status', async () => {
      let nativeCallback: (data: unknown) => void = () => undefined;
      mockAddListener.mockImplementation((_event, callback) => {
        nativeCallback = callback;
        return { remove: jest.fn() };
      });

      const listener = jest.fn();
      adapter.addActivationListener(listener);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // iOS SDK sends 'state' property with 'activated' value
      nativeCallback({ serialNumber: 'pass-123', state: 'activated' });

      expect(listener).toHaveBeenCalledWith({
        serialNumber: 'pass-123',
        status: 'activated',
      });
    });

    it('notifies listeners on canceled status', async () => {
      let nativeCallback: (data: unknown) => void = () => undefined;
      mockAddListener.mockImplementation((_event, callback) => {
        nativeCallback = callback;
        return { remove: jest.fn() };
      });

      const listener = jest.fn();
      adapter.addActivationListener(listener);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // iOS SDK sends 'state' property with 'canceled' value
      nativeCallback({ serialNumber: 'pass-123', state: 'canceled' });

      expect(listener).toHaveBeenCalledWith({
        serialNumber: 'pass-123',
        status: 'canceled',
      });
    });

    it('notifies listeners on failed status (unknown state)', async () => {
      let nativeCallback: (data: unknown) => void = () => undefined;
      mockAddListener.mockImplementation((_event, callback) => {
        nativeCallback = callback;
        return { remove: jest.fn() };
      });

      const listener = jest.fn();
      adapter.addActivationListener(listener);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Unknown state falls through to 'failed'
      nativeCallback({ serialNumber: 'pass-123', state: 'unknown' });

      expect(listener).toHaveBeenCalledWith({
        serialNumber: 'pass-123',
        status: 'failed',
      });
    });
  });
});
