import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useDropEligibility } from './useDropEligibility';
import Engine from '../../../../core/Engine';
import type { DropEligibilityDto } from '../../../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

describe('useDropEligibility', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;

  const mockSubscriptionId = 'test-subscription-id';
  const mockDropId = 'test-drop-id';
  const mockEligibility: DropEligibilityDto = {
    dropId: mockDropId,
    eligible: true,
    prerequisiteLogic: 'AND',
    canCommit: true,
    prerequisiteStatuses: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockSubscriptionId);
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useDropEligibility(mockDropId));

      expect(result.current.eligibility).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  describe('refetch function', () => {
    it('should successfully fetch eligibility', async () => {
      mockEngineCall.mockResolvedValueOnce(mockEligibility);

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:getDropEligibility',
        mockDropId,
        mockSubscriptionId,
      );
      expect(result.current.eligibility).toEqual(mockEligibility);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: DropEligibilityDto) => void;
      const promise = new Promise<DropEligibilityDto>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      act(() => {
        result.current.refetch();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      await act(async () => {
        resolvePromise(mockEligibility);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.eligibility).toEqual(mockEligibility);
    });

    it('should handle missing subscription ID', async () => {
      mockUseSelector.mockReturnValue(null);
      const { result } = renderHook(() => useDropEligibility(mockDropId));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.eligibility).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing drop ID', async () => {
      const { result } = renderHook(() => useDropEligibility(''));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.eligibility).toBeNull();
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Fetch failed');
      mockEngineCall.mockRejectedValueOnce(mockError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(jest.fn());

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.eligibility).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      mockEngineCall.mockRejectedValueOnce('String error');
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(jest.fn());

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('Failed to fetch eligibility');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should clear error before new fetch attempt', async () => {
      const mockError = new Error('First error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(jest.fn());

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBe('First error');

      mockEngineCall.mockResolvedValueOnce(mockEligibility);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.eligibility).toEqual(mockEligibility);

      consoleErrorSpy.mockRestore();
    });

    it('should prevent concurrent requests', async () => {
      let resolveFirst: (value: DropEligibilityDto) => void;
      const firstPromise = new Promise<DropEligibilityDto>((resolve) => {
        resolveFirst = resolve;
      });
      mockEngineCall.mockReturnValueOnce(firstPromise);

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      // Start first request
      act(() => {
        result.current.refetch();
      });

      expect(result.current.isLoading).toBe(true);

      // Attempt second request while first is pending
      act(() => {
        result.current.refetch();
      });

      // Should only be called once (the concurrent call is blocked)
      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      // Resolve first promise
      await act(async () => {
        resolveFirst(mockEligibility);
        await firstPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should allow new request after previous completes', async () => {
      mockEngineCall.mockResolvedValue(mockEligibility);

      const { result } = renderHook(() => useDropEligibility(mockDropId));

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(1);

      const updatedEligibility = {
        ...mockEligibility,
        isEligible: false,
      };
      mockEngineCall.mockResolvedValueOnce(updatedEligibility);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockEngineCall).toHaveBeenCalledTimes(2);
      expect(result.current.eligibility).toEqual(updatedEligibility);
    });
  });
});
