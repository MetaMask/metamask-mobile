import { renderHook } from '@testing-library/react-native';
import type { OrderBookData } from '@metamask/perps-controller';
import { usePerpsEstimatedSlippage } from './usePerpsEstimatedSlippage';
import { usePerpsLiveOrderBook } from './stream/usePerpsLiveOrderBook';

jest.mock('./stream/usePerpsLiveOrderBook');

const book: OrderBookData = {
  midPrice: '100',
  asks: [
    {
      price: '101',
      size: '1',
      total: '1',
      notional: '101',
      totalNotional: '101',
    },
  ],
  bids: [
    { price: '99', size: '1', total: '1', notional: '99', totalNotional: '99' },
  ],
  spread: '2',
  spreadPercentage: '2',
  lastUpdated: 1,
  maxTotal: '1',
};
const options = {
  symbol: 'ETH',
  sizeUsd: 100,
  isBuy: true,
  maxSlippageBps: 300,
};
const mockBook = (
  overrides: Partial<ReturnType<typeof usePerpsLiveOrderBook>> = {},
) => {
  jest.mocked(usePerpsLiveOrderBook).mockReturnValue({
    orderBook: book,
    dataSymbol: 'ETH',
    isLoading: false,
    error: null,
    connectionStatus: 'connected',
    reconnect: jest.fn(),
    ...overrides,
  });
};

beforeEach(() => {
  jest.resetAllMocks();
  mockBook();
});

describe('usePerpsEstimatedSlippage', () => {
  it('returns VWAP and fill eligibility for a ready book', () => {
    const { result } = renderHook(() => usePerpsEstimatedSlippage(options));

    expect(result.current).toEqual({
      estimatedSlippageBps: 100,
      worstSlippageBps: 100,
      isReady: true,
      canFillWithinSlippage: true,
    });
  });

  it('distinguishes insufficient depth from a pending subscription', () => {
    const { result, rerender } = renderHook(() =>
      usePerpsEstimatedSlippage({ ...options, sizeUsd: 1000 }),
    );

    expect(result.current.isReady).toBe(true);
    expect(result.current.canFillWithinSlippage).toBe(false);
    expect(result.current.estimatedSlippageBps).toBeNull();
    mockBook({ orderBook: null, dataSymbol: null, isLoading: true });
    rerender({});
    expect(result.current.isReady).toBe(false);
    expect(result.current.canFillWithinSlippage).toBeNull();
  });

  it('rejects a stale book from another symbol before the subscription effect resets it', () => {
    mockBook({ dataSymbol: 'BTC' });

    const { result } = renderHook(() => usePerpsEstimatedSlippage(options));

    expect(result.current.isReady).toBe(false);
    expect(result.current.estimatedSlippageBps).toBeNull();
  });

  it('reports a terminal subscription error as ready but unavailable', () => {
    mockBook({ orderBook: null, error: new Error('subscription failed') });

    const { result } = renderHook(() => usePerpsEstimatedSlippage(options));

    expect(result.current.isReady).toBe(true);
    expect(result.current.estimatedSlippageBps).toBeNull();
  });

  it.each([undefined, 0, -1])('does not estimate a size of %s', (sizeUsd) => {
    const { result } = renderHook(() =>
      usePerpsEstimatedSlippage({ ...options, sizeUsd }),
    );

    expect(result.current.estimatedSlippageBps).toBeNull();
  });

  it('disables the order-book subscription for limit orders', () => {
    const { result } = renderHook(() =>
      usePerpsEstimatedSlippage({ ...options, enabled: false }),
    );

    expect(usePerpsLiveOrderBook).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(result.current.isReady).toBe(false);
    expect(result.current.estimatedSlippageBps).toBeNull();
  });

  it('recalculates the worst fill against a changed cap and submission mid', () => {
    const { result, rerender } = renderHook(
      ({ currentPrice, maxSlippageBps }) =>
        usePerpsEstimatedSlippage({
          ...options,
          currentPrice,
          maxSlippageBps,
          szDecimals: 2,
        }),
      { initialProps: { currentPrice: 100, maxSlippageBps: 300 } },
    );
    expect(result.current.canFillWithinSlippage).toBe(true);

    rerender({ currentPrice: 99, maxSlippageBps: 100 });

    expect(result.current.canFillWithinSlippage).toBe(false);
  });
});
