import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK, ICardSDK } from '../sdk';
import {
  RegisterPersonalDetailsRequest,
  RegisterUserResponse,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import useRegisterPersonalDetails from './useRegisterPersonalDetails';
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

describe('useRegisterPersonalDetails', () => {
  const mockRegisterPersonalDetails = jest.fn();

  const mockSDK = {
    registerPersonalDetails: mockRegisterPersonalDetails,
  } as unknown as CardSDK;

  const mockPersonalDetailsRequest: RegisterPersonalDetailsRequest = {
    onboardingId: 'onboarding-123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-01',
    countryOfNationality: 'US',
    ssn: '123456789',
  };

  const mockUserResponse: RegisterUserResponse = {
    onboardingId: 'onboarding-123',
    user: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      email: 'john.doe@example.com',
      verificationState: 'PENDING',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    } as ICardSDK);
  });

  describe('Hook initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useRegisterPersonalDetails());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.registerPersonalDetails).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('registerPersonalDetails function', () => {
    it('successfully registers personal details', async () => {
      mockRegisterPersonalDetails.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      let response: RegisterUserResponse | undefined;
      await act(async () => {
        response = await result.current.registerPersonalDetails(
          mockPersonalDetailsRequest,
        );
      });

      expect(mockRegisterPersonalDetails).toHaveBeenCalledWith({
        ...mockPersonalDetailsRequest,
      });
      expect(response).toEqual(mockUserResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets loading state during registration process', async () => {
      let resolveRegisterPersonalDetails!: (
        value: RegisterUserResponse,
      ) => void;
      const registerPersonalDetailsPromise = new Promise<RegisterUserResponse>(
        (resolve) => {
          resolveRegisterPersonalDetails = resolve;
        },
      );

      mockRegisterPersonalDetails.mockReturnValue(
        registerPersonalDetailsPromise,
      );

      const { result } = renderHook(() => useRegisterPersonalDetails());

      act(() => {
        result.current.registerPersonalDetails(mockPersonalDetailsRequest);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      await act(async () => {
        resolveRegisterPersonalDetails(mockUserResponse);
        await registerPersonalDetailsPromise;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles SDK not available error', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      } as ICardSDK);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      await expect(
        act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
        }),
      ).rejects.toThrow('Card SDK not initialized');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });

    it('handles registerPersonalDetails API error', async () => {
      const apiError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid personal details',
      );
      mockRegisterPersonalDetails.mockRejectedValue(apiError);
      mockGetErrorMessage.mockReturnValue('Invalid personal details');

      const { result } = renderHook(() => useRegisterPersonalDetails());

      try {
        await act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
        });
      } catch (error) {
        // Expected to throw
      }

      expect(mockRegisterPersonalDetails).toHaveBeenCalledWith({
        ...mockPersonalDetailsRequest,
      });
      expect(mockGetErrorMessage).toHaveBeenCalledWith(apiError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid personal details');
    });

    it('handles network error', async () => {
      const networkError = new CardError(
        CardErrorType.NETWORK_ERROR,
        'Network connection failed',
      );
      mockRegisterPersonalDetails.mockRejectedValue(networkError);
      mockGetErrorMessage.mockReturnValue('Network connection failed');

      const { result } = renderHook(() => useRegisterPersonalDetails());

      try {
        await act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
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
      mockRegisterPersonalDetails.mockRejectedValue(genericError);
      mockGetErrorMessage.mockReturnValue('Something went wrong');

      const { result } = renderHook(() => useRegisterPersonalDetails());

      try {
        await act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
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
      mockRegisterPersonalDetails.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      await act(async () => {
        await result.current.registerPersonalDetails(
          mockPersonalDetailsRequest,
        );
      });

      expect(result.current.isSuccess).toBe(true);

      // Second registration should reset success state
      let resolveRegisterPersonalDetails!: (
        value: RegisterUserResponse,
      ) => void;
      const registerPersonalDetailsPromise = new Promise<RegisterUserResponse>(
        (resolve) => {
          resolveRegisterPersonalDetails = resolve;
        },
      );

      mockRegisterPersonalDetails.mockReturnValue(
        registerPersonalDetailsPromise,
      );

      act(() => {
        result.current.registerPersonalDetails(mockPersonalDetailsRequest);
      });

      // Success should be reset when starting new registration
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveRegisterPersonalDetails(mockUserResponse);
        await registerPersonalDetailsPromise;
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('resets error state for new registration', async () => {
      const initialError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid details',
      );
      mockRegisterPersonalDetails.mockRejectedValueOnce(initialError);
      mockGetErrorMessage.mockReturnValue('Invalid details');

      const { result } = renderHook(() => useRegisterPersonalDetails());

      // First call should fail
      try {
        await act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
        });
      } catch (error) {
        // Expected to throw
      }

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Invalid details');

      // Second call should succeed and clear error
      mockRegisterPersonalDetails.mockResolvedValue(mockUserResponse);

      await act(async () => {
        await result.current.registerPersonalDetails(
          mockPersonalDetailsRequest,
        );
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('clearError function', () => {
    it('clears error state', async () => {
      const error = new CardError(CardErrorType.CONFLICT_ERROR, 'Test error');
      mockRegisterPersonalDetails.mockRejectedValue(error);
      mockGetErrorMessage.mockReturnValue('Test error');

      const { result } = renderHook(() => useRegisterPersonalDetails());

      // Trigger error
      try {
        await act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
        });
      } catch (err) {
        // Expected to throw
      }

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Test error');

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('does nothing when no error exists', () => {
      const { result } = renderHook(() => useRegisterPersonalDetails());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('reset function', () => {
    it('resets all state to initial values', async () => {
      mockRegisterPersonalDetails.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      // Set some state
      await act(async () => {
        await result.current.registerPersonalDetails(
          mockPersonalDetailsRequest,
        );
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
      const error = new CardError(CardErrorType.CONFLICT_ERROR, 'Test error');
      mockRegisterPersonalDetails.mockRejectedValue(error);
      mockGetErrorMessage.mockReturnValue('Test error');

      const { result } = renderHook(() => useRegisterPersonalDetails());

      // Trigger error
      try {
        await act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
        });
      } catch (err) {
        // Expected to throw
      }

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Test error');

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
    it('calls registerPersonalDetails with correct parameters', async () => {
      mockRegisterPersonalDetails.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      const customRequest: RegisterPersonalDetailsRequest = {
        onboardingId: 'onboarding-456',
        firstName: 'Jane',
        lastName: 'Smith',
        dateOfBirth: '1985-05-15',
        countryOfNationality: 'CA',
      };

      await act(async () => {
        await result.current.registerPersonalDetails(customRequest);
      });

      expect(mockRegisterPersonalDetails).toHaveBeenCalledWith({
        ...customRequest,
      });
      expect(mockRegisterPersonalDetails).toHaveBeenCalledTimes(1);
    });

    it('handles undefined SDK gracefully', async () => {
      const mockCardSDKNull: ICardSDK = {
        ...jest.requireMock('../sdk'),
        sdk: null,
      };

      mockUseCardSDK.mockReturnValue(mockCardSDKNull);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      await expect(
        act(async () => {
          await result.current.registerPersonalDetails(
            mockPersonalDetailsRequest,
          );
        }),
      ).rejects.toThrow('Card SDK not initialized');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles personal details request without optional fields', async () => {
      const minimalRequest: RegisterPersonalDetailsRequest = {
        onboardingId: 'onboarding-789',
        firstName: 'Alice',
        lastName: 'Johnson',
        dateOfBirth: '1992-12-25',
        countryOfNationality: 'GB',
      };

      mockRegisterPersonalDetails.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => useRegisterPersonalDetails());

      await act(async () => {
        await result.current.registerPersonalDetails(minimalRequest);
      });

      expect(mockRegisterPersonalDetails).toHaveBeenCalledWith({
        ...minimalRequest,
      });
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useRegisterPersonalDetails(),
      );

      const initialRegisterPersonalDetails =
        result.current.registerPersonalDetails;
      const initialClearError = result.current.clearError;
      const initialReset = result.current.reset;

      rerender();

      expect(result.current.registerPersonalDetails).toBe(
        initialRegisterPersonalDetails,
      );
      expect(result.current.clearError).toBe(initialClearError);
      expect(result.current.reset).toBe(initialReset);
    });
  });
});
