import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardSDK } from '../sdk';
import useCardDetails from './useCardDetails';
import {
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardStatus,
  CardType,
} from '../types';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useCardDetails', () => {
  const mockGetCardDetails = jest.fn();
  const mockLogoutFromProvider = jest.fn();

  const mockSDK = {
    getCardDetails: mockGetCardDetails,
  } as unknown as CardSDK;

  const mockCardDetailsResponse: CardDetailsResponse = {
    id: 'card-123',
    holderName: 'John Doe',
    expiryDate: '12/25',
    panLast4: '1234',
    status: CardStatus.ACTIVE,
    type: CardType.VIRTUAL,
    orderedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks - authenticated user with loaded SDK
    mockUseSelector.mockReturnValue(true); // isAuthenticated
    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: mockLogoutFromProvider,
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      // Given: User is not authenticated (prevents auto-fetch)
      mockUseSelector.mockReturnValue(false);

      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: Initial state should have null values and not be loading
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Fetching Card Details', () => {
    it('should fetch card details successfully when authenticated and SDK is ready', async () => {
      // Given: Authenticated user with ready SDK
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      // When: Hook is rendered
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      // Then: Should fetch card details
      await waitForNextUpdate();

      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      // Given: Deferred promise to control timing
      let resolvePromise: (value: CardDetailsResponse) => void;
      const deferredPromise = new Promise<CardDetailsResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockGetCardDetails.mockReturnValue(deferredPromise);

      // When: Hook starts fetching
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Then: Should be in loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.error).toBeNull();

      // When: Promise resolves
      await act(async () => {
        resolvePromise(mockCardDetailsResponse);
        await waitForNextUpdate();
      });

      // Then: Should have data and not be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
    });

    it('should allow manual fetchCardDetails call', async () => {
      // Given: Hook is rendered
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Clear the mock from initial effect call
      mockGetCardDetails.mockClear();

      // When: Manually calling fetchCardDetails
      const updatedResponse = {
        ...mockCardDetailsResponse,
        holderName: 'Jane Smith',
      };
      mockGetCardDetails.mockResolvedValue(updatedResponse);

      await act(async () => {
        await result.current.fetchCardDetails();
      });

      // Then: Should fetch again and update state
      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
      expect(result.current.cardDetails).toEqual(updatedResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle NO_CARD error without setting error state', async () => {
      // Given: SDK returns NO_CARD error
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: Should not set error state (triggers provisioning flow)
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle other CardError types as UNKNOWN_ERROR', async () => {
      // Given: SDK returns a different CardError
      const cardError = new CardError(
        CardErrorType.SERVER_ERROR,
        'Server error occurred',
      );
      mockGetCardDetails.mockRejectedValue(cardError);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: Should set UNKNOWN_ERROR
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(CardErrorType.UNKNOWN_ERROR);
    });

    it('should handle generic errors as UNKNOWN_ERROR', async () => {
      // Given: SDK throws generic error
      const genericError = new Error('Network error');
      mockGetCardDetails.mockRejectedValue(genericError);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: Should set UNKNOWN_ERROR
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(CardErrorType.UNKNOWN_ERROR);
    });

    it('should clear previous error on successful retry', async () => {
      // Given: Initial error state
      mockGetCardDetails.mockRejectedValueOnce(new Error('First error'));
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      expect(result.current.error).toBe(CardErrorType.UNKNOWN_ERROR);

      // When: Retry succeeds
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      await act(async () => {
        await result.current.fetchCardDetails();
      });

      // Then: Error should be cleared
      expect(result.current.error).toBeNull();
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Effect Behavior', () => {
    it('should not fetch when user is not authenticated', () => {
      // Given: User is not authenticated
      mockUseSelector.mockReturnValue(false);
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      // When: Hook is rendered
      renderHook(() => useCardDetails());

      // Then: Should not fetch card details
      expect(mockGetCardDetails).not.toHaveBeenCalled();
    });

    it('should not fetch when SDK is still loading', () => {
      // Given: SDK is loading
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: true,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: mockLogoutFromProvider,
      });
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      // When: Hook is rendered
      renderHook(() => useCardDetails());

      // Then: Should not fetch card details
      expect(mockGetCardDetails).not.toHaveBeenCalled();
    });

    it('should not fetch when SDK is not available', () => {
      // Given: No SDK available
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: mockLogoutFromProvider,
      });
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      // When: Hook is rendered
      renderHook(() => useCardDetails());

      // Then: Should not fetch card details
      expect(mockGetCardDetails).not.toHaveBeenCalled();
    });

    it('should fetch when authentication state changes to true', async () => {
      // Given: Initially not authenticated
      mockUseSelector.mockReturnValue(false);
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      const { rerender, waitForNextUpdate } = renderHook(() =>
        useCardDetails(),
      );

      expect(mockGetCardDetails).not.toHaveBeenCalled();

      // When: User becomes authenticated
      mockUseSelector.mockReturnValue(true);
      rerender();

      await waitForNextUpdate();

      // Then: Should fetch card details
      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
    });

    it('should fetch when SDK finishes loading', async () => {
      // Given: SDK is initially loading
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: true,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: mockLogoutFromProvider,
      });
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      const { rerender, waitForNextUpdate } = renderHook(() =>
        useCardDetails(),
      );

      expect(mockGetCardDetails).not.toHaveBeenCalled();

      // When: SDK finishes loading
      mockUseCardSDK.mockReturnValue({
        sdk: mockSDK,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: mockLogoutFromProvider,
      });
      rerender();

      await waitForNextUpdate();

      // Then: Should fetch card details
      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Fetch with No SDK', () => {
    it('should return early when manually fetching with no SDK', async () => {
      // Given: No SDK available but authenticated
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: mockLogoutFromProvider,
      });

      const { result } = renderHook(() => useCardDetails());

      // When: Manually calling fetchCardDetails
      await act(async () => {
        await result.current.fetchCardDetails();
      });

      // Then: Should not attempt to fetch
      expect(mockGetCardDetails).not.toHaveBeenCalled();
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid fetch calls gracefully', async () => {
      // Given: Multiple rapid calls
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      mockGetCardDetails.mockClear();

      // When: Multiple rapid manual fetches
      await act(async () => {
        const promises = [
          result.current.fetchCardDetails(),
          result.current.fetchCardDetails(),
          result.current.fetchCardDetails(),
        ];
        await Promise.all(promises);
      });

      // Then: All calls should complete successfully
      expect(mockGetCardDetails).toHaveBeenCalledTimes(3);
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
      expect(result.current.isLoading).toBe(false);
    });

    it('should maintain error state when NO_CARD error occurs after previous error', async () => {
      // Given: Initial UNKNOWN_ERROR state
      mockGetCardDetails.mockRejectedValueOnce(new Error('Generic error'));
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      expect(result.current.error).toBe(CardErrorType.UNKNOWN_ERROR);

      // When: NO_CARD error occurs on retry
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      await act(async () => {
        await result.current.fetchCardDetails();
      });

      // Then: Error should be cleared (NO_CARD doesn't set error)
      expect(result.current.error).toBeNull();
      expect(result.current.cardDetails).toBeNull();
    });
  });

  describe('Warning States', () => {
    it('sets frozen warning when card status is FROZEN', async () => {
      // Given: Card with FROZEN status
      const frozenCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.FROZEN,
      };
      mockGetCardDetails.mockResolvedValue(frozenCardResponse);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: Sets warning to Frozen
      expect(result.current.warning).toBe('frozen');
      expect(result.current.cardDetails).toEqual(frozenCardResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('sets blocked warning when card status is BLOCKED', async () => {
      // Given: Card with BLOCKED status
      const blockedCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.BLOCKED,
      };
      mockGetCardDetails.mockResolvedValue(blockedCardResponse);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: Sets warning to Blocked
      expect(result.current.warning).toBe('blocked');
      expect(result.current.cardDetails).toEqual(blockedCardResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('sets no card warning when NO_CARD error is thrown', async () => {
      // Given: SDK returns NO_CARD error
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: Sets warning to NoCard and no error
      expect(result.current.warning).toBe('no_card');
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('does not set warning when card status is ACTIVE', async () => {
      // Given: Card with ACTIVE status
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      // When: Hook fetches card details
      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      // Then: No warning is set
      expect(result.current.warning).toBeNull();
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
      expect(result.current.error).toBeNull();
    });

    it('clears warning on successful retry after previous warning', async () => {
      // Given: Initial FROZEN warning
      const frozenCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.FROZEN,
      };
      mockGetCardDetails.mockResolvedValueOnce(frozenCardResponse);

      const { result, waitForNextUpdate } = renderHook(() => useCardDetails());

      await waitForNextUpdate();

      expect(result.current.warning).toBe('frozen');

      // When: Retry with ACTIVE status
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      await act(async () => {
        await result.current.fetchCardDetails();
      });

      // Then: Warning is cleared
      expect(result.current.warning).toBeNull();
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
    });
  });

  describe('pollCardStatusUntilProvisioned', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns true when card status becomes ACTIVE on first attempt', async () => {
      // Given: User is not authenticated to prevent auto-fetch
      mockUseSelector.mockReturnValue(false);
      const activeCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.ACTIVE,
      };
      mockGetCardDetails.mockResolvedValue(activeCardResponse);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling for provisioned status
      let pollResult: boolean | undefined;
      await act(async () => {
        const pollPromise = result.current.pollCardStatusUntilProvisioned();
        pollResult = await pollPromise;
      });

      // Then: Returns true and updates state with active card
      expect(pollResult).toBe(true);
      expect(result.current.cardDetails).toEqual(activeCardResponse);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
      expect(result.current.warning).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('polls multiple times until card status becomes ACTIVE', async () => {
      // Given: User is not authenticated to prevent auto-fetch
      mockUseSelector.mockReturnValue(false);
      const frozenCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.FROZEN,
      };
      const activeCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.ACTIVE,
      };

      // Mock first two calls return FROZEN, third returns ACTIVE
      mockGetCardDetails
        .mockResolvedValueOnce(frozenCardResponse)
        .mockResolvedValueOnce(frozenCardResponse)
        .mockResolvedValue(activeCardResponse);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling for provisioned status
      let pollResult: boolean | undefined;
      await act(async () => {
        const promise = result.current.pollCardStatusUntilProvisioned();

        // Fast-forward through all timers
        await jest.runAllTimersAsync();

        pollResult = await promise;
      });

      // Then: Returns true after polling multiple times
      expect(pollResult).toBe(true);
      expect(mockGetCardDetails).toHaveBeenCalledTimes(3);
      expect(result.current.cardDetails).toEqual(activeCardResponse);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });

    it('returns false when max polling attempts reached without ACTIVE status', async () => {
      // Given: User is not authenticated to prevent auto-fetch
      mockUseSelector.mockReturnValue(false);
      const frozenCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.FROZEN,
      };
      mockGetCardDetails.mockResolvedValue(frozenCardResponse);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling with limited attempts
      let pollResult: boolean | undefined;
      await act(async () => {
        const promise = result.current.pollCardStatusUntilProvisioned(3, 1000);

        // Fast-forward through all timers
        await jest.runAllTimersAsync();

        pollResult = await promise;
      });

      // Then: Returns false after max attempts and resets loading state
      expect(pollResult).toBe(false);
      expect(mockGetCardDetails).toHaveBeenCalledTimes(3);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });

    it('sets loading state during polling', async () => {
      // Given: User is not authenticated to prevent auto-fetch
      mockUseSelector.mockReturnValue(false);
      let resolveGetCardDetails: (value: CardDetailsResponse) => void;
      const deferredPromise = new Promise<CardDetailsResponse>((resolve) => {
        resolveGetCardDetails = resolve;
      });
      mockGetCardDetails.mockReturnValue(deferredPromise);

      const { result } = renderHook(() => useCardDetails());

      // When: Starting to poll
      act(() => {
        result.current.pollCardStatusUntilProvisioned();
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Then: Should be in loading state
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.warning).toBeNull();

      // Cleanup: Resolve the promise
      await act(async () => {
        resolveGetCardDetails({
          ...mockCardDetailsResponse,
          status: CardStatus.ACTIVE,
        });
        await deferredPromise;
      });
    });

    it('returns false and sets error when SDK call throws error', async () => {
      // Given: User is not authenticated to prevent auto-fetch
      mockUseSelector.mockReturnValue(false);
      const genericError = new Error('Network error');
      mockGetCardDetails.mockRejectedValue(genericError);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling encounters error
      let pollResult: boolean | undefined;
      await act(async () => {
        pollResult = await result.current.pollCardStatusUntilProvisioned();
      });

      // Then: Returns false and sets error state
      expect(pollResult).toBe(false);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
      expect(result.current.error).toBe(CardErrorType.UNKNOWN_ERROR);
      expect(result.current.warning).toBeNull();
    });

    it('returns false when SDK is not available', async () => {
      // Given: No SDK available
      mockUseSelector.mockReturnValue(false);
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: mockLogoutFromProvider,
      });

      const { result } = renderHook(() => useCardDetails());

      // When: Attempting to poll without SDK
      let pollResult: boolean | undefined;
      await act(async () => {
        pollResult = await result.current.pollCardStatusUntilProvisioned();
      });

      // Then: Returns false
      expect(pollResult).toBe(false);
      expect(mockGetCardDetails).not.toHaveBeenCalled();
    });

    it('uses custom polling interval when provided', async () => {
      // Given: User is not authenticated to prevent auto-fetch
      mockUseSelector.mockReturnValue(false);
      const frozenCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.FROZEN,
      };
      const activeCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.ACTIVE,
      };

      mockGetCardDetails
        .mockResolvedValueOnce(frozenCardResponse)
        .mockResolvedValue(activeCardResponse);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling with custom interval
      let pollResult: boolean | undefined;
      await act(async () => {
        const promise = result.current.pollCardStatusUntilProvisioned(10, 500);

        // Fast-forward through all timers
        await jest.runAllTimersAsync();

        pollResult = await promise;
      });

      // Then: Uses custom interval and succeeds
      expect(pollResult).toBe(true);
      expect(mockGetCardDetails).toHaveBeenCalledTimes(2);
    });

    it('clears error and warning states when polling starts', async () => {
      // Given: Initial error state
      mockUseSelector.mockReturnValue(false);
      mockGetCardDetails.mockRejectedValueOnce(new Error('Initial error'));

      const { result } = renderHook(() => useCardDetails());

      await act(async () => {
        await result.current.fetchCardDetails();
      });

      expect(result.current.error).toBe(CardErrorType.UNKNOWN_ERROR);

      // When: Starting new poll
      mockGetCardDetails.mockResolvedValue({
        ...mockCardDetailsResponse,
        status: CardStatus.ACTIVE,
      });

      await act(async () => {
        await result.current.pollCardStatusUntilProvisioned();
      });

      // Then: Error is cleared
      expect(result.current.error).toBeNull();
      expect(result.current.warning).toBeNull();
    });
  });
});
