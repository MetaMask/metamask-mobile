import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useCardSDK } from '../sdk';
import { useUserRegistrationStatus } from './useUserRegistrationStatus';
import { CardSDK } from '../sdk/CardSDK';
import {
  UserResponse,
  CardVerificationState,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../util/getErrorMessage', () => ({
  getErrorMessage: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<
  typeof getErrorMessage
>;

describe('useUserRegistrationStatus', () => {
  const mockGetRegistrationStatus = jest.fn();

  const mockSDK = {
    getRegistrationStatus: mockGetRegistrationStatus,
  } as unknown as CardSDK;

  const mockUserResponse: UserResponse = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    verificationState: 'VERIFIED' as CardVerificationState,
    phoneNumber: '1234567890',
    phoneCountryCode: '+1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mocks - handle multiple useSelector calls
    mockUseSelector.mockImplementation((selector) => {
      if (selector.toString().includes('selectOnboardingId')) {
        return 'onboarding-123';
      }
      return 'US'; // Default for other selectors like selectedCountry
    });

    // Mock useDispatch
    const mockDispatch = jest.fn();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default mock for getRegistrationStatus to handle auto-polling
    mockGetRegistrationStatus.mockResolvedValue({
      ...mockUserResponse,
      verificationState: 'UNVERIFIED',
    });

    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
    });
    mockGetErrorMessage.mockReturnValue('Mocked error message');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with correct default state', async () => {
      // Given: Mock API response with PENDING verification state for initial auto-polling
      const pendingUserResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING' as CardVerificationState,
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingUserResponse);

      // When: Hook is rendered
      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      // Wait for the initial auto-polling to complete
      await waitForNextUpdate();

      // Then: Initial state should have PENDING verification state and not be loading after initial fetch
      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.startPolling).toBe('function');
      expect(typeof result.current.stopPolling).toBe('function');
    });
  });

  describe('fetchRegistrationStatus', () => {
    it('sets loading state during fetch', async () => {
      // Given: Mock response
      mockGetRegistrationStatus.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => useUserRegistrationStatus());

      // When: startPolling is called (which triggers fetchRegistrationStatus internally)
      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should have completed the fetch
      expect(result.current.verificationState).toBe('VERIFIED');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles SDK not initialized error', async () => {
      // Given: SDK is not available
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      // When: Hook attempts to fetch
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should set error state
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Card SDK not initialized');
      expect(result.current.isLoading).toBe(false);
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });

    it('handles API errors', async () => {
      // Given: API throws an error
      const apiError = new CardError(
        CardErrorType.SERVER_ERROR,
        'Server error',
      );
      mockGetRegistrationStatus.mockRejectedValue(apiError);
      mockGetErrorMessage.mockReturnValue('Server error occurred');

      // When: Hook attempts to fetch
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should handle error properly
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Server error occurred');
      expect(result.current.isLoading).toBe(false);
      expect(mockGetErrorMessage).toHaveBeenCalledWith(apiError);
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      // Given: Hook is in error state
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Card SDK not initialized');

      // When: clearError is called
      act(() => {
        result.current.clearError();
      });

      // Then: Error state should be cleared
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Polling Management', () => {
    it('starts polling and fetches immediately', async () => {
      // Given: Successful API response
      mockGetRegistrationStatus.mockResolvedValue(mockUserResponse);

      // When: startPolling is called
      const { result } = renderHook(() => useUserRegistrationStatus());

      // Clear the initial auto-polling call
      mockGetRegistrationStatus.mockClear();

      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should fetch immediately
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);
      expect(result.current.verificationState).toBe('VERIFIED');
    });

    it('sets up polling interval after initial fetch', async () => {
      // Given: Successful API response with PENDING state to keep polling active
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);

      // When: startPolling is called
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Clear the initial call
      mockGetRegistrationStatus.mockClear();

      // When: Time advances by polling interval
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should fetch again
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);
    });

    it('clears existing interval when starting new polling', async () => {
      // Given: Hook with active polling (PENDING state to keep polling active)
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Clear the initial call
      mockGetRegistrationStatus.mockClear();

      // When: startPolling is called again
      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should fetch immediately (new polling started)
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should only have one active interval
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(2);
    });

    it('stops polling when stopPolling is called', async () => {
      // Given: Hook with active polling (PENDING state to keep polling active)
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Clear the initial call
      mockGetRegistrationStatus.mockClear();

      // When: stopPolling is called
      act(() => {
        result.current.stopPolling();
      });

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Should not fetch again
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });
  });

  describe('Auto-polling based on verification state', () => {
    it('starts polling when verification state is PENDING', async () => {
      // Given: Response with PENDING verification state
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);

      // When: Hook is rendered and fetches data
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('PENDING');

      // Clear the initial calls
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should continue polling
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);
    });

    it('starts polling when verification state is UNVERIFIED', async () => {
      // Given: Response with UNVERIFIED verification state
      const unverifiedResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'UNVERIFIED',
      };
      mockGetRegistrationStatus.mockResolvedValue(unverifiedResponse);

      // When: Hook is rendered and fetches data
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('UNVERIFIED');

      // Clear the initial calls
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should continue polling
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);
    });

    it('stops polling when verification state changes from PENDING to VERIFIED', async () => {
      // Given: Initial PENDING response for both auto-polling and manual startPolling
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      // Use mockResolvedValue instead of mockResolvedValueOnce to handle multiple calls
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);

      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('PENDING');

      // When: Next poll returns VERIFIED
      const verifiedResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'VERIFIED',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(verifiedResponse);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should update state and stop polling
      expect(result.current.verificationState).toBe('VERIFIED');

      // Clear previous calls
      mockGetRegistrationStatus.mockClear();

      // When: More time passes
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Should not fetch again (polling stopped)
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });

    it('stops polling when verification state changes to REJECTED', async () => {
      // Given: Response with REJECTED verification state
      const rejectedResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'REJECTED',
      };
      mockGetRegistrationStatus.mockResolvedValue(rejectedResponse);

      // When: Hook fetches REJECTED state
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('REJECTED');

      // Clear the initial call
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Should not continue polling
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('cleans up polling interval on unmount', async () => {
      // Given: Hook with active polling
      mockGetRegistrationStatus.mockResolvedValue({
        ...mockUserResponse,
        verificationState: 'PENDING',
      });

      const { result, unmount } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Clear initial calls
      mockGetRegistrationStatus.mockClear();

      // When: Component unmounts
      unmount();

      // When: Time advances after unmount
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Should not continue polling
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles response without verificationState', async () => {
      // Given: Response without verificationState
      const responseWithoutVerificationState: UserResponse = {
        id: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };
      mockGetRegistrationStatus.mockResolvedValue(
        responseWithoutVerificationState,
      );

      // When: Hook fetches data
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should handle gracefully - verificationState should be 'PENDING' (default fallback)
      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isError).toBe(false);
    });

    it('handles multiple rapid startPolling calls', async () => {
      // Given: PENDING response to maintain polling
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);

      const { result } = renderHook(() => useUserRegistrationStatus());

      // Clear the initial auto-polling call
      mockGetRegistrationStatus.mockClear();

      // When: Multiple rapid startPolling calls
      await act(async () => {
        result.current.startPolling();
      });

      await act(async () => {
        result.current.startPolling();
      });

      await act(async () => {
        result.current.startPolling();
      });

      // Then: Should handle gracefully (each call triggers a fetch, but auto-polling is prevented)
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(3);

      // Clear previous calls
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should only poll once (single active interval)
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);
    });

    it('handles stopPolling when no polling is active', () => {
      // Given: Hook without active polling
      const { result } = renderHook(() => useUserRegistrationStatus());

      // When: stopPolling is called without active polling
      act(() => {
        result.current.stopPolling();
      });

      // Then: Should handle gracefully without errors - verificationState remains PENDING
      expect(result.current.verificationState).toBe('PENDING');
      expect(result.current.isError).toBe(false);
    });
  });
});
