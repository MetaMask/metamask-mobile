import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import {
  EmailVerificationVerifyRequest,
  EmailVerificationVerifyResponse,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import useEmailVerificationVerify from './useEmailVerificationVerify';
import { CardSDK } from '../sdk/CardSDK';
import Engine from '../../../../core/Engine';

// Mock dependencies
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));
jest.mock('../util/getErrorMessage');
jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      isSignedIn: jest.fn(),
      getSessionProfile: jest.fn(),
    },
  },
}));

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
const mockIsSignedIn = Engine.context.AuthenticationController
  .isSignedIn as jest.MockedFunction<
  typeof Engine.context.AuthenticationController.isSignedIn
>;
const mockGetSessionProfile = Engine.context.AuthenticationController
  .getSessionProfile as jest.MockedFunction<
  typeof Engine.context.AuthenticationController.getSessionProfile
>;

describe('useEmailVerificationVerify', () => {
  const mockEmailVerificationVerify = jest.fn();
  const mockProfileId = 'mock-profile-id-from-jwt';

  const mockSDK = {
    emailVerificationVerify: mockEmailVerificationVerify,
  } as unknown as CardSDK;

  const mockVerifyRequest: EmailVerificationVerifyRequest = {
    email: 'test@example.com',
    password: 'password123',
    verificationCode: '123456',
    contactVerificationId: 'contact-123',
    countryOfResidence: 'US',
    allowMarketing: true,
    allowSms: true,
  };

  const mockVerifyResponse: EmailVerificationVerifyResponse = {
    hasAccount: false,
    onboardingId: 'onboarding-123',
    user: {
      id: 'user-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
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
    mockIsSignedIn.mockReturnValue(true);
    mockGetSessionProfile.mockResolvedValue({
      profileId: mockProfileId,
      identifierId: 'mock-identifier-id',
      metaMetricsId: 'mock-metametrics-id',
    });
    mockGetErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('hook initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useEmailVerificationVerify());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.verifyEmailVerification).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('verifyEmailVerification function', () => {
    it('verifies email verification successfully', async () => {
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      let response: EmailVerificationVerifyResponse | undefined;
      await act(async () => {
        response =
          await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(mockEmailVerificationVerify).toHaveBeenCalledWith({
        ...mockVerifyRequest,
        userExternalId: mockProfileId,
      });
      expect(response).toEqual(mockVerifyResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets loading state during verification process', async () => {
      let resolveVerification!: (value: typeof mockVerifyResponse) => void;
      const verificationPromise = new Promise<typeof mockVerifyResponse>(
        (resolve) => {
          resolveVerification = resolve;
        },
      );

      mockEmailVerificationVerify.mockReturnValue(verificationPromise);

      const { result } = renderHook(() => useEmailVerificationVerify());

      act(() => {
        result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();

      await act(async () => {
        resolveVerification(mockVerifyResponse);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles CardError correctly', async () => {
      const cardError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Invalid verification code',
      );
      mockEmailVerificationVerify.mockRejectedValue(cardError);

      const { result } = renderHook(() => useEmailVerificationVerify());

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBe(cardError);
      expect(mockGetErrorMessage).toHaveBeenCalledWith(cardError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('handles network error correctly', async () => {
      const networkError = new Error('Network error');
      mockEmailVerificationVerify.mockRejectedValue(networkError);

      const { result } = renderHook(() => useEmailVerificationVerify());

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBe(networkError);
      expect(mockGetErrorMessage).toHaveBeenCalledWith(networkError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('handles unknown error correctly', async () => {
      const unknownError = new Error('Unknown error');
      mockEmailVerificationVerify.mockRejectedValue(unknownError);

      const { result } = renderHook(() => useEmailVerificationVerify());

      let thrownError: unknown;
      await act(async () => {
        try {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        } catch (error) {
          thrownError = error;
        }
      });

      expect(thrownError).toBe(unknownError);
      expect(mockGetErrorMessage).toHaveBeenCalledWith(unknownError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('throws error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useEmailVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow('Card SDK not initialized');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('includes profileId when user is signed in', async () => {
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(mockIsSignedIn).toHaveBeenCalled();
      expect(mockGetSessionProfile).toHaveBeenCalled();
      expect(mockEmailVerificationVerify).toHaveBeenCalledWith({
        ...mockVerifyRequest,
        userExternalId: mockProfileId,
      });
    });

    it('does not include userExternalId when user is not signed in', async () => {
      mockIsSignedIn.mockReturnValue(false);
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(mockIsSignedIn).toHaveBeenCalled();
      expect(mockGetSessionProfile).not.toHaveBeenCalled();
      expect(mockEmailVerificationVerify).toHaveBeenCalledWith(
        mockVerifyRequest,
      );
    });

    it('does not include userExternalId when getSessionProfile throws error', async () => {
      mockGetSessionProfile.mockRejectedValue(new Error('Session error'));
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(mockEmailVerificationVerify).toHaveBeenCalledWith(
        mockVerifyRequest,
      );
      expect(result.current.isSuccess).toBe(true);
    });

    it('does not include userExternalId when session profile has empty profileId', async () => {
      mockGetSessionProfile.mockResolvedValue({
        profileId: '',
        identifierId: 'mock-identifier-id',
        metaMetricsId: 'mock-metametrics-id',
      });
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(mockEmailVerificationVerify).toHaveBeenCalledWith(
        mockVerifyRequest,
      );
      expect(result.current.isSuccess).toBe(true);
    });

    it('resets success state for new verification', async () => {
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      // First successful verification
      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(result.current.isSuccess).toBe(true);

      // Second verification should reset success state initially
      const secondPromise = act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      // During the call, success should be reset
      expect(result.current.isSuccess).toBe(false);

      await secondPromise;
      expect(result.current.isSuccess).toBe(true);
    });

    it('resets error state for new verification', async () => {
      const error = new Error('First error');
      mockEmailVerificationVerify.mockRejectedValueOnce(error);
      mockEmailVerificationVerify.mockResolvedValueOnce(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      // First verification with error
      await act(async () => {
        try {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        } catch {
          // Expected error
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Second verification should reset error state
      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe('clearError function', () => {
    it('clears error state while preserving other states', async () => {
      const error = new Error('Test error');
      mockEmailVerificationVerify.mockRejectedValue(error);

      const { result } = renderHook(() => useEmailVerificationVerify());

      // Trigger error
      await act(async () => {
        try {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        } catch {
          // Expected error
        }
      });

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
    it('resets all states to initial values', async () => {
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      // Trigger successful verification
      await act(async () => {
        await result.current.verifyEmailVerification(mockVerifyRequest);
      });

      expect(result.current.isSuccess).toBe(true);

      // Reset all states
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
    it('calls SDK emailVerificationVerify with profileId from AuthenticationController', async () => {
      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      const customRequest: EmailVerificationVerifyRequest = {
        email: 'custom@example.com',
        password: 'customPassword',
        verificationCode: '654321',
        contactVerificationId: 'contact-456',
        countryOfResidence: 'UK',
        allowMarketing: false,
        allowSms: false,
      };

      await act(async () => {
        await result.current.verifyEmailVerification(customRequest);
      });

      expect(mockEmailVerificationVerify).toHaveBeenCalledWith({
        ...customRequest,
        userExternalId: mockProfileId,
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty verification code', async () => {
      const requestWithEmptyCode = {
        ...mockVerifyRequest,
        verificationCode: '',
      };

      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      await act(async () => {
        await result.current.verifyEmailVerification(requestWithEmptyCode);
      });

      expect(mockEmailVerificationVerify).toHaveBeenCalledWith({
        ...requestWithEmptyCode,
        userExternalId: mockProfileId,
      });
    });

    it('handles special characters in email and password', async () => {
      const requestWithSpecialChars = {
        ...mockVerifyRequest,
        email: 'test+special@example.com',
        password: 'P@ssw0rd!',
      };

      mockEmailVerificationVerify.mockResolvedValue(mockVerifyResponse);

      const { result } = renderHook(() => useEmailVerificationVerify());

      await act(async () => {
        await result.current.verifyEmailVerification(requestWithSpecialChars);
      });

      expect(mockEmailVerificationVerify).toHaveBeenCalledWith({
        ...requestWithSpecialChars,
        userExternalId: mockProfileId,
      });
    });
  });

  describe('function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() =>
        useEmailVerificationVerify(),
      );

      const firstRenderFunctions = {
        verifyEmailVerification: result.current.verifyEmailVerification,
        clearError: result.current.clearError,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.verifyEmailVerification).toBe(
        firstRenderFunctions.verifyEmailVerification,
      );
      expect(result.current.clearError).toBe(firstRenderFunctions.clearError);
      expect(result.current.reset).toBe(firstRenderFunctions.reset);
    });
  });

  describe('handles undefined SDK gracefully', () => {
    it('throws appropriate error when SDK is undefined', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useEmailVerificationVerify());

      await expect(
        act(async () => {
          await result.current.verifyEmailVerification(mockVerifyRequest);
        }),
      ).rejects.toThrow('Card SDK not initialized');
    });
  });
});
