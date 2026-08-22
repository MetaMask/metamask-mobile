import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import {
  STOCK_MARKET_STATUS_POLL_MS,
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
