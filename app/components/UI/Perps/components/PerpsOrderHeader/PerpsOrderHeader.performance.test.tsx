/**
 * Performance/isolation tests for PerpsOrderHeader's live price subscription.
 *
 * These tests exercise the REAL usePerpsLiveHeaderPrice -> usePerpsLiveCandles
 * / usePerpsLivePrices hooks (only the underlying WebSocket stream manager is
 * mocked), so a "tick" here is delivered through the exact same setState path
 * that runs in production when the WebSocket receives new data.
 *
 * The goal is to provide empirical evidence — not just a theoretical claim —
 * that decoupling the header's price subscription into PerpsOrderHeader's own
 * subtree does NOT cause the (potentially much heavier) parent tree
 * (PerpsOrderView / PerpsClosePositionView, with their fee/margin/validation
 * recomputation) to re-render on every price/candle tick. A React state
 * update only re-renders the fiber that owns the state and its children;
 * siblings and ancestors are untouched unless their own props/state change.
 * These tests assert that guarantee holds for this specific hook usage.
 */
import React from 'react';
import { act } from '@testing-library/react-native';
import { View } from 'react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PerpsOrderHeader from './PerpsOrderHeader';
import {
  CandlePeriod,
  type CandleData,
  type PriceUpdate,
} from '@metamask/perps-controller';

let capturedCandleCallback: ((data: CandleData) => void) | undefined;
let capturedPriceCallback:
  | ((data: Record<string, PriceUpdate>) => void)
  | undefined;

const mockCandleSubscribe = jest.fn(
  (params: { callback: (data: CandleData) => void }) => {
    capturedCandleCallback = params.callback;
    return jest.fn(); // unsubscribe
  },
);

const mockPriceSubscribeToSymbols = jest.fn(
  (params: { callback: (data: Record<string, PriceUpdate>) => void }) => {
    capturedPriceCallback = params.callback;
    return jest.fn(); // unsubscribe
  },
);

// The real usePerpsStream() returns a stable singleton (provided via React
// Context), not a fresh object per call. Returning a NEW literal on every
// invocation here would make usePerpsLiveCandles' effect (deps include
// `stream`) re-run on every render, resetting its state right after each
// tick — a test-mocking artifact that has nothing to do with production
// behavior. Keep a single stable reference to mirror the real contract.
const mockStream = {
  candles: {
    subscribe: mockCandleSubscribe,
  },
  prices: {
    subscribeToSymbols: mockPriceSubscribeToSymbols,
  },
};

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => mockStream),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(() => ({ goBack: jest.fn() })),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.market.long': 'Long',
      'perps.market.short': 'Short',
    };
    return translations[key] || key;
  }),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

/** Counts how many times the parent subtree above PerpsOrderHeader renders. */
const ParentRenderProbe: React.FC<{
  onRender: () => void;
  children: React.ReactNode;
}> = ({ onRender, children }) => {
  onRender();
  return <View>{children}</View>;
};

/** Creates a mutable render counter + callback pair for use with ParentRenderProbe. */
const createRenderCounter = () => {
  const counter = { current: 0 };
  const onRender = () => {
    counter.current += 1;
  };
  return { counter, onRender };
};

const buildCandleData = (close: string): CandleData => ({
  symbol: 'BTC',
  interval: CandlePeriod.OneMinute,
  candles: [
    {
      time: Date.now(),
      open: close,
      high: close,
      low: close,
      close,
      volume: '1',
    },
  ],
});

describe('PerpsOrderHeader performance: live ticks stay isolated to its own subtree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCandleCallback = undefined;
    capturedPriceCallback = undefined;
  });

  it('updates the displayed price on a real candle tick without re-rendering the parent subtree', () => {
    const { counter: parentRenderCount, onRender } = createRenderCounter();

    const { getByText, queryByText } = renderWithProvider(
      <ParentRenderProbe onRender={onRender}>
        <PerpsOrderHeader asset="BTC" price={90000} />
      </ParentRenderProbe>,
      { state: initialState },
    );

    expect(getByText('$90,000')).toBeTruthy();
    expect(capturedCandleCallback).toBeDefined();

    const renderCountBeforeTick = parentRenderCount.current;

    // Simulate a real WebSocket candle tick — the exact path production code
    // takes when new market data arrives.
    act(() => {
      capturedCandleCallback?.(buildCandleData('92345'));
    });

    // The header must reflect the new price...
    expect(getByText('$92,345')).toBeTruthy();
    expect(queryByText('$90,000')).toBeNull();
    // ...but the parent tree above it must NOT have re-rendered. The state
    // update lives entirely inside PerpsOrderHeader's own fiber, so React
    // never needs to touch (or re-run expensive work in) its ancestors.
    expect(parentRenderCount.current).toBe(renderCountBeforeTick);
  });

  it('updates the percent change on a real price-stream tick without re-rendering the parent subtree', () => {
    const { counter: parentRenderCount, onRender } = createRenderCounter();

    const { getByText, queryByText } = renderWithProvider(
      <ParentRenderProbe onRender={onRender}>
        <PerpsOrderHeader asset="BTC" price={90000} />
      </ParentRenderProbe>,
      { state: initialState },
    );

    expect(getByText('--%')).toBeTruthy(); // loading state before first tick
    expect(capturedPriceCallback).toBeDefined();

    const renderCountBeforeTick = parentRenderCount.current;

    act(() => {
      capturedPriceCallback?.({
        BTC: {
          symbol: 'BTC',
          price: '90000',
          percentChange24h: '4.20',
          timestamp: Date.now(),
          isTradable: true,
        },
      });
    });

    expect(getByText('+4.20%')).toBeTruthy();
    expect(queryByText('--%')).toBeNull();
    expect(parentRenderCount.current).toBe(renderCountBeforeTick);
  });

  it('does not accumulate parent re-renders across many rapid ticks', () => {
    const { counter: parentRenderCount, onRender } = createRenderCounter();

    const { getByText } = renderWithProvider(
      <ParentRenderProbe onRender={onRender}>
        <PerpsOrderHeader asset="BTC" price={90000} />
      </ParentRenderProbe>,
      { state: initialState },
    );

    const renderCountBeforeTicks = parentRenderCount.current;

    // Simulate a burst of 50 rapid, unthrottled ticks (as could occur during
    // high market volatility) to confirm the parent stays fully isolated
    // regardless of tick frequency, not just for a single update.
    act(() => {
      for (let i = 0; i < 50; i++) {
        capturedCandleCallback?.(buildCandleData(String(90000 + i)));
      }
    });

    expect(getByText('$90,049')).toBeTruthy();
    expect(parentRenderCount.current).toBe(renderCountBeforeTicks);
  });
});
