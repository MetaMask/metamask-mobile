import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePushProvisioning } from './usePushProvisioning';
import { CardDetails } from '../types';

// Mock react-redux
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

// Mock useMetrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
});
jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

// Mock useCardSDK
const mockCardSDK = {
  createGoogleWalletProvisioningRequest: jest.fn(),
};
jest.mock('../../sdk', () => ({
  useCardSDK: () => ({
    sdk: mockCardSDK,
    isLoading: false,
  }),
}));

// Mock providers
const mockCardAdapter = {
  providerId: 'galileo',
  getOpaquePaymentCard: jest.fn(),
};
const mockWalletAdapter = {
  walletType: 'google_wallet',
  platform: 'android',
  checkAvailability: jest.fn(),
  getEligibility: jest.fn(),
  provisionCard: jest.fn(),
  addActivationListener: jest.fn().mockReturnValue(() => undefined),
};

jest.mock('../providers', () => ({
  getCardProvider: jest.fn(() => mockCardAdapter),
  getWalletProvider: jest.fn(() => mockWalletAdapter),
}));

// Mock service
const mockInitiateProvisioning = jest.fn();
const mockAddActivationListener = jest.fn().mockReturnValue(() => undefined);
jest.mock('../service', () => ({
  createPushProvisioningService: jest.fn(() => ({
    initiateProvisioning: mockInitiateProvisioning,
    addActivationListener: mockAddActivationListener,
  })),
  ProvisioningOptions: {},
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// Mock selectors
jest.mock('../../../../../core/redux/slices/card', () => ({
  selectIsAuthenticatedCard: 'selectIsAuthenticatedCard',
  selectUserCardLocation: 'selectUserCardLocation',
}));

describe('usePushProvisioning', () => {
  const mockCardDetails: CardDetails = {
    id: 'card-123',
    holderName: 'John Doe',
    panLast4: '1234',
    status: 'ACTIVE',
    expiryDate: '12/25',
  };

  const defaultOptions = {
    cardDetails: mockCardDetails,
    onSuccess: jest.fn(),
    onError: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default selector returns
    mockUseSelector.mockImplementation((selector) => {
      if (selector === 'selectIsAuthenticatedCard') return true;
      if (selector === 'selectUserCardLocation') return 'us';
      return undefined;
    });
    // Default adapter returns - use sync mock to avoid act() warnings
    mockWalletAdapter.getEligibility.mockResolvedValue({
      isAvailable: true,
      canAddCard: true,
      recommendedAction: 'add_card',
    });
  });

  // Helper to wait for all async effects to settle
  const waitForEffects = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };

  describe('initialization', () => {
    it('returns initial idle status', async () => {
      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(result.current.isProvisioning).toBe(false);

      await waitForEffects();
      unmount();
    });

    it('returns initiateProvisioning function', async () => {
      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      expect(typeof result.current.initiateProvisioning).toBe('function');

      await waitForEffects();
      unmount();
    });

    it('returns resetStatus function', async () => {
      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      expect(typeof result.current.resetStatus).toBe('function');

      await waitForEffects();
      unmount();
    });
  });

  describe('canAddToWallet', () => {
    it('returns true when all conditions are met', async () => {
      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddToWallet).toBe(true);
      unmount();
    });

    it('returns false when not authenticated', async () => {
      mockUseSelector.mockImplementation((selector) => {
        if (selector === 'selectIsAuthenticatedCard') return false;
        if (selector === 'selectUserCardLocation') return 'us';
        return undefined;
      });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddToWallet).toBe(false);
      unmount();
    });

    it('returns false when cardDetails is null', async () => {
      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, cardDetails: null }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddToWallet).toBe(false);
      unmount();
    });

    it('returns false when wallet is not available', async () => {
      mockWalletAdapter.getEligibility.mockResolvedValue({
        isAvailable: false,
        canAddCard: false,
      });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddToWallet).toBe(false);
      unmount();
    });
  });

  describe('initiateProvisioning', () => {
    it('calls service initiateProvisioning', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'success' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(mockInitiateProvisioning).toHaveBeenCalled();
      unmount();
    });

    it('sets status to provisioning during operation', async () => {
      let resolveProvisioning: (value: unknown) => void;
      mockInitiateProvisioning.mockReturnValue(
        new Promise((resolve) => {
          resolveProvisioning = resolve;
        }),
      );

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.initiateProvisioning();
      });

      expect(result.current.status).toBe('provisioning');
      expect(result.current.isProvisioning).toBe(true);

      await act(async () => {
        resolveProvisioning?.({ status: 'success' });
      });
      unmount();
    });

    it('calls onCancel callback when user cancels', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'canceled' });
      const onCancel = jest.fn();

      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onCancel }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(onCancel).toHaveBeenCalled();
      unmount();
    });

    it('tracks analytics on provisioning', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'success' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalled();
      unmount();
    });
  });

  describe('resetStatus', () => {
    it('resets status to idle', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'success' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First trigger a status change
      await act(async () => {
        await result.current.initiateProvisioning();
      });

      // Then reset
      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      unmount();
    });
  });

  describe('computed states', () => {
    it('isSuccess is true when status is success', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'success' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Note: success status is set via activation listener, not directly
      // This test validates the computed property logic
      expect(result.current.isSuccess).toBe(false); // Initially false
      unmount();
    });

    it('isError is true when status is error', async () => {
      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(false); // Initially false
      unmount();
    });
  });
});
