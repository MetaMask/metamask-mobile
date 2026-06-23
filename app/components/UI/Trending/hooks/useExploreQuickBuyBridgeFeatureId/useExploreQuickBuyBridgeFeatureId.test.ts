import { renderHook } from '@testing-library/react-native';
import { FeatureId } from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import { useExploreQuickBuyBridgeFeatureId } from './useExploreQuickBuyBridgeFeatureId';

const mockFetchQuotes = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        fetchQuotes: (...args: unknown[]) => mockFetchQuotes(...args),
      },
    },
  },
}));

describe('useExploreQuickBuyBridgeFeatureId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchQuotes.mockResolvedValue([]);
  });

  it('maps UNKNOWN feature ids to QUICK_BUY_EXPLORE while active', () => {
    const { unmount } = renderHook(() =>
      useExploreQuickBuyBridgeFeatureId(true),
    );

    const params = { walletAddress: '0xabc' } as Parameters<
      typeof Engine.context.BridgeController.fetchQuotes
    >[0];
    const signal = new AbortController().signal;

    Engine.context.BridgeController.fetchQuotes(
      params,
      FeatureId.UNKNOWN,
      signal,
    );

    expect(mockFetchQuotes).toHaveBeenCalledWith(
      params,
      FeatureId.QUICK_BUY_EXPLORE,
      signal,
    );

    unmount();
  });

  it('preserves non-UNKNOWN feature ids while active', () => {
    renderHook(() => useExploreQuickBuyBridgeFeatureId(true));

    const params = { walletAddress: '0xabc' } as Parameters<
      typeof Engine.context.BridgeController.fetchQuotes
    >[0];
    const signal = new AbortController().signal;

    Engine.context.BridgeController.fetchQuotes(
      params,
      FeatureId.QUICK_BUY_TOKEN_DETAILS,
      signal,
    );

    expect(mockFetchQuotes).toHaveBeenCalledWith(
      params,
      FeatureId.QUICK_BUY_TOKEN_DETAILS,
      signal,
    );
  });

  it('stops remapping feature ids when inactive or unmounted', () => {
    const { rerender, unmount } = renderHook(
      ({ isActive }) => useExploreQuickBuyBridgeFeatureId(isActive),
      { initialProps: { isActive: true } },
    );

    const params = { walletAddress: '0xabc' } as Parameters<
      typeof Engine.context.BridgeController.fetchQuotes
    >[0];
    const signal = new AbortController().signal;

    Engine.context.BridgeController.fetchQuotes(
      params,
      FeatureId.UNKNOWN,
      signal,
    );

    expect(mockFetchQuotes).toHaveBeenLastCalledWith(
      params,
      FeatureId.QUICK_BUY_EXPLORE,
      signal,
    );

    rerender({ isActive: false });

    Engine.context.BridgeController.fetchQuotes(
      params,
      FeatureId.UNKNOWN,
      signal,
    );

    expect(mockFetchQuotes).toHaveBeenLastCalledWith(
      params,
      FeatureId.UNKNOWN,
      signal,
    );

    renderHook(() => useExploreQuickBuyBridgeFeatureId(true)).unmount();

    Engine.context.BridgeController.fetchQuotes(
      params,
      FeatureId.UNKNOWN,
      signal,
    );

    expect(mockFetchQuotes).toHaveBeenLastCalledWith(
      params,
      FeatureId.UNKNOWN,
      signal,
    );
  });
});
