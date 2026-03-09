import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsSection, { positionDisplayKey } from './PerpsSection';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';

const mockNavigate = jest.fn();
const mockTrack = jest.fn();

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: () => false,
}));

jest.mock('../../../../UI/Perps/hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({
    track: mockTrack,
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../UI/Perps/hooks', () => ({
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
  usePerpsLiveOrders: jest.fn(() => ({
    orders: [],
    isInitialLoading: false,
  })),
  usePerpsMarkets: jest.fn(() => ({
    markets: [],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    isRefreshing: false,
  })),
}));

jest.mock('react-native-skeleton-placeholder', () => {
  const { View } = jest.requireActual('react-native');
  return function MockSkeletonPlaceholder({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <View testID="skeleton-placeholder">{children}</View>;
  };
});

jest.mock('../../../../UI/Perps/components/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="token-logo" />,
  };
});

jest.mock('../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ maxLeverage }: { maxLeverage: string }) => (
      <Text>{maxLeverage}</Text>
    ),
  };
});

jest.mock('../../../../UI/Perps/components/PerpsCard', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      order,
      testID,
    }: {
      order: { symbol: string; side: string; orderId: string };
      testID: string;
    }) => (
      <TouchableOpacity testID={testID}>
        <Text>
          {order.symbol} {order.side === 'buy' ? 'long' : 'short'} order
        </Text>
      </TouchableOpacity>
    ),
  };
});

const mockReconnectWithNewContext = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../../UI/Perps/hooks/usePerpsConnection', () => ({
  usePerpsConnection: jest.fn(() => ({
    isConnected: true,
    isConnecting: false,
    isInitialized: true,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    resetError: jest.fn(),
    reconnectWithNewContext: mockReconnectWithNewContext,
  })),
}));

const { usePerpsConnection } = jest.requireMock(
  '../../../../UI/Perps/hooks/usePerpsConnection',
);

jest.mock('./hooks/useHomepageSparklines', () => ({
  useHomepageSparklines: jest.fn(() => ({
    sparklines: {},
    refresh: jest.fn(),
  })),
}));

jest.mock('./components/PerpsMarketTileCard', () => {
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      market,
      testID,
      onPress,
      showFavoriteTag,
    }: {
      market: { symbol: string };
      testID?: string;
      onPress?: (m: { symbol: string }) => void;
      showFavoriteTag?: boolean;
    }) => (
      <TouchableOpacity
        testID={testID ?? `perps-market-tile-${market.symbol}`}
        onPress={() => onPress?.(market)}
      >
        <Text>{market.symbol}</Text>
        {showFavoriteTag && <View testID={`favorite-badge-${market.symbol}`} />}
      </TouchableOpacity>
    ),
  };
});

jest.mock('../../components/FadingScrollContainer', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
    }: {
      children: (props: {
        onScroll: () => void;
        scrollEventThrottle: number;
      }) => React.ReactNode;
    }) => (
      <View testID="fading-scroll-container">
        {children({ onScroll: jest.fn(), scrollEventThrottle: 16 })}
      </View>
    ),
  };
});

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: Record<string, unknown>) => (
      <View {...props}>{children as React.ReactNode}</View>
    ),
  };
});

const { usePerpsLivePositions, usePerpsLiveOrders, usePerpsMarkets } =
  jest.requireMock('../../../../UI/Perps/hooks');

const makePosition = (overrides: Record<string, unknown> = {}) => ({
  symbol: 'BTC',
  size: '-0.0015',
  entryPrice: '98500',
  positionValue: '100',
  unrealizedPnl: '9.4',
  marginUsed: '10',
  leverage: { type: 'isolated', value: 10 },
  liquidationPrice: '108000',
  maxLeverage: 50,
  returnOnEquity: '0.094',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitPrice: undefined,
  stopLossPrice: undefined,
  takeProfitCount: 0,
  stopLossCount: 0,
  ...overrides,
});

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  orderId: 'order-1',
  symbol: 'SOL',
  side: 'buy',
  orderType: 'limit',
  size: '10',
  originalSize: '10',
  price: '180',
  filledSize: '0',
  remainingSize: '10',
  status: 'open',
  timestamp: 1700000000,
  ...overrides,
});

const mockUseHomeViewedEvent = jest.requireMock(
  '../../hooks/useHomeViewedEvent',
).default as jest.Mock;

const makeTrendingMarket = (overrides: Record<string, unknown> = {}) => ({
  symbol: 'BTC',
  name: 'Bitcoin',
  maxLeverage: '50x',
  price: '$52,000',
  change24h: '+$2,000',
  change24hPercent: '+4.00%',
  volume: '$2.5B',
  volumeNumber: 2500000000,
  ...overrides,
});

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
  },
}));

describe('positionDisplayKey', () => {
  it('returns stable key from position display fields', () => {
    const position = makePosition({
      symbol: 'BTC',
      entryPrice: '98500',
      size: '-0.0015',
      unrealizedPnl: '9.4',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
    }) as Parameters<typeof positionDisplayKey>[0];
    expect(positionDisplayKey(position)).toBe('BTC:98500:-0.0015:9.4::');
  });

  it('uses empty string for undefined optional fields', () => {
    const position = makePosition({
      symbol: 'ETH',
      entryPrice: undefined,
      size: '1',
      unrealizedPnl: undefined,
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
    }) as Parameters<typeof positionDisplayKey>[0];
    expect(positionDisplayKey(position)).toBe('ETH::1:::');
  });

  it('includes takeProfitPrice and stopLossPrice when set', () => {
    const position = makePosition({
      symbol: 'SOL',
      entryPrice: '180',
      size: '10',
      unrealizedPnl: '-5',
      takeProfitPrice: '200',
      stopLossPrice: '160',
    }) as Parameters<typeof positionDisplayKey>[0];
    expect(positionDisplayKey(position)).toBe('SOL:180:10:-5:200:160');
  });

  it('returns different keys when display-relevant fields differ', () => {
    const base = makePosition({ symbol: 'BTC' }) as Parameters<
      typeof positionDisplayKey
    >[0];
    const withPnl = makePosition({
      symbol: 'BTC',
      unrealizedPnl: '100',
    }) as Parameters<typeof positionDisplayKey>[0];
    expect(positionDisplayKey(base)).not.toBe(positionDisplayKey(withPnl));
  });

  it('returns same key when only non-display fields differ', () => {
    const a = makePosition({
      symbol: 'BTC',
      entryPrice: '50000',
      size: '1',
      unrealizedPnl: '100',
      positionValue: '50000',
    }) as Parameters<typeof positionDisplayKey>[0];
    const b = makePosition({
      symbol: 'BTC',
      entryPrice: '50000',
      size: '1',
      unrealizedPnl: '100',
      positionValue: '99999',
    }) as Parameters<typeof positionDisplayKey>[0];
    expect(positionDisplayKey(a)).toBe(positionDisplayKey(b));
  });
});

describe('PerpsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
    usePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
    usePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
  });

  it('renders section title', () => {
    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
  });

  it('renders live positions', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', size: '-0.0015' }),
        makePosition({
          symbol: 'ETH',
          size: '0.03',
          entryPrice: '3200',
          leverage: { type: 'isolated', value: 40 },
          takeProfitPrice: '3680',
          stopLossPrice: '2720',
        }),
      ],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Short BTC')).toBeOnTheScreen();
    expect(screen.getByText('Long ETH')).toBeOnTheScreen();
  });

  it('shows leverage badges', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', size: '-1' }),
        makePosition({
          symbol: 'ETH',
          size: '1',
          leverage: { type: 'isolated', value: 40 },
        }),
      ],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('10X short')).toBeOnTheScreen();
    expect(screen.getByText('40X long')).toBeOnTheScreen();
  });

  it('shows TP/SL immediately when any position has TP/SL data', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC' }),
        makePosition({
          symbol: 'ETH',
          size: '0.03',
          entryPrice: '3200',
          takeProfitPrice: '3680',
          stopLossPrice: '2720',
        }),
      ],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('TP 15%, SL 15%')).toBeOnTheScreen();
    expect(screen.getByText('No TP/SL')).toBeOnTheScreen();
    expect(screen.queryByTestId('tp-sl-skeleton')).toBeNull();
  });

  it('shows TP/SL skeleton when no position has TP/SL data yet', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [makePosition({ symbol: 'BTC' })],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('tp-sl-skeleton')).toBeOnTheScreen();
    expect(screen.queryByText('No TP/SL')).toBeNull();
  });

  it('shows "No TP/SL" after fallback timeout settles', () => {
    jest.useFakeTimers();

    try {
      usePerpsLivePositions.mockReturnValue({
        positions: [makePosition({ symbol: 'BTC' })],
        isInitialLoading: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByTestId('tp-sl-skeleton')).toBeOnTheScreen();

      act(() => {
        jest.advanceTimersByTime(5500);
      });

      expect(screen.getByText('No TP/SL')).toBeOnTheScreen();
      expect(screen.queryByTestId('tp-sl-skeleton')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows position value and ROE', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition(),
        makePosition({ symbol: 'ETH', size: '0.03' }),
      ],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    const roeElements = screen.getAllByText('+9.40%');
    expect(roeElements.length).toBeGreaterThanOrEqual(2);
  });

  it('navigates to perps home on title press with home_section source', () => {
    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Perpetuals'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: 'home_section' },
    });
  });

  it('navigates with full market data when market is available', () => {
    const fullMarket = {
      symbol: 'BTC',
      maxLeverage: 50,
      marketType: 'crypto',
      marketSource: 'HyperLiquid',
      volumeNumber: 1000000,
    };
    usePerpsLivePositions.mockReturnValue({
      positions: [makePosition()],
      isInitialLoading: false,
    });
    usePerpsMarkets.mockReturnValue({
      markets: [fullMarket],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByTestId('perps-position-row-BTC'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: fullMarket,
        initialTab: 'position',
        source: 'section_position',
      },
    });
  });

  it('falls back to partial market when market is unavailable', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [makePosition()],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByTestId('perps-position-row-BTC'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: { symbol: 'BTC', maxLeverage: 50 },
        initialTab: 'position',
        source: 'section_position',
      },
    });
  });

  it('fires PERPS_UI_INTERACTION event when a position is pressed', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [makePosition()],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByTestId('perps-position-row-BTC'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.OPEN_POSITION,
        [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]:
          PERPS_EVENT_VALUE.BUTTON_LOCATION.WALLET_HOME,
      },
    );
  });

  it('limits items to max 5 (positions first, then orders)', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', size: '-1' }),
        makePosition({ symbol: 'ETH', size: '1' }),
        makePosition({ symbol: 'SOL', size: '10' }),
        makePosition({ symbol: 'DOGE', size: '-50000' }),
        makePosition({ symbol: 'AVAX', size: '5' }),
        makePosition({ symbol: 'LINK', size: '100' }),
      ],
      isInitialLoading: false,
    });
    usePerpsLiveOrders.mockReturnValue({
      orders: [makeOrder()],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Short BTC')).toBeOnTheScreen();
    expect(screen.getByText('Long ETH')).toBeOnTheScreen();
    expect(screen.getByText('Long SOL')).toBeOnTheScreen();
    expect(screen.getByText('Short DOGE')).toBeOnTheScreen();
    expect(screen.getByText('Long AVAX')).toBeOnTheScreen();
    expect(screen.queryByText('Long LINK')).toBeNull();
    expect(screen.queryByTestId('perps-order-row-order-1')).toBeNull();
  });

  it('renders orders in remaining slots after positions', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [
        makePosition({ symbol: 'BTC', size: '-1' }),
        makePosition({ symbol: 'ETH', size: '1' }),
      ],
      isInitialLoading: false,
    });
    usePerpsLiveOrders.mockReturnValue({
      orders: [
        makeOrder({ orderId: 'o1', symbol: 'SOL', side: 'buy' }),
        makeOrder({ orderId: 'o2', symbol: 'DOGE', side: 'sell' }),
      ],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Short BTC')).toBeOnTheScreen();
    expect(screen.getByText('Long ETH')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-order-row-o1')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-order-row-o2')).toBeOnTheScreen();
  });

  it('renders orders when there are no positions', () => {
    usePerpsLiveOrders.mockReturnValue({
      orders: [makeOrder({ orderId: 'o1', symbol: 'SOL', side: 'buy' })],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('perps-order-row-o1')).toBeOnTheScreen();
  });

  it('shows skeleton placeholder while positions are loading', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: true,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('homepage-perps-positions'),
    ).not.toBeOnTheScreen();
  });

  it('shows skeleton placeholder while orders are loading', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
    usePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: true,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('homepage-perps-positions'),
    ).not.toBeOnTheScreen();
  });

  it('shows skeleton while markets are loading and user has no positions', () => {
    usePerpsMarkets.mockReturnValue({
      markets: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('skeleton-placeholder')).toBeOnTheScreen();
    expect(screen.queryByTestId('homepage-trending-perps-carousel')).toBeNull();
  });

  it('hides skeleton and shows content after data loads', () => {
    usePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });

    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.queryByTestId('skeleton-placeholder')).not.toBeOnTheScreen();
  });

  it('uses 5000ms throttle for WebSocket subscriptions', () => {
    renderWithProvider(
      <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(usePerpsLivePositions).toHaveBeenCalledWith({
      throttleMs: 5000,
    });
    expect(usePerpsLiveOrders).toHaveBeenCalledWith({
      hideTpSl: true,
      throttleMs: 5000,
    });
  });

  describe('Trending Perps Carousel', () => {
    const makeTrendingMarket = (overrides: Record<string, unknown> = {}) => ({
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$52,000',
      change24h: '+$2,000',
      change24hPercent: '+4.00%',
      volume: '$2.5B',
      volumeNumber: 2500000000,
      ...overrides,
    });

    it('shows trending carousel when user has no positions or orders', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
          makeTrendingMarket({ symbol: 'ETH', volumeNumber: 3000000000 }),
          makeTrendingMarket({ symbol: 'SOL', volumeNumber: 1000000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        screen.getByTestId('homepage-trending-perps-carousel'),
      ).toBeOnTheScreen();
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
    });

    it('does not show trending carousel when user has positions', () => {
      usePerpsLivePositions.mockReturnValue({
        positions: [makePosition()],
        isInitialLoading: false,
      });
      usePerpsMarkets.mockReturnValue({
        markets: [makeTrendingMarket()],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        screen.queryByTestId('homepage-trending-perps-carousel'),
      ).toBeNull();
      expect(screen.getByTestId('homepage-perps-positions')).toBeOnTheScreen();
    });

    it('does not show trending carousel when user has orders', () => {
      usePerpsLiveOrders.mockReturnValue({
        orders: [makeOrder()],
        isInitialLoading: false,
      });
      usePerpsMarkets.mockReturnValue({
        markets: [makeTrendingMarket()],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        screen.queryByTestId('homepage-trending-perps-carousel'),
      ).toBeNull();
      expect(screen.getByTestId('homepage-perps-positions')).toBeOnTheScreen();
    });

    it('navigates to market details when tile is pressed', () => {
      const market = makeTrendingMarket({ symbol: 'SOL' });
      usePerpsMarkets.mockReturnValue({
        markets: [market],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent.press(screen.getByTestId('perps-market-tile-SOL'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market, source: 'home_section' },
      });
    });

    it('limits trending markets to 5', () => {
      const markets = Array.from({ length: 8 }, (_, i) =>
        makeTrendingMarket({
          symbol: `MKT${i}`,
          volumeNumber: 10000000 - i * 1000000,
        }),
      );
      usePerpsMarkets.mockReturnValue({
        markets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('MKT0')).toBeOnTheScreen();
      expect(screen.getByText('MKT4')).toBeOnTheScreen();
      expect(screen.queryByText('MKT5')).toBeNull();
    });

    it('renders "View more" card at the end of the carousel', () => {
      const markets = Array.from({ length: 4 }, (_, i) =>
        makeTrendingMarket({
          symbol: `MKT${i}`,
          volumeNumber: 10000000 - i * 1000000,
        }),
      );
      usePerpsMarkets.mockReturnValue({
        markets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByTestId('perps-view-more-card')).toBeOnTheScreen();
      expect(screen.getByText('View more')).toBeOnTheScreen();
    });

    it('navigates to perps home with home_screen source when "View more" card is pressed', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent.press(screen.getByTestId('perps-view-more-card'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: { source: 'home_section' },
      });
    });

    it('renders nothing when no positions, orders, or markets', () => {
      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        screen.queryByTestId('homepage-perps-positions'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('homepage-trending-perps-carousel'),
      ).toBeNull();
    });
  });

  describe('Watchlist Markets in Carousel', () => {
    const makeTrendingMarket = (overrides: Record<string, unknown> = {}) => ({
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$52,000',
      change24h: '+$2,000',
      change24hPercent: '+4.00%',
      volume: '$2.5B',
      volumeNumber: 2500000000,
      ...overrides,
    });

    const watchlistState = (symbols: string[]) => ({
      engine: {
        backgroundState: {
          PerpsController: {
            watchlistMarkets: { mainnet: symbols, testnet: [] },
          },
        },
      },
    });

    it('shows watchlist market first in carousel with favorite badge', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
          makeTrendingMarket({ symbol: 'ETH', volumeNumber: 3000000000 }),
          makeTrendingMarket({ symbol: 'SOL', volumeNumber: 1000000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState(['SOL']),
        },
      );

      expect(
        screen.getByTestId('homepage-trending-perps-carousel'),
      ).toBeOnTheScreen();

      const allTiles = screen.getAllByTestId(/^perps-market-tile-/);
      expect(allTiles[0].props.testID).toBe('perps-market-tile-SOL');

      expect(screen.getByTestId('favorite-badge-SOL')).toBeOnTheScreen();
      expect(screen.queryByTestId('favorite-badge-BTC')).toBeNull();
      expect(screen.queryByTestId('favorite-badge-ETH')).toBeNull();
    });

    it('shows multiple watchlist markets before trending markets', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
          makeTrendingMarket({ symbol: 'ETH', volumeNumber: 3000000000 }),
          makeTrendingMarket({ symbol: 'SOL', volumeNumber: 1000000000 }),
          makeTrendingMarket({ symbol: 'DOGE', volumeNumber: 500000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState(['SOL', 'DOGE']),
        },
      );

      const allTiles = screen.getAllByTestId(/^perps-market-tile-/);
      const symbols = allTiles.map((t) =>
        t.props.testID.replace('perps-market-tile-', ''),
      );

      expect(symbols.indexOf('SOL')).toBeLessThan(symbols.indexOf('BTC'));
      expect(symbols.indexOf('DOGE')).toBeLessThan(symbols.indexOf('BTC'));

      expect(screen.getByTestId('favorite-badge-SOL')).toBeOnTheScreen();
      expect(screen.getByTestId('favorite-badge-DOGE')).toBeOnTheScreen();
    });

    it('excludes watchlist markets from trending to avoid duplicates', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
          makeTrendingMarket({ symbol: 'ETH', volumeNumber: 3000000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState(['BTC']),
        },
      );

      const allTiles = screen.getAllByTestId(/^perps-market-tile-/);
      const symbols = allTiles.map((t) =>
        t.props.testID.replace('perps-market-tile-', ''),
      );

      const btcOccurrences = symbols.filter((s) => s === 'BTC').length;
      expect(btcOccurrences).toBe(1);
    });

    it('respects max 5 total tiles including watchlist', () => {
      const markets = Array.from({ length: 8 }, (_, i) =>
        makeTrendingMarket({
          symbol: `MKT${i}`,
          volumeNumber: 10000000 - i * 1000000,
        }),
      );
      usePerpsMarkets.mockReturnValue({
        markets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState(['MKT5', 'MKT6']),
        },
      );

      const allTiles = screen.getAllByTestId(/^perps-market-tile-/);
      expect(allTiles).toHaveLength(5);

      expect(screen.getByText('MKT5')).toBeOnTheScreen();
      expect(screen.getByText('MKT6')).toBeOnTheScreen();
    });

    it('renders only trending when watchlist is empty', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
          makeTrendingMarket({ symbol: 'ETH', volumeNumber: 3000000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState([]),
        },
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.queryByTestId('favorite-badge-BTC')).toBeNull();
      expect(screen.queryByTestId('favorite-badge-ETH')).toBeNull();
    });

    it('caps at 5 tiles even when watchlist exceeds max carousel size', () => {
      const markets = Array.from({ length: 7 }, (_, i) =>
        makeTrendingMarket({
          symbol: `MKT${i}`,
          volumeNumber: 10000000 - i * 1000000,
        }),
      );
      usePerpsMarkets.mockReturnValue({
        markets,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState([
            'MKT0',
            'MKT1',
            'MKT2',
            'MKT3',
            'MKT4',
            'MKT5',
          ]),
        },
      );

      const allTiles = screen.getAllByTestId(/^perps-market-tile-/);
      expect(allTiles).toHaveLength(5);

      expect(screen.queryByTestId('favorite-badge-MKT6')).toBeNull();
      expect(screen.queryByText('MKT6')).toBeNull();
      // MKT5 is the 6th watchlist item, truncated by the cap
      expect(screen.queryByText('MKT5')).toBeNull();
    });

    it('ignores watchlist symbols not present in market data', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC', volumeNumber: 5000000000 }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
        {
          state: watchlistState(['NONEXISTENT']),
        },
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('favorite-badge-BTC')).toBeNull();
      expect(screen.queryByTestId('favorite-badge-NONEXISTENT')).toBeNull();
    });
  });

  describe('connection error state', () => {
    it('renders ErrorState with section title when connection fails', () => {
      usePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'CONNECTION_TIMEOUT',
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: mockReconnectWithNewContext,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
      expect(screen.getByText('Unable to load perpetuals')).toBeOnTheScreen();
      expect(screen.getByText('Retry')).toBeOnTheScreen();
    });

    it('calls reconnectWithNewContext with force on retry', () => {
      usePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'CONNECTION_TIMEOUT',
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: mockReconnectWithNewContext,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent.press(screen.getByText('Retry'));

      expect(mockReconnectWithNewContext).toHaveBeenCalledWith({
        force: true,
      });
    });

    it('triggers reconnect on pull-to-refresh when connection error exists', async () => {
      usePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'CONNECTION_TIMEOUT',
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: mockReconnectWithNewContext,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} ref={ref} />,
      );

      await ref.current?.refresh();

      expect(mockReconnectWithNewContext).toHaveBeenCalledWith({
        force: true,
      });
    });

    it('does not render positions or carousel when connection error exists', () => {
      usePerpsConnection.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'NETWORK_ERROR',
        connect: jest.fn(),
        disconnect: jest.fn(),
        resetError: jest.fn(),
        reconnectWithNewContext: mockReconnectWithNewContext,
      });
      usePerpsLivePositions.mockReturnValue({
        positions: [makePosition()],
        isInitialLoading: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        screen.queryByTestId('homepage-perps-positions'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId('homepage-trending-perps-carousel'),
      ).toBeNull();
    });
  });

  describe('segment event integration', () => {
    it('passes sectionName, sectionIndex, and totalSectionsLoaded', () => {
      renderWithProvider(
        <PerpsSection sectionIndex={2} totalSectionsLoaded={4} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionName: 'perps',
          sectionIndex: 2,
          totalSectionsLoaded: 4,
        }),
      );
    });

    it('passes isLoading: true while positions are loading', () => {
      usePerpsLivePositions.mockReturnValue({
        positions: [],
        isInitialLoading: true,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isLoading: true }),
      );
    });

    it('passes isLoading: true while orders are loading', () => {
      usePerpsLiveOrders.mockReturnValue({
        orders: [],
        isInitialLoading: true,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isLoading: true }),
      );
    });

    it('passes isLoading: true while markets load when user has no positions or orders (pendingTrending)', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isLoading: true }),
      );
    });

    it('passes isLoading: false once all data has settled', () => {
      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isLoading: false }),
      );
    });

    it('passes isEmpty: true and itemCount: 0 when no positions, orders, or markets', () => {
      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isEmpty: true, itemCount: 0 }),
      );
    });

    it('passes isEmpty: false and itemCount when user has positions', () => {
      usePerpsLivePositions.mockReturnValue({
        positions: [makePosition(), makePosition({ symbol: 'ETH', size: '1' })],
        isInitialLoading: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isEmpty: false, itemCount: 2 }),
      );
    });

    it('combines positions and orders in itemCount', () => {
      usePerpsLivePositions.mockReturnValue({
        positions: [makePosition()],
        isInitialLoading: false,
      });
      usePerpsLiveOrders.mockReturnValue({
        orders: [
          makeOrder({ orderId: 'o1' }),
          makeOrder({ orderId: 'o2', symbol: 'ETH' }),
        ],
        isInitialLoading: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isEmpty: false, itemCount: 3 }),
      );
    });

    it('passes isEmpty: false when trending markets are shown', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [makeTrendingMarket()],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ isEmpty: false }),
      );
    });

    it('passes itemCount: 0 when only trending markets are shown (positions/orders not counted)', () => {
      usePerpsMarkets.mockReturnValue({
        markets: [
          makeTrendingMarket({ symbol: 'BTC' }),
          makeTrendingMarket({ symbol: 'ETH' }),
        ],
        isLoading: false,
        error: null,
        refresh: jest.fn(),
        isRefreshing: false,
      });

      renderWithProvider(
        <PerpsSection sectionIndex={0} totalSectionsLoaded={5} />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ itemCount: 0 }),
      );
    });
  });
});
