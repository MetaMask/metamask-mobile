import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import { initialStatePerps } from '../presets/perpsStatePreset';
import {
  PerpsConnectionContext,
  type PerpsConnectionContextValue,
} from '../../../app/components/UI/Perps/providers/PerpsConnectionProvider';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../../../app/components/UI/Perps/providers/PerpsStreamManager';
import PerpsMarketDetailsView from '../../../app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView';
import PerpsMarketListView from '../../../app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView';
import PerpsSelectModifyActionView from '../../../app/components/UI/Perps/Views/PerpsSelectModifyActionView/PerpsSelectModifyActionView';
import PerpsSelectProviderView from '../../../app/components/UI/Perps/Views/PerpsSelectProviderView/PerpsSelectProviderView';
import PerpsTabView from '../../../app/components/UI/Perps/Views/PerpsTabView/PerpsTabView';
import PerpsPositionsView from '../../../app/components/UI/Perps/Views/PerpsPositionsView/PerpsPositionsView';
import PerpsHomeView from '../../../app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView';
import PerpsClosePositionView from '../../../app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView';
import PerpsOrderBookView from '../../../app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView';
import PerpsWithdrawView from '../../../app/components/UI/Perps/Views/PerpsWithdrawView/PerpsWithdrawView';
import PerpsTransactionsView from '../../../app/components/UI/Perps/Views/PerpsTransactionsView/PerpsTransactionsView';
import PerpsHeroCardView from '../../../app/components/UI/Perps/Views/PerpsHeroCardView/PerpsHeroCardView';
import PerpsTPSLView from '../../../app/components/UI/Perps/Views/PerpsTPSLView/PerpsTPSLView';
import PerpsOrderDetailsView from '../../../app/components/UI/Perps/Views/PerpsOrderDetailsView/PerpsOrderDetailsView';
import PerpsCancelAllOrdersView from '../../../app/components/UI/Perps/Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import PerpsCloseAllPositionsView from '../../../app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import { Position } from '@metamask/perps-controller';

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

/** Top-of-book channel: usePerpsTopOfBook calls subscribeToSymbol (e.g. PerpsClosePositionView, PerpsOrderBookView) */
function topOfBookChannel() {
  return {
    subscribe: (): (() => void) => noopUnsubscribe,
    subscribeToSymbol: (params: {
      symbol: string;
      callback: (data: unknown) => void;
    }): (() => void) => {
      if (params?.callback) {
        params.callback(undefined);
      }
      return noopUnsubscribe;
    },
  };
}

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
    topOfBook: topOfBookChannel(),
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
    const InnerStack = createStackNavigator();
    // PerpsTabView navigates via navigation.navigate(PERPS.ROOT, { screen: MARKET_LIST }).
    // So we register PERPS.ROOT as a nested stack containing the extra routes; then
    // navigating to ROOT with screen: MARKET_LIST shows the route probe.
    const nestedScreens = (
      <>
        {extraRoutes.map(({ name, Component: Extra }) => (
          <InnerStack.Screen
            key={name}
            name={name}
            component={Extra ?? DefaultRouteProbe(name)}
          />
        ))}
      </>
    );
    const NestedPerpsStack = () => (
      <InnerStack.Navigator>{nestedScreens}</InnerStack.Navigator>
    );
    const stackTree = (
      <Stack.Navigator>
        <Stack.Screen
          name={routeName}
          component={WrappedComponent as unknown as React.ComponentType}
          initialParams={initialParams}
        />
        <Stack.Screen
          name={Routes.PERPS.ROOT}
          component={NestedPerpsStack as unknown as React.ComponentType}
        />
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

/** Default position for PerpsSelectModifyActionView view tests. */
const defaultSelectModifyActionPosition: Position = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

const selectModifyActionExtraRoutes = [
  { name: Routes.PERPS.CLOSE_POSITION },
  { name: Routes.PERPS.ADJUST_MARGIN },
  { name: Routes.PERPS.TUTORIAL },
  {
    name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    Component: () => <Text testID="route-order-confirmation">Order</Text>,
  },
];

/**
 * Renders PerpsSelectModifyActionView with Redux state and extra routes for navigation assertions.
 * Use in PerpsSelectModifyActionView.view.test.tsx.
 */
export function renderPerpsSelectModifyActionView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
  } = {},
) {
  const { overrides, initialParams } = options;
  const builder = initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  return renderScreenWithRoutes(
    PerpsSelectModifyActionView as unknown as React.ComponentType,
    { name: Routes.PERPS.SELECT_MODIFY_ACTION },
    selectModifyActionExtraRoutes,
    { state },
    initialParams ?? { position: defaultSelectModifyActionPosition },
  );
}

/** Default market for PerpsMarketDetailsView view tests (geo-restriction, etc.). */
const defaultMarketDetailsMarket = {
  symbol: 'ETH',
  name: 'Ethereum',
  price: '$2,000.00',
  change24h: '+$50.00',
  change24hPercent: '+2.5%',
  volume: '$1.5B',
  maxLeverage: '50x',
  marketType: 'crypto',
};

/** Default Redux overrides for geo-restriction tests (PerpsController.isEligible: false). */
const defaultGeoRestrictionOverrides: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      PerpsController: { isEligible: false },
    },
  },
};

/**
 * Renders PerpsMarketDetailsView with default geo-restriction state and market/position.
 * Use in PerpsMarketDetailsView.view.test.tsx.
 */
export function renderPerpsMarketDetailsView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
  } = {},
) {
  const {
    overrides = defaultGeoRestrictionOverrides,
    initialParams = { market: defaultMarketDetailsMarket },
    streamOverrides = { positions: [defaultSelectModifyActionPosition] },
  } = options;
  return renderPerpsView(
    PerpsMarketDetailsView as unknown as React.ComponentType,
    'PerpsMarketDetails',
    { overrides, initialParams, streamOverrides },
  );
}

/**
 * Renders PerpsMarketListView. Use in PerpsMarketListView.view.test.tsx.
 */
export function renderPerpsMarketListView(
  options: RenderPerpsViewOptions = {},
) {
  return renderPerpsView(
    PerpsMarketListView as unknown as React.ComponentType,
    'PerpsMarketListView',
    options,
  );
}

/**
 * Renders PerpsTabView. Use in PerpsTabView.view.test.tsx.
 */
export function renderPerpsTabView(options: RenderPerpsViewOptions = {}) {
  return renderPerpsView(
    PerpsTabView as unknown as React.ComponentType,
    'PerpsTabView',
    options,
  );
}

/**
 * Renders PerpsSelectProviderView. Use in PerpsSelectProviderView.view.test.tsx.
 */
export function renderPerpsSelectProviderView(
  options: RenderPerpsViewOptions = {},
) {
  return renderPerpsView(
    PerpsSelectProviderView as unknown as React.ComponentType,
    Routes.PERPS.MODALS.SELECT_PROVIDER,
    options,
  );
}

/** Default position for view tests that need a single position (Close, OrderBook, HeroCard, TPSL). */
export const defaultPositionForViews: Position = {
  symbol: 'ETH',
  size: '2.5',
  marginUsed: '500',
  entryPrice: '2000',
  liquidationPrice: '1900',
  unrealizedPnl: '100',
  returnOnEquity: '0.20',
  leverage: { value: 10, type: 'isolated' },
  cumulativeFunding: { sinceOpen: '5', allTime: '10', sinceChange: '2' },
  positionValue: '5000',
  maxLeverage: 50,
  takeProfitCount: 0,
  stopLossCount: 0,
};

/**
 * Renders PerpsPositionsView. Use in PerpsPositionsView.view.test.tsx.
 */
export function renderPerpsPositionsView(options: RenderPerpsViewOptions = {}) {
  return renderPerpsView(
    PerpsPositionsView as unknown as React.ComponentType,
    Routes.PERPS.POSITIONS,
    options,
  );
}

/**
 * Renders PerpsHomeView. Use in PerpsHomeView.view.test.tsx.
 */
export function renderPerpsHomeView(options: RenderPerpsViewOptions = {}) {
  return renderPerpsView(
    PerpsHomeView as unknown as React.ComponentType,
    Routes.PERPS.PERPS_HOME,
    options,
  );
}

/**
 * Renders PerpsClosePositionView. Use in PerpsClosePositionView.view.test.tsx.
 */
export function renderPerpsClosePositionView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
  } = {},
) {
  const position = options.initialParams?.position ?? defaultPositionForViews;
  return renderPerpsView(
    PerpsClosePositionView as unknown as React.ComponentType,
    Routes.PERPS.CLOSE_POSITION,
    {
      ...options,
      initialParams: { ...options.initialParams, position },
      streamOverrides: {
        positions: [position],
        ...options.streamOverrides,
      },
    },
  );
}

/** Default market for PerpsOrderBookView. */
const defaultOrderBookMarket = {
  symbol: 'ETH',
  name: 'Ethereum',
  price: '$2,000.00',
  change24h: '+$50.00',
  change24hPercent: '+2.5%',
  volume: '$1.5B',
  maxLeverage: '50x',
  marketType: 'crypto' as const,
};

/**
 * Renders PerpsOrderBookView. Use in PerpsOrderBookView.view.test.tsx.
 */
export function renderPerpsOrderBookView(options: RenderPerpsViewOptions = {}) {
  const initialParams = {
    market: defaultOrderBookMarket,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsOrderBookView as unknown as React.ComponentType,
    Routes.PERPS.ORDER_BOOK,
    { ...options, initialParams },
  );
}

/**
 * Renders PerpsWithdrawView. Use in PerpsWithdrawView.view.test.tsx.
 */
export function renderPerpsWithdrawView(options: RenderPerpsViewOptions = {}) {
  return renderPerpsView(
    PerpsWithdrawView as unknown as React.ComponentType,
    Routes.PERPS.WITHDRAW,
    options,
  );
}

/**
 * Renders PerpsTransactionsView. Use in PerpsTransactionsView.view.test.tsx.
 */
export function renderPerpsTransactionsView(
  options: RenderPerpsViewOptions = {},
) {
  return renderPerpsView(
    PerpsTransactionsView as unknown as React.ComponentType,
    Routes.PERPS.ACTIVITY,
    options,
  );
}

/**
 * Renders PerpsHeroCardView. Use in PerpsHeroCardView.view.test.tsx.
 */
export function renderPerpsHeroCardView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
  } = {},
) {
  const initialParams = {
    position: defaultPositionForViews,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsHeroCardView as unknown as React.ComponentType,
    Routes.PERPS.PNL_HERO_CARD,
    { ...options, initialParams, streamOverrides: options.streamOverrides },
  );
}

/** Minimal TPSL route params for PerpsTPSLView. */
const defaultTPSLParams = {
  asset: 'ETH',
  currentPrice: '2000',
  direction: 'long' as const,
  position: defaultPositionForViews,
  initialTakeProfitPrice: '',
  initialStopLossPrice: '',
  leverage: 10,
  orderType: 'market' as const,
  limitPrice: '',
  amount: '1',
  szDecimals: 2,
  onConfirm: (): void => undefined,
};

/**
 * Renders PerpsTPSLView. Use in PerpsTPSLView.view.test.tsx.
 */
export function renderPerpsTPSLView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
  } = {},
) {
  const initialParams = {
    ...defaultTPSLParams,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsTPSLView as unknown as React.ComponentType,
    Routes.PERPS.TPSL,
    { ...options, initialParams, streamOverrides: options.streamOverrides },
  );
}

/** Minimal order for PerpsOrderDetailsView. */
const defaultOrderDetailsOrder = {
  orderId: 'order_1',
  symbol: 'ETH',
  side: 'buy' as const,
  orderType: 'market' as const,
  size: '1',
  originalSize: '1',
  price: '2000',
  reduceOnly: false,
  triggerPrice: undefined,
  triggerDirection: undefined,
  timeInForce: 'Gtc' as const,
  status: 'open' as const,
  timestamp: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  fee: '0',
  averageFillPrice: undefined,
  filledSize: '0',
};

/**
 * Renders PerpsOrderDetailsView. Use in PerpsOrderDetailsView.view.test.tsx.
 */
export function renderPerpsOrderDetailsView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
  } = {},
) {
  const initialParams = {
    order: defaultOrderDetailsOrder,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsOrderDetailsView as unknown as React.ComponentType,
    Routes.PERPS.ORDER_DETAILS,
    { ...options, initialParams, streamOverrides: options.streamOverrides },
  );
}

/**
 * Renders PerpsCancelAllOrdersView (as full screen for view test). Use in PerpsCancelAllOrdersView.view.test.tsx.
 */
export function renderPerpsCancelAllOrdersView(
  options: RenderPerpsViewOptions = {},
) {
  return renderPerpsView(
    PerpsCancelAllOrdersView as unknown as React.ComponentType,
    Routes.PERPS.MODALS.CANCEL_ALL_ORDERS,
    options,
  );
}

/**
 * Renders PerpsCloseAllPositionsView (as full screen for view test). Use in PerpsCloseAllPositionsView.view.test.tsx.
 */
export function renderPerpsCloseAllPositionsView(
  options: RenderPerpsViewOptions = {},
) {
  return renderPerpsView(
    PerpsCloseAllPositionsView as unknown as React.ComponentType,
    Routes.PERPS.MODALS.CLOSE_ALL_POSITIONS,
    options,
  );
}
