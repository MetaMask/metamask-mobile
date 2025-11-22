import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import {
  EmailVerificationSendResponse,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import useEmailVerificationSend from './useEmailVerificationSend';
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

describe('useEmailVerificationSend', () => {
  const mockEmailVerificationSend = jest.fn();

  const mockSDK = {
    emailVerificationSend: mockEmailVerificationSend,
  } as unknown as CardSDK;

  const mockSendResponse: EmailVerificationSendResponse = {
    contactVerificationId: 'contact-123',
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
      const { result } = renderHook(() => useEmailVerificationSend());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.sendEmailVerification).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('sendEmailVerification function', () => {
    it('sends email verification successfully', async () => {
      mockEmailVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      let sendPromise: Promise<EmailVerificationSendResponse>;
      act(() => {
        sendPromise = result.current.sendEmailVerification('test@example.com');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();

      let response: EmailVerificationSendResponse | undefined;
      await act(async () => {
        response = await sendPromise;
      });

      expect(response).toEqual(mockSendResponse);
      expect(mockEmailVerificationSend).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets loading state during send process', async () => {
      let resolveEmailSend: (value: EmailVerificationSendResponse) => void;
      const emailSendPromise = new Promise<EmailVerificationSendResponse>(
        (resolve) => {
          resolveEmailSend = resolve;
        },
      );
      mockEmailVerificationSend.mockReturnValue(emailSendPromise);

      const { result } = renderHook(() => useEmailVerificationSend());

      act(() => {
        result.current.sendEmailVerification('test@example.com');
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      await act(async () => {
        resolveEmailSend(mockSendResponse);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('handles CardError correctly', async () => {
      const cardError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Email already exists',
      );
      mockEmailVerificationSend.mockRejectedValue(cardError);

      const { result } = renderHook(() => useEmailVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow(cardError);

      expect(mockGetErrorMessage).toHaveBeenCalledWith(cardError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('handles network error correctly', async () => {
      const networkError = new Error('Network error');
      mockEmailVerificationSend.mockRejectedValue(networkError);

      const { result } = renderHook(() => useEmailVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow(networkError);

      expect(mockGetErrorMessage).toHaveBeenCalledWith(networkError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('handles unknown error correctly', async () => {
      const unknownError = new Error('Unknown error');
      mockEmailVerificationSend.mockRejectedValue(unknownError);

      const { result } = renderHook(() => useEmailVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow(unknownError);

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

      const { result } = renderHook(() => useEmailVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow('Card SDK not initialized');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('resets success state for new send', async () => {
      mockEmailVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      // First successful send
      await act(async () => {
        await result.current.sendEmailVerification('test@example.com');
      });

      expect(result.current.isSuccess).toBe(true);

      // Second send should reset success state
      act(() => {
        result.current.sendEmailVerification('test2@example.com');
      });

      expect(result.current.isSuccess).toBe(false);
    });

    it('resets error state for new send', async () => {
      const cardError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Email already exists',
      );
      mockEmailVerificationSend
        .mockRejectedValueOnce(cardError)
        .mockResolvedValueOnce(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      // First send with error
      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow(cardError);

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Second send should reset error state
      act(() => {
        result.current.sendEmailVerification('test2@example.com');
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('clearError function', () => {
    it('clears error state while preserving other states', async () => {
      const cardError = new CardError(
        CardErrorType.CONFLICT_ERROR,
        'Email already exists',
      );
      mockEmailVerificationSend.mockRejectedValue(cardError);

      const { result } = renderHook(() => useEmailVerificationSend());

      // Trigger error
      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow(cardError);

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
      mockEmailVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      // Trigger successful send
      await act(async () => {
        await result.current.sendEmailVerification('test@example.com');
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
    it('calls SDK emailVerificationSend with correct parameters', async () => {
      mockEmailVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      await act(async () => {
        await result.current.sendEmailVerification('custom@example.com');
      });

      expect(mockEmailVerificationSend).toHaveBeenCalledTimes(1);
      expect(mockEmailVerificationSend).toHaveBeenCalledWith({
        email: 'custom@example.com',
      });
    });
  });

  describe('edge cases', () => {
    it('handles empty email', async () => {
      mockEmailVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      await act(async () => {
        await result.current.sendEmailVerification('');
      });

      expect(mockEmailVerificationSend).toHaveBeenCalledWith({
        email: '',
      });
    });

    it('handles special characters in email', async () => {
      mockEmailVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => useEmailVerificationSend());

      const specialEmail = 'test+special@example-domain.co.uk';

      await act(async () => {
        await result.current.sendEmailVerification(specialEmail);
      });

      expect(mockEmailVerificationSend).toHaveBeenCalledWith({
        email: specialEmail,
      });
    });
  });

  describe('function stability', () => {
    it('maintains function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useEmailVerificationSend());

      const firstRenderFunctions = {
        sendEmailVerification: result.current.sendEmailVerification,
        clearError: result.current.clearError,
        reset: result.current.reset,
      };

      rerender();

      expect(result.current.sendEmailVerification).toBe(
        firstRenderFunctions.sendEmailVerification,
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

      const { result } = renderHook(() => useEmailVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendEmailVerification('test@example.com');
        }),
      ).rejects.toThrow('Card SDK not initialized');
    });
  });
});
