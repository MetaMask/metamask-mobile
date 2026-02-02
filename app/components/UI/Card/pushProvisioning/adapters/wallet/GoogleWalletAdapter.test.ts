import { Platform } from 'react-native';
import { GoogleWalletAdapter } from './GoogleWalletAdapter';
import {
  ProvisionCardParams,
  ProvisioningErrorCode,
  UserAddress,
} from '../../types';

// Mock react-native-wallet module functions
const mockAddCardToGoogleWallet = jest.fn();
const mockResumeAddCardToGoogleWallet = jest.fn();
const mockGetCardStatusBySuffix = jest.fn();
const mockListTokens = jest.fn();
const mockCheckWalletAvailability = jest.fn();
const mockAddListener = jest.fn();

const mockWalletModule = {
  addCardToGoogleWallet: mockAddCardToGoogleWallet,
  resumeAddCardToGoogleWallet: mockResumeAddCardToGoogleWallet,
  getCardStatusBySuffix: mockGetCardStatusBySuffix,
  listTokens: mockListTokens,
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
  getWalletName: () => 'Google Wallet',
}));

/**
 * Helper to inject mock wallet module into adapter
 * Since the adapter uses dynamic imports, we need to manually inject the mock
 */
function injectMockModule(adapter: GoogleWalletAdapter): void {
  // Access private property using type assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).walletModule = mockWalletModule;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (adapter as any).moduleLoadPromise = Promise.resolve();
}

describe('GoogleWalletAdapter', () => {
  let adapter: GoogleWalletAdapter;
  const originalPlatform = Platform.OS;

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

  const mockProvisionParams: ProvisionCardParams = {
    cardNetwork: 'MASTERCARD',
    cardholderName: 'John Doe',
    lastFourDigits: '1234',
    cardDescription: 'MetaMask Card ending in 1234',
    encryptedPayload: {
      opaquePaymentCard: 'encrypted-opaque-card-data',
    },
    userAddress: mockUserAddress,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Set platform to android for most tests
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
    });
    adapter = new GoogleWalletAdapter();
    // Inject mock module for tests that need it
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
      expect(adapter.walletType).toBe('google_wallet');
    });

    it('has correct platform', () => {
      expect(adapter.platform).toBe('android');
    });
  });

  describe('checkAvailability', () => {
    it('returns false on non-Android platforms', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
      const iosAdapter = new GoogleWalletAdapter();

      const result = await iosAdapter.checkAvailability();
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

    it('maps requireActivation to requires_activation', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('requires_activation');
    });

    it('maps "not found" to not_found', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('not found');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('not_found');
    });

    it('maps pending status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('pending');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('pending');
    });

    it('maps suspended status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('suspended');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('suspended');
    });

    it('maps deactivated status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('deactivated');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('deactivated');
    });
  });

  describe('provisionCard', () => {
    describe('platform checks', () => {
      it('returns error on non-Android platforms', async () => {
        Object.defineProperty(Platform, 'OS', {
          value: 'ios',
          writable: true,
        });
        const iosAdapter = new GoogleWalletAdapter();
        injectMockModule(iosAdapter);

        const result = await iosAdapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
        );
      });
    });

    describe('validation', () => {
      it('returns error when opaquePaymentCard is missing', async () => {
        const params = {
          ...mockProvisionParams,
          encryptedPayload: {},
        };

        const result = await adapter.provisionCard(params);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.INVALID_CARD_DATA,
        );
      });

      it('returns error when opaquePaymentCard is empty string', async () => {
        const params = {
          ...mockProvisionParams,
          encryptedPayload: { opaquePaymentCard: '' },
        };

        const result = await adapter.provisionCard(params);

        expect(result.status).toBe('error');
        expect(result.error?.code).toBe(
          ProvisioningErrorCode.INVALID_CARD_DATA,
        );
      });
    });

    describe('normal flow (card not in wallet)', () => {
      beforeEach(() => {
        mockGetCardStatusBySuffix.mockResolvedValue('not found');
        mockAddCardToGoogleWallet.mockResolvedValue('success');
      });

      it('calls addCardToGoogleWallet with correct data', async () => {
        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('success');
        expect(mockAddCardToGoogleWallet).toHaveBeenCalledWith({
          network: 'MASTERCARD',
          opaquePaymentCard: 'encrypted-opaque-card-data',
          cardHolderName: 'John Doe',
          lastDigits: '1234',
          userAddress: {
            name: 'John Doe',
            addressOne: '123 Main St',
            addressTwo: 'Apt 4B',
            administrativeArea: 'NY',
            locality: 'New York',
            countryCode: 'US',
            postalCode: '10001',
            phoneNumber: '5551234567',
          },
        });
      });

      it('uses default address when userAddress is not provided', async () => {
        const params = {
          ...mockProvisionParams,
          userAddress: undefined,
        };

        await adapter.provisionCard(params);

        expect(mockAddCardToGoogleWallet).toHaveBeenCalledWith(
          expect.objectContaining({
            userAddress: {
              name: 'John Doe',
              addressOne: '',
              addressTwo: undefined,
              administrativeArea: '',
              locality: '',
              countryCode: 'US',
              postalCode: '',
              phoneNumber: '',
            },
          }),
        );
      });

      it('returns canceled status when user cancels', async () => {
        mockAddCardToGoogleWallet.mockResolvedValue('canceled');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('canceled');
      });

      it('returns error status when SDK returns error', async () => {
        mockAddCardToGoogleWallet.mockResolvedValue('error');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
      });
    });

    describe('auto-resume flow (Yellow Path)', () => {
      const mockToken = {
        identifier: 'token-123',
        lastDigits: '1234',
        tokenState: 1,
      };

      beforeEach(() => {
        mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');
        mockListTokens.mockResolvedValue([mockToken]);
        mockResumeAddCardToGoogleWallet.mockResolvedValue('success');
      });

      it('automatically resumes provisioning when card requires activation', async () => {
        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('success');
        expect(mockResumeAddCardToGoogleWallet).toHaveBeenCalledWith({
          network: 'MASTERCARD',
          tokenReferenceID: 'token-123',
          cardHolderName: 'John Doe',
          lastDigits: '1234',
        });
        expect(mockAddCardToGoogleWallet).not.toHaveBeenCalled();
      });

      it('falls back to addNewCard when token not found', async () => {
        mockListTokens.mockResolvedValue([]);
        mockAddCardToGoogleWallet.mockResolvedValue('success');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('success');
        expect(mockAddCardToGoogleWallet).toHaveBeenCalled();
        expect(mockResumeAddCardToGoogleWallet).not.toHaveBeenCalled();
      });

      it('falls back to addNewCard when token has different lastDigits', async () => {
        mockListTokens.mockResolvedValue([
          { identifier: 'token-456', lastDigits: '5678', tokenState: 1 },
        ]);
        mockAddCardToGoogleWallet.mockResolvedValue('success');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('success');
        expect(mockAddCardToGoogleWallet).toHaveBeenCalled();
        expect(mockResumeAddCardToGoogleWallet).not.toHaveBeenCalled();
      });

      it('handles resume canceled status', async () => {
        mockResumeAddCardToGoogleWallet.mockResolvedValue('canceled');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('canceled');
      });

      it('handles resume error status', async () => {
        mockResumeAddCardToGoogleWallet.mockResolvedValue('error');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockGetCardStatusBySuffix.mockResolvedValue('not found');
      });

      it('returns error result when SDK returns error status', async () => {
        mockAddCardToGoogleWallet.mockResolvedValue('error');

        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('error');
      });

      it('returns error result when getCardStatus throws', async () => {
        mockGetCardStatusBySuffix.mockImplementationOnce(async () => {
          throw new Error('Status failed');
        });
        mockAddCardToGoogleWallet.mockResolvedValue('success');

        // getCardStatus error is caught and returns 'not_found', so flow continues
        const result = await adapter.provisionCard(mockProvisionParams);

        expect(result.status).toBe('success');
      });
    });
  });

  describe('resumeProvisioning', () => {
    it('returns error on non-Android platforms', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
      const iosAdapter = new GoogleWalletAdapter();
      injectMockModule(iosAdapter);

      const result = await iosAdapter.resumeProvisioning(
        'token-123',
        'MASTERCARD',
        'John Doe',
        '1234',
      );

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe(
        ProvisioningErrorCode.PLATFORM_NOT_SUPPORTED,
      );
    });

    it('calls resumeAddCardToGoogleWallet with correct data', async () => {
      mockResumeAddCardToGoogleWallet.mockResolvedValue('success');

      const result = await adapter.resumeProvisioning(
        'token-123',
        'MASTERCARD',
        'John Doe',
        '1234',
      );

      expect(result.status).toBe('success');
      expect(mockResumeAddCardToGoogleWallet).toHaveBeenCalledWith({
        network: 'MASTERCARD',
        tokenReferenceID: 'token-123',
        cardHolderName: 'John Doe',
        lastDigits: '1234',
      });
    });

    it('handles optional parameters', async () => {
      mockResumeAddCardToGoogleWallet.mockResolvedValue('success');

      await adapter.resumeProvisioning('token-123', 'MASTERCARD');

      expect(mockResumeAddCardToGoogleWallet).toHaveBeenCalledWith({
        network: 'MASTERCARD',
        tokenReferenceID: 'token-123',
        cardHolderName: undefined,
        lastDigits: undefined,
      });
    });

    it('returns canceled status when user cancels resume', async () => {
      mockResumeAddCardToGoogleWallet.mockResolvedValue('canceled');

      const result = await adapter.resumeProvisioning(
        'token-123',
        'MASTERCARD',
      );

      expect(result.status).toBe('canceled');
    });

    it('returns error result when SDK throws', async () => {
      mockResumeAddCardToGoogleWallet.mockRejectedValue(
        new Error('Resume failed'),
      );

      const result = await adapter.resumeProvisioning(
        'token-123',
        'MASTERCARD',
      );

      expect(result.status).toBe('error');
      expect(result.error?.code).toBe(ProvisioningErrorCode.UNKNOWN_ERROR);
    });
  });

  describe('listTokens', () => {
    it('returns validated tokens', async () => {
      const mockTokens = [
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { identifier: 'token-2', lastDigits: '5678', tokenState: 2 },
      ];
      mockListTokens.mockResolvedValue(mockTokens);

      const result = await adapter.listTokens();

      expect(result).toEqual(mockTokens);
    });

    it('filters out invalid tokens', async () => {
      const mockTokens = [
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { invalid: true },
        null,
      ];
      mockListTokens.mockResolvedValue(mockTokens);

      const result = await adapter.listTokens();

      expect(result).toEqual([
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
      ]);
    });

    it('returns empty array on error', async () => {
      mockListTokens.mockRejectedValue(new Error('SDK error'));

      const result = await adapter.listTokens();

      expect(result).toEqual([]);
    });

    it('returns empty array when SDK returns non-array', async () => {
      mockListTokens.mockResolvedValue('not an array');

      const result = await adapter.listTokens();

      expect(result).toEqual([]);
    });

    it('returns empty array when SDK returns null', async () => {
      mockListTokens.mockResolvedValue(null);

      const result = await adapter.listTokens();

      expect(result).toEqual([]);
    });
  });

  describe('findTokenByLastDigits', () => {
    it('finds token with matching lastDigits', async () => {
      const mockTokens = [
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { identifier: 'token-2', lastDigits: '5678', tokenState: 2 },
      ];
      mockListTokens.mockResolvedValue(mockTokens);

      const result = await adapter.findTokenByLastDigits('5678');

      expect(result).toEqual({
        identifier: 'token-2',
        lastDigits: '5678',
        tokenState: 2,
      });
    });

    it('returns null when no matching token found', async () => {
      mockListTokens.mockResolvedValue([
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
      ]);

      const result = await adapter.findTokenByLastDigits('9999');

      expect(result).toBeNull();
    });

    it('returns null when listTokens fails', async () => {
      mockListTokens.mockRejectedValue(new Error('SDK error'));

      const result = await adapter.findTokenByLastDigits('1234');

      expect(result).toBeNull();
    });

    it('returns first matching token when duplicates exist', async () => {
      const mockTokens = [
        { identifier: 'token-1', lastDigits: '1234', tokenState: 1 },
        { identifier: 'token-2', lastDigits: '1234', tokenState: 2 },
      ];
      mockListTokens.mockResolvedValue(mockTokens);

      const result = await adapter.findTokenByLastDigits('1234');

      expect(result?.identifier).toBe('token-1');
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

    it('returns canAddCard true with resume action when requires activation', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');
      mockListTokens.mockResolvedValue([
        { identifier: 'token-123', lastDigits: '1234', tokenState: 1 },
      ]);

      const result = await adapter.getEligibility('1234');

      expect(result.isAvailable).toBe(true);
      expect(result.canAddCard).toBe(true);
      expect(result.recommendedAction).toBe('resume');
      expect(result.tokenReferenceId).toBe('token-123');
    });

    it('returns resume action without tokenReferenceId when token not found', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');
      mockListTokens.mockResolvedValue([]);

      const result = await adapter.getEligibility('1234');

      expect(result.recommendedAction).toBe('resume');
      expect(result.tokenReferenceId).toBeUndefined();
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((adapter as any).activationListeners.size).toBe(0);
    });

    it('sets up native listener when listener is added', async () => {
      mockAddListener.mockReturnValue({ remove: jest.fn() });

      adapter.addActivationListener(jest.fn());

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

      // Android SDK sends 'status' property with 'active' value
      nativeCallback({ tokenId: 'token-123', status: 'active' });

      expect(listener).toHaveBeenCalledWith({
        tokenId: 'token-123',
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

      // Android SDK sends 'status' property with 'canceled' value
      nativeCallback({ tokenId: 'token-123', status: 'canceled' });

      expect(listener).toHaveBeenCalledWith({
        tokenId: 'token-123',
        status: 'canceled',
      });
    });

    it('notifies listeners on failed status (unknown status)', async () => {
      let nativeCallback: (data: unknown) => void = () => undefined;
      mockAddListener.mockImplementation((_event, callback) => {
        nativeCallback = callback;
        return { remove: jest.fn() };
      });

      const listener = jest.fn();
      adapter.addActivationListener(listener);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Unknown status falls through to 'failed'
      nativeCallback({ tokenId: 'token-123', status: 'unknown' });

      expect(listener).toHaveBeenCalledWith({
        tokenId: 'token-123',
        status: 'failed',
      });
    });
  });
});
