import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';
import { renderComponentViewScreen } from '../render';
import { initialStatePerps } from '../presets/perps';
import {
  PerpsConnectionContext,
  type PerpsConnectionContextValue,
} from '../../../../components/UI/Perps/providers/PerpsConnectionProvider';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../../../../components/UI/Perps/providers/PerpsStreamManager';

/** No-op unsubscribe for test stream channels */
const noopUnsubscribe = (): (() => void) => () => undefined;

/** Connection context value for view tests: "connected" so views render content instead of loading skeleton */
const testConnectionValue: PerpsConnectionContextValue = {
  isConnected: true,
  isConnecting: false,
  isInitialized: true,
  error: null,
  connect: async (): Promise<void> => undefined,
  disconnect: async (): Promise<void> => undefined,
  resetError: (): void => undefined,
  reconnectWithNewContext: async (): Promise<void> => undefined,
};

/** Minimal account so usePerpsLiveAccount sets isInitialLoading=false; non-zero totalBalance so PerpsTabControlBar shows balance button */
const initialAccount = {
  availableBalance: '1',
  totalBalance: '1',
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
};

/** One market so usePerpsMarkets (via marketData stream) populates explore section and "See all perps" appears */
const initialMarketData = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '50x',
    price: '$50,000',
    change24h: '$0',
    change24hPercent: '0%',
    volume: '$1M',
  },
];

/** Channel that calls callback once with initial value so hooks leave loading state */
function channelWithInitialValue<T>(initialValue: T) {
  return {
    subscribe: (params: { callback: (data: T) => void }) => {
      if (params?.callback) {
        params.callback(initialValue);
      }
      return noopUnsubscribe;
    },
  };
}

/** No-op channel for streams not needed by view tests */
const noopChannel = () => ({
  subscribe: () => noopUnsubscribe,
});

/** Prices channel: usePerpsLivePrices calls subscribeToSymbols */
const pricesChannel = () => ({
  subscribe: () => noopUnsubscribe,
  subscribeToSymbols: () => noopUnsubscribe,
});

/** Creates a minimal stream manager double so views using usePerpsStream() render without WebSocket. */
function createTestStreamManager(): PerpsStreamManager {
  return {
    prices: pricesChannel(),
    orders: channelWithInitialValue([]),
    positions: channelWithInitialValue([]),
    fills: noopChannel(),
    account: channelWithInitialValue(initialAccount),
    marketData: channelWithInitialValue(initialMarketData),
    oiCaps: noopChannel(),
    topOfBook: noopChannel(),
    candles: noopChannel(),
    clearAllChannels: (): void => undefined,
  } as unknown as PerpsStreamManager;
}

interface RenderPerpsViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
}

/**
 * Renders a Perps view with preset state. State is driven by Redux; use overrides
 * to set e.g. PerpsController.isEligible for geo-restriction tests.
 * Wraps with PerpsConnectionProvider and PerpsStreamProvider so views that use
 * usePerpsStream() (e.g. PerpsTabView, PerpsMarketListView) render without errors.
 */
export function renderPerpsView(
  Component: React.ComponentType,
  routeName: string,
  options: RenderPerpsViewOptions = {},
) {
  const { overrides, initialParams } = options;
  const builder = initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  const testStreamManager = createTestStreamManager();

  const WrappedComponent = (props: Record<string, unknown>) => (
    <PerpsConnectionContext.Provider value={testConnectionValue}>
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <Component {...props} />
      </PerpsStreamProvider>
    </PerpsConnectionContext.Provider>
  );

  return renderComponentViewScreen(
    WrappedComponent as unknown as React.ComponentType,
    { name: routeName },
    { state },
    initialParams,
  );
}
