import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useReferralDetails } from './useReferralDetails';
import { setReferralDetails } from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type { SubscriptionReferralDetailsDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux');
jest.mock('../../../../core/Engine');
jest.mock('../../../../util/Logger');
jest.mock('../../../../reducers/rewards', () => ({
  setReferralDetails: jest.fn(),
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSetReferralDetails = setReferralDetails as jest.MockedFunction<
  typeof setReferralDetails
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('useReferralDetails', () => {
  const mockDispatch = jest.fn();
  const mockControllerMessengerCall = jest.fn();

  const mockReferralDetailsResponse: SubscriptionReferralDetailsDto = {
    referralCode: 'TEST123',
    totalReferees: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redux hooks
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue('subscription-123'); // Default subscription ID

    // Mock Engine controllerMessenger
    (
      Engine as unknown as {
        controllerMessenger: { call: jest.Mock };
      }
    ).controllerMessenger = {
      call: mockControllerMessengerCall,
    };

    // Mock successful API call by default
    mockControllerMessengerCall.mockResolvedValue(mockReferralDetailsResponse);

    // Mock action creator
    mockSetReferralDetails.mockReturnValue({
      type: 'rewards/setReferralDetails',
      payload: { referralCode: 'TEST123', refereeCount: 5 },
    });
  });

  describe('initial state', () => {
    it('returns default loading and error states', () => {
      // Act
      const { result } = renderHook(() => useReferralDetails());

      // Assert
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.fetchReferralDetails).toBe('function');
    });
  });

  describe('successful fetch', () => {
    it('fetches referral details and updates Redux store', async () => {
      // Arrange
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(mockControllerMessengerCall).toHaveBeenCalledWith(
        'RewardsController:getReferralDetails',
        'subscription-123',
      );
      expect(mockSetReferralDetails).toHaveBeenCalledWith({
        referralCode: 'TEST123',
        refereeCount: 5,
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'rewards/setReferralDetails',
        payload: { referralCode: 'TEST123', refereeCount: 5 },
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('loading state management', () => {
    it('sets loading to true during fetch and false after completion', async () => {
      // Arrange
      const { result } = renderHook(() => useReferralDetails());
      let loadingDuringFetch = false;

      // Mock delayed resolution to capture loading state
      mockControllerMessengerCall.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              loadingDuringFetch = result.current.isLoading;
              resolve(mockReferralDetailsResponse);
            }, 10);
          }),
      );

      // Act
      const fetchPromise = act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert loading state during fetch
      expect(result.current.isLoading).toBe(true);

      await fetchPromise;

      // Assert loading state after completion
      expect(loadingDuringFetch).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('resets error state when starting new fetch', async () => {
      // Arrange
      const { result } = renderHook(() => useReferralDetails());

      // First, set an error state
      mockControllerMessengerCall.mockRejectedValueOnce(
        new Error('Network error'),
      );
      await act(async () => {
        await result.current.fetchReferralDetails();
      });
      expect(result.current.error).toBe('Network error');

      // Reset mock for successful call
      mockControllerMessengerCall.mockResolvedValueOnce(
        mockReferralDetailsResponse,
      );

      // Act - fetch again
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(result.current.error).toBeNull();
    });
  });

  describe('error handling', () => {
    it('handles API errors and sets error message', async () => {
      // Arrange
      const errorMessage = 'Subscription not found';
      mockControllerMessengerCall.mockRejectedValue(new Error(errorMessage));
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('handles non-Error objects and sets unknown error message', async () => {
      // Arrange
      mockControllerMessengerCall.mockRejectedValue('string error');
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(result.current.error).toBe('Unknown error');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'useReferralDetails: Failed to fetch referral details:',
        'Unknown error',
      );
    });

    it('logs error details when fetch fails', async () => {
      // Arrange
      const error = new Error('Network timeout');
      mockControllerMessengerCall.mockRejectedValue(error);
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(mockLogger.log).toHaveBeenCalledWith(
        'useReferralDetails: Failed to fetch referral details:',
        'Network timeout',
      );
    });
  });

  describe('subscription ID validation', () => {
    it('returns early when no subscription ID is available', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(null); // No subscription ID
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'useReferralDetails: No subscription ID available',
      );
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns early when subscription ID is empty string', async () => {
      // Arrange
      mockUseSelector.mockReturnValue(''); // Empty subscription ID
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(mockControllerMessengerCall).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'useReferralDetails: No subscription ID available',
      );
    });
  });

  describe('hook dependencies', () => {
    it('recreates fetchReferralDetails when subscription ID changes', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useReferralDetails());
      const firstFetch = result.current.fetchReferralDetails;

      // Act - change subscription ID
      mockUseSelector.mockReturnValue('new-subscription-456');
      rerender();

      // Assert
      expect(result.current.fetchReferralDetails).not.toBe(firstFetch);
    });

    it('maintains same function reference when dependencies unchanged', () => {
      // Arrange
      const { result, rerender } = renderHook(() => useReferralDetails());
      const firstFetch = result.current.fetchReferralDetails;

      // Act - rerender without changing dependencies
      rerender();

      // Assert
      expect(result.current.fetchReferralDetails).toBe(firstFetch);
    });
  });

  describe('data mapping', () => {
    it('correctly maps API response to Redux action payload', async () => {
      // Arrange
      const customResponse: SubscriptionReferralDetailsDto = {
        referralCode: 'CUSTOM456',
        totalReferees: 12,
      };
      mockControllerMessengerCall.mockResolvedValue(customResponse);
      const { result } = renderHook(() => useReferralDetails());

      // Act
      await act(async () => {
        await result.current.fetchReferralDetails();
      });

      // Assert
      expect(mockSetReferralDetails).toHaveBeenCalledWith({
        referralCode: 'CUSTOM456',
        refereeCount: 12, // Note: totalReferees maps to refereeCount
      });
    });
  });
});
