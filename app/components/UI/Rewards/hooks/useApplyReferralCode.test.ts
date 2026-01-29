import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useApplyReferralCode } from './useApplyReferralCode';
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

describe('useApplyReferralCode', () => {
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
  const mockReferralCode = 'ABC123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockHandleRewardsErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => useApplyReferralCode());

      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeError).toBeUndefined();
      expect(result.current.applyReferralCodeSuccess).toBe(false);
      expect(typeof result.current.applyReferralCode).toBe('function');
      expect(typeof result.current.clearApplyReferralCodeError).toBe(
        'function',
      );
    });
  });

  describe('applyReferralCode function', () => {
    it('should successfully apply referral code', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyReferralCode',
        mockReferralCode,
        mockSubscriptionId,
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeError).toBeUndefined();
      expect(result.current.applyReferralCodeSuccess).toBe(true);
    });

    it('should convert referral code to uppercase', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode('abc123');
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyReferralCode',
        'ABC123',
        mockSubscriptionId,
      );
    });

    it('should trim referral code', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode('  ABC123  ');
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyReferralCode',
        'ABC123',
        mockSubscriptionId,
      );
    });

    it('should set loading state during apply process', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useApplyReferralCode());

      // Start the apply process
      act(() => {
        result.current.applyReferralCode(mockReferralCode);
      });

      // Check loading state is true and success is false during loading
      expect(result.current.isApplyingReferralCode).toBe(true);
      expect(result.current.applyReferralCodeError).toBeUndefined();
      expect(result.current.applyReferralCodeSuccess).toBe(false);

      // Resolve the promise
      await act(async () => {
        resolvePromise();
        await promise;
      });

      // Check loading state is false and success is true after completion
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(true);
    });

    it('should handle missing subscription ID', async () => {
      mockUseSelector.mockReturnValue(null);
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyReferralCodeError).toBe(
        'No subscription found. Please try again.',
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });

    it('should handle empty referral code', async () => {
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode('');
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyReferralCodeError).toBe(
        'Please enter a referral code.',
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });

    it('should handle whitespace-only referral code', async () => {
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode('   ');
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyReferralCodeError).toBe(
        'Please enter a referral code.',
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });

    it('should handle invalid referral code error', async () => {
      const mockError = new Error('Invalid referral code');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue(
        'Invalid referral code. Please check and try again.',
      );

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        try {
          await result.current.applyReferralCode(mockReferralCode);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.applyReferralCodeError).toBe(
        'Invalid referral code. Please check and try again.',
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });

    it('should handle already referred error', async () => {
      const mockError = new Error('Already referred by another user');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue(
        'You have already been referred by another user.',
      );

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        try {
          await result.current.applyReferralCode(mockReferralCode);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.applyReferralCodeError).toBe(
        'You have already been referred by another user.',
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });

    it('should handle own referral code error', async () => {
      const mockError = new Error('Cannot use your own referral code');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue(
        'You cannot use your own referral code.',
      );

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        try {
          await result.current.applyReferralCode(mockReferralCode);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.applyReferralCodeError).toBe(
        'You cannot use your own referral code.',
      );
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });

    it('should clear error before new apply attempt', async () => {
      // First, set an error
      const mockError = new Error('First error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('First error message');

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        try {
          await result.current.applyReferralCode(mockReferralCode);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.applyReferralCodeError).toBe('First error message');
      expect(result.current.applyReferralCodeSuccess).toBe(false);

      // Now make a successful apply
      mockEngineCall.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(result.current.applyReferralCodeError).toBeUndefined();
      expect(result.current.applyReferralCodeSuccess).toBe(true);
    });

    it('should reset success state before new apply attempt', async () => {
      // First, make a successful apply
      mockEngineCall.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(result.current.applyReferralCodeSuccess).toBe(true);

      // Now make another apply that fails
      const mockError = new Error('Second attempt error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Second error message');

      await act(async () => {
        try {
          await result.current.applyReferralCode(mockReferralCode);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.applyReferralCodeSuccess).toBe(false);
      expect(result.current.applyReferralCodeError).toBe(
        'Second error message',
      );
    });

    it('should re-throw error after handling', async () => {
      const mockError = new Error('Apply failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await expect(
          result.current.applyReferralCode(mockReferralCode),
        ).rejects.toThrow('Apply failed');
      });
    });
  });

  describe('clearApplyReferralCodeError function', () => {
    it('should clear error state', async () => {
      // First, set an error
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Test error message');

      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        try {
          await result.current.applyReferralCode(mockReferralCode);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.applyReferralCodeError).toBe('Test error message');

      // Clear the error
      act(() => {
        result.current.clearApplyReferralCodeError();
      });

      expect(result.current.applyReferralCodeError).toBeUndefined();
    });

    it('should not affect other state when clearing error', async () => {
      const { result } = renderHook(() => useApplyReferralCode());

      act(() => {
        result.current.clearApplyReferralCodeError();
      });

      expect(result.current.applyReferralCodeError).toBeUndefined();
      expect(result.current.isApplyingReferralCode).toBe(false);
      expect(result.current.applyReferralCodeSuccess).toBe(false);
      expect(typeof result.current.applyReferralCode).toBe('function');
    });
  });

  describe('subscription ID changes', () => {
    it('should handle subscription ID changes between renders', async () => {
      const { result, rerender } = renderHook(() => useApplyReferralCode());

      // First render with subscription ID
      mockEngineCall.mockResolvedValueOnce(undefined);
      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyReferralCode',
        mockReferralCode,
        mockSubscriptionId,
      );

      // Change subscription ID
      const newSubscriptionId = 'new-subscription-id';
      mockUseSelector.mockReturnValue(newSubscriptionId);
      mockEngineCall.mockResolvedValueOnce(undefined);

      rerender();

      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(mockEngineCall).toHaveBeenLastCalledWith(
        'RewardsController:applyReferralCode',
        mockReferralCode,
        newSubscriptionId,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty subscription ID string', async () => {
      mockUseSelector.mockReturnValue('');
      const { result } = renderHook(() => useApplyReferralCode());

      await act(async () => {
        await result.current.applyReferralCode(mockReferralCode);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyReferralCodeError).toBe(
        'No subscription found. Please try again.',
      );
      expect(result.current.applyReferralCodeSuccess).toBe(false);
    });
  });
});
