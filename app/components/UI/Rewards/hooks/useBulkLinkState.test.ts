import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import { useBulkLinkState } from './useBulkLinkState';
import {
  selectBulkLinkIsRunning,
  selectBulkLinkTotalAccounts,
  selectBulkLinkLinkedAccounts,
  selectBulkLinkFailedAccounts,
  selectBulkLinkAccountProgress,
} from '../../../../reducers/rewards/selectors';
import { bulkLinkReset } from '../../../../reducers/rewards';
import {
  startBulkLink,
  cancelBulkLink,
} from '../../../../store/sagas/rewardsBulkLinkAccountGroups';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectBulkLinkIsRunning: jest.fn(),
  selectBulkLinkTotalAccounts: jest.fn(),
  selectBulkLinkLinkedAccounts: jest.fn(),
  selectBulkLinkFailedAccounts: jest.fn(),
  selectBulkLinkAccountProgress: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  bulkLinkReset: jest.fn(),
}));

jest.mock('../../../../store/sagas/rewardsBulkLinkAccountGroups', () => ({
  startBulkLink: jest.fn(),
  cancelBulkLink: jest.fn(),
}));

describe('useBulkLinkState', () => {
  const mockDispatch = jest.fn();
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockUseDispatch = useDispatch as jest.MockedFunction<
    typeof useDispatch
  >;

  const mockSelectBulkLinkIsRunning =
    selectBulkLinkIsRunning as jest.MockedFunction<
      typeof selectBulkLinkIsRunning
    >;
  const mockSelectBulkLinkTotalAccounts =
    selectBulkLinkTotalAccounts as jest.MockedFunction<
      typeof selectBulkLinkTotalAccounts
    >;
  const mockSelectBulkLinkLinkedAccounts =
    selectBulkLinkLinkedAccounts as jest.MockedFunction<
      typeof selectBulkLinkLinkedAccounts
    >;
  const mockSelectBulkLinkFailedAccounts =
    selectBulkLinkFailedAccounts as jest.MockedFunction<
      typeof selectBulkLinkFailedAccounts
    >;
  const mockSelectBulkLinkAccountProgress =
    selectBulkLinkAccountProgress as jest.MockedFunction<
      typeof selectBulkLinkAccountProgress
    >;

  const mockBulkLinkReset = bulkLinkReset as jest.MockedFunction<
    typeof bulkLinkReset
  >;
  const mockStartBulkLink = startBulkLink as jest.MockedFunction<
    typeof startBulkLink
  >;
  const mockCancelBulkLink = cancelBulkLink as jest.MockedFunction<
    typeof cancelBulkLink
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);

    // Default selector values
    mockSelectBulkLinkIsRunning.mockReturnValue(false);
    mockSelectBulkLinkTotalAccounts.mockReturnValue(0);
    mockSelectBulkLinkLinkedAccounts.mockReturnValue(0);
    mockSelectBulkLinkFailedAccounts.mockReturnValue(0);
    mockSelectBulkLinkAccountProgress.mockReturnValue(0);

    // Mock useSelector to return values from selectors
    mockUseSelector.mockImplementation((selector) => {
      if (selector === mockSelectBulkLinkIsRunning) {
        return mockSelectBulkLinkIsRunning({} as never);
      }
      if (selector === mockSelectBulkLinkTotalAccounts) {
        return mockSelectBulkLinkTotalAccounts({} as never);
      }
      if (selector === mockSelectBulkLinkLinkedAccounts) {
        return mockSelectBulkLinkLinkedAccounts({} as never);
      }
      if (selector === mockSelectBulkLinkFailedAccounts) {
        return mockSelectBulkLinkFailedAccounts({} as never);
      }
      if (selector === mockSelectBulkLinkAccountProgress) {
        return mockSelectBulkLinkAccountProgress({} as never);
      }
      return undefined;
    });

    // Setup action creators
    mockBulkLinkReset.mockReturnValue({
      type: 'rewards/bulkLinkReset',
    } as never);
    mockStartBulkLink.mockReturnValue({
      type: 'rewards/startBulkLink',
    } as never);
    mockCancelBulkLink.mockReturnValue({
      type: 'rewards/cancelBulkLink',
    } as never);
  });

  describe('Initial State', () => {
    it('should return correct initial state when no bulk link is running', () => {
      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current).toEqual({
        startBulkLink: expect.any(Function),
        cancelBulkLink: expect.any(Function),
        resetBulkLink: expect.any(Function),
        isRunning: false,
        isCompleted: false,
        hasFailures: false,
        isFullySuccessful: false,
        totalAccounts: 0,
        linkedAccounts: 0,
        failedAccounts: 0,
        accountProgress: 0,
        processedAccounts: 0,
      });
    });

    it('should call all selectors on mount', () => {
      renderHook(() => useBulkLinkState());

      expect(mockUseSelector).toHaveBeenCalledWith(mockSelectBulkLinkIsRunning);
      expect(mockUseSelector).toHaveBeenCalledWith(
        mockSelectBulkLinkTotalAccounts,
      );
      expect(mockUseSelector).toHaveBeenCalledWith(
        mockSelectBulkLinkLinkedAccounts,
      );
      expect(mockUseSelector).toHaveBeenCalledWith(
        mockSelectBulkLinkFailedAccounts,
      );
      expect(mockUseSelector).toHaveBeenCalledWith(
        mockSelectBulkLinkAccountProgress,
      );
    });
  });

  describe('Computed Values', () => {
    it('should calculate processedAccounts correctly', () => {
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(5);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(2);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 5;
        if (selector === mockSelectBulkLinkFailedAccounts) return 2;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.7;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.processedAccounts).toBe(7); // 5 + 2
    });

    it('should calculate isCompleted correctly when all accounts are processed', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(10);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(8);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(2);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 8;
        if (selector === mockSelectBulkLinkFailedAccounts) return 2;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.processedAccounts).toBe(10); // 8 + 2
    });

    it('should not be completed when bulk link is still running', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(true);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(10);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(10);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(0);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return true;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 10;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isCompleted).toBe(false);
      expect(result.current.isRunning).toBe(true);
    });

    it('should not be completed when no accounts have been processed', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(10);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(0);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(0);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 0;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isCompleted).toBe(false);
      expect(result.current.processedAccounts).toBe(0);
    });

    it('should calculate hasFailures correctly', () => {
      mockSelectBulkLinkFailedAccounts.mockReturnValue(3);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 5;
        if (selector === mockSelectBulkLinkFailedAccounts) return 3;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.8;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.hasFailures).toBe(true);
    });

    it('should not have failures when failedAccounts is 0', () => {
      mockSelectBulkLinkFailedAccounts.mockReturnValue(0);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 10;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.hasFailures).toBe(false);
    });

    it('should calculate isFullySuccessful correctly', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(10);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(10);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(0);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 10;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isFullySuccessful).toBe(true);
      expect(result.current.isCompleted).toBe(true);
      expect(result.current.hasFailures).toBe(false);
    });

    it('should not be fully successful when there are failures', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(10);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(8);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(2);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 8;
        if (selector === mockSelectBulkLinkFailedAccounts) return 2;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isFullySuccessful).toBe(false);
      expect(result.current.isCompleted).toBe(true);
      expect(result.current.hasFailures).toBe(true);
    });

    it('should not be fully successful when still running', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(true);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(10);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(10);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(0);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return true;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 10;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isFullySuccessful).toBe(false);
      expect(result.current.isRunning).toBe(true);
    });
  });

  describe('Action Dispatchers', () => {
    it('should dispatch startBulkLink when startBulkLink is called', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 0;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 0;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      act(() => {
        result.current.startBulkLink();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockStartBulkLink());
    });

    it('should not dispatch startBulkLink when already running', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(true);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return true;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 5;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.5;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      // Clear previous calls
      mockDispatch.mockClear();

      act(() => {
        result.current.startBulkLink();
      });

      // Should not dispatch when already running
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('should dispatch cancelBulkLink when cancelBulkLink is called', () => {
      const { result } = renderHook(() => useBulkLinkState());

      act(() => {
        result.current.cancelBulkLink();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockCancelBulkLink());
    });

    it('should dispatch bulkLinkReset when resetBulkLink is called', () => {
      const { result } = renderHook(() => useBulkLinkState());

      act(() => {
        result.current.resetBulkLink();
      });

      expect(mockDispatch).toHaveBeenCalledWith(mockBulkLinkReset());
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total accounts', () => {
      mockSelectBulkLinkTotalAccounts.mockReturnValue(0);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 0;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 0;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.totalAccounts).toBe(0);
      expect(result.current.isCompleted).toBe(false);
      expect(result.current.isFullySuccessful).toBe(false);
    });

    it('should handle progress calculation correctly', () => {
      mockSelectBulkLinkAccountProgress.mockReturnValue(0.75);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return true;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 7;
        if (selector === mockSelectBulkLinkFailedAccounts) return 1;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.75;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.accountProgress).toBe(0.75);
      expect(result.current.processedAccounts).toBe(8); // 7 + 1
    });

    it('should handle partial completion correctly', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(true);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(20);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(12);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(3);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return true;
        if (selector === mockSelectBulkLinkTotalAccounts) return 20;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 12;
        if (selector === mockSelectBulkLinkFailedAccounts) return 3;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.75;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isRunning).toBe(true);
      expect(result.current.isCompleted).toBe(false);
      expect(result.current.processedAccounts).toBe(15); // 12 + 3
      expect(result.current.hasFailures).toBe(true);
      expect(result.current.accountProgress).toBe(0.75);
    });

    it('should handle all accounts failed scenario', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);
      mockSelectBulkLinkTotalAccounts.mockReturnValue(5);
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(0);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(5);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 5;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 0;
        if (selector === mockSelectBulkLinkFailedAccounts) return 5;
        if (selector === mockSelectBulkLinkAccountProgress) return 1.0;
        return undefined;
      });

      const { result } = renderHook(() => useBulkLinkState());

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.hasFailures).toBe(true);
      expect(result.current.isFullySuccessful).toBe(false);
      expect(result.current.processedAccounts).toBe(5);
    });
  });

  describe('Memoization', () => {
    it('should memoize processedAccounts correctly', () => {
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(5);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(2);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 5;
        if (selector === mockSelectBulkLinkFailedAccounts) return 2;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.7;
        return undefined;
      });

      const { result, rerender } = renderHook(() => useBulkLinkState());

      const firstProcessedAccounts = result.current.processedAccounts;

      // Rerender with same values
      rerender();

      expect(result.current.processedAccounts).toBe(firstProcessedAccounts);
    });

    it('should update processedAccounts when linkedAccounts changes', () => {
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(5);
      mockSelectBulkLinkFailedAccounts.mockReturnValue(2);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 5;
        if (selector === mockSelectBulkLinkFailedAccounts) return 2;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.7;
        return undefined;
      });

      const { result, rerender } = renderHook(() => useBulkLinkState());

      expect(result.current.processedAccounts).toBe(7);

      // Update linked accounts
      mockSelectBulkLinkLinkedAccounts.mockReturnValue(6);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 10;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 6;
        if (selector === mockSelectBulkLinkFailedAccounts) return 2;
        if (selector === mockSelectBulkLinkAccountProgress) return 0.8;
        return undefined;
      });

      rerender();

      expect(result.current.processedAccounts).toBe(8); // 6 + 2
    });
  });

  describe('Callback Stability', () => {
    it('should maintain stable callbacks when dependencies do not change', () => {
      const { result, rerender } = renderHook(() => useBulkLinkState());

      const initialStartBulkLink = result.current.startBulkLink;
      const initialCancelBulkLink = result.current.cancelBulkLink;
      const initialResetBulkLink = result.current.resetBulkLink;

      rerender();

      expect(result.current.startBulkLink).toBe(initialStartBulkLink);
      expect(result.current.cancelBulkLink).toBe(initialCancelBulkLink);
      expect(result.current.resetBulkLink).toBe(initialResetBulkLink);
    });

    it('should recreate startBulkLink callback when isRunning changes', () => {
      mockSelectBulkLinkIsRunning.mockReturnValue(false);

      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return false;
        if (selector === mockSelectBulkLinkTotalAccounts) return 0;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 0;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 0;
        return undefined;
      });

      const { result, rerender } = renderHook(() => useBulkLinkState());

      const initialStartBulkLink = result.current.startBulkLink;

      // Change isRunning
      mockSelectBulkLinkIsRunning.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector) => {
        if (selector === mockSelectBulkLinkIsRunning) return true;
        if (selector === mockSelectBulkLinkTotalAccounts) return 0;
        if (selector === mockSelectBulkLinkLinkedAccounts) return 0;
        if (selector === mockSelectBulkLinkFailedAccounts) return 0;
        if (selector === mockSelectBulkLinkAccountProgress) return 0;
        return undefined;
      });

      rerender();

      // startBulkLink should be recreated because isRunning is a dependency
      expect(result.current.startBulkLink).not.toBe(initialStartBulkLink);
    });
  });
});
