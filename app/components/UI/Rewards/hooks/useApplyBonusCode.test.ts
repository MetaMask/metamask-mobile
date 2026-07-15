import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useApplyBonusCode } from './useApplyBonusCode';
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

describe('useApplyBonusCode', () => {
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
  const mockBonusCode = 'BNS123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockSubscriptionId);
    mockHandleRewardsErrorMessage.mockReturnValue('Mocked error message');
  });

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useApplyBonusCode());

      expect(result.current.isApplyingBonusCode).toBe(false);
      expect(result.current.applyBonusCodeError).toBeUndefined();
      expect(result.current.applyBonusCodeSuccess).toBe(false);
      expect(typeof result.current.applyBonusCode).toBe('function');
      expect(typeof result.current.clearApplyBonusCodeError).toBe('function');
    });
  });

  describe('applyBonusCode function', () => {
    it('successfully applies bonus code', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await result.current.applyBonusCode(mockBonusCode);
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyBonusCode',
        mockBonusCode,
        mockSubscriptionId,
      );
      expect(result.current.isApplyingBonusCode).toBe(false);
      expect(result.current.applyBonusCodeError).toBeUndefined();
      expect(result.current.applyBonusCodeSuccess).toBe(true);
    });

    it('converts bonus code to uppercase', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await result.current.applyBonusCode('bns123');
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyBonusCode',
        'BNS123',
        mockSubscriptionId,
      );
    });

    it('trims bonus code', async () => {
      mockEngineCall.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await result.current.applyBonusCode('  BNS123  ');
      });

      expect(mockEngineCall).toHaveBeenCalledWith(
        'RewardsController:applyBonusCode',
        'BNS123',
        mockSubscriptionId,
      );
    });

    it('sets loading state during apply process', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockEngineCall.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useApplyBonusCode());

      act(() => {
        result.current.applyBonusCode(mockBonusCode);
      });

      expect(result.current.isApplyingBonusCode).toBe(true);
      expect(result.current.applyBonusCodeError).toBeUndefined();
      expect(result.current.applyBonusCodeSuccess).toBe(false);

      await act(async () => {
        resolvePromise();
        await promise;
      });

      expect(result.current.isApplyingBonusCode).toBe(false);
      expect(result.current.applyBonusCodeSuccess).toBe(true);
    });

    it('handles missing subscription ID', async () => {
      mockUseSelector.mockReturnValue(null);
      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await result.current.applyBonusCode(mockBonusCode);
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyBonusCodeError).toBe(
        'No subscription found. Please try again.',
      );
      expect(result.current.isApplyingBonusCode).toBe(false);
      expect(result.current.applyBonusCodeSuccess).toBe(false);
    });

    it('handles empty bonus code', async () => {
      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await result.current.applyBonusCode('');
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyBonusCodeError).toBe(
        'Please enter a bonus code.',
      );
      expect(result.current.isApplyingBonusCode).toBe(false);
      expect(result.current.applyBonusCodeSuccess).toBe(false);
    });

    it('handles whitespace-only bonus code', async () => {
      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await result.current.applyBonusCode('   ');
      });

      expect(mockEngineCall).not.toHaveBeenCalled();
      expect(result.current.applyBonusCodeError).toBe(
        'Please enter a bonus code.',
      );
    });

    it('handles apply error', async () => {
      const mockError = new Error('Invalid bonus code');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue(
        'Invalid bonus code. Please check and try again.',
      );

      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        try {
          await result.current.applyBonusCode(mockBonusCode);
        } catch {
          // Expected to throw
        }
      });

      expect(mockHandleRewardsErrorMessage).toHaveBeenCalledWith(mockError);
      expect(result.current.applyBonusCodeError).toBe(
        'Invalid bonus code. Please check and try again.',
      );
      expect(result.current.isApplyingBonusCode).toBe(false);
      expect(result.current.applyBonusCodeSuccess).toBe(false);
    });

    it('re-throws error after handling', async () => {
      const mockError = new Error('Apply failed');
      mockEngineCall.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        await expect(
          result.current.applyBonusCode(mockBonusCode),
        ).rejects.toThrow('Apply failed');
      });
    });

    it('clears error before new apply attempt', async () => {
      const mockError = new Error('First error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('First error message');

      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        try {
          await result.current.applyBonusCode(mockBonusCode);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.applyBonusCodeError).toBe('First error message');

      mockEngineCall.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.applyBonusCode(mockBonusCode);
      });

      expect(result.current.applyBonusCodeError).toBeUndefined();
      expect(result.current.applyBonusCodeSuccess).toBe(true);
    });
  });

  describe('clearApplyBonusCodeError function', () => {
    it('clears error state', async () => {
      const mockError = new Error('Test error');
      mockEngineCall.mockRejectedValueOnce(mockError);
      mockHandleRewardsErrorMessage.mockReturnValue('Test error message');

      const { result } = renderHook(() => useApplyBonusCode());

      await act(async () => {
        try {
          await result.current.applyBonusCode(mockBonusCode);
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.applyBonusCodeError).toBe('Test error message');

      act(() => {
        result.current.clearApplyBonusCodeError();
      });

      expect(result.current.applyBonusCodeError).toBeUndefined();
    });
  });
});
