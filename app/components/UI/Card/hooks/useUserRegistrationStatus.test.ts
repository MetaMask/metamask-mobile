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

    // Default mocks - always return onboarding-123 for selectOnboardingId
    mockUseSelector.mockReturnValue('onboarding-123');

    // Mock useDispatch
    const mockDispatch = jest.fn();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default mock for getRegistrationStatus
    mockGetRegistrationStatus.mockResolvedValue({
      ...mockUserResponse,
      verificationState: 'PENDING',
    });

    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      user: null,
      setUser: jest.fn(),
      isLoading: false,
      logoutFromProvider: jest.fn(),
      fetchUserData: jest.fn(),
      isReturningSession: false,
    });
    mockGetErrorMessage.mockReturnValue('Mocked error message');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      // When: Hook is rendered without user data
      const { result } = renderHook(() => useUserRegistrationStatus());

      // Then: Initial state defaults to PENDING and polling is not started
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

      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      // When: startPolling is called (which triggers fetchRegistrationStatus internally)
      act(() => {
        result.current.startPolling();
      });

      // Wait for the async operation to complete and state to update
      await waitForNextUpdate();

      // Then: Should have completed the fetch
      expect(result.current.verificationState).toBe('VERIFIED');
      expect(result.current.isLoading).toBe(false);
    });

    it('handles SDK not initialized error', async () => {
      // Given: SDK is not available
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
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
        ...jest.requireMock('../sdk'),
        sdk: null,
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
      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      act(() => {
        result.current.startPolling();
      });

      await waitForNextUpdate();

      // Then: Fetches immediately
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

  describe('Auto-stop polling based on verification state', () => {
    it('continues polling when verification state is PENDING', async () => {
      // Given: Response with PENDING verification state
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValue(pendingResponse);

      // When: Polling is manually started
      const { result } = renderHook(() => useUserRegistrationStatus());

      await act(async () => {
        result.current.startPolling();
      });

      expect(result.current.verificationState).toBe('PENDING');

      // Clear the initial call
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Should continue polling
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(1);
    });

    it('automatically stops polling when verification state is UNVERIFIED', async () => {
      // Given: Initial PENDING response
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(pendingResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      act(() => {
        result.current.startPolling();
      });

      await waitForNextUpdate();

      expect(result.current.verificationState).toBe('PENDING');

      // When: Next poll returns UNVERIFIED
      const unverifiedResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'UNVERIFIED',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(unverifiedResponse);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitForNextUpdate();

      // Then: Verification state updates and polling auto-stops
      expect(result.current.verificationState).toBe('UNVERIFIED');

      // Clear previous calls
      mockGetRegistrationStatus.mockClear();

      // When: More time passes
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Polling has stopped automatically (no more fetches)
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });

    it('automatically stops polling when verification state changes from PENDING to VERIFIED', async () => {
      // Given: Initial PENDING response
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(pendingResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      act(() => {
        result.current.startPolling();
      });

      await waitForNextUpdate();

      expect(result.current.verificationState).toBe('PENDING');

      // When: Next poll returns VERIFIED
      const verifiedResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'VERIFIED',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(verifiedResponse);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitForNextUpdate();

      // Then: Verification state updates and polling auto-stops
      expect(result.current.verificationState).toBe('VERIFIED');

      // Clear previous calls
      mockGetRegistrationStatus.mockClear();

      // When: More time passes
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Polling has stopped automatically (no more fetches)
      expect(mockGetRegistrationStatus).not.toHaveBeenCalled();
    });

    it('automatically stops polling when verification state changes to REJECTED', async () => {
      // Given: Initial PENDING response
      const pendingResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'PENDING',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(pendingResponse);

      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      act(() => {
        result.current.startPolling();
      });

      await waitForNextUpdate();

      expect(result.current.verificationState).toBe('PENDING');

      // When: Next poll returns REJECTED
      const rejectedResponse: UserResponse = {
        ...mockUserResponse,
        verificationState: 'REJECTED',
      };
      mockGetRegistrationStatus.mockResolvedValueOnce(rejectedResponse);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitForNextUpdate();

      // Then: Verification state updates and polling auto-stops
      expect(result.current.verificationState).toBe('REJECTED');

      // Clear the initial calls
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Polling has stopped automatically (no more fetches)
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

      mockGetRegistrationStatus.mockClear();

      // When: Component unmounts
      unmount();

      // When: Time advances after unmount
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      // Then: Polling stops (cleanup on unmount)
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
      const { result, waitForNextUpdate } = renderHook(() =>
        useUserRegistrationStatus(),
      );

      act(() => {
        result.current.startPolling();
      });

      await waitForNextUpdate();

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

      // Then: Each call triggers a fetch, clearing previous interval
      expect(mockGetRegistrationStatus).toHaveBeenCalledTimes(3);

      // Clear previous calls
      mockGetRegistrationStatus.mockClear();

      // When: Time advances
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // Then: Only one active interval remains (last startPolling call)
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
