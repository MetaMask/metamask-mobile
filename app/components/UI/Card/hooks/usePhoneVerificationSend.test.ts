import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import {
  PhoneVerificationSendRequest,
  PhoneVerificationSendResponse,
  CardError,
  CardErrorType,
} from '../types';
import { getErrorMessage } from '../util/getErrorMessage';
import usePhoneVerificationSend from './usePhoneVerificationSend';
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

describe('usePhoneVerificationSend', () => {
  const mockPhoneVerificationSend = jest.fn();

  const mockSDK = {
    phoneVerificationSend: mockPhoneVerificationSend,
  } as unknown as CardSDK;

  const mockSendRequest: PhoneVerificationSendRequest = {
    phoneCountryCode: '+1',
    phoneNumber: '1234567890',
    contactVerificationId: 'contact-123',
  };

  const mockSendResponse: PhoneVerificationSendResponse = {
    success: true,
  };

  const mockCardSDKReturn = {
    ...jest.requireMock('../sdk'),
    sdk: mockSDK,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardSDK.mockReturnValue(mockCardSDKReturn);
    mockGetErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('Hook initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => usePhoneVerificationSend());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.sendPhoneVerification).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('sendPhoneVerification', () => {
    it('should send phone verification successfully', async () => {
      mockPhoneVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => usePhoneVerificationSend());

      let response: PhoneVerificationSendResponse | undefined;

      await act(async () => {
        response = await result.current.sendPhoneVerification(mockSendRequest);
      });

      expect(mockPhoneVerificationSend).toHaveBeenCalledWith({
        ...mockSendRequest,
      });
      expect(response).toEqual(mockSendResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should set loading state during phone verification', async () => {
      let resolvePromise: (value: PhoneVerificationSendResponse) => void;
      const promise = new Promise<PhoneVerificationSendResponse>((resolve) => {
        resolvePromise = resolve;
      });
      mockPhoneVerificationSend.mockReturnValue(promise);

      const { result } = renderHook(() => usePhoneVerificationSend());

      act(() => {
        result.current.sendPhoneVerification(mockSendRequest);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);

      await act(async () => {
        resolvePromise(mockSendResponse);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(true);
    });

    it('should throw error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => usePhoneVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow('Card SDK not initialized');

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it('should handle undefined SDK gracefully', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => usePhoneVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow('Card SDK not initialized');
    });

    it('should handle CardError correctly', async () => {
      const cardError = new CardError(
        CardErrorType.UNKNOWN_ERROR,
        'Card error occurred',
      );
      mockPhoneVerificationSend.mockRejectedValue(cardError);

      const { result } = renderHook(() => usePhoneVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow(cardError);

      expect(mockGetErrorMessage).toHaveBeenCalledWith(cardError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('should handle network error correctly', async () => {
      const networkError = new Error('Network error');
      mockPhoneVerificationSend.mockRejectedValue(networkError);

      const { result } = renderHook(() => usePhoneVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow(networkError);

      expect(mockGetErrorMessage).toHaveBeenCalledWith(networkError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });

    it('should handle unknown error correctly', async () => {
      const unknownError = 'Unknown error';
      mockPhoneVerificationSend.mockRejectedValue(unknownError);

      const { result } = renderHook(() => usePhoneVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toBe(unknownError);

      expect(mockGetErrorMessage).toHaveBeenCalledWith(unknownError);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const error = new Error('Test error');
      mockPhoneVerificationSend.mockRejectedValue(error);

      const { result } = renderHook(() => usePhoneVerificationSend());

      // First, trigger an error
      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow();

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Then clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      // Other states should remain unchanged
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all states to initial values', async () => {
      mockPhoneVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => usePhoneVerificationSend());

      // First, perform a successful operation
      await act(async () => {
        await result.current.sendPhoneVerification(mockSendRequest);
      });

      expect(result.current.isSuccess).toBe(true);

      // Then reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should reset error states', async () => {
      const error = new Error('Test error');
      mockPhoneVerificationSend.mockRejectedValue(error);

      const { result } = renderHook(() => usePhoneVerificationSend());

      // First, trigger an error
      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow();

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe('Mocked error message');

      // Then reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('SDK integration', () => {
    it('should call SDK phoneVerificationSend with correct parameters', async () => {
      mockPhoneVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => usePhoneVerificationSend());

      const customRequest: PhoneVerificationSendRequest = {
        phoneCountryCode: '+44',
        phoneNumber: '9876543210',
        contactVerificationId: 'contact-456',
      };

      await act(async () => {
        await result.current.sendPhoneVerification(customRequest);
      });

      expect(mockPhoneVerificationSend).toHaveBeenCalledWith({
        phoneCountryCode: '+44',
        phoneNumber: '9876543210',
        contactVerificationId: 'contact-456',
      });
    });

    it('should handle SDK method not available', async () => {
      const sdkWithoutMethod = {} as CardSDK;
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: sdkWithoutMethod,
      });

      const { result } = renderHook(() => usePhoneVerificationSend());

      await expect(
        act(async () => {
          await result.current.sendPhoneVerification(mockSendRequest);
        }),
      ).rejects.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty phone number', async () => {
      mockPhoneVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => usePhoneVerificationSend());

      const emptyRequest: PhoneVerificationSendRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '',
        contactVerificationId: 'contact-123',
      };

      await act(async () => {
        await result.current.sendPhoneVerification(emptyRequest);
      });

      expect(mockPhoneVerificationSend).toHaveBeenCalledWith({
        ...emptyRequest,
      });
    });

    it('should handle special characters in phone number', async () => {
      mockPhoneVerificationSend.mockResolvedValue(mockSendResponse);

      const { result } = renderHook(() => usePhoneVerificationSend());

      const specialRequest: PhoneVerificationSendRequest = {
        phoneCountryCode: '+1',
        phoneNumber: '(123) 456-7890',
        contactVerificationId: 'contact-123',
      };

      await act(async () => {
        await result.current.sendPhoneVerification(specialRequest);
      });

      expect(mockPhoneVerificationSend).toHaveBeenCalledWith({
        ...specialRequest,
      });
    });
  });

  describe('Function stability', () => {
    it('should maintain function references across re-renders', () => {
      const { result, rerender } = renderHook(() => usePhoneVerificationSend());

      const initialSendPhoneVerification = result.current.sendPhoneVerification;
      const initialClearError = result.current.clearError;
      const initialReset = result.current.reset;

      rerender();

      expect(result.current.sendPhoneVerification).toBe(
        initialSendPhoneVerification,
      );
      expect(result.current.clearError).toBe(initialClearError);
      expect(result.current.reset).toBe(initialReset);
    });
  });
});
