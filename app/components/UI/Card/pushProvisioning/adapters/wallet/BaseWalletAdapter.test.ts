import { Platform, PlatformOSType } from 'react-native';
import { BaseWalletAdapter } from './BaseWalletAdapter';
import {
  WalletType,
  ProvisionCardParams,
  ProvisioningResult,
  CardActivationEvent,
} from '../../types';

// Mock react-native-wallet module
const mockCheckWalletAvailability = jest.fn();
const mockGetCardStatusBySuffix = jest.fn();
const mockAddListener = jest.fn();

const mockWalletModule = {
  checkWalletAvailability: mockCheckWalletAvailability,
  getCardStatusBySuffix: mockGetCardStatusBySuffix,
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
  getWalletName: () => 'Test Wallet',
}));

/**
 * Concrete test implementation of BaseWalletAdapter
 */
class TestWalletAdapter extends BaseWalletAdapter {
  readonly walletType: WalletType = 'google_wallet';
  readonly platform: PlatformOSType = 'android';
  public lastEvent: CardActivationEvent | null = null;

  protected getAdapterName(): string {
    return 'TestWalletAdapter';
  }

  protected getExpectedPlatform(): PlatformOSType {
    return 'android';
  }

  protected handleNativeActivationEvent(data: unknown): void {
    const typedData = data as { actionStatus?: string; tokenId?: string };
    const event: CardActivationEvent = {
      tokenId: typedData.tokenId,
      status:
        typedData.actionStatus === 'active'
          ? 'activated'
          : typedData.actionStatus === 'canceled'
            ? 'canceled'
            : 'failed',
    };
    this.lastEvent = event;
    this.notifyActivationListeners(event);
  }

  // Expose provisionCard for interface compliance
  async provisionCard(
    _params: ProvisionCardParams,
  ): Promise<ProvisioningResult> {
    return { status: 'success' };
  }

  // Helper method for testing protected methods
  public testGetWalletModule() {
    return this.getWalletModule();
  }

  // Helper to inject mock module
  public injectMockModule() {
    this.walletModule =
      mockWalletModule as unknown as typeof import('@expensify/react-native-wallet');
    this.moduleLoadPromise = Promise.resolve();
  }

  // Helper to simulate module load error
  public simulateModuleLoadError(error: Error) {
    this.walletModule = null;
    this.moduleLoadError = error;
    this.moduleLoadPromise = Promise.resolve();
  }

  // Helper to trigger native listener setup
  public async triggerSetupNativeListener() {
    await this.setupNativeListenerIfNeeded();
  }

  // Helper to test handleNativeActivationEvent (protected method)
  public testHandleNativeActivationEvent(data: unknown) {
    this.handleNativeActivationEvent(data);
  }

  // Helper to test createPlatformNotSupportedError (protected method)
  public testCreatePlatformNotSupportedError() {
    return this.createPlatformNotSupportedError();
  }

  // Helper to test createInvalidCardDataError (protected method)
  public testCreateInvalidCardDataError() {
    return this.createInvalidCardDataError();
  }
}

describe('BaseWalletAdapter', () => {
  let adapter: TestWalletAdapter;
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      writable: true,
    });
    adapter = new TestWalletAdapter();
    adapter.injectMockModule();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('checkAvailability', () => {
    it('returns false when platform does not match', async () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
      const iosAdapter = new TestWalletAdapter();

      const result = await iosAdapter.checkAvailability();
      expect(result).toBe(false);
    });

    it('returns true when wallet is available', async () => {
      mockCheckWalletAvailability.mockResolvedValue(true);

      const result = await adapter.checkAvailability();
      expect(result).toBe(true);
      expect(mockCheckWalletAvailability).toHaveBeenCalled();
    });

    it('returns false when wallet is not available', async () => {
      mockCheckWalletAvailability.mockResolvedValue(false);

      const result = await adapter.checkAvailability();
      expect(result).toBe(false);
    });

    it('returns false on SDK error', async () => {
      mockCheckWalletAvailability.mockRejectedValue(new Error('SDK error'));

      const result = await adapter.checkAvailability();
      expect(result).toBe(false);
    });
  });

  describe('getCardStatus', () => {
    it('returns mapped active status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('active');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('active');
    });

    it('returns mapped not_found status for "not found"', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('not found');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('not_found');
    });

    it('returns mapped requires_activation status for "requireActivation"', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('requireActivation');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('requires_activation');
    });

    it('returns mapped pending status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('pending');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('pending');
    });

    it('returns mapped suspended status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('suspended');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('suspended');
    });

    it('returns mapped deactivated status', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('deactivated');

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('deactivated');
    });

    it('returns not_found on error', async () => {
      mockGetCardStatusBySuffix.mockRejectedValue(new Error('SDK error'));

      const result = await adapter.getCardStatus('1234');
      expect(result).toBe('not_found');
    });
  });

  describe('getEligibility', () => {
    beforeEach(() => {
      mockCheckWalletAvailability.mockResolvedValue(true);
    });

    it('returns unavailable when wallet is not available', async () => {
      mockCheckWalletAvailability.mockResolvedValue(false);

      const result = await adapter.getEligibility('1234');

      expect(result.isAvailable).toBe(false);
      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('none');
    });

    it('returns add_card when card not found', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('not found');

      const result = await adapter.getEligibility('1234');

      expect(result.isAvailable).toBe(true);
      expect(result.canAddCard).toBe(true);
      expect(result.recommendedAction).toBe('add_card');
    });

    it('returns add_card when no lastFourDigits provided', async () => {
      const result = await adapter.getEligibility();

      expect(result.isAvailable).toBe(true);
      expect(result.canAddCard).toBe(true);
      expect(result.recommendedAction).toBe('add_card');
    });

    it('returns none when card is active', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('active');

      const result = await adapter.getEligibility('1234');

      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('none');
      expect(result.ineligibilityReason).toBeDefined();
    });

    it('returns wait when card is pending', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('pending');

      const result = await adapter.getEligibility('1234');

      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('wait');
    });

    it('returns contact_support when card is suspended', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('suspended');

      const result = await adapter.getEligibility('1234');

      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('contact_support');
    });

    it('returns contact_support when card is deactivated', async () => {
      mockGetCardStatusBySuffix.mockResolvedValue('deactivated');

      const result = await adapter.getEligibility('1234');

      expect(result.canAddCard).toBe(false);
      expect(result.recommendedAction).toBe('contact_support');
    });
  });

  describe('addActivationListener', () => {
    it('returns unsubscribe function', () => {
      const callback = jest.fn();

      const unsubscribe = adapter.addActivationListener(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('calls callback when event is received', async () => {
      const callback = jest.fn();
      adapter.addActivationListener(callback);

      // Simulate native event
      adapter.testHandleNativeActivationEvent({
        actionStatus: 'active',
        tokenId: 'token-123',
      });

      expect(callback).toHaveBeenCalledWith({
        tokenId: 'token-123',
        status: 'activated',
      });
    });

    it('handles multiple listeners', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      adapter.addActivationListener(callback1);
      adapter.addActivationListener(callback2);

      adapter.testHandleNativeActivationEvent({
        actionStatus: 'active',
        tokenId: 'token-123',
      });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('removes listener when unsubscribe is called', async () => {
      const callback = jest.fn();
      const unsubscribe = adapter.addActivationListener(callback);

      unsubscribe();

      adapter.testHandleNativeActivationEvent({
        actionStatus: 'active',
        tokenId: 'token-123',
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('handles error in listener gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalCallback = jest.fn();

      adapter.addActivationListener(errorCallback);
      adapter.addActivationListener(normalCallback);

      // Should not throw
      expect(() => {
        adapter.testHandleNativeActivationEvent({
          actionStatus: 'active',
          tokenId: 'token-123',
        });
      }).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('getWalletModule', () => {
    it('throws error when module failed to load', async () => {
      adapter.simulateModuleLoadError(new Error('Load failed'));

      await expect(adapter.testGetWalletModule()).rejects.toThrow();
    });

    it('returns module when loaded successfully', async () => {
      const walletModule = await adapter.testGetWalletModule();

      expect(walletModule).toBe(mockWalletModule);
    });
  });

  describe('setupNativeListenerIfNeeded', () => {
    it('sets up native listener when listeners are registered', async () => {
      mockAddListener.mockReturnValue({ remove: jest.fn() });

      adapter.addActivationListener(jest.fn());
      await adapter.triggerSetupNativeListener();

      expect(mockAddListener).toHaveBeenCalledWith(
        'onCardActivated',
        expect.any(Function),
      );
    });

    it('does not set up native listener when no listeners registered', async () => {
      await adapter.triggerSetupNativeListener();

      expect(mockAddListener).not.toHaveBeenCalled();
    });

    it('does not set up duplicate listeners', async () => {
      mockAddListener.mockReturnValue({ remove: jest.fn() });

      adapter.addActivationListener(jest.fn());
      await adapter.triggerSetupNativeListener();
      await adapter.triggerSetupNativeListener();

      expect(mockAddListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('error helpers', () => {
    it('createPlatformNotSupportedError returns correct error', () => {
      const error = adapter.testCreatePlatformNotSupportedError();

      expect(error.code).toBe('PLATFORM_NOT_SUPPORTED');
    });

    it('createInvalidCardDataError returns correct error', () => {
      const error = adapter.testCreateInvalidCardDataError();

      expect(error.code).toBe('INVALID_CARD_DATA');
    });
  });
});
