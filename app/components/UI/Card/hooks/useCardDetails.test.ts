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
});
