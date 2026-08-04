import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { Box, ButtonBase } from '@metamask/design-system-react-native';
import {
  CandlePeriod,
  PerpsMode,
  type Order,
  type Position,
} from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsProMarketView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  getPerpsProOrderRowSelector,
  getPerpsProPositionRowSelector,
  PerpsBalanceBottomSheetSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
} from '../../Perps.testIds';
import type { UsePerpsMarketsOptions } from '../../hooks/usePerpsMarkets';

interface MockRouteParams {
  market?: {
    symbol: string;
    price?: string;
    name?: string;
    maxLeverage?: string;
  };
  source?: string;
  source_section?: string;
}

interface MockChartPanelProps {
  symbol: string;
  selectedCandlePeriod: CandlePeriod;
  onMorePress: () => void;
}

interface MockCandlePeriodBottomSheetProps {
  isVisible: boolean;
  selectedPeriod: CandlePeriod;
  onClose: () => void;
  onPeriodChange: (period: CandlePeriod) => void;
  testID?: string;
}

interface MockBalanceBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

interface MockOrderFormPanelProps {
  isOrderBookCollapsed?: boolean;
  onExpandOrderBook?: () => void;
}

let mockRouteParams: MockRouteParams | undefined = {
  market: {
    symbol: 'BTC',
    price: '$90,000.00',
    name: 'Bitcoin',
    maxLeverage: '40x',
  },
};
const mockTrack = jest.fn();
const mockSetParams = jest.fn();
const mockUsePerpsEventTracking = jest.fn((_options?: unknown) => ({
  track: mockTrack,
}));

const mockHandleBackPress = jest.fn();
const mockHandleMarketListPress = jest.fn();
const mockHandleFavoritePress = jest.fn();
const mockHandlePerpsModeChange = jest.fn();
const mockHeaderPerpsMode = PerpsMode.Pro;

const mockPerpsProChartPanel = jest.fn(
  ({ symbol, onMorePress }: MockChartPanelProps) => (
    <>
      <Box
        testID={PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY}
        twClassName="h-[76px]"
      />
      <Box
        testID={PerpsProMarketViewSelectorsIDs.CHART_PANEL}
        accessibilityLabel={symbol}
      >
        <Box
          testID={PerpsProMarketViewSelectorsIDs.CHART_CONTENT}
          twClassName="h-[344px]"
        />
        <ButtonBase testID="mock-pro-chart-more-button" onPress={onMorePress}>
          <Box />
        </ButtonBase>
      </Box>
    </>
  ),
);

const mockCandlePeriodBottomSheet = jest.fn(
  ({
    isVisible,
    onClose,
    onPeriodChange,
    testID,
  }: MockCandlePeriodBottomSheetProps) =>
    isVisible ? (
      <Box testID={testID}>
        <ButtonBase
          testID="mock-more-period-option"
          onPress={() => onPeriodChange(CandlePeriod.FourHours)}
        >
          <Box />
        </ButtonBase>
        <ButtonBase testID="mock-more-period-close" onPress={onClose}>
          <Box />
        </ButtonBase>
      </Box>
    ) : null,
);

const mockBalanceBottomSheet = jest.fn(
  ({ isVisible, onClose }: MockBalanceBottomSheetProps) =>
    isVisible ? (
      <Box testID={PerpsBalanceBottomSheetSelectorsIDs.CONTAINER}>
        <ButtonBase testID="mock-balance-sheet-close" onPress={onClose}>
          <Box />
        </ButtonBase>
      </Box>
    ) : null,
);

jest.mock('./components/PerpsProChartPanel', () => ({
  __esModule: true,
  default: (props: MockChartPanelProps) => mockPerpsProChartPanel(props),
}));

jest.mock('../../components/PerpsBalanceBottomSheet', () => ({
  __esModule: true,
  default: (props: MockBalanceBottomSheetProps) =>
    mockBalanceBottomSheet(props),
}));
// The order-form panel now mounts its own provider + business hooks + sheets
// (order type, leverage, slippage). Its wiring is covered by
// PerpsProOrderFormPanel.test.tsx and usePerpsProOrderForm.test.ts; here we only
// need a lightweight placeholder so the layout scaffold assertions still pass.
jest.mock('./components/PerpsProOrderFormPanel', () => {
  const ReactActual = jest.requireActual('react');
  const { Box, ButtonBase } = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  const { PerpsProMarketViewSelectorsIDs: ids } = jest.requireActual(
    '../../Perps.testIds',
  );
  return {
    __esModule: true,
    default: ({
      isOrderBookCollapsed,
      onExpandOrderBook,
    }: MockOrderFormPanelProps) =>
      ReactActual.createElement(
        Box,
        { testID: ids.ORDER_FORM_PANEL },
        isOrderBookCollapsed
          ? ReactActual.createElement(
              ButtonBase,
              {
                testID: ids.ORDER_BOOK_EXPAND_BUTTON,
                onPress: onExpandOrderBook,
              },
              ReactActual.createElement(Box, null),
            )
          : null,
      ),
  };
});

jest.mock('../../components/PerpsCandlePeriodBottomSheet', () => ({
  __esModule: true,
  default: (props: MockCandlePeriodBottomSheetProps) =>
    mockCandlePeriodBottomSheet(props),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: (options?: unknown) =>
    mockUsePerpsEventTracking(options),
}));

jest.mock('../../hooks/usePerpsProMarketHeaderActions', () => ({
  usePerpsProMarketHeaderActions: jest.fn(() => ({
    perpsMode: mockHeaderPerpsMode,
    isWatchlist: false,
    handleBackPress: mockHandleBackPress,
    handleMarketListPress: mockHandleMarketListPress,
    handleFavoritePress: mockHandleFavoritePress,
    handlePerpsModeChange: mockHandlePerpsModeChange,
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({ params: mockRouteParams }),
    useNavigation: () => ({ setParams: mockSetParams }),
  };
});

// Live stream hooks used by the positions panel and stats bar; mock the barrel
// fully (no requireActual) so the view renders without a PerpsStreamProvider.
jest.mock('../../hooks/stream', () => ({
  usePerpsLiveAccount: jest.fn(() => ({
    account: null,
    isInitialLoading: false,
  })),
  usePerpsLiveOrders: jest.fn(() => ({
    orders: [],
    isInitialLoading: false,
  })),
  usePerpsLivePositions: jest.fn(() => ({
    positions: [],
    isInitialLoading: false,
  })),
  usePerpsLivePrices: jest.fn(() => ({})),
}));

jest.mock('../../hooks/usePerpsProPositionsPanelActions', () => ({
  usePerpsProPositionsPanelActions: jest.fn(() => ({
    handleClosePosition: jest.fn(),
    handleReversePosition: jest.fn(),
    handleSharePosition: jest.fn(),
    handleEditPositionTpSl: jest.fn(),
    handleEditPositionMargin: jest.fn(),
    handleCancelOrder: jest.fn(),
    handleCloseAllPress: jest.fn(),
    cancelingOrderId: null,
    isOrderCancelable: () => true,
    isPositionMarginEditable: () => true,
    renderActionSheets: () => null,
  })),
}));

jest.mock('../../hooks/stream/usePerpsLiveOrderBook', () => ({
  usePerpsLiveOrderBook: jest.fn(() => ({
    orderBook: null,
    isLoading: true,
    error: null,
    connectionStatus: 'connecting',
    reconnect: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePerpsOrderBookGrouping', () => ({
  usePerpsOrderBookGrouping: jest.fn(() => ({
    savedGrouping: undefined,
    saveGrouping: jest.fn(),
  })),
}));

// The default mock route already has a formatted `maxLeverage` ("40x"), so
// this enrichment hook's markets list is never actually consulted in most
// tests — mocked (rather than requireActual) to avoid needing a real
// PerpsStreamProvider in the tree, and overridable per-test via
// `mockUsePerpsMarketsImpl` for the enrichment test below.
const mockUsePerpsMarketsImpl = jest.fn(
  (_options?: UsePerpsMarketsOptions) => ({
    markets: [] as { symbol: string; maxLeverage: string }[],
    isLoading: false,
    error: null,
    refresh: jest.fn(),
    isRefreshing: false,
  }),
);
jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: (options?: UsePerpsMarketsOptions) =>
    mockUsePerpsMarketsImpl(options),
}));

jest.mock('../../hooks/usePerpsMarketStats', () => ({
  usePerpsMarketStats: jest.fn(() => ({
    high24h: '$50,000.00',
    low24h: '$45,000.00',
    volume24h: '$1,234,567.89',
    openInterest: '$987,654.32',
    fundingRate: '0.0125%',
    currentPrice: 90000,
    isLoading: false,
    refresh: jest.fn(),
  })),
}));

const mockUsePerpsLivePositions = jest.requireMock('../../hooks/stream')
  .usePerpsLivePositions as jest.Mock;
const mockUsePerpsLiveOrders = jest.requireMock('../../hooks/stream')
  .usePerpsLiveOrders as jest.Mock;

const ethPosition: Position = {
  symbol: 'ETH',
  size: '1.5',
  entryPrice: '2900',
  positionValue: '4350',
  unrealizedPnl: '150',
  marginUsed: '1450',
  leverage: { type: 'cross', value: 3 },
  liquidationPrice: '2500',
  maxLeverage: 50,
  returnOnEquity: '0.103',
  cumulativeFunding: { allTime: '0', sinceOpen: '0', sinceChange: '0' },
  takeProfitCount: 0,
  stopLossCount: 0,
};

const ethOrder: Order = {
  orderId: 'eth-order-1',
  symbol: 'ETH',
  side: 'buy',
  size: '1',
  originalSize: '1',
  filledSize: '0',
  remainingSize: '1',
  price: '3000',
  orderType: 'limit',
  status: 'open',
  timestamp: 1_711_756_800_000,
  reduceOnly: false,
  isTrigger: false,
  detailedOrderType: 'Limit',
};

const renderView = () =>
  renderWithProvider(<PerpsProMarketView />, {
    state: { engine: { backgroundState } },
  });

describe('PerpsProMarketView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {
      market: {
        symbol: 'BTC',
        price: '$90,000.00',
        name: 'Bitcoin',
        maxLeverage: '40x',
      },
    };
    mockUsePerpsMarketsImpl.mockReturnValue({
      markets: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [],
      isInitialLoading: false,
    });
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [],
      isInitialLoading: false,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('swaps the route market in place when a positions-panel row is tapped', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [ethPosition],
      isInitialLoading: false,
    });

    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(getPerpsProPositionRowSelector('ETH')));

    expect(mockSetParams).toHaveBeenCalledWith({
      market: { symbol: 'ETH' },
      source: PERPS_EVENT_VALUE.SOURCE.POSITION_TAB,
      source_section: PERPS_EVENT_VALUE.SOURCE_SECTION.POSITIONS,
    });
  });

  it('attributes order-row market switches with the orders source section', () => {
    mockUsePerpsLiveOrders.mockReturnValue({
      orders: [ethOrder],
      isInitialLoading: false,
    });

    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL_TAB_ORDERS),
    );
    fireEvent.press(getByTestId(getPerpsProOrderRowSelector('ETH', 0)));

    expect(mockSetParams).toHaveBeenCalledWith({
      market: { symbol: 'ETH' },
      source: PERPS_EVENT_VALUE.SOURCE.POSITION_TAB,
      source_section: PERPS_EVENT_VALUE.SOURCE_SECTION.ORDERS,
    });
  });

  it('ignores a row tap for the market already being displayed', () => {
    mockUsePerpsLivePositions.mockReturnValue({
      positions: [{ ...ethPosition, symbol: 'BTC' }],
      isInitialLoading: false,
    });

    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(getPerpsProPositionRowSelector('BTC')));

    expect(mockSetParams).not.toHaveBeenCalled();
  });

  it('scrolls to the top when the active market symbol changes', () => {
    const scrollToSpy = jest.spyOn(
      jest.requireActual('react-native').ScrollView.prototype,
      'scrollTo',
    );

    const { rerender } = renderView();
    scrollToSpy.mockClear();

    mockRouteParams = {
      market: {
        symbol: 'ETH',
        price: '$3,000.00',
        name: 'Ethereum',
        maxLeverage: '25x',
      },
    };
    rerender(<PerpsProMarketView />);

    expect(scrollToSpy).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  it.each([
    ['params', undefined],
    ['market', {}],
    ['symbol', { market: { symbol: '' } }],
  ] as const)(
    'renders the error state when route %s are invalid',
    (_missingField, params) => {
      mockRouteParams = params;

      const { getByTestId, queryByTestId, getByText } = renderView();

      expect(
        getByTestId(PerpsProMarketViewSelectorsIDs.ERROR),
      ).toBeOnTheScreen();
      expect(
        getByText('Market data not found. Please go back and try again.'),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER),
      ).not.toBeOnTheScreen();
    },
  );

  it('renders the screen inside every safe-area edge', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.CONTAINER)).toHaveProp(
      'edges',
      ['top', 'bottom', 'left', 'right'],
    );
  });

  it('tracks an attributed Pro market screen view', () => {
    renderView();

    expect(mockUsePerpsEventTracking).toHaveBeenCalledWith({
      eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
      resetKey: expect.stringMatching(/^BTC:/),
      conditions: [true],
      properties: expect.objectContaining({
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.ASSET_DETAILS,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        [PERPS_EVENT_PROPERTY.SOURCE]: PERPS_EVENT_VALUE.SOURCE.PERP_MARKETS,
        [PERPS_EVENT_PROPERTY.CHART_LIBRARY]: expect.any(String),
        [PERPS_EVENT_PROPERTY.ASSET_TYPE]: PERPS_EVENT_VALUE.ASSET_TYPE.PERP,
      }),
    });
  });

  it('renders every top-level scaffold slot', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.CHART_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.STATS_BAR_SCROLL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.POSITIONS_PANEL),
    ).toBeOnTheScreen();
  });

  it('dismisses the native keyboard interactively without swallowing taps', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW)).toHaveProp(
      'keyboardDismissMode',
      'interactive',
    );
    expect(getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW)).toHaveProp(
      'keyboardShouldPersistTaps',
      'handled',
    );
  });

  it('opens the More candle periods sheet from the chart', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId('mock-pro-chart-more-button'));

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.CHART_MORE_PERIODS_SHEET),
    ).toBeOnTheScreen();
  });

  it('mounts the More candle periods sheet outside the scroll view', () => {
    const { getByTestId } = renderView();
    fireEvent.press(getByTestId('mock-pro-chart-more-button'));
    const scrollView = getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW);

    const nestedSheet = within(scrollView).queryByTestId(
      PerpsProMarketViewSelectorsIDs.CHART_MORE_PERIODS_SHEET,
    );

    expect(nestedSheet).not.toBeOnTheScreen();
  });

  it('updates the chart period from the More candle periods sheet', () => {
    const { getByTestId } = renderView();
    fireEvent.press(getByTestId('mock-pro-chart-more-button'));

    fireEvent.press(getByTestId('mock-more-period-option'));

    expect(mockPerpsProChartPanel).toHaveBeenLastCalledWith(
      expect.objectContaining({
        selectedCandlePeriod: CandlePeriod.FourHours,
      }),
    );
  });

  it('closes the More candle periods sheet', () => {
    const { getByTestId, queryByTestId } = renderView();
    fireEvent.press(getByTestId('mock-pro-chart-more-button'));

    fireEvent.press(getByTestId('mock-more-period-close'));

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.CHART_MORE_PERIODS_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('keeps the header fixed while the market summary scrolls', () => {
    const { getByTestId } = renderView();

    const scrollView = getByTestId(PerpsProMarketViewSelectorsIDs.SCROLL_VIEW);

    expect(
      within(scrollView).queryByTestId(PerpsProMarketViewSelectorsIDs.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      within(scrollView).getByTestId(
        PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the asset name from route params in the header', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent(/^Bitcoin$/);
  });

  it('falls back to the display symbol when the market has no name', () => {
    mockRouteParams = { market: { symbol: 'xyz:TSLA' } };

    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent(/^TSLA$/);
  });

  it('enriches minimal route market data with maxLeverage from usePerpsMarkets', () => {
    // Some navigation sources (e.g. Recent Activity, deep links) pass
    // minimal market data without a formatted `maxLeverage`.
    mockRouteParams = { market: { symbol: 'BTC', name: 'Bitcoin' } };
    mockUsePerpsMarketsImpl.mockReturnValue({
      markets: [{ symbol: 'BTC', maxLeverage: '40x' }],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
      isRefreshing: false,
    });

    const { getByText } = renderView();

    expect(getByText('40x')).toBeOnTheScreen();
  });

  it('does not re-fetch markets when route data already has a formatted maxLeverage', () => {
    renderView();

    expect(mockUsePerpsMarketsImpl).toHaveBeenCalledWith(
      expect.objectContaining({ skipInitialFetch: true }),
    );
  });

  it('renders the redesigned header controls from Figma', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_ASSET_ICON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders the perp pair subtitle beneath the asset name', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE),
    ).toHaveTextContent('BTC-USD perp');
  });

  it('wires header actions from usePerpsProMarketHeaderActions', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON),
    );
    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON),
    );
    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    );

    expect(mockHandleBackPress).toHaveBeenCalledTimes(1);
    expect(mockHandleMarketListPress).toHaveBeenCalledTimes(1);
    expect(mockHandleFavoritePress).toHaveBeenCalledTimes(1);
  });

  it('opens and closes the balance bottom sheet from the wallet button', () => {
    const { getByTestId, queryByTestId } = renderView();

    expect(
      queryByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    );

    expect(
      getByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId('mock-balance-sheet-close'));

    expect(
      queryByTestId(PerpsBalanceBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('uses the Figma shell heights', () => {
    const { getByTestId } = renderView();

    expect(getByTestId(PerpsProMarketViewSelectorsIDs.HEADER)).toHaveStyle({
      height: 64,
    });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY),
    ).toHaveStyle({ height: 76 });
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.CHART_CONTENT),
    ).toHaveStyle({ height: 344 });
  });

  it('collapses the order book so the order form fills the trading area', () => {
    const { getByTestId, queryByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLLAPSE_BUTTON),
    );

    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PerpsProMarketViewSelectorsIDs.RIGHT_COLUMN),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON),
    );

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL),
    ).toBeOnTheScreen();
  });
});
