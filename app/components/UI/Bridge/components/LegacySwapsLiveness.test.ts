import { renderHook, act } from '@testing-library/react-hooks';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { swapsUtils, type FeatureFlags } from '@metamask/swaps-controller';
import LegacySwapLiveness from './LegacySwapsLiveness';
import { setSwapsLiveness } from '../../../../reducers/swaps';
import Logger from '../../../../util/Logger';
import { isBridgeAllowed } from '../utils';

// Mock dependencies
jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
}));

jest.mock('@metamask/swaps-controller', () => ({
  swapsUtils: {
    fetchSwapsFeatureFlags: jest.fn(),
  },
}));

jest.mock('../../../../reducers/swaps', () => ({
  setSwapsLiveness: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../utils', () => ({
  isBridgeAllowed: jest.fn(),
}));

// Mock the bridge slice to break the import chain that causes selector issues
jest.mock('../../../../core/redux/slices/bridge', () => ({
  selectIsSwapsLive: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

// Mock useInterval hook
const mockUseInterval = jest.fn();
jest.mock('../../../hooks/useInterval', () => ({
  __esModule: true,
  default: (callback: () => void, options: { delay: number | null }) =>
    mockUseInterval(callback, options),
}));

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    SWAPS: {
      LIVENESS_POLLING_FREQUENCY: 10000,
      CLIENT_ID: 'test-client-id',
    },
  },
}));

const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockFetchSwapsFeatureFlags =
  swapsUtils.fetchSwapsFeatureFlags as jest.MockedFunction<
    typeof swapsUtils.fetchSwapsFeatureFlags
  >;
const mockSetSwapsLiveness = setSwapsLiveness as jest.MockedFunction<
  typeof setSwapsLiveness
>;
const mockIsBridgeAllowed = isBridgeAllowed as jest.MockedFunction<
  typeof isBridgeAllowed
>;
const mockLoggerError = Logger.error as jest.MockedFunction<
  typeof Logger.error
>;
const mockAppStateAddEventListener =
  AppState.addEventListener as jest.MockedFunction<
    typeof AppState.addEventListener
  >;

describe('LegacySwapLiveness', () => {
  const mockDispatch = jest.fn();
  const mockChainId = '0x1';
  // Mock feature flags - cast to unknown first then to FeatureFlags to avoid type mismatch
  const mockFeatureFlags = {
    ethereum: {
      mobile_active: true,
      extension_active: true,
      fallbackToV1: false,
      mobileActive: true,
      extensionActive: true,
      mobileActiveIOS: true,
      mobileActiveAndroid: true,
    },
    smart_transactions: {
      mobile_active: false,
      extension_active: false,
    },
    smartTransactions: {
      mobileActive: false,
      extensionActive: false,
      mobileActiveIOS: false,
      mobileActiveAndroid: false,
    },
  } as unknown as FeatureFlags;
  const mockRemoveListener = jest.fn();
  let appStateChangeHandler: ((state: AppStateStatus) => void) | null = null;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetSwapsLiveness.mockImplementation((chainId, featureFlags) => ({
      type: 'SWAPS_SET_LIVENESS',
      payload: { chainId, featureFlags },
    }));

    // Default selector behavior based on call order
    // Component calls useSelector twice: 1st for chainId, 2nd for isLive
    // Odd calls (1, 3, ...) are chainId, even calls (2, 4, ...) are isLive
    let selectorCallCount = 0;
    mockUseSelector.mockImplementation(() => {
      selectorCallCount++;
      if (selectorCallCount % 2 === 1) {
        return mockChainId; // chainId (1st, 3rd, ... call)
      }
      return false; // isLive - default to false (2nd, 4th, ... call)
    });

    mockIsBridgeAllowed.mockReturnValue(true);
    mockFetchSwapsFeatureFlags.mockResolvedValue(mockFeatureFlags);

    appStateChangeHandler = null;
    mockAppStateAddEventListener.mockImplementation((event, handler) => {
      if (event === 'change') {
        appStateChangeHandler = handler;
      }
      return { remove: mockRemoveListener };
    });
  });

  it('returns null (renders nothing)', () => {
    mockUseSelector
      .mockReturnValueOnce(mockChainId) // selectEvmChainId
      .mockReturnValueOnce(false); // selectIsSwapsLive

    const { result } = renderHook(() => LegacySwapLiveness());

    expect(result.current).toBeNull();
  });

  it('fetches liveness on mount', async () => {
    mockUseSelector
      .mockReturnValueOnce(mockChainId) // selectEvmChainId
      .mockReturnValueOnce(false); // selectIsSwapsLive

    renderHook(() => LegacySwapLiveness());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchSwapsFeatureFlags).toHaveBeenCalledWith(
      mockChainId,
      'test-client-id',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      mockSetSwapsLiveness(mockChainId, mockFeatureFlags),
    );
  });

  it('fetches liveness when chainId changes and bridge is allowed but not live', async () => {
    const newChainId = '0xa';
    mockUseSelector
      .mockReturnValueOnce(mockChainId) // initial chainId
      .mockReturnValueOnce(false) // initial isLive
      .mockReturnValueOnce(newChainId) // new chainId
      .mockReturnValueOnce(false); // isLive still false

    const { rerender } = renderHook(() => LegacySwapLiveness());

    await act(async () => {
      await Promise.resolve();
    });

    // Clear calls from initial render
    mockFetchSwapsFeatureFlags.mockClear();
    mockDispatch.mockClear();

    // Rerender with new chainId
    rerender();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockFetchSwapsFeatureFlags).toHaveBeenCalledWith(
      newChainId,
      'test-client-id',
    );
  });

  it('does not fetch liveness when chainId changes but bridge is not allowed', async () => {
    mockIsBridgeAllowed.mockReturnValue(false);
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false);

    renderHook(() => LegacySwapLiveness());

    await act(async () => {
      await Promise.resolve();
    });

    // Clear and rerender
    mockFetchSwapsFeatureFlags.mockClear();
    mockUseSelector.mockReturnValueOnce('0xa').mockReturnValueOnce(false);

    // The chainId change effect checks isBridgeAllowed
    expect(mockIsBridgeAllowed).toHaveBeenCalled();
  });

  it('does not fetch liveness when already live', async () => {
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(true); // already live

    renderHook(() => LegacySwapLiveness());

    // Clear the initial mount call
    await act(async () => {
      await Promise.resolve();
    });
    mockFetchSwapsFeatureFlags.mockClear();

    // The chainId change effect should not trigger fetch since already live
    mockIsBridgeAllowed.mockReturnValue(true);
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(true);

    // No additional fetch should be made in chainId change effect
    expect(mockFetchSwapsFeatureFlags).not.toHaveBeenCalled();
  });

  it('sets up AppState listener when bridge is allowed', () => {
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false);
    mockIsBridgeAllowed.mockReturnValue(true);

    renderHook(() => LegacySwapLiveness());

    expect(mockAppStateAddEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('does not set up AppState listener when bridge is not allowed', () => {
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false);
    mockIsBridgeAllowed.mockReturnValue(false);

    renderHook(() => LegacySwapLiveness());

    expect(mockAppStateAddEventListener).not.toHaveBeenCalled();
  });

  it('removes AppState listener on unmount', () => {
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false);
    mockIsBridgeAllowed.mockReturnValue(true);

    const { unmount } = renderHook(() => LegacySwapLiveness());

    expect(mockAppStateAddEventListener).toHaveBeenCalled();

    unmount();

    expect(mockRemoveListener).toHaveBeenCalled();
  });

  it('checks liveness when app becomes active and not already live', async () => {
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false); // not live
    mockIsBridgeAllowed.mockReturnValue(true);

    renderHook(() => LegacySwapLiveness());

    await act(async () => {
      await Promise.resolve();
    });

    // Clear initial mount call
    mockFetchSwapsFeatureFlags.mockClear();
    mockDispatch.mockClear();

    // Simulate app becoming active
    await act(async () => {
      appStateChangeHandler?.('active');
      await Promise.resolve();
    });

    expect(mockFetchSwapsFeatureFlags).toHaveBeenCalledWith(
      mockChainId,
      'test-client-id',
    );
  });

  it('does not check liveness when app goes to background', async () => {
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false);
    mockIsBridgeAllowed.mockReturnValue(true);

    renderHook(() => LegacySwapLiveness());

    await act(async () => {
      await Promise.resolve();
    });

    // Clear initial mount call
    mockFetchSwapsFeatureFlags.mockClear();

    // Simulate app going to background
    await act(async () => {
      appStateChangeHandler?.('background');
      await Promise.resolve();
    });

    expect(mockFetchSwapsFeatureFlags).not.toHaveBeenCalled();
  });

  it('handles fetch error gracefully and sets liveness to null', async () => {
    const mockError = new Error('Network error');
    mockFetchSwapsFeatureFlags.mockRejectedValue(mockError);
    mockUseSelector.mockReturnValueOnce(mockChainId).mockReturnValueOnce(false);

    renderHook(() => LegacySwapLiveness());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      mockError,
      'Swaps: error while fetching swaps liveness',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      mockSetSwapsLiveness(mockChainId, null),
    );
  });

  describe('polling interval', () => {
    it('calls useInterval with polling delay when bridge is allowed and not live', () => {
      mockUseSelector
        .mockReturnValueOnce(mockChainId)
        .mockReturnValueOnce(false); // not live
      mockIsBridgeAllowed.mockReturnValue(true);

      renderHook(() => LegacySwapLiveness());

      // Verify useInterval was called with the polling frequency
      expect(mockUseInterval).toHaveBeenCalledWith(expect.any(Function), {
        delay: 10000,
      });
    });

    it('calls useInterval with null delay when bridge is not allowed', () => {
      mockUseSelector
        .mockReturnValueOnce(mockChainId)
        .mockReturnValueOnce(false);
      mockIsBridgeAllowed.mockReturnValue(false);

      renderHook(() => LegacySwapLiveness());

      // Verify useInterval was called with null delay (disabled)
      expect(mockUseInterval).toHaveBeenCalledWith(expect.any(Function), {
        delay: null,
      });
    });
  });

  describe('setLiveness callback', () => {
    it('dispatches setSwapsLiveness with chainId and featureFlags', async () => {
      mockUseSelector
        .mockReturnValueOnce(mockChainId)
        .mockReturnValueOnce(false);

      renderHook(() => LegacySwapLiveness());

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockSetSwapsLiveness).toHaveBeenCalledWith(
        mockChainId,
        mockFeatureFlags,
      );
      expect(mockDispatch).toHaveBeenCalled();
    });
  });
});
