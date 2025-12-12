import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import { useCardProvision } from './useCardProvision';
import Logger from '../../../../util/Logger';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('useCardProvision', () => {
  const mockProvisionCard = jest.fn();

  const mockSDK = {
    provisionCard: mockProvisionCard,
  } as unknown as CardSDK;

  const mockSuccessResponse = {
    success: true,
    cardId: 'card-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock - SDK is available
    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });
  });

  describe('Initial State', () => {
    it('initializes with loading set to false', () => {
      const { result } = renderHook(() => useCardProvision());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.provisionCard).toBeInstanceOf(Function);
    });
  });

  describe('Successful Provisioning', () => {
    it('provisions card and returns response when successful', async () => {
      mockProvisionCard.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useCardProvision());

      let response;
      await act(async () => {
        response = await result.current.provisionCard();
      });

      expect(mockProvisionCard).toHaveBeenCalledTimes(1);
      expect(response).toEqual(mockSuccessResponse);
      expect(result.current.isLoading).toBe(false);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('sets loading to false after successful provisioning', async () => {
      mockProvisionCard.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useCardProvision());

      await act(async () => {
        await result.current.provisionCard();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Loading State', () => {
    it('sets loading to true during provisioning', async () => {
      let resolveProvision: (value: typeof mockSuccessResponse) => void;
      const deferredPromise = new Promise<typeof mockSuccessResponse>(
        (resolve) => {
          resolveProvision = resolve;
        },
      );
      mockProvisionCard.mockReturnValue(deferredPromise);

      const { result } = renderHook(() => useCardProvision());

      act(() => {
        result.current.provisionCard();
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(result.current.isLoading).toBe(true);

      // Cleanup: Resolve the promise
      await act(async () => {
        resolveProvision(mockSuccessResponse);
        await deferredPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('throws error when response success is false', async () => {
      const failureResponse = {
        success: false,
        error: 'Provisioning failed',
      };
      mockProvisionCard.mockResolvedValue(failureResponse);

      const { result } = renderHook(() => useCardProvision());

      await expect(
        act(async () => {
          await result.current.provisionCard();
        }),
      ).rejects.toThrow('Failed to provision card');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to provision card',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('throws error and logs when SDK call fails', async () => {
      const networkError = new Error('Network error');
      mockProvisionCard.mockRejectedValue(networkError);

      const { result } = renderHook(() => useCardProvision());

      await expect(
        act(async () => {
          await result.current.provisionCard();
        }),
      ).rejects.toThrow('Network error');

      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        networkError,
        'Failed to provision card',
      );
      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading to false when error occurs', async () => {
      const error = new Error('Provisioning error');
      mockProvisionCard.mockRejectedValue(error);

      const { result } = renderHook(() => useCardProvision());

      await expect(
        act(async () => {
          await result.current.provisionCard();
        }),
      ).rejects.toThrow('Provisioning error');

      expect(result.current.isLoading).toBe(false);
    });

    it('rethrows error after logging', async () => {
      const customError = new Error('Custom provisioning error');
      mockProvisionCard.mockRejectedValue(customError);

      const { result } = renderHook(() => useCardProvision());

      await expect(
        act(async () => {
          await result.current.provisionCard();
        }),
      ).rejects.toThrow('Custom provisioning error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        customError,
        'Failed to provision card',
      );
    });
  });

  describe('No SDK Available', () => {
    it('returns early when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useCardProvision());

      let response;
      await act(async () => {
        response = await result.current.provisionCard();
      });

      expect(mockProvisionCard).not.toHaveBeenCalled();
      expect(response).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('does not set loading state when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      const { result } = renderHook(() => useCardProvision());

      await act(async () => {
        await result.current.provisionCard();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple rapid provision calls', async () => {
      mockProvisionCard.mockResolvedValue(mockSuccessResponse);

      const { result } = renderHook(() => useCardProvision());

      await act(async () => {
        const promises = [
          result.current.provisionCard(),
          result.current.provisionCard(),
          result.current.provisionCard(),
        ];
        await Promise.all(promises);
      });

      expect(mockProvisionCard).toHaveBeenCalledTimes(3);
      expect(result.current.isLoading).toBe(false);
    });

    it('maintains callback stability across renders', () => {
      const { result, rerender } = renderHook(() => useCardProvision());

      const firstCallback = result.current.provisionCard;

      rerender();

      const secondCallback = result.current.provisionCard;

      // Callback should be stable due to useCallback with [sdk] dependency
      expect(firstCallback).toBe(secondCallback);
    });

    it('updates callback when SDK changes', () => {
      const { result, rerender } = renderHook(() => useCardProvision());

      const firstCallback = result.current.provisionCard;

      // Change SDK instance
      const newMockSDK = {
        provisionCard: jest.fn(),
      } as unknown as CardSDK;

      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: newMockSDK,
      });

      rerender();

      const secondCallback = result.current.provisionCard;

      // Callback should update when SDK changes
      expect(firstCallback).not.toBe(secondCallback);
    });

    it('handles provision retry after initial failure', async () => {
      // First call fails
      const error = new Error('Initial error');
      mockProvisionCard.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCardProvision());

      await expect(
        act(async () => {
          await result.current.provisionCard();
        }),
      ).rejects.toThrow('Initial error');

      expect(result.current.isLoading).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);

      // Clear mock to verify retry behavior
      mockLogger.error.mockClear();

      // Second call succeeds
      mockProvisionCard.mockResolvedValue(mockSuccessResponse);

      let response;
      await act(async () => {
        response = await result.current.provisionCard();
      });

      expect(response).toEqual(mockSuccessResponse);
      expect(result.current.isLoading).toBe(false);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
