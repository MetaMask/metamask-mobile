import { act, renderHook } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { WatchlistAnalytics } from '../../constants/watchlistAnalytics';
import { useWatchlistEditDraft } from './useWatchlistEditDraft';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'mock' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const createToken = (assetId: string, name: string): TrendingAsset =>
  ({
    assetId,
    name,
    symbol: name.toUpperCase(),
    decimals: 18,
    price: '100',
    marketCap: 0,
    aggregatedUsdVolume: 0,
  }) as TrendingAsset;

describe('useWatchlistEditDraft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires WATCHLIST_TOKEN_REMOVED for each removed token on successful Done commit', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onSuccess?.();
    });

    const { result } = renderHook(() =>
      useWatchlistEditDraft({
        queryTokens,
        updateListMutation: { mutate: mockMutate },
      }),
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });
    act(() => {
      result.current.handleDonePress();
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      source: WatchlistAnalytics.REMOVE_SOURCE.FULLSCREEN_EDIT,
      asset_type: 'erc20',
    });
  });

  it('fires removal events for all removed tokens on unwatch-all auto-commit', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onSuccess?.();
    });

    const { result } = renderHook(() =>
      useWatchlistEditDraft({
        queryTokens,
        updateListMutation: { mutate: mockMutate },
      }),
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });
    act(() => {
      result.current.onRemoveFromDraft(String(eth.assetId));
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.WATCHLIST_TOKEN_REMOVED,
    );
  });

  it('does not fire removal events when only reordering', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onSuccess?.();
    });

    const { result } = renderHook(() =>
      useWatchlistEditDraft({
        queryTokens,
        updateListMutation: { mutate: mockMutate },
      }),
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.handleReorder({ from: 0, to: 1 });
    });
    act(() => {
      result.current.handleDonePress();
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not fire removal events when mutation fails', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onError?.();
    });

    const { result } = renderHook(() =>
      useWatchlistEditDraft({
        queryTokens,
        updateListMutation: { mutate: mockMutate },
      }),
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });
    act(() => {
      result.current.handleDonePress();
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('exits edit mode without mutate when query becomes stale with no draft changes', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn();

    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useWatchlistEditDraft({
          queryTokens: tokens,
          updateListMutation: { mutate: mockMutate },
        }),
      { initialProps: { tokens: queryTokens } },
    );

    act(() => {
      result.current.handleEditPress();
    });

    rerender({ tokens: [] });

    expect(mockMutate).not.toHaveBeenCalled();
    expect(result.current.isEditMode).toBe(false);
  });

  it('persists remaining draft items when query becomes stale during edit', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onSuccess?.();
    });

    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useWatchlistEditDraft({
          queryTokens: tokens,
          updateListMutation: { mutate: mockMutate },
        }),
      { initialProps: { tokens: queryTokens } },
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });

    rerender({ tokens: [] });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      ['eip155:8453/slip44:60'],
      expect.any(Object),
    );
    expect(mockMutate).not.toHaveBeenCalledWith([], expect.any(Object));
  });

  it('commits draft order when Done is pressed with stale empty query', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onSuccess?.();
    });

    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useWatchlistEditDraft({
          queryTokens: tokens,
          updateListMutation: { mutate: mockMutate },
        }),
      { initialProps: { tokens: queryTokens } },
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });

    rerender({ tokens: [] });

    act(() => {
      result.current.handleDonePress();
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      ['eip155:8453/slip44:60'],
      expect.any(Object),
    );
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('still mutates empty list on intentional unwatch-all with stale query', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn((_assetIds, options) => {
      options?.onSuccess?.();
    });

    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useWatchlistEditDraft({
          queryTokens: tokens,
          updateListMutation: { mutate: mockMutate },
        }),
      { initialProps: { tokens: queryTokens } },
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });
    act(() => {
      result.current.onRemoveFromDraft(String(eth.assetId));
    });

    rerender({ tokens: [] });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith([], expect.any(Object));
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('does not wipe watchlist when query no longer contains draft items', () => {
    const eth = createToken('eip155:8453/slip44:60', 'Ethereum');
    const btc = createToken('eip155:1/erc20:0xbtc', 'Bitcoin');
    const queryTokens = [btc, eth];

    const mockMutate = jest.fn();

    const { result, rerender } = renderHook(
      ({ tokens }) =>
        useWatchlistEditDraft({
          queryTokens: tokens,
          updateListMutation: { mutate: mockMutate },
        }),
      { initialProps: { tokens: queryTokens } },
    );

    act(() => {
      result.current.handleEditPress();
    });
    act(() => {
      result.current.onRemoveFromDraft(String(btc.assetId));
    });

    const unrelated = createToken('eip155:1/erc20:0xother', 'Other');
    rerender({ tokens: [unrelated] });

    act(() => {
      result.current.handleDonePress();
    });

    expect(mockMutate).not.toHaveBeenCalled();
    expect(result.current.isEditMode).toBe(true);
  });
});
