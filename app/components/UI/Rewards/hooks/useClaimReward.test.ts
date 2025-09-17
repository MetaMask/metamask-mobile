import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useClaimReward } from './useClaimReward';
import Engine from '../../../../core/Engine';
import { handleRewardsErrorMessage } from '../utils';

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

jest.mock('../utils', () => ({
  handleRewardsErrorMessage: jest.fn(),
}));

describe('useClaimReward', () => {
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockEngineCall = Engine.controllerMessenger.call as jest.MockedFunction<
    typeof Engine.controllerMessenger.call
  >;
  const mockHandleRewardsErrorMessage =
    handleRewardsErrorMessage as jest.MockedFunction<
      typeof handleRewardsErrorMessage
    >;

  const mockSubscriptionId = 'test-subscription-id';
  const mockRewardId = 'test-reward-id';
  const mockDto = { data: { telegramHandle: '@testuser' } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockHandleRewardsErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useClaimReward());

      expect(result.current.isClaimingReward).toBe(false);
      expect(result.current.claimRewardError).toBeUndefined();
      expect(typeof result.current.claimReward).toBe('function');
      expect(typeof result.current.clearClaimRewardError).toBe('function');
    });
  });

  describe('claimReward function', () => {
    it('should successfully claim reward with default DTO', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await result.current.claimReward(mockRewardId);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:claimReward',
        mockRewardId,
        mockSubscriptionId,
        {},
      );
      expect(result.current.isClaimingReward).toBe(false);
      expect(result.current.claimRewardError).toBeUndefined();
    });

    it('should successfully claim reward with custom DTO', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await result.current.claimReward(mockRewardId, mockDto);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:claimReward',
        mockRewardId,
        mockSubscriptionId,
        mockDto,
      );
      expect(result.current.isClaimingReward).toBe(false);
      expect(result.current.claimRewardError).toBeUndefined();
    });

    it('should set loading state during claim process', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useClaimReward());

      // Start the claim process
      act(() => {
        result.current.claimReward(mockRewardId);
      });

      // Check loading state is true
      expect(result.current.isClaimingReward).toBe(true);
      expect(result.current.claimRewardError).toBeUndefined();

      // Resolve the promise
      await act(async () => {
        resolvePromise();
        await promise;
      });

      // Check loading state is false after completion
      expect(result.current.isClaimingReward).toBe(false);
    });

    it('should handle missing subscription ID', async () => {
      mockUseSelector.mockReturnValue(null);
      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await result.current.claimReward(mockRewardId);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.claimRewardError).toBe(
        'No subscription found. Please try again.',
      );
      expect(result.current.isClaimingReward).toBe(false);
    });

    it('should handle claim reward error', async () => {
      const mockError = new Error('Claim failed');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Failed to claim reward');

      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        try {
          await result.current.claimReward(mockRewardId);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.claimRewardError).toBe('Failed to claim reward');
      expect(result.current.isClaimingReward).toBe(false);
    });

    it('should clear error before new claim attempt', async () => {
      // First, set an error
      const mockError = new Error('First error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('First error message');

      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        try {
          await result.current.claimReward(mockRewardId);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.claimRewardError).toBe('First error message');

      // Now make a successful claim
      mockEngineCall.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.claimReward(mockRewardId);
      });

      expect(result.current.claimRewardError).toBeUndefined();
    });

    it('should re-throw error after handling', async () => {
      const mockError = new Error('Claim failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await expect(result.current.claimReward(mockRewardId)).rejects.toThrow(
          'Claim failed',
        );
      });
    });
  });

  describe('clearClaimRewardError function', () => {
    it('should clear error state', async () => {
      // First, set an error
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Test error message');

      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        try {
          await result.current.claimReward(mockRewardId);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.claimRewardError).toBe('Test error message');

      // Clear the error
      act(() => {
        result.current.clearClaimRewardError();
      });

      expect(result.current.claimRewardError).toBeUndefined();
    });

    it('should not affect other state when clearing error', async () => {
      const { result } = renderHook(() => useClaimReward());

      act(() => {
        result.current.clearClaimRewardError();
      });

      expect(result.current.claimRewardError).toBeUndefined();
      expect(result.current.isClaimingReward).toBe(false);
      expect(typeof result.current.claimReward).toBe('function');
    });
  });

  describe('subscription ID changes', () => {
    it('should handle subscription ID changes between renders', async () => {
      const { result, rerender } = renderHook(() => useClaimReward());

      // First render with subscription ID
      mockEngineCall.mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.claimReward(mockRewardId);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:claimReward',
        mockRewardId,
        mockSubscriptionId,
        {},
      );

      // Change subscription ID
      const newSubscriptionId = 'new-subscription-id';
      mockUseSelector.mockReturnValue(newSubscriptionId);
      mockEngineCall.mockResolvedValueOnce(undefined);

      rerender();

      await act(async () => {
        await result.current.claimReward(mockRewardId);
      });

      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsController:claimReward',
        mockRewardId,
        newSubscriptionId,
        {},
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty reward ID', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await result.current.claimReward('');
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:claimReward',
        '',
        mockSubscriptionId,
        {},
      );
    });

    it('should handle undefined DTO', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await result.current.claimReward(mockRewardId, undefined);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:claimReward',
        mockRewardId,
        mockSubscriptionId,
        {},
      );
    });

    it('should handle empty subscription ID string', async () => {
      mockUseSelector.mockReturnValue('');
      const { result } = renderHook(() => useClaimReward());

      await act(async () => {
        await result.current.claimReward(mockRewardId);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.claimRewardError).toBe(
        'No subscription found. Please try again.',
      );
    });
  });

  describe('concurrent claims', () => {
    it('should handle multiple concurrent claim attempts', async () => {
      let resolveFirst: () => void;
      let resolveSecond: () => void;

      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<void>((resolve) => {
        resolveSecond = resolve;
      });

      mockEngineCall
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useClaimReward());

      // Start first claim
      act(() => {
        result.current.claimReward('reward-1');
      });

      expect(result.current.isClaimingReward).toBe(true);

      // Start second claim while first is still pending
      act(() => {
        result.current.claimReward('reward-2');
      });

      expect(result.current.isClaimingReward).toBe(true);

      // Resolve both promises
      await act(async () => {
        resolveFirst();
        resolveSecond();
        await Promise.all([firstPromise, secondPromise]);
      });

      expect(result.current.isClaimingReward).toBe(false);
      expect(mockEngineCall).toHaveBeenCalledTimes(2);
    });
  });
});
