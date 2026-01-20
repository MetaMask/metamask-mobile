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
import { useWrapWithCache } from './useWrapWithCache';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('./useWrapWithCache', () => ({
  useWrapWithCache: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseWrapWithCache = useWrapWithCache as jest.MockedFunction<
  typeof useWrapWithCache
>;

describe('useCardDetails', () => {
  const mockGetCardDetails = jest.fn();
  const mockFetchData = jest.fn();

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

  const mockCacheReturn = {
    data: null,
    isLoading: false,
    error: null,
    fetchData: mockFetchData,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks - authenticated user with loaded SDK
    mockUseSelector.mockReturnValue(true); // isAuthenticated

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    mockUseWrapWithCache.mockReturnValue(mockCacheReturn);
    mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      // Given: useWrapWithCache returns default values
      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: Initial state should have null values and not be loading
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.warning).toBeNull();
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });
  });

  describe('Fetching Card Details', () => {
    it('returns card details data from useWrapWithCache', () => {
      // Given: useWrapWithCache returns card details data
      const cardDetailsResult = {
        cardDetails: mockCardDetailsResponse,
        warning: null,
      };
      mockUseWrapWithCache.mockReturnValue({
        data: cardDetailsResult,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: Returns card details from cache
      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
      expect(result.current.warning).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns loading state from useWrapWithCache', () => {
      // Given: useWrapWithCache is loading
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchData,
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: Shows loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('exposes fetchCardDetails function from useWrapWithCache', () => {
      // Given: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: fetchCardDetails is available
      expect(result.current.fetchCardDetails).toBe(mockFetchData);
    });

    it('passes correct cache key and options to useWrapWithCache', () => {
      // When: Hook is rendered
      renderHook(() => useCardDetails());

      // Then: useWrapWithCache called with correct params
      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'card-details',
        expect.any(Function),
        {
          cacheDuration: 60000, // AUTHENTICATED_CACHE_DURATION
          fetchOnMount: false, // Manual fetch control
        },
      );
    });
  });

  describe('Error Handling', () => {
    it('returns error state from useWrapWithCache', () => {
      // Given: useWrapWithCache has error
      const mockError = new Error('Test error');
      mockUseWrapWithCache.mockReturnValue({
        data: null,
        isLoading: false,
        error: mockError,
        fetchData: mockFetchData,
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: Returns error object
      expect(result.current.error).toBe(mockError);
      expect(result.current.cardDetails).toBeNull();
    });

    it('handles NO_CARD error in fetch function', async () => {
      // Given: SDK returns NO_CARD error
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Returns result with no_card warning
      expect(result).toEqual({
        cardDetails: null,
        warning: 'no_card',
      });
    });

    it('throws error for other CardError types', async () => {
      // Given: SDK returns a different CardError
      const cardError = new CardError(
        CardErrorType.SERVER_ERROR,
        'Server error occurred',
      );
      mockGetCardDetails.mockRejectedValue(cardError);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When/Then: Fetch function throws error
      await expect(fetchFunction()).rejects.toThrow(cardError);
    });

    it('throws error for generic errors', async () => {
      // Given: SDK throws generic error
      const genericError = new Error('Network error');
      mockGetCardDetails.mockRejectedValue(genericError);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When/Then: Fetch function throws error
      await expect(fetchFunction()).rejects.toThrow(genericError);
    });
  });

  describe('Fetch Function Behavior', () => {
    it('returns null when user is not authenticated', async () => {
      // Given: User is not authenticated
      mockUseSelector.mockReturnValue(false);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Returns null
      expect(result).toBeNull();
      expect(mockGetCardDetails).not.toHaveBeenCalled();
    });

    it('returns null when SDK is not available', async () => {
      // Given: No SDK available
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Returns null
      expect(result).toBeNull();
      expect(mockGetCardDetails).not.toHaveBeenCalled();
    });

    it('fetches card details when authenticated and SDK is ready', async () => {
      // Given: Authenticated user with ready SDK
      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Fetches and returns card details
      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        cardDetails: mockCardDetailsResponse,
        warning: null,
      });
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

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Sets warning to Frozen
      expect(result).toEqual({
        cardDetails: frozenCardResponse,
        warning: 'frozen',
      });
    });

    it('sets blocked warning when card status is BLOCKED', async () => {
      // Given: Card with BLOCKED status
      const blockedCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.BLOCKED,
      };
      mockGetCardDetails.mockResolvedValue(blockedCardResponse);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Sets warning to Blocked
      expect(result).toEqual({
        cardDetails: blockedCardResponse,
        warning: 'blocked',
      });
    });

    it('sets no card warning when NO_CARD error is thrown', async () => {
      // Given: SDK returns NO_CARD error
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: Sets warning to NoCard and no error
      expect(result).toEqual({
        cardDetails: null,
        warning: 'no_card',
      });
    });

    it('does not set warning when card status is ACTIVE', async () => {
      // Given: Card with ACTIVE status
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      renderHook(() => useCardDetails());

      // Get the fetch function from useWrapWithCache mock
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      // When: Fetch function is called
      const result = await fetchFunction();

      // Then: No warning is set
      expect(result).toEqual({
        cardDetails: mockCardDetailsResponse,
        warning: null,
      });
    });

    it('returns warning from useWrapWithCache data', () => {
      // Given: useWrapWithCache returns data with frozen warning
      const cardDetailsResult = {
        cardDetails: {
          ...mockCardDetailsResponse,
          status: CardStatus.FROZEN,
        },
        warning: 'frozen' as const,
      };
      mockUseWrapWithCache.mockReturnValue({
        data: cardDetailsResult,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      });

      // When: Hook is rendered
      const { result } = renderHook(() => useCardDetails());

      // Then: Returns warning from cache
      expect(result.current.warning).toBe('frozen');
      expect(result.current.error).toBeNull();
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
      // Given: SDK returns ACTIVE card
      const activeCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.ACTIVE,
      };
      mockGetCardDetails.mockResolvedValue(activeCardResponse);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling for provisioned status
      let pollResult: boolean | undefined;
      await act(async () => {
        pollResult = await result.current.pollCardStatusUntilProvisioned();
      });

      // Then: Returns true, calls fetchCardDetails, and updates loading state
      expect(pollResult).toBe(true);
      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
      // pollCardStatusUntilProvisioned refreshes card details once after provisioning
      expect(mockFetchData).toHaveBeenCalledTimes(1);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });

    it('polls multiple times until card status becomes ACTIVE', async () => {
      // Given: First two calls return FROZEN, third returns ACTIVE
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
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });

    it('returns false when max polling attempts reached without ACTIVE status', async () => {
      // Given: SDK always returns FROZEN
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

      // Then: Returns false after max attempts
      expect(pollResult).toBe(false);
      expect(mockGetCardDetails).toHaveBeenCalledTimes(3);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });

    it('sets loading state during polling', async () => {
      // Given: Deferred promise to control timing
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

      // Then: Shows loading state
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(true);

      // Cleanup: Resolve the promise
      await act(async () => {
        resolveGetCardDetails({
          ...mockCardDetailsResponse,
          status: CardStatus.ACTIVE,
        });
        await deferredPromise;
      });
    });

    it('returns false when SDK call throws error', async () => {
      // Given: SDK throws error
      const genericError = new Error('Network error');
      mockGetCardDetails.mockRejectedValue(genericError);

      const { result } = renderHook(() => useCardDetails());

      // When: Polling encounters error
      let pollResult: boolean | undefined;
      await act(async () => {
        pollResult = await result.current.pollCardStatusUntilProvisioned();
      });

      // Then: Returns false and resets loading state
      expect(pollResult).toBe(false);
      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(
        false,
      );
    });

    it('returns false when SDK is not available', async () => {
      // Given: No SDK available
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
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
      // Given: First call returns FROZEN, second returns ACTIVE
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
  });
});
