import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider, { type DeepPartial } from '../../renderWithProvider';
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

/** No-op unsubscribe for test stream channels; subscribe() must return () => void */
const noopUnsubscribe = (): void => undefined;

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
    subscribe: (params: { callback: (data: T) => void }): (() => void) => {
      if (params?.callback) {
        params.callback(initialValue);
      }
      return noopUnsubscribe;
    },
  };
}

/** No-op channel for streams not needed by view tests */
const noopChannel = () => ({
  subscribe: (): (() => void) => noopUnsubscribe,
});

/** Prices channel: usePerpsLivePrices calls subscribeToSymbols */
const pricesChannel = () => ({
  subscribe: (): (() => void) => noopUnsubscribe,
  subscribeToSymbols: (): (() => void) => noopUnsubscribe,
});

/** Optional stream data overrides for view tests (e.g. initial positions for Market Details Close/Modify). */
export interface PerpsStreamOverrides {
  /** When set, usePerpsLivePositions() receives this array (e.g. to show Close/Modify on Market Details). */
  positions?: unknown[];
  /** When set, usePerpsMarkets() receives this array (e.g. to test category badges in Market List: crypto + commodity). */
  marketData?: unknown[];
}

/** Creates a minimal stream manager double so views using usePerpsStream() render without WebSocket. */
function createTestStreamManager(
  streamOverrides?: PerpsStreamOverrides,
): PerpsStreamManager {
  const positions = streamOverrides?.positions ?? [];
  const marketData = streamOverrides?.marketData ?? initialMarketData;
  return {
    prices: pricesChannel(),
    orders: channelWithInitialValue([]),
    positions: channelWithInitialValue(positions),
    fills: noopChannel(),
    account: channelWithInitialValue(initialAccount),
    marketData: channelWithInitialValue(marketData),
    oiCaps: noopChannel(),
    topOfBook: noopChannel(),
    candles: noopChannel(),
    clearAllChannels: (): void => undefined,
  } as unknown as PerpsStreamManager;
}

/** Extra route for navigation assertions (e.g. MARKET_LIST so "See all perps" can be verified). */
export interface PerpsExtraRoute {
  name: string;
  Component?: React.ComponentType<unknown>;
}

interface RenderPerpsViewOptions {
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
  /** Optional stream overrides (e.g. positions for PerpsMarketDetailsView geo-restriction test). */
  streamOverrides?: PerpsStreamOverrides;
  /** Optional extra routes so navigation can be asserted (e.g. [{ name: Routes.PERPS.MARKET_LIST }]). */
  extraRoutes?: PerpsExtraRoute[];
}

const DefaultRouteProbe =
  (routeName: string): React.FC =>
  () => <Text testID={`route-${routeName}`}>{routeName}</Text>;

/**
 * Renders a Perps view with preset state. State is driven by Redux; use overrides
 * to set e.g. PerpsController.isEligible for geo-restriction tests.
 * Wraps with PerpsConnectionProvider and PerpsStreamProvider so views that use
 * usePerpsStream() (e.g. PerpsTabView, PerpsMarketListView) render without errors.
 * When extraRoutes is provided, those routes are registered so navigation can be asserted.
 */
export function renderPerpsView(
  Component: React.ComponentType,
  routeName: string,
  options: RenderPerpsViewOptions = {},
) {
  const { overrides, initialParams, streamOverrides, extraRoutes } = options;
  const builder = initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  const testStreamManager = createTestStreamManager(streamOverrides);

  const WrappedComponent = (props: Record<string, unknown>) => (
    <PerpsConnectionContext.Provider value={testConnectionValue}>
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <Component {...props} />
      </PerpsStreamProvider>
    </PerpsConnectionContext.Provider>
  );

  if (extraRoutes?.length) {
    const Stack = createStackNavigator();
    const stackTree = (
      <Stack.Navigator>
        <Stack.Screen
          name={routeName}
          component={WrappedComponent as unknown as React.ComponentType}
          initialParams={initialParams}
        />
        {extraRoutes.map(({ name, Component: Extra }) => (
          <Stack.Screen
            key={name}
            name={name}
            component={Extra ?? DefaultRouteProbe(name)}
          />
        ))}
      </Stack.Navigator>
    );
    return renderWithProvider(stackTree, { state });
  }

  return renderComponentViewScreen(
    WrappedComponent as unknown as React.ComponentType,
    { name: routeName },
    { state },
    initialParams,
  );
}
