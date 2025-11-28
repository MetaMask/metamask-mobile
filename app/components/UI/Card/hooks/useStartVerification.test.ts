import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useStartVerification } from './useStartVerification';
import { useCardSDK } from '../sdk';
import { CardError, CardErrorType } from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import Logger from '../../../../util/Logger';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../util/getErrorMessage', () => ({
  getErrorMessage: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<
  typeof getErrorMessage
>;

// Mock data
const mockStartUserVerificationResponse = {
  sessionUrl: 'https://example.com/verification-session',
};

describe('useStartVerification', () => {
  const mockStartUserVerification = jest.fn();
  const mockSDK = {
    startUserVerification: mockStartUserVerification,
  } as unknown as CardSDK;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });
    mockUseSelector.mockReturnValue('US'); // selectedCountry
    mockGetErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      // Prevent auto-triggering by not providing SDK initially
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useStartVerification());

      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.startVerification).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('startVerification function', () => {
    it('should handle SDK not initialized error', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useStartVerification());

      let response;
      await act(async () => {
        response = await result.current.startVerification();
      });

      expect(response).toBeNull();
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Card SDK not initialized');
      expect(mockStartUserVerification).not.toHaveBeenCalled();
    });

    it('should handle CardError from SDK', async () => {
      const cardError = new CardError(
        CardErrorType.SERVER_ERROR,
        'Server error occurred',
      );
      mockStartUserVerification.mockRejectedValue(cardError);
      mockGetErrorMessage.mockReturnValue('Server error occurred');

      const { result } = renderHook(() => useStartVerification());

      let response;
      await act(async () => {
        response = await result.current.startVerification();
      });

      expect(response).toBeNull();
      expect(result.current.data).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Server error occurred');
      expect(mockGetErrorMessage).toHaveBeenCalledWith(cardError);
      expect(Logger.error).toHaveBeenCalledWith(
        cardError,
        'useStartVerification::Error starting user verification',
      );
    });

    it('should handle generic error from SDK', async () => {
      const genericError = new Error('Network error');
      mockStartUserVerification.mockRejectedValue(genericError);
      mockGetErrorMessage.mockReturnValue('Network error');

      const { result } = renderHook(() => useStartVerification());

      let response;
      await act(async () => {
        response = await result.current.startVerification();
      });

      expect(response).toBeNull();
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Network error');
      expect(Logger.error).toHaveBeenCalledWith(
        genericError,
        'useStartVerification::Error starting user verification',
      );
    });

    it('should set loading state during verification', async () => {
      let resolvePromise: (
        value: typeof mockStartUserVerificationResponse,
      ) => void;
      const promise = new Promise<typeof mockStartUserVerificationResponse>(
        (resolve) => {
          resolvePromise = resolve;
        },
      );
      mockStartUserVerification.mockReturnValue(promise);

      const { result } = renderHook(() => useStartVerification());

      act(() => {
        result.current.startVerification();
      });

      // Check loading state is true during the async operation
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(false);

      await act(async () => {
        resolvePromise(mockStartUserVerificationResponse);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should reset states when starting new verification', async () => {
      // First, set up an error state
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });
      const { result, rerender } = renderHook(() => useStartVerification());

      await act(async () => {
        await result.current.startVerification();
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Card SDK not initialized');

      // Now provide SDK and start verification again
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: mockSDK,
      });
      mockStartUserVerification.mockResolvedValue(
        mockStartUserVerificationResponse,
      );

      rerender();

      await act(async () => {
        await result.current.startVerification();
      });

      // States should be reset
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('clearError function', () => {
    it('should clear error state', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useStartVerification());

      // Set error state
      await act(async () => {
        await result.current.startVerification();
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Card SDK not initialized');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not affect other states when clearing error', async () => {
      mockStartUserVerification.mockResolvedValue(
        mockStartUserVerificationResponse,
      );

      const { result } = renderHook(() => useStartVerification());

      // Set success state
      await act(async () => {
        await result.current.startVerification();
      });

      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockStartUserVerificationResponse);

      // Clear error (even though there's no error)
      act(() => {
        result.current.clearError();
      });

      // Other states should remain unchanged
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(mockStartUserVerificationResponse);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('auto-triggering on mount', () => {
    it('should not auto-trigger when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });
      mockUseSelector.mockReturnValue('US');

      renderHook(() => useStartVerification());

      expect(mockStartUserVerification).not.toHaveBeenCalled();
    });

    it('should not auto-trigger when selectedCountry is not available', async () => {
      mockUseSelector.mockReturnValue(null);

      renderHook(() => useStartVerification());

      expect(mockStartUserVerification).not.toHaveBeenCalled();
    });

    it('should handle auto-trigger error gracefully', async () => {
      const cardError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network error on auto-trigger',
      );
      mockStartUserVerification.mockRejectedValue(cardError);
      mockGetErrorMessage.mockReturnValue('Network error on auto-trigger');
      mockUseSelector.mockReturnValue('US');

      const { result } = renderHook(() => useStartVerification());

      // Wait for the effect to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Network error on auto-trigger');
      expect(Logger.error).toHaveBeenCalledWith(
        cardError,
        'useStartVerification::Error starting user verification',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle undefined response from SDK', async () => {
      mockStartUserVerification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useStartVerification());

      let response;
      await act(async () => {
        response = await result.current.startVerification();
      });

      expect(response).toBeUndefined();
      expect(result.current.data).toBeUndefined();
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
    });

    it('should handle multiple rapid startVerification calls', async () => {
      let resolveFirst: (
        value: typeof mockStartUserVerificationResponse,
      ) => void;
      let resolveSecond: (
        value: typeof mockStartUserVerificationResponse,
      ) => void;

      const firstPromise = new Promise<
        typeof mockStartUserVerificationResponse
      >((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<
        typeof mockStartUserVerificationResponse
      >((resolve) => {
        resolveSecond = resolve;
      });

      mockStartUserVerification
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useStartVerification());

      // Start first verification
      act(() => {
        result.current.startVerification();
      });

      expect(result.current.isLoading).toBe(true);

      // Start second verification while first is still pending
      act(() => {
        result.current.startVerification();
      });

      // Should still be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve second call first
      const secondResponse = { sessionUrl: 'https://second-call.com' };
      await act(async () => {
        resolveSecond(secondResponse);
      });

      // Should reflect the second call's result
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.data).toEqual(secondResponse);

      // Resolve first call (should not affect state since second completed)
      act(() => {
        resolveFirst({ sessionUrl: 'https://first-call.com' });
      });

      // State should still reflect the second call
      expect(result.current.data).toEqual(secondResponse);
    });
  });

  describe('state management', () => {
    it('should maintain state consistency across multiple operations', async () => {
      // Mock to prevent auto-triggering on mount
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });
      mockUseSelector.mockReturnValue(null);

      const { result, rerender } = renderHook(() => useStartVerification());

      // Initial state
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      // Provide SDK for successful operation
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: mockSDK,
      });
      mockStartUserVerification.mockResolvedValue(
        mockStartUserVerificationResponse,
      );
      mockUseSelector.mockReturnValue('US');

      rerender();

      await act(async () => {
        await result.current.startVerification();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);

      // Error operation
      const cardError = new CardError(
        CardErrorType.SERVER_ERROR,
        'Server error',
      );
      mockStartUserVerification.mockRejectedValue(cardError);
      mockGetErrorMessage.mockReturnValue('Server error');

      await act(async () => {
        await result.current.startVerification();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
