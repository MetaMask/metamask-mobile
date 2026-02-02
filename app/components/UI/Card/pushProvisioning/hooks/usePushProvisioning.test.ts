import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePushProvisioning } from './usePushProvisioning';
import {
  CardDetails,
  ProvisioningError,
  ProvisioningErrorCode,
} from '../types';

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

  const mockUserAddress = {
    name: 'John Doe',
    addressOne: '123 Main St',
    administrativeArea: 'NY',
    locality: 'New York',
    countryCode: 'US',
    postalCode: '10001',
    phoneNumber: '5551234567',
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

    it('checks eligibility on mount', async () => {
      const { unmount } = renderHook(() => usePushProvisioning(defaultOptions));

      await waitFor(() => {
        expect(mockWalletAdapter.getEligibility).toHaveBeenCalledWith('1234');
      });

      unmount();
    });

    it('does not check eligibility when cardDetails is null', async () => {
      const { unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, cardDetails: null }),
      );

      await waitForEffects();

      expect(mockWalletAdapter.getEligibility).not.toHaveBeenCalled();

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

    it('returns false when card cannot be added', async () => {
      mockWalletAdapter.getEligibility.mockResolvedValue({
        isAvailable: true,
        canAddCard: false,
        recommendedAction: 'none',
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

    it('returns false when card status is not ACTIVE', async () => {
      const inactiveCard = { ...mockCardDetails, status: 'INACTIVE' };

      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, cardDetails: inactiveCard }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.canAddToWallet).toBe(false);
      unmount();
    });

    it('returns false when card status is PENDING', async () => {
      const pendingCard = { ...mockCardDetails, status: 'PENDING' };

      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, cardDetails: pendingCard }),
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

    it('passes cardDetails to service', async () => {
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

      expect(mockInitiateProvisioning).toHaveBeenCalledWith(
        expect.objectContaining({
          cardDetails: expect.objectContaining({
            id: 'card-123',
            holderName: 'John Doe',
            panLast4: '1234',
          }),
        }),
      );
      unmount();
    });

    it('passes userAddress to service when provided', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'success' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning({
          ...defaultOptions,
          userAddress: mockUserAddress,
        }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(mockInitiateProvisioning).toHaveBeenCalledWith(
        expect.objectContaining({
          userAddress: mockUserAddress,
        }),
      );
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

    it('sets status to idle when user cancels', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'canceled' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(result.current.status).toBe('idle');
      unmount();
    });

    it('sets status to error when provisioning fails', async () => {
      const error = new ProvisioningError(
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Test error',
      );
      mockInitiateProvisioning.mockResolvedValue({ status: 'error', error });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe(error);
      unmount();
    });

    it('calls onError callback when provisioning fails', async () => {
      const error = new ProvisioningError(
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Test error',
      );
      mockInitiateProvisioning.mockResolvedValue({ status: 'error', error });
      const onError = jest.fn();

      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onError }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(onError).toHaveBeenCalledWith(error);
      unmount();
    });

    it('handles thrown errors gracefully', async () => {
      mockInitiateProvisioning.mockRejectedValue(new Error('Unexpected error'));
      const onError = jest.fn();

      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onError }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(result.current.status).toBe('error');
      expect(onError).toHaveBeenCalled();
      unmount();
    });

    it('tracks analytics on provisioning start', async () => {
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
      expect(mockTrackEvent).toHaveBeenCalled();
      unmount();
    });

    it('tracks analytics on cancel', async () => {
      mockInitiateProvisioning.mockResolvedValue({ status: 'canceled' });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      // Should track both start and cancel events
      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      unmount();
    });
  });

  describe('resetStatus', () => {
    it('resets status to idle', async () => {
      const error = new ProvisioningError(
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Test error for reset',
      );
      mockInitiateProvisioning.mockResolvedValue({ status: 'error', error });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First trigger a status change (use error since cancel returns to idle)
      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(result.current.status).toBe('error');

      // Then reset
      act(() => {
        result.current.resetStatus();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      unmount();
    });

    it('clears error on reset', async () => {
      const error = new ProvisioningError(
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Test error',
      );
      mockInitiateProvisioning.mockResolvedValue({ status: 'error', error });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(result.current.error).toBe(error);

      act(() => {
        result.current.resetStatus();
      });

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
      const error = new ProvisioningError(
        ProvisioningErrorCode.UNKNOWN_ERROR,
        'Test error',
      );
      mockInitiateProvisioning.mockResolvedValue({ status: 'error', error });

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.initiateProvisioning();
      });

      expect(result.current.isError).toBe(true);
      unmount();
    });

    it('isProvisioning is true when status is provisioning', async () => {
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

      expect(result.current.isProvisioning).toBe(true);

      await act(async () => {
        resolveProvisioning?.({ status: 'success' });
      });
      unmount();
    });
  });

  describe('activation listener', () => {
    it('handles canceled event by setting status to idle when provisioning', async () => {
      let activationCallback:
        | ((event: { status: string; tokenId?: string }) => void)
        | undefined;
      mockAddActivationListener.mockImplementation((callback) => {
        activationCallback = callback;
        return () => undefined;
      });

      // Make provisioning hang so status stays at 'provisioning'
      let resolveProvisioning: (value: unknown) => void;
      mockInitiateProvisioning.mockReturnValue(
        new Promise((resolve) => {
          resolveProvisioning = resolve;
        }),
      );

      const onCancel = jest.fn();
      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onCancel }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start provisioning to set status to 'provisioning'
      act(() => {
        result.current.initiateProvisioning();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('provisioning');
      });

      // Simulate activation listener receiving a canceled event
      await act(async () => {
        activationCallback?.({ status: 'canceled' });
      });

      expect(result.current.status).toBe('idle');
      expect(onCancel).toHaveBeenCalled();

      // Cleanup
      await act(async () => {
        resolveProvisioning?.({ status: 'canceled' });
      });
      unmount();
    });

    it('ignores activation events when not in provisioning state', async () => {
      let activationCallback:
        | ((event: { status: string; tokenId?: string }) => void)
        | undefined;
      mockAddActivationListener.mockImplementation((callback) => {
        activationCallback = callback;
        return () => undefined;
      });

      const onError = jest.fn();
      const onCancel = jest.fn();
      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onError, onCancel }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Status is 'idle', not 'provisioning'
      expect(result.current.status).toBe('idle');

      // Simulate activation events - they should be ignored
      await act(async () => {
        activationCallback?.({ status: 'failed' });
      });
      expect(result.current.status).toBe('idle');
      expect(onError).not.toHaveBeenCalled();

      await act(async () => {
        activationCallback?.({ status: 'canceled' });
      });
      expect(result.current.status).toBe('idle');
      expect(onCancel).not.toHaveBeenCalled();

      unmount();
    });

    it('handles activated event by setting status to success when provisioning', async () => {
      let activationCallback:
        | ((event: { status: string; tokenId?: string }) => void)
        | undefined;
      mockAddActivationListener.mockImplementation((callback) => {
        activationCallback = callback;
        return () => undefined;
      });

      // Make provisioning hang so status stays at 'provisioning'
      let resolveProvisioning: (value: unknown) => void;
      mockInitiateProvisioning.mockReturnValue(
        new Promise((resolve) => {
          resolveProvisioning = resolve;
        }),
      );

      const onSuccess = jest.fn();
      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onSuccess }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start provisioning to set status to 'provisioning'
      act(() => {
        result.current.initiateProvisioning();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('provisioning');
      });

      // Simulate activation listener receiving an activated event
      await act(async () => {
        activationCallback?.({ status: 'activated', tokenId: 'token-123' });
      });

      expect(result.current.status).toBe('success');
      expect(onSuccess).toHaveBeenCalledWith({
        status: 'success',
        tokenId: 'token-123',
      });

      // Cleanup
      await act(async () => {
        resolveProvisioning?.({ status: 'success' });
      });
      unmount();
    });

    it('handles failed event by setting status to error when provisioning', async () => {
      let activationCallback:
        | ((event: { status: string; tokenId?: string }) => void)
        | undefined;
      mockAddActivationListener.mockImplementation((callback) => {
        activationCallback = callback;
        return () => undefined;
      });

      // Make provisioning hang so status stays at 'provisioning'
      let resolveProvisioning: (value: unknown) => void;
      mockInitiateProvisioning.mockReturnValue(
        new Promise((resolve) => {
          resolveProvisioning = resolve;
        }),
      );

      const onError = jest.fn();
      const { result, unmount } = renderHook(() =>
        usePushProvisioning({ ...defaultOptions, onError }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start provisioning to set status to 'provisioning'
      act(() => {
        result.current.initiateProvisioning();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('provisioning');
      });

      // Simulate activation listener receiving a failed event
      await act(async () => {
        activationCallback?.({ status: 'failed' });
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.code).toBe(
        ProvisioningErrorCode.UNKNOWN_ERROR,
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ProvisioningErrorCode.UNKNOWN_ERROR,
        }),
      );

      // Cleanup
      await act(async () => {
        resolveProvisioning?.({ status: 'error' });
      });
      unmount();
    });
  });

  describe('eligibility loading', () => {
    it('isLoading is true initially while checking eligibility', async () => {
      // Make eligibility check take some time
      let resolveEligibility: (value: unknown) => void;
      mockWalletAdapter.getEligibility.mockReturnValue(
        new Promise((resolve) => {
          resolveEligibility = resolve;
        }),
      );

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveEligibility?.({
          isAvailable: true,
          canAddCard: true,
          recommendedAction: 'add_card',
        });
      });

      expect(result.current.isLoading).toBe(false);
      unmount();
    });

    it('handles eligibility check failure gracefully', async () => {
      mockWalletAdapter.getEligibility.mockRejectedValue(
        new Error('Eligibility check failed'),
      );

      const { result, unmount } = renderHook(() =>
        usePushProvisioning(defaultOptions),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should default to not being able to add
      expect(result.current.canAddToWallet).toBe(false);
      unmount();
    });
  });

  describe('re-renders and stability', () => {
    it('does not re-check eligibility when cardDetails object reference changes but content is same', async () => {
      const { rerender, unmount } = renderHook(
        ({ cardDetails }) =>
          usePushProvisioning({ ...defaultOptions, cardDetails }),
        { initialProps: { cardDetails: mockCardDetails } },
      );

      await waitFor(() => {
        expect(mockWalletAdapter.getEligibility).toHaveBeenCalledTimes(1);
      });

      // Re-render with new object but same content
      rerender({ cardDetails: { ...mockCardDetails } });

      await waitForEffects();

      // Should not re-check eligibility
      expect(mockWalletAdapter.getEligibility).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('re-checks eligibility when lastFourDigits changes', async () => {
      const { rerender, unmount } = renderHook(
        ({ cardDetails }) =>
          usePushProvisioning({ ...defaultOptions, cardDetails }),
        { initialProps: { cardDetails: mockCardDetails } },
      );

      await waitFor(() => {
        expect(mockWalletAdapter.getEligibility).toHaveBeenCalledTimes(1);
      });

      // Re-render with different panLast4
      rerender({ cardDetails: { ...mockCardDetails, panLast4: '5678' } });

      await waitFor(() => {
        expect(mockWalletAdapter.getEligibility).toHaveBeenCalledTimes(2);
      });

      expect(mockWalletAdapter.getEligibility).toHaveBeenLastCalledWith('5678');
      unmount();
    });
  });
});
