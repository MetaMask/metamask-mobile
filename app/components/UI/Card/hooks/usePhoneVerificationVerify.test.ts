import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import {
  PhoneVerificationVerifyRequest,
  RegisterUserResponse,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import usePhoneVerificationVerify from './usePhoneVerificationVerify';
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

describe('usePhoneVerificationVerify', () => {
  const mockPhoneVerificationVerify = jest.fn();

  const mockSDK = {
    phoneVerificationVerify: mockPhoneVerificationVerify,
  } as unknown as CardSDK;

  const mockVerifyRequest: PhoneVerificationVerifyRequest = {
    phoneCountryCode: '+1',
    phoneNumber: '1234567890',
    verificationCode: '123456',
    onboardingId: 'onboarding-123',
    contactVerificationId: 'contact-123',
  };

  const mockUserResponse: RegisterUserResponse = {
    onboardingId: 'onboarding-123',
    user: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '1234567890',
      phoneCountryCode: '+1',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });
    mockGetErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('hook initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => usePhoneVerificationVerify());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.verifyPhoneVerification).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('verifyPhoneVerification function', () => {
    it('verifies phone verification successfully', async () => {
      mockPhoneVerificationVerify.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      let response: RegisterUserResponse | undefined;
      await act(async () => {
        response =
          await result.current.verifyPhoneVerification(mockVerifyRequest);
      });

      expect(mockPhoneVerificationVerify).toHaveBeenCalledWith({
        ...mockVerifyRequest,
      });
      expect(response).toEqual(mockUserResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets loading state during verification process', async () => {
      let resolveVerification!: (value: typeof mockUserResponse) => void;
      const verificationPromise = new Promise<typeof mockUserResponse>(
        (resolve) => {
          resolveVerification = resolve;
        },
      );

      mockPhoneVerificationVerify.mockReturnValue(verificationPromise);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      act(() => {
        result.current.verifyPhoneVerification(mockVerifyRequest);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();

      await act(async () => {
        resolveVerification(mockUserResponse);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('throws error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow('Card SDK not initialized');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles phoneVerificationVerify API error', async () => {
      const apiError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Phone verification verify failed',
      );
      mockPhoneVerificationVerify.mockRejectedValue(apiError);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow(apiError);

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
      expect(mockGetErrorMessage).toHaveBeenCalledWith(apiError);
    });

    it('handles network error', async () => {
      const networkError = new Error('Network error');
      mockPhoneVerificationVerify.mockRejectedValue(networkError);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow(networkError);

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
      expect(mockGetErrorMessage).toHaveBeenCalledWith(networkError);
    });

    it('handles generic error', async () => {
      const genericError = new Error('Something went wrong');
      mockPhoneVerificationVerify.mockRejectedValue(genericError);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow(genericError);

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('resets success state for new verification', async () => {
      mockPhoneVerificationVerify.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      // First successful verification
      await act(async () => {
        await result.current.verifyPhoneVerification(mockVerifyRequest);
      });

      expect(result.current.isSuccess).toBe(true);

      // Second verification should reset success state initially
      const secondPromise = act(async () => {
        await result.current.verifyPhoneVerification(mockVerifyRequest);
      });

      // During the call, success should be reset
      expect(result.current.isSuccess).toBe(false);

      await secondPromise;
      expect(result.current.isSuccess).toBe(true);
    });

    it('resets error state for new verification', async () => {
      const error = new Error('First error');
      mockPhoneVerificationVerify.mockRejectedValueOnce(error);
      mockPhoneVerificationVerify.mockResolvedValueOnce(mockUserResponse);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      // First verification with error
      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow(error);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Second successful verification should reset error state
      await act(async () => {
        await result.current.verifyPhoneVerification(mockVerifyRequest);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('clearError function', () => {
    it('clears error state', async () => {
      const error = new Error('Test error');
      mockPhoneVerificationVerify.mockRejectedValue(error);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      // Set error state
      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow(error);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

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
      mockPhoneVerificationVerify.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      // Set some state
      await act(async () => {
        await result.current.verifyPhoneVerification(mockVerifyRequest);
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
      const error = new Error('Test error');
      mockPhoneVerificationVerify.mockRejectedValue(error);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      // Set error state
      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow(error);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

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
    it('calls phoneVerificationVerify with correct parameters', async () => {
      mockPhoneVerificationVerify.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await act(async () => {
        await result.current.verifyPhoneVerification(mockVerifyRequest);
      });

      expect(mockPhoneVerificationVerify).toHaveBeenCalledWith({
        ...mockVerifyRequest,
      });
    });

    it('handles undefined SDK gracefully', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyPhoneVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow('Card SDK not initialized');
    });
  });

  describe('Edge cases', () => {
    it('handles verification request without optional fields', async () => {
      const minimalRequest: PhoneVerificationVerifyRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '1234567890',
        verificationCode: '123456',
        onboardingId: 'onboarding-123',
        contactVerificationId: 'contact-123',
      };

      mockPhoneVerificationVerify.mockResolvedValue(mockUserResponse);

      const { result } = renderHook(() => usePhoneVerificationVerify());

      await act(async () => {
        await result.current.verifyPhoneVerification(minimalRequest);
      });

      expect(mockPhoneVerificationVerify).toHaveBeenCalledWith({
        ...minimalRequest,
      });
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('Function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        usePhoneVerificationVerify(),
      );

      const firstRenderFunctions = {
        verifyPhoneVerification: result.current.verifyPhoneVerification,
        clearError: result.current.clearError,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.verifyPhoneVerification).toBe(
        firstRenderFunctions.verifyPhoneVerification,
      );
      expect(result.current.clearError).toBe(firstRenderFunctions.clearError);
      expect(result.current.reset).toBe(firstRenderFunctions.reset);
    });
  });
});
