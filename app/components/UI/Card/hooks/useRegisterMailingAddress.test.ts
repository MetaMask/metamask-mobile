import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK, ICardSDK } from '../sdk';
import {
  RegisterPhysicalAddressRequest,
  RegisterAddressResponse,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import useRegisterMailingAddress from './useRegisterMailingAddress';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));
jest.mock('../util/getErrorMessage');

// Mock CardError class to avoid constructor issues
jest.mock('../types', () => ({
  ...jest.requireActual('../types'),
  CardError: jest.fn().mockImplementation((type, message) => {
    const error = Object.create(Error.prototype);
    error.name = 'CardError';
    error.message = message;
    error.type = type;
    return error;
  }),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockGetErrorMessage = getErrorMessage as jest.MockedFunction<
  typeof getErrorMessage
>;

describe('useRegisterMailingAddress', () => {
  const mockRegisterMailingAddress = jest.fn();

  const mockSDK = {
    registerMailingAddress: mockRegisterMailingAddress,
  } as unknown as CardSDK;

  const mockAddressRequest: RegisterPhysicalAddressRequest = {
    onboardingId: 'onboarding-123',
    addressLine1: '123 Main St',
    addressLine2: 'Apt 4B',
    city: 'New York',
    zip: '10001',
    usState: 'NY',
    isSameMailingAddress: false,
  };

  const mockAddressResponse: RegisterAddressResponse = {
    accessToken: 'mock-access-token',
    onboardingId: 'onboarding-123',
    user: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  };

  const mockCardSDK: ICardSDK = {
    ...jest.requireMock('../sdk'),
    sdk: mockSDK,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardSDK.mockReturnValue(mockCardSDK);
  });

  describe('hook initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useRegisterMailingAddress());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.registerAddress).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('registerAddress function', () => {
    it('registers mailing address successfully', async () => {
      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      let response: RegisterAddressResponse | undefined;
      await act(async () => {
        response = await result.current.registerAddress(mockAddressRequest);
      });

      expect(mockRegisterMailingAddress).toHaveBeenCalledWith({
        ...mockAddressRequest,
      });
      expect(response).toEqual(mockAddressResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets loading state during registration process', async () => {
      let resolveRegisterAddress!: (value: typeof mockAddressResponse) => void;
      const registerAddressPromise = new Promise<typeof mockAddressResponse>(
        (resolve) => {
          resolveRegisterAddress = resolve;
        },
      );

      mockRegisterMailingAddress.mockReturnValue(registerAddressPromise);

      const { result } = renderHook(() => useRegisterMailingAddress());

      act(() => {
        result.current.registerAddress(mockAddressRequest);
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      await act(async () => {
        resolveRegisterAddress(mockAddressResponse);
        await registerAddressPromise;
      });

      // Should be completed
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('throws error when SDK is not available', async () => {
      const mockCardSDKUndefined: ICardSDK = {
        ...jest.requireMock('../sdk'),
        sdk: null,
      };
      mockUseCardSDK.mockReturnValue(mockCardSDKUndefined);

      const { result } = renderHook(() => useRegisterMailingAddress());

      await act(async () => {
        try {
          await result.current.registerAddress(mockAddressRequest, 'us');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Card SDK not initialized');
        }
      });

      expect(mockRegisterMailingAddress).not.toHaveBeenCalled();
    });

    it('handles registerMailingAddress API error', async () => {
      const apiError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid address format',
      );
      mockRegisterMailingAddress.mockRejectedValue(apiError);
      mockGetErrorMessage.mockReturnValue('Invalid address format');

      const { result } = renderHook(() => useRegisterMailingAddress());

      try {
        await act(async () => {
          await result.current.registerAddress(mockAddressRequest, 'us');
        });
      } catch (error) {
        // Expected to throw
      }

      expect(mockRegisterMailingAddress).toHaveBeenCalledWith({
        ...mockAddressRequest,
        location: 'us',
      });
      expect(mockGetErrorMessage).toHaveBeenCalledWith(apiError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid address format');
    });

    it('handles network error', async () => {
      const networkError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network connection failed',
      );
      mockRegisterMailingAddress.mockRejectedValue(networkError);
      mockGetErrorMessage.mockReturnValue('Network connection failed');

      const { result } = renderHook(() => useRegisterMailingAddress());

      try {
        await act(async () => {
          await result.current.registerAddress(mockAddressRequest, 'us');
        });
      } catch (error) {
        // Expected to throw
      }

      expect(mockGetErrorMessage).toHaveBeenCalledWith(networkError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Network connection failed');
    });

    it('handles generic error', async () => {
      const genericError = new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Something went wrong',
      );
      mockRegisterMailingAddress.mockRejectedValue(genericError);
      mockGetErrorMessage.mockReturnValue('Something went wrong');

      const { result } = renderHook(() => useRegisterMailingAddress());

      try {
        await act(async () => {
          await result.current.registerAddress(mockAddressRequest, 'us');
        });
      } catch (error) {
        // Expected to throw
      }

      expect(mockGetErrorMessage).toHaveBeenCalledWith(genericError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Something went wrong');
    });

    it('resets success state for new registration', async () => {
      // First successful registration
      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      await act(async () => {
        await result.current.registerAddress(mockAddressRequest, 'us');
      });

      expect(result.current.isSuccess).toBe(true);

      // Second registration should reset success state
      let resolveRegisterAddress!: (value: typeof mockAddressResponse) => void;
      const registerAddressPromise = new Promise<typeof mockAddressResponse>(
        (resolve) => {
          resolveRegisterAddress = resolve;
        },
      );

      mockRegisterMailingAddress.mockReturnValue(registerAddressPromise);

      act(() => {
        result.current.registerAddress(mockAddressRequest);
      });

      // Success should be reset when starting new registration
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveRegisterAddress(mockAddressResponse);
        await registerAddressPromise;
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('resets error state for new registration', async () => {
      const initialError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid address',
      );
      mockRegisterMailingAddress.mockRejectedValueOnce(initialError);
      mockGetErrorMessage.mockReturnValue('Invalid address');

      const { result } = renderHook(() => useRegisterMailingAddress());

      // First call should fail
      try {
        await act(async () => {
          await result.current.registerAddress(mockAddressRequest);
        });
      } catch (error) {
        // Expected to throw
      }

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid address');

      // Second call should succeed and clear error
      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      await act(async () => {
        await result.current.registerAddress(mockAddressRequest);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('clearError function', () => {
    it('clears error state', async () => {
      const error = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid address',
      );
      mockRegisterMailingAddress.mockRejectedValue(error);
      mockGetErrorMessage.mockReturnValue('Invalid address');

      const { result } = renderHook(() => useRegisterMailingAddress());

      // Trigger error
      try {
        await act(async () => {
          await result.current.registerAddress(mockAddressRequest);
        });
      } catch (err) {
        // Expected to throw
      }

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid address');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('reset function', () => {
    it('resets all state to initial values', async () => {
      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      // Trigger successful registration
      await act(async () => {
        await result.current.registerAddress(mockAddressRequest);
      });

      expect(result.current.isSuccess).toBe(true);

      // Reset state
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('resets error state', async () => {
      const error = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid address',
      );
      mockRegisterMailingAddress.mockRejectedValue(error);
      mockGetErrorMessage.mockReturnValue('Invalid address');

      const { result } = renderHook(() => useRegisterMailingAddress());

      // Trigger error
      try {
        await act(async () => {
          await result.current.registerAddress(mockAddressRequest);
        });
      } catch (err) {
        // Expected to throw
      }

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid address');

      // Reset state
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('SDK integration', () => {
    it('calls registerMailingAddress with correct parameters', async () => {
      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      const customRequest: RegisterPhysicalAddressRequest = {
        onboardingId: 'onboarding-456',
        addressLine1: '456 Oak Ave',
        addressLine2: 'Suite 100',
        city: 'Los Angeles',
        zip: '90210',
        usState: 'CA',
        isSameMailingAddress: false,
      };

      await act(async () => {
        await result.current.registerAddress(customRequest, 'us');
      });

      expect(mockRegisterMailingAddress).toHaveBeenCalledWith({
        ...customRequest,
        location: 'us',
      });
      expect(mockRegisterMailingAddress).toHaveBeenCalledTimes(1);
    });

    it('handles undefined SDK gracefully', async () => {
      const mockCardSDKUndefined: ICardSDK = {
        ...jest.requireMock('../sdk'),
        sdk: null,
      };
      mockUseCardSDK.mockReturnValue(mockCardSDKUndefined);

      const { result } = renderHook(() => useRegisterMailingAddress());

      await act(async () => {
        try {
          await result.current.registerAddress(mockAddressRequest, 'us');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('Card SDK not initialized');
        }
      });

      expect(mockRegisterMailingAddress).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles address request without optional fields', async () => {
      const minimalRequest: RegisterPhysicalAddressRequest = {
        onboardingId: 'onboarding-123',
        addressLine1: '123 Main St',
        city: 'New York',
        zip: '10001',
      };

      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      await act(async () => {
        await result.current.registerAddress(minimalRequest, 'international');
      });

      expect(mockRegisterMailingAddress).toHaveBeenCalledWith({
        ...minimalRequest,
        location: 'international',
      });
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles international location', async () => {
      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      await act(async () => {
        await result.current.registerAddress(
          mockAddressRequest,
          'international',
        );
      });

      expect(mockRegisterMailingAddress).toHaveBeenCalledWith({
        ...mockAddressRequest,
        location: 'international',
      });
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles US location with state', async () => {
      const usRequest: RegisterPhysicalAddressRequest = {
        onboardingId: 'onboarding-123',
        addressLine1: '123 Main St',
        city: 'New York',
        zip: '10001',
        usState: 'NY',
      };

      mockRegisterMailingAddress.mockResolvedValue(mockAddressResponse);

      const { result } = renderHook(() => useRegisterMailingAddress());

      await act(async () => {
        await result.current.registerAddress(usRequest, 'us');
      });

      expect(mockRegisterMailingAddress).toHaveBeenCalledWith({
        ...usRequest,
        location: 'us',
      });
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useRegisterMailingAddress(),
      );

      const initialRegisterAddress = result.current.registerAddress;
      const initialClearError = result.current.clearError;
      const initialReset = result.current.reset;

      rerender();

      expect(result.current.registerAddress).toBe(initialRegisterAddress);
      expect(result.current.clearError).toBe(initialClearError);
      expect(result.current.reset).toBe(initialReset);
    });
  });
});
