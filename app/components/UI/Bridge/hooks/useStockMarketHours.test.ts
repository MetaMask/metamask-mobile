import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  STOCK_MARKET_STATUS_POLL_MS,
  __getStockMarketHoursNowMsForTest,
  __resetStockMarketHoursClockForTest,
  __subscribeStockMarketHoursClockForTest,
  useStockMarketHours,
} from './useStockMarketHours';
import type { BridgeToken } from '../types';
import type { Hex } from '@metamask/utils';

const MARKET_OPEN = '2024-01-02T09:00:00.000Z';
const MARKET_CLOSE = '2024-01-02T17:00:00.000Z';
const OFF_OPEN = '2024-01-01T17:30:00.000Z';
const OFF_CLOSE = '2024-01-01T20:00:00.000Z';

const stockWithOffHours: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  symbol: 'AAPL',
  name: 'Apple',
  decimals: 18,
  chainId: '0x1' as Hex,
  rwaData: {
    instrumentType: 'stock',
    market: {
      nextOpen: MARKET_OPEN,
      nextClose: MARKET_CLOSE,
    },
    offhours: {
      nextOpen: OFF_OPEN,
      nextClose: OFF_CLOSE,
    },
  } as BridgeToken['rwaData'],
};

const createState = (
  destToken: BridgeToken | undefined,
  rwaEnabled = true,
) => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          rwaTokensEnabled: rwaEnabled,
        },
        cacheTimestamp: 0,
      },
    },
  },
  bridge: {
    sourceToken: undefined,
    destToken,
  },
});

describe('useStockMarketHours', () => {
  afterEach(() => {
    __resetStockMarketHoursClockForTest();
    jest.useRealTimers();
  });

  it('returns off-hours true and market-closed false while dest stock is in off-hours', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T18:00:00.000Z'));

    const { result, unmount } = renderHookWithProvider(
      () => useStockMarketHours(),
      {
        state: createState(stockWithOffHours),
      },
    );

    expect(result.current.isInOffHoursTrading).toBe(true);
    expect(result.current.isStockMarketClosed).toBe(false);

    unmount();
  });

  it('flips to market-closed after the off-hours window ends', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T18:00:00.000Z'));

    const { result, unmount } = renderHookWithProvider(
      () => useStockMarketHours(),
      {
        state: createState(stockWithOffHours),
      },
    );

    expect(result.current.isInOffHoursTrading).toBe(true);
    expect(result.current.isStockMarketClosed).toBe(false);

    act(() => {
      jest.setSystemTime(new Date('2024-01-01T20:30:00.000Z'));
      jest.advanceTimersByTime(STOCK_MARKET_STATUS_POLL_MS);
    });

    expect(result.current.isInOffHoursTrading).toBe(false);
    expect(result.current.isStockMarketClosed).toBe(true);

    unmount();
  });

  it('notifies when restarting an idle clock after refreshing nowMs', () => {
    jest.useFakeTimers();
    const idleAtMs = new Date('2024-01-01T18:00:00.000Z').getTime();
    const restartAtMs = new Date('2024-01-01T20:30:00.000Z').getTime();
    jest.setSystemTime(idleAtMs);

    const firstListener = jest.fn();
    const unsubscribe = __subscribeStockMarketHoursClockForTest(firstListener);
    expect(__getStockMarketHoursNowMsForTest()).toBe(idleAtMs);

    // Last subscriber leaves: interval clears, nowMs stays frozen.
    unsubscribe();
    expect(__getStockMarketHoursNowMsForTest()).toBe(idleAtMs);

    jest.setSystemTime(restartAtMs);
    const restartListener = jest.fn();
    const unsubscribeRestart =
      __subscribeStockMarketHoursClockForTest(restartListener);

    // Direct store contract: idle restart must refresh and notify. Hook-level
    // remounts can be masked by React's useSyncExternalStore tear check.
    expect(restartListener).toHaveBeenCalledTimes(1);
    expect(__getStockMarketHoursNowMsForTest()).toBe(restartAtMs);

    unsubscribeRestart();
  });

  it('keeps a remounted caller on the same clock as still-mounted callers', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T18:00:00.000Z'));

    const { result: stillMounted, unmount: unmountStillMounted } =
      renderHookWithProvider(() => useStockMarketHours(), {
        state: createState(stockWithOffHours),
      });
    const { unmount: unmountTransient } = renderHookWithProvider(
      () => useStockMarketHours(),
      { state: createState(stockWithOffHours) },
    );

    expect(stillMounted.current.isInOffHoursTrading).toBe(true);
    expect(stillMounted.current.isStockMarketClosed).toBe(false);

    act(() => {
      jest.setSystemTime(new Date('2024-01-01T20:30:00.000Z'));
    });
    unmountTransient();
    const { result: remounted, unmount: unmountRemounted } =
      renderHookWithProvider(() => useStockMarketHours(), {
        state: createState(stockWithOffHours),
      });

    expect(remounted.current.isInOffHoursTrading).toBe(
      stillMounted.current.isInOffHoursTrading,
    );
    expect(remounted.current.isStockMarketClosed).toBe(
      stillMounted.current.isStockMarketClosed,
    );
    expect(remounted.current.isInOffHoursTrading).toBe(true);
    expect(remounted.current.isStockMarketClosed).toBe(false);

    act(() => {
      jest.advanceTimersByTime(STOCK_MARKET_STATUS_POLL_MS);
    });

    expect(remounted.current.isInOffHoursTrading).toBe(false);
    expect(remounted.current.isStockMarketClosed).toBe(true);
    expect(stillMounted.current.isInOffHoursTrading).toBe(false);
    expect(stillMounted.current.isStockMarketClosed).toBe(true);

    unmountRemounted();
    unmountStillMounted();
  });

  it('returns both flags false when dest is not a stock RWA', () => {
    const usdc: BridgeToken = {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      decimals: 6,
      chainId: '0x1' as Hex,
    };

    const { result, unmount } = renderHookWithProvider(
      () => useStockMarketHours(),
      {
        state: createState(usdc),
      },
    );

    expect(result.current.isInOffHoursTrading).toBe(false);
    expect(result.current.isStockMarketClosed).toBe(false);

    unmount();
  });
});
