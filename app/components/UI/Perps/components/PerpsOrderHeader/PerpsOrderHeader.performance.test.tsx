/**
 * Performance/isolation tests for PerpsOrderHeader's live price subscription.
 *
 * These tests exercise the REAL usePerpsLiveFocusedPrice hook (only the
 * underlying WebSocket stream manager is mocked), so a "tick" here is
 * delivered through the exact same setState path that runs in production
 * when the WebSocket receives new data.
 *
 * The goal is to provide empirical evidence — not just a theoretical claim —
 * that decoupling the header's price subscription into PerpsOrderHeader's own
 * subtree does NOT cause the (potentially much heavier) parent tree
 * (PerpsOrderView / PerpsClosePositionView, with their fee/margin/validation
 * recomputation) to re-render on every price tick. A React state update only
 * re-renders the fiber that owns the state and its children; siblings and
 * ancestors are untouched unless their own props/state change. These tests
 * assert that guarantee holds for this specific hook usage.
 */
import React from 'react';
import { act } from '@testing-library/react-native';
import { View } from 'react-native';
import { type PriceUpdate } from '@metamask/perps-controller';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PerpsOrderHeader from './PerpsOrderHeader';

let capturedCallback: ((update: PriceUpdate | undefined) => void) | undefined;

const mockSubscribeToSymbol = jest.fn(
  (params: { callback: (update: PriceUpdate | undefined) => void }) => {
    capturedCallback = params.callback;
    return jest.fn(); // unsubscribe
  },
);

// The real usePerpsStream() returns a stable singleton (provided via React
// Context), not a fresh object per call. Returning a NEW literal on every
// invocation here would make usePerpsLiveFocusedPrice's effect (deps include
// `stream`) re-run on every render, resetting its state right after each
// tick — a test-mocking artifact that has nothing to do with production
// behavior. Keep a single stable reference to mirror the real contract.
const mockStream = {
  focusedPrice: {
    subscribeToSymbol: mockSubscribeToSymbol,
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

const buildPriceUpdate = (price: string): PriceUpdate => ({
  symbol: 'BTC',
  price,
  markPrice: price,
  percentChange24h: '4.20',
  timestamp: Date.now(),
  isTradable: true,
});

describe('PerpsOrderHeader performance: live ticks stay isolated to its own subtree', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = undefined;
  });

  it('updates the displayed price and percent change on a real focused-price tick without re-rendering the parent subtree', () => {
    const { counter: parentRenderCount, onRender } = createRenderCounter();

    const { getByText, queryByText } = renderWithProvider(
      <ParentRenderProbe onRender={onRender}>
        <PerpsOrderHeader asset="BTC" price={90000} />
      </ParentRenderProbe>,
      { state: initialState },
    );

    expect(getByText('$90,000')).toBeOnTheScreen();
    expect(capturedCallback).toBeDefined();

    const renderCountBeforeTick = parentRenderCount.current;

    // Simulate a real WebSocket price tick — the exact path production code
    // takes when new market data arrives.
    act(() => {
      capturedCallback?.(buildPriceUpdate('92345'));
    });

    // The header must reflect the new price and percent change...
    expect(getByText('$92,345')).toBeOnTheScreen();
    expect(getByText('+4.20%')).toBeOnTheScreen();
    expect(queryByText('$90,000')).toBeNull();
    // ...but the parent tree above it must NOT have re-rendered. The state
    // update lives entirely inside PerpsOrderHeader's own fiber, so React
    // never needs to touch (or re-run expensive work in) its ancestors.
    expect(parentRenderCount.current).toBe(renderCountBeforeTick);
  });

  it('clears the price and percent change back to the loading placeholders when the channel resets to undefined', () => {
    const { counter: parentRenderCount, onRender } = createRenderCounter();

    const { getByText, queryByText } = renderWithProvider(
      <ParentRenderProbe onRender={onRender}>
        <PerpsOrderHeader asset="BTC" price={90000} />
      </ParentRenderProbe>,
      { state: initialState },
    );

    act(() => {
      capturedCallback?.(buildPriceUpdate('92345'));
    });
    expect(getByText('$92,345')).toBeOnTheScreen();

    const renderCountBeforeReset = parentRenderCount.current;

    act(() => {
      capturedCallback?.(undefined);
    });

    // Falls back to the `price` prop (still 90000, since the parent never
    // re-rendered), and the percent change goes back to the loading
    // placeholder — without the parent re-rendering either.
    expect(getByText('$90,000')).toBeOnTheScreen();
    expect(getByText('--%')).toBeOnTheScreen();
    expect(queryByText('$92,345')).toBeNull();
    expect(parentRenderCount.current).toBe(renderCountBeforeReset);
  });

  it('does not accumulate parent re-renders across many separate, sequential ticks', () => {
    const { counter: parentRenderCount, onRender } = createRenderCounter();

    const { getByText } = renderWithProvider(
      <ParentRenderProbe onRender={onRender}>
        <PerpsOrderHeader asset="BTC" price={90000} />
      </ParentRenderProbe>,
      { state: initialState },
    );

    const renderCountBeforeTicks = parentRenderCount.current;

    // Each tick is dispatched in its OWN act() call — a separate React commit
    // per tick, unlike a single batched act() wrapping all of them — so this
    // actually measures isolation across sustained, sequential high-frequency
    // updates (e.g. volatile market conditions), not just a single batched
    // render covering all 50 at once.
    const dispatchTick = (price: string) => {
      act(() => {
        capturedCallback?.(buildPriceUpdate(price));
      });
    };
    for (let i = 0; i < 50; i++) {
      dispatchTick(String(90000 + i));
    }

    expect(getByText('$90,049')).toBeOnTheScreen();
    expect(parentRenderCount.current).toBe(renderCountBeforeTicks);
  });
});
