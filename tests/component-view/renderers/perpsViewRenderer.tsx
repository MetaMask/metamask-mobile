import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { selectHip3ConfigVersion } from '../../../app/components/UI/Perps/selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../../../app/components/UI/Perps/selectors/perpsController';
import { PerpsConnectionManager } from '../../../app/components/UI/Perps/services/PerpsConnectionManager';
import { buildPerpsMarketContextKey } from '../../../app/components/UI/Perps/utils/perpsMarketContext';
import Routes from '../../../app/constants/navigation/Routes';
import { ConnectionStatus } from '@metamask/hw-wallet-sdk';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import {
  initialStatePerps,
  initialStatePerpsPro,
} from '../presets/perpsStatePreset';
import {
  PerpsConnectionContext,
  type PerpsConnectionContextValue,
} from '../../../app/components/UI/Perps/providers/PerpsConnectionProvider';
import {
  PerpsStreamProvider,
  type PerpsStreamManager,
} from '../../../app/components/UI/Perps/providers/PerpsStreamManager';
import { AccessRestrictedProvider } from '../../../app/components/UI/Compliance';
import HardwareWalletContext, {
  type HardwareWalletContextValue,
} from '../../../app/core/HardwareWallet/contexts/HardwareWalletContext';
import PerpsMarketDetailsView from '../../../app/components/UI/Perps/Views/PerpsMarketDetailsView/PerpsMarketDetailsView';
import PerpsMarketListView from '../../../app/components/UI/Perps/Views/PerpsMarketListView/PerpsMarketListView';
import PerpsSelectModifyActionView from '../../../app/components/UI/Perps/Views/PerpsSelectModifyActionView/PerpsSelectModifyActionView';
import PerpsSelectProviderView from '../../../app/components/UI/Perps/Views/PerpsSelectProviderView/PerpsSelectProviderView';
import PerpsPositionsView from '../../../app/components/UI/Perps/Views/PerpsPositionsView/PerpsPositionsView';
import PerpsHomeView from '../../../app/components/UI/Perps/Views/PerpsHomeView/PerpsHomeView';
import PerpsClosePositionView from '../../../app/components/UI/Perps/Views/PerpsClosePositionView/PerpsClosePositionView';
import PerpsClosePositionRouter from '../../../app/components/UI/Perps/Views/PerpsClosePositionRouter/PerpsClosePositionRouter';
import PerpsOrderBookView from '../../../app/components/UI/Perps/Views/PerpsOrderBookView/PerpsOrderBookView';
import PerpsWithdrawView from '../../../app/components/UI/Perps/Views/PerpsWithdrawView/PerpsWithdrawView';
import PerpsTransactionsView from '../../../app/components/UI/Perps/Views/PerpsTransactionsView/PerpsTransactionsView';
import PerpsHeroCardView from '../../../app/components/UI/Perps/Views/PerpsHeroCardView/PerpsHeroCardView';
import PerpsTPSLView from '../../../app/components/UI/Perps/Views/PerpsTPSLView/PerpsTPSLView';
import PerpsOrderDetailsView from '../../../app/components/UI/Perps/Views/PerpsOrderDetailsView/PerpsOrderDetailsView';
import PerpsOrderView from '../../../app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView';
import PerpsProMarketView from '../../../app/components/UI/Perps/Views/PerpsProMarketView/PerpsProMarketView';
import {
  Toast,
  Text as DesignSystemText,
  TextVariant,
} from '@metamask/design-system-react-native';
import { ToastContext } from '../../../app/component-library/components/Toast/Toast.context';
import type {
  ToastRef,
  ToastOptions,
} from '../../../app/component-library/components/Toast/Toast.types';
import { usePerpsChaseOrders } from '../../../app/components/UI/Perps/hooks/usePerpsChaseOrders';
import PerpsCancelAllOrdersView from '../../../app/components/UI/Perps/Views/PerpsCancelAllOrdersView/PerpsCancelAllOrdersView';
import PerpsCloseAllPositionsView from '../../../app/components/UI/Perps/Views/PerpsCloseAllPositionsView/PerpsCloseAllPositionsView';
import PerpsSelectAdjustMarginActionView from '../../../app/components/UI/Perps/Views/PerpsSelectAdjustMarginActionView/PerpsSelectAdjustMarginActionView';
import PerpsTooltipView from '../../../app/components/UI/Perps/Views/PerpsTooltipView/PerpsTooltipView';
import PerpsCrossMarginWarningBottomSheet from '../../../app/components/UI/Perps/components/PerpsCrossMarginWarningBottomSheet/PerpsCrossMarginWarningBottomSheet';
import {
  handlePerpsCufOrdersDelivered,
  handlePerpsCufPositionsDelivered,
} from '../../../app/components/UI/Perps/utils/perpsCufTrace';
import {
  type AccountState,
  type CandleData,
  CandlePeriod,
  type PerpsMarketData,
  type Position,
  type PriceUpdate,
  type Order,
  type OrderFill,
} from '@metamask/perps-controller';

/** No-op unsubscribe for test stream channels; subscribe() must return () => void */
const noopUnsubscribe = (): void => undefined;

const createPerpsQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

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

function setTestMarketContext(
  state: DeepPartial<RootState>,
  isInitialized: boolean,
): void {
  const manager = PerpsConnectionManager as unknown as {
    initializedMarketContextKey: string | null;
    initializedConnectionGeneration: number | null;
    connectionGeneration: number;
  };
  const rootState = state as RootState;
  manager.initializedMarketContextKey = isInitialized
    ? buildPerpsMarketContextKey(
        selectPerpsNetwork(rootState),
        selectPerpsProvider(rootState),
        selectHip3ConfigVersion(rootState),
      )
    : null;
  manager.initializedConnectionGeneration = isInitialized
    ? manager.connectionGeneration
    : null;
}

const testHardwareWalletValue: HardwareWalletContextValue = {
  walletType: null,
  deviceId: null,
  connectionState: { status: ConnectionStatus.Disconnected },
  deviceSelection: {
    devices: [],
    selectedDevice: null,
    isScanning: false,
    scanError: null,
  },
  ensureDeviceReady: async (): Promise<boolean> => true,
  setTargetWalletType: (): void => undefined,
  setPendingOperationAddress: (): void => undefined,
  showHardwareWalletError: (): void => undefined,
  cancelConnectionFlow: (): void => undefined,
  showAwaitingConfirmation: (): void => undefined,
  hideAwaitingConfirmation: (): void => undefined,
  qr: {
    pendingScanRequest: undefined,
    isSigningQRObject: false,
    setRequestCompleted: (): void => undefined,
    isRequestCompleted: false,
    cancelQRScanRequestIfPresent: async (): Promise<void> => undefined,
  },
};

const PerpsChaseDiscoveryConsumer = () => {
  usePerpsChaseOrders({ isEnabled: false, enableDiscovery: true });
  return null;
};

const PerpsTestToastHost = ({ children }: { children: React.ReactNode }) => {
  const [options, setOptions] = React.useState<ToastOptions | null>(null);
  const api = React.useMemo<ToastRef>(
    () => ({ showToast: setOptions, closeToast: () => setOptions(null) }),
    [],
  );
  const toastRef = React.useRef<ToastRef | null>(api);
  const value = React.useMemo(() => ({ toastRef }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {options && (
        <Toast onClose={() => setOptions(null)}>
          {options.labelOptions.map((option, index) => (
            <DesignSystemText key={index} variant={TextVariant.BodyMd}>
              {option.label}
            </DesignSystemText>
          ))}
        </Toast>
      )}
    </ToastContext.Provider>
  );
};

const PerpsTestProviders = ({
  children,
  connectionValue = testConnectionValue,
  queryClient,
  streamManager,
  includeToasts = false,
}: {
  children: React.ReactNode;
  connectionValue?: PerpsConnectionContextValue;
  queryClient: QueryClient;
  streamManager: PerpsStreamManager;
  includeToasts?: boolean;
}) => (
  <QueryClientProvider client={queryClient}>
    <HardwareWalletContext.Provider value={testHardwareWalletValue}>
      <AccessRestrictedProvider>
        <PerpsConnectionContext.Provider value={connectionValue}>
          <PerpsStreamProvider testStreamManager={streamManager}>
            <PerpsChaseDiscoveryConsumer />
            {includeToasts ? (
              <PerpsTestToastHost>{children}</PerpsTestToastHost>
            ) : (
              children
            )}
          </PerpsStreamProvider>
        </PerpsConnectionContext.Provider>
      </AccessRestrictedProvider>
    </HardwareWalletContext.Provider>
  </QueryClientProvider>
);

/** Minimal account so usePerpsLiveAccount sets isInitialLoading=false; non-zero totalBalance so balance UI renders */
const initialAccount: AccountState = {
  spendableBalance: '1',
  withdrawableBalance: '1',
  totalBalance: '1',
  marginUsed: '0',
  unrealizedPnl: '0',
  returnOnEquity: '0',
};

/** One market so usePerpsMarkets (via marketData stream) populates explore section and "See all perps" appears */
const initialMarketData: PerpsMarketData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '50x',
    price: '$50,000',
    change24h: '$0',
    change24hPercent: '0%',
    volume: '$1M',
    openInterest: '$500K',
  },
];

type StreamCallback<T> = (data: T | null) => void;

interface MutableStreamChannel<T> {
  subscribe: (params: {
    callback: StreamCallback<T>;
    onError?: (error: Error) => void;
  }) => () => void;
  getSnapshot: () => T | null;
  getError: () => Error | null;
  getLastDeliveredAt: () => number | null;
  emit: (data: T | null) => void;
  emitError: (error: Error) => void;
  refresh: () => Promise<void>;
  clearCache: () => void;
  reconnect: () => void;
  getReconnectCount: () => number;
}

export interface PerpsStreamControls {
  emitAccount: (account: AccountState | null) => void;
  emitMarketData: (marketData: PerpsMarketData[] | null) => void;
  emitOrders: (orders: Order[] | null) => void;
  emitOrdersError: (error: Error) => void;
  emitFills: (fills: OrderFill[] | null) => void;
  emitFillsError: (error: Error) => void;
  getOrdersReconnectCount: () => number;
  getFillsReconnectCount: () => number;
  getPositionsReconnectCount: () => number;
  getAccountReconnectCount: () => number;
  emitPositions: (positions: Position[] | null) => void;
  emitPrices: (prices: Record<string, PriceUpdate> | null) => void;
}

/** Channel that calls callback once with initial value so hooks leave loading state. */
function mutableChannelWithInitialValue<T>(
  initialValue: T,
): MutableStreamChannel<T> {
  let snapshot: T | null = initialValue;
  let lastDeliveredAt: number | null = null;
  let reconnectCount = 0;
  let streamError: Error | null = null;
  const subscribers = new Set<StreamCallback<T>>();
  const errorSubscribers = new Set<(error: Error) => void>();

  const emit = (data: T | null) => {
    streamError = null;
    snapshot = data;
    lastDeliveredAt = Date.now();
    subscribers.forEach((callback) => callback(snapshot));
  };

  return {
    subscribe: (params: {
      callback: StreamCallback<T>;
      onError?: (error: Error) => void;
    }): (() => void) => {
      if (params.onError) {
        errorSubscribers.add(params.onError);
      }
      if (params?.callback) {
        subscribers.add(params.callback);
        lastDeliveredAt = Date.now();
        params.callback(snapshot);
      }
      return () => {
        subscribers.delete(params.callback);
        if (params.onError) {
          errorSubscribers.delete(params.onError);
        }
      };
    },
    getSnapshot: () => snapshot,
    getError: () => streamError,
    getLastDeliveredAt: () => lastDeliveredAt,
    emit,
    emitError: (error: Error) => {
      streamError = error;
      errorSubscribers.forEach((callback) => callback(error));
    },
    refresh: async (): Promise<void> => undefined,
    clearCache: (): void => {
      emit(null);
    },
    reconnect: (): void => {
      reconnectCount += 1;
    },
    getReconnectCount: () => reconnectCount,
  };
}

/** No-op channel for streams not needed by view tests */
const noopChannel = () => ({
  subscribe: (): (() => void) => noopUnsubscribe,
  getSnapshot: () => null,
  refresh: async (): Promise<void> => undefined,
  clearCache: (): void => undefined,
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
    getSnapshot: () => null,
  };
}

/**
 * Focused-price channel. `cachedFocusedPrice` is only what
 * `getSnapshot()` returns. The live subscription still starts empty so a
 * cached quote is not also the first focused tick.
 */
function focusedPriceChannel(cachedFocusedPrice: PriceUpdate | null = null) {
  return {
    subscribe: (): (() => void) => noopUnsubscribe,
    subscribeToSymbol: (params: {
      symbol: string;
      callback: (update: PriceUpdate | undefined) => void;
    }): (() => void) => {
      if (params?.callback) {
        params.callback(undefined);
      }
      return noopUnsubscribe;
    },
    getSnapshot: () => cachedFocusedPrice,
  };
}

/**
 * Candles channel. The cached series is a synchronous read for the trade
 * sheet header. It is not pushed through the live candle subscription.
 */
function candlesChannel(
  cachedCandles: CandleData | null,
  chartCacheFresh: boolean,
) {
  return {
    subscribe: (): (() => void) => noopUnsubscribe,
    getSnapshot: () => cachedCandles,
    getCachedData: (
      symbol: string,
      interval: CandlePeriod,
    ): CandleData | null =>
      cachedCandles?.symbol === symbol && cachedCandles.interval === interval
        ? cachedCandles
        : null,
    isChartCacheFresh: (data: CandleData): boolean =>
      chartCacheFresh && data === cachedCandles,
    refresh: async (): Promise<void> => undefined,
    clearCache: (): void => undefined,
  };
}

/**
 * Prices channel. `cachedPrices` is the all-mids map `getSnapshotForSymbol`
 * reads during render. `initialPrices` is what `usePerpsLivePrices` receives.
 * Keeping them separate lets a test show a cached header before any live tick.
 * A later `emit` updates both, matching a price that has now been delivered.
 */
const pricesChannel = (
  initialPrices: Record<string, PriceUpdate> = {},
  cachedPrices: Record<string, PriceUpdate> = {},
) => {
  const channel =
    mutableChannelWithInitialValue<Record<string, PriceUpdate>>(initialPrices);
  const priceCache = new Map<string, PriceUpdate>(Object.entries(cachedPrices));
  for (const [symbol, update] of Object.entries(initialPrices)) {
    if (!priceCache.has(symbol)) {
      priceCache.set(symbol, update);
    }
  }

  const emit = (data: Record<string, PriceUpdate> | null) => {
    if (data) {
      for (const [symbol, update] of Object.entries(data)) {
        priceCache.set(symbol, update);
      }
    }
    channel.emit(data);
  };

  return {
    ...channel,
    emit,
    getSnapshotForSymbol: (symbol: string): PriceUpdate | null =>
      priceCache.get(symbol) ?? null,
    subscribeToSymbols: (params?: {
      callback?: (data: Record<string, PriceUpdate> | null) => void;
    }): (() => void) => {
      if (params?.callback) {
        return channel.subscribe({
          callback: params.callback,
        });
      }
      return noopUnsubscribe;
    },
  };
};

interface TestStreamManagerBundle {
  streamManager: PerpsStreamManager;
  stream: PerpsStreamControls;
}

const withStreamControls = <T extends object>(
  renderResult: T,
  stream: PerpsStreamControls,
) => ({
  ...renderResult,
  stream,
});

const typedPositions = (positions: unknown[]): Position[] =>
  positions as Position[];

const typedOrders = (orders: unknown[]): Order[] => orders as Order[];

const typedMarkets = (markets: unknown[]): PerpsMarketData[] =>
  markets as PerpsMarketData[];

const typedAccount = (account: unknown): AccountState =>
  account as AccountState;

const createPricesChannel = (
  prices?: Record<string, PriceUpdate>,
  cachedPrices?: Record<string, PriceUpdate>,
) => pricesChannel(prices, cachedPrices);

const createAccountChannel = (account: unknown) =>
  mutableChannelWithInitialValue(typedAccount(account));

const createPositionsChannel = (positions: unknown[]) =>
  mutableChannelWithInitialValue(typedPositions(positions));

const createOrdersChannel = (orders: unknown[]) => {
  const channel = mutableChannelWithInitialValue(typedOrders(orders));

  return {
    ...channel,
    /** Optimistic patch used by Pro open-order edit (price/size). */
    updateOrderOptimistic: (orderId: string, patch: Partial<Order>): void => {
      const snapshot = channel.getSnapshot() ?? [];
      channel.emit(
        snapshot.map((order) =>
          order.orderId === orderId ? ({ ...order, ...patch } as Order) : order,
        ),
      );
    },
  };
};

const createMarketDataChannel = (marketData: unknown[]) =>
  mutableChannelWithInitialValue(typedMarkets(marketData));

/** Optional stream data overrides for view tests (e.g. initial positions for Market Details Close/Modify). */
export interface PerpsStreamOverrides {
  /** When set, usePerpsLiveAccount() receives this account state. */
  account?: unknown;
  /** When set, usePerpsLivePositions() receives this array (e.g. to show Close/Modify on Market Details). */
  positions?: unknown[];
  /** When set, usePerpsMarkets() receives this array (e.g. to test category badges in Market List: crypto + commodity). */
  marketData?: unknown[];
  /** When set, usePerpsLiveOrders() receives this array (e.g. to test CancelAllOrders with/without orders). */
  orders?: unknown[];
  /** When set, usePerpsLivePrices() receives these prices on first subscription. */
  prices?: Record<string, PriceUpdate>;
  /**
   * All-mids entries for `prices.getSnapshotForSymbol`. Not delivered to
   * `usePerpsLivePrices` until `emitPrices`.
   */
  cachedPrices?: Record<string, PriceUpdate>;
  /** Candle series for `candles.getCachedData`. Not a live candle subscription. */
  cachedCandles?: CandleData | null;
  /**
   * `candles.isChartCacheFresh` for `cachedCandles`. Defaults to true when a
   * series is seeded, otherwise false.
   */
  chartCacheFresh?: boolean;
  /** `focusedPrice.getSnapshot()` only. The live focused subscription stays empty. */
  cachedFocusedPrice?: PriceUpdate | null;
}

/** Creates a minimal stream manager double so views using usePerpsStream() render without WebSocket. */
function createTestStreamManager(
  streamOverrides?: PerpsStreamOverrides,
): TestStreamManagerBundle {
  const positions = createPositionsChannel(streamOverrides?.positions ?? []);
  const orders = createOrdersChannel(streamOverrides?.orders ?? []);
  const fills = mutableChannelWithInitialValue<OrderFill[]>([]);
  const marketData = createMarketDataChannel(
    streamOverrides?.marketData ?? initialMarketData,
  );
  const account = createAccountChannel(
    streamOverrides?.account ?? initialAccount,
  );
  const prices = createPricesChannel(
    streamOverrides?.prices,
    streamOverrides?.cachedPrices,
  );
  const cachedCandles = streamOverrides?.cachedCandles ?? null;
  const chartCacheFresh =
    streamOverrides?.chartCacheFresh ?? cachedCandles != null;

  const streamManager = {
    prices,
    orders,
    positions,
    fills,
    account,
    marketData,
    oiCaps: noopChannel(),
    topOfBook: topOfBookChannel(),
    focusedPrice: focusedPriceChannel(
      streamOverrides?.cachedFocusedPrice ?? null,
    ),
    candles: candlesChannel(cachedCandles, chartCacheFresh),
    retryOrderStreams: (): void => {
      orders.clearCache();
      fills.clearCache();
      orders.reconnect();
      fills.reconnect();
    },
    clearAllChannels: (): void => undefined,
  } as unknown as PerpsStreamManager;

  return {
    streamManager,
    stream: {
      emitAccount: account.emit,
      emitMarketData: marketData.emit,
      emitOrdersError: orders.emitError,
      emitFills: fills.emit,
      emitFillsError: fills.emitError,
      getOrdersReconnectCount: orders.getReconnectCount,
      getFillsReconnectCount: fills.getReconnectCount,
      getPositionsReconnectCount: positions.getReconnectCount,
      getAccountReconnectCount: account.getReconnectCount,
      // Mirror production stream channels: notify CUF matchers when test
      // doubles deliver positions/orders so place/cancel waits resolve.
      emitOrders: (nextOrders) => {
        orders.emit(nextOrders);
        handlePerpsCufOrdersDelivered(nextOrders ?? []);
      },
      emitPositions: (nextPositions) => {
        positions.emit(nextPositions);
        handlePerpsCufPositionsDelivered(nextPositions ?? []);
      },
      emitPrices: prices.emit,
    },
  };
}

/** Extra route for navigation assertions (e.g. MARKET_LIST so "See all perps" can be verified). */
export interface PerpsExtraRoute {
  name: string;
  Component?: React.ComponentType<unknown>;
  /** 'perps-root' registers under Routes.PERPS.ROOT nested navigator; default is root stack. */
  mount?: 'root' | 'perps-root';
}

interface RenderPerpsViewOptions {
  /** Mount the real toast component for rendered receipt and error assertions. */
  includeToasts?: boolean;
  overrides?: DeepPartial<RootState>;
  initialParams?: Record<string, unknown>;
  /** Optional stream overrides (e.g. positions for PerpsMarketDetailsView geo-restriction test). */
  streamOverrides?: PerpsStreamOverrides;
  /** Optional extra routes so navigation can be asserted (e.g. [{ name: Routes.PERPS.MARKET_LIST }]). */
  extraRoutes?: PerpsExtraRoute[];
  /** Selects the matching Perps state preset. */
  mode?: 'lite' | 'pro';
  /** Override the PerpsConnectionContext value. Useful for views that behave differently when disconnected or connecting. */
  connectionValue?: PerpsConnectionContextValue;
}

const DefaultRouteProbe =
  (routeName: string): React.ComponentType<unknown> =>
  () => <Text testID={`route-${routeName}`}>{routeName}</Text>;

/**
 * Renders a Perps view with preset state. State is driven by Redux; use overrides
 * to set e.g. PerpsController.isEligible for geo-restriction tests.
 * Wraps with PerpsConnectionProvider and PerpsStreamProvider so views that use
 * usePerpsStream() (e.g. PerpsMarketListView) render without errors.
 * When extraRoutes is provided, those routes are registered so navigation can be asserted.
 */
export function renderPerpsView(
  Component: React.ComponentType,
  routeName: string,
  options: RenderPerpsViewOptions = {},
) {
  const {
    overrides,
    initialParams,
    streamOverrides,
    extraRoutes,
    mode,
    connectionValue,
    includeToasts,
  } = options;
  const builder = mode === 'pro' ? initialStatePerpsPro() : initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  setTestMarketContext(state, true);
  const { streamManager: testStreamManager, stream } =
    createTestStreamManager(streamOverrides);
  const queryClient = createPerpsQueryClient();

  const WrappedComponent = (props: Record<string, unknown>) => (
    <PerpsTestProviders
      queryClient={queryClient}
      streamManager={testStreamManager}
      connectionValue={connectionValue}
      includeToasts={includeToasts && !extraRoutes?.length}
    >
      <Component {...props} />
    </PerpsTestProviders>
  );

  const wrapRouteWithPerpsProviders = (
    RouteComponent: React.ComponentType<unknown>,
  ) => {
    const WrappedRoute = (props: Record<string, unknown>) => (
      <PerpsTestProviders
        queryClient={queryClient}
        streamManager={testStreamManager}
      >
        <RouteComponent {...props} />
      </PerpsTestProviders>
    );
    return WrappedRoute as unknown as React.ComponentType;
  };

  if (extraRoutes?.length) {
    const Stack = createNativeStackNavigator();
    const InnerStack = createNativeStackNavigator();
    const nestedPerpsRoutes = extraRoutes.filter(
      ({ mount }) => mount === 'perps-root',
    );
    const rootRoutes = extraRoutes.filter(
      ({ mount }) => mount !== 'perps-root',
    );
    // Some Perps views navigate via navigation.navigate(PERPS.ROOT, { screen: MARKET_LIST }).
    // So we register PERPS.ROOT as a nested stack containing the extra routes; then
    // navigating to ROOT with screen: MARKET_LIST shows the route probe.
    const nestedScreens = (
      <>
        {nestedPerpsRoutes.map(({ name, Component: Extra }) => (
          // Extra routes can render real views (not only probes), so keep provider parity.
          <InnerStack.Screen
            key={name}
            name={name}
            component={wrapRouteWithPerpsProviders(
              Extra ?? DefaultRouteProbe(name),
            )}
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
        {rootRoutes.map(({ name, Component: Extra }) => (
          <Stack.Screen
            key={`root-${name}`}
            name={name}
            component={wrapRouteWithPerpsProviders(
              Extra ?? DefaultRouteProbe(name),
            )}
          />
        ))}
        {nestedPerpsRoutes.length ? (
          <Stack.Screen
            name={Routes.PERPS.ROOT}
            component={NestedPerpsStack as unknown as React.ComponentType}
          />
        ) : null}
      </Stack.Navigator>
    );
    // App toasts outlive the submitting route and remain visible after navigation.
    const navigationTree = includeToasts ? (
      <PerpsTestToastHost>{stackTree}</PerpsTestToastHost>
    ) : (
      stackTree
    );
    return withStreamControls(
      renderWithProvider(navigationTree, { state }),
      stream,
    );
  }

  return withStreamControls(
    renderComponentViewScreen(
      WrappedComponent as unknown as React.ComponentType,
      { name: routeName },
      { state },
      initialParams,
    ),
    stream,
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

export const ROUTE_ORDER_CONFIRMATION_TEST_ID = 'route-order-confirmation';

const selectModifyActionExtraRoutes = [
  { name: Routes.PERPS.CLOSE_POSITION },
  { name: Routes.PERPS.ADJUST_MARGIN },
  { name: Routes.PERPS.TUTORIAL },
  {
    name: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
    Component: () => (
      <Text testID={ROUTE_ORDER_CONFIRMATION_TEST_ID}>Order</Text>
    ),
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
  openInterest: '$500M',
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
    extraRoutes?: PerpsExtraRoute[];
  } = {},
) {
  const {
    overrides = defaultGeoRestrictionOverrides,
    initialParams = { market: defaultMarketDetailsMarket },
    streamOverrides = { positions: [defaultSelectModifyActionPosition] },
    extraRoutes,
  } = options;
  return renderPerpsView(
    PerpsMarketDetailsView as unknown as React.ComponentType,
    'PerpsMarketDetails',
    { overrides, initialParams, streamOverrides, extraRoutes },
  );
}

const defaultProMarket = {
  ...defaultMarketDetailsMarket,
  providerId: 'hyperliquid' as const,
  szDecimals: 2,
};

const defaultProPrices: Record<string, PriceUpdate> = {
  ETH: {
    symbol: 'ETH',
    price: '2500',
    markPrice: '2500',
    percentChange24h: '2',
    timestamp: 1,
    isTradable: true,
  },
};

/**
 * Renders PerpsProMarketView with Pro state and live price fixtures.
 */
export function renderPerpsProMarketView(options: RenderPerpsViewOptions = {}) {
  return renderPerpsView(
    PerpsProMarketView as unknown as React.ComponentType,
    Routes.PERPS.MARKET_DETAILS,
    {
      ...options,
      mode: 'pro',
      initialParams: {
        market: defaultProMarket,
        ...options.initialParams,
      },
      streamOverrides: {
        marketData: [defaultProMarket],
        prices: defaultProPrices,
        ...options.streamOverrides,
      },
    },
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

/**
 * Renders PerpsClosePositionRouter. Use in PerpsClosePositionRouter.view.test.tsx.
 */
export function renderPerpsClosePositionRouter(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
  } = {},
) {
  const position = options.initialParams?.position ?? defaultPositionForViews;
  return renderPerpsView(
    PerpsClosePositionRouter as unknown as React.ComponentType,
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
  openInterest: '$500M',
  maxLeverage: '50x',
  marketType: 'crypto' as const,
};

/**
 * Renders PerpsOrderBookView. Use in PerpsOrderBookView.view.test.tsx.
 */
export function renderPerpsOrderBookView(options: RenderPerpsViewOptions = {}) {
  const initialParams = {
    symbol: defaultOrderBookMarket.symbol,
    marketData: defaultOrderBookMarket,
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
 * Hoisted so the sheet arm keeps a stable component identity across renders
 * rather than remounting on every call.
 */
const PerpsTPSLSheetView = () => <PerpsTPSLView variant="sheet" />;

/**
 * Renders PerpsTPSLView. Use in PerpsTPSLView.view.test.tsx.
 *
 * `variant` selects the A/B arm: omit it for the full-screen control, or pass
 * `sheet` for the bottom-sheet treatment.
 */
export function renderPerpsTPSLView(
  options: {
    overrides?: DeepPartial<RootState>;
    initialParams?: Record<string, unknown>;
    streamOverrides?: PerpsStreamOverrides;
    variant?: 'screen' | 'sheet';
  } = {},
) {
  const initialParams = {
    ...defaultTPSLParams,
    ...options.initialParams,
  };
  const Component =
    options.variant === 'sheet' ? PerpsTPSLSheetView : PerpsTPSLView;
  return renderPerpsView(
    Component as unknown as React.ComponentType,
    Routes.PERPS.TPSL,
    { ...options, initialParams, streamOverrides: options.streamOverrides },
  );
}

/** Minimal order for PerpsOrderDetailsView. */
export const defaultOrderDetailsOrder = {
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
 * Renders PerpsOrderView. Use in PerpsOrderView.view.test.tsx and flow tests.
 */
export function renderPerpsOrderView(options: RenderPerpsViewOptions = {}) {
  const initialParams = {
    direction: 'long',
    asset: 'ETH',
    amount: '100',
    leverage: 3,
    defaultSzDecimals: 2,
    defaultMaxLeverage: 50,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsOrderView as unknown as React.ComponentType,
    'PerpsOrderView',
    { ...options, initialParams },
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

/**
 * Renders PerpsSelectAdjustMarginActionView. Use in PerpsSelectAdjustMarginActionView.view.test.tsx.
 */
export function renderPerpsSelectAdjustMarginActionView(
  options: RenderPerpsViewOptions = {},
) {
  const initialParams = {
    position: defaultPositionForViews,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsSelectAdjustMarginActionView as unknown as React.ComponentType,
    Routes.PERPS.SELECT_ADJUST_MARGIN_ACTION,
    { ...options, initialParams },
  );
}

/**
 * Renders PerpsTooltipView with a given contentKey. Use in PerpsTooltipView.view.test.tsx.
 */
export function renderPerpsTooltipView(
  options: RenderPerpsViewOptions & {
    contentKey?: string;
    tooltipData?: Record<string, unknown>;
  } = {},
) {
  const initialParams = {
    contentKey: options.contentKey ?? 'leverage',
    data: options.tooltipData,
    ...options.initialParams,
  };
  return renderPerpsView(
    PerpsTooltipView as unknown as React.ComponentType,
    Routes.PERPS.MODALS.TOOLTIP,
    { ...options, initialParams },
  );
}

/**
 * Renders PerpsCrossMarginWarningBottomSheet. Use in view tests for cross-margin warning.
 */
export function renderPerpsCrossMarginWarningView(
  options: RenderPerpsViewOptions = {},
) {
  return renderPerpsView(
    PerpsCrossMarginWarningBottomSheet as unknown as React.ComponentType,
    Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
    options,
  );
}

/**
 * Renders a standalone Perps component (not a View) wrapped with Redux, connection, and stream providers.
 * Use for components like PerpsBadge, PerpsFillTag, etc. that are not routed views.
 */
export function renderPerpsComponent(
  Component: React.ComponentType<Record<string, unknown>>,
  props: Record<string, unknown> = {},
  options: RenderPerpsViewOptions = {},
) {
  const { overrides, streamOverrides } = options;
  const builder = initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  setTestMarketContext(state, true);
  const { streamManager: testStreamManager, stream } =
    createTestStreamManager(streamOverrides);
  const queryClient = createPerpsQueryClient();

  const WrappedComponent = () => (
    <PerpsTestProviders
      queryClient={queryClient}
      streamManager={testStreamManager}
    >
      <Component {...props} />
    </PerpsTestProviders>
  );

  return withStreamControls(
    renderComponentViewScreen(
      WrappedComponent as unknown as React.ComponentType,
      { name: 'PerpsComponentTestRoute' },
      { state },
    ),
    stream,
  );
}

/**
 * Same as renderPerpsComponent but with a disconnected connection context for error state tests.
 */
export function renderPerpsComponentDisconnected(
  Component: React.ComponentType<Record<string, unknown>>,
  props: Record<string, unknown> = {},
  options: RenderPerpsViewOptions = {},
) {
  const { overrides, streamOverrides } = options;
  const builder = initialStatePerps();
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();
  setTestMarketContext(state, false);
  const { streamManager: testStreamManager, stream } =
    createTestStreamManager(streamOverrides);
  const queryClient = createPerpsQueryClient();

  const disconnectedValue: PerpsConnectionContextValue = {
    ...testConnectionValue,
    isConnected: false,
    isConnecting: false,
    isInitialized: false,
    error: 'Simulated connection error',
  };

  const WrappedComponent = () => (
    <PerpsTestProviders
      connectionValue={disconnectedValue}
      queryClient={queryClient}
      streamManager={testStreamManager}
    >
      <Component {...props} />
    </PerpsTestProviders>
  );

  return withStreamControls(
    renderComponentViewScreen(
      WrappedComponent as unknown as React.ComponentType,
      { name: 'PerpsComponentDisconnectedTestRoute' },
      { state },
    ),
    stream,
  );
}

/** Default order for tests that need stream orders. */
export const defaultOrderForViews: Order = {
  orderId: 'order_view_1',
  symbol: 'ETH',
  side: 'buy' as const,
  orderType: 'limit' as const,
  size: '1.5',
  originalSize: '1.5',
  price: '2500',
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
  remainingSize: '1.5',
} as Order;
