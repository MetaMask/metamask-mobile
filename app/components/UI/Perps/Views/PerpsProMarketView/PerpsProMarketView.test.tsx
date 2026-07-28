import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { Box, ButtonBase } from '@metamask/design-system-react-native';
import { CandlePeriod, PerpsMode } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import PerpsProMarketView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  PerpsModeToggleSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
} from '../../Perps.testIds';

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

let mockRouteParams: MockRouteParams | undefined = {
  market: {
    symbol: 'BTC',
    price: '$90,000.00',
    name: 'Bitcoin',
    maxLeverage: '40x',
  },
};
const mockTrack = jest.fn();
const mockUsePerpsEventTracking = jest.fn((_options?: unknown) => ({
  track: mockTrack,
}));

const mockNavigateBack = jest.fn();
const mockNavigateToHome = jest.fn();
const mockNavigateToMarketList = jest.fn();
let mockCanGoBack = true;
const mockSetPerpsMode = jest.fn();
const mockShowPerpsModeFlash = jest.fn();
const mockShowToast = jest.fn();
const mockToggleWatchlistMarket = jest.fn();
const mockGetWatchlistMarkets = jest.fn(() => [] as string[]);
const mockPerpsModeValue = PerpsMode.Pro;

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

jest.mock('./components/PerpsProChartPanel', () => ({
  __esModule: true,
  default: (props: MockChartPanelProps) => mockPerpsProChartPanel(props),
}));

jest.mock('../../components/PerpsCandlePeriodBottomSheet', () => ({
  __esModule: true,
  default: (props: MockCandlePeriodBottomSheetProps) =>
    mockCandlePeriodBottomSheet(props),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: (options?: unknown) =>
    mockUsePerpsEventTracking(options),
}));

jest.mock('../../hooks', () => ({
  usePerpsNavigation: jest.fn(() => ({
    navigateBack: mockNavigateBack,
    navigateToHome: mockNavigateToHome,
    navigateToMarketList: mockNavigateToMarketList,
    canGoBack: mockCanGoBack,
  })),
  usePerpsMode: jest.fn(() => ({
    mode: mockPerpsModeValue,
    setMode: mockSetPerpsMode,
  })),
}));

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      watchlist: {
        limitReached: { message: 'watchlist-limit' },
      },
    },
  }),
}));

jest.mock('../../utils/perpsModeFlash', () => ({
  showPerpsModeFlash: (...args: unknown[]) => mockShowPerpsModeFlash(...args),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      toggleWatchlistMarket: (...args: unknown[]) =>
        mockToggleWatchlistMarket(...args),
      getWatchlistMarkets: () => mockGetWatchlistMarkets(),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({ params: mockRouteParams }),
  };
});

// PerpsProPositionsPanel uses live stream hooks; avoid PerpsStreamProvider requirement.
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

const renderView = () =>
  renderWithProvider(<PerpsProMarketView />, {
    state: { engine: { backgroundState } },
  });

describe('PerpsProMarketView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
    mockGetWatchlistMarkets.mockReturnValue([]);
    mockRouteParams = {
      market: {
        symbol: 'BTC',
        price: '$90,000.00',
        name: 'Bitcoin',
        maxLeverage: '40x',
      },
    };
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
      getByTestId(PerpsProMarketViewSelectorsIDs.LAYOUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_FORM_PANEL),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.CONTAINER),
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

  it('keeps the fixture Place Order action disabled until wiring lands', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON),
    ).toBeDisabled();
  });

  it('opens the order type sheet from the form', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );

    expect(
      getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
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

  it('updates the form to Market and closes the order type sheet', () => {
    const { getByTestId, queryByTestId } = renderView();
    fireEvent.press(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );

    fireEvent.press(
      getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
    );

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    ).toHaveTextContent('Market');
    expect(
      queryByTestId(PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('restores the limit price input when Limit is selected', () => {
    const { getByTestId, queryByTestId } = renderView();
    fireEvent.press(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );
    fireEvent.press(
      getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.MARKET_OPTION),
    );
    fireEvent.press(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );

    fireEvent.press(
      getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.LIMIT_OPTION),
    );

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('closes the order type sheet without changing the current selection', () => {
    const { getByTestId, queryByTestId } = renderView();
    fireEvent.press(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    );

    fireEvent.press(
      getByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON),
    ).toHaveTextContent('Limit');
    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(PerpsOrderTypeBottomSheetSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('renders the Pro summary and available balance copy from Figma', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.SUMMARY_LIQUIDATION),
    ).toHaveTextContent(/Est Liquidation/);
    expect(
      getByTestId(PerpsProOrderFormSelectorsIDs.AVAILABLE_BALANCE),
    ).toHaveTextContent('-- available');
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

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON),
    );

    expect(mockNavigateBack).toHaveBeenCalledTimes(1);
    expect(mockNavigateToHome).not.toHaveBeenCalled();
  });

  it('falls back to Perps home when back is pressed with an empty stack', () => {
    mockCanGoBack = false;
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON),
    );

    expect(mockNavigateToHome).toHaveBeenCalledWith(
      PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    );
  });

  it('opens the market list from the header identity', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON),
    );

    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      source: PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    });
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
          PERPS_EVENT_VALUE.BUTTON_CLICKED.MARKET_LIST,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
      }),
    );
  });

  it('navigates to Perps home from the wallet button', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON),
    );

    expect(mockNavigateToHome).toHaveBeenCalledWith(
      PERPS_EVENT_VALUE.SOURCE.PERP_ASSET_SCREEN,
    );
  });

  it('toggles the watchlist from the favorite button', () => {
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    );

    expect(mockToggleWatchlistMarket).toHaveBeenCalledWith('BTC');
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.FAVORITE_TOGGLED,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
      }),
    );
  });

  it('blocks adding to a full watchlist and shows a toast', () => {
    mockGetWatchlistMarkets.mockReturnValue(
      Array.from({ length: 100 }, (_, index) => `ASSET-${index}`),
    );
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON),
    );

    expect(mockShowToast).toHaveBeenCalledWith({ message: 'watchlist-limit' });
    expect(mockToggleWatchlistMarket).not.toHaveBeenCalled();
  });

  it('switches mode and flashes from the Pro mode pill', () => {
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId(PerpsModeToggleSelectorsIDs.PRO_SEGMENT));

    expect(mockSetPerpsMode).toHaveBeenCalledWith(PerpsMode.Lite);
    expect(mockShowPerpsModeFlash).toHaveBeenCalledWith(PerpsMode.Lite);
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
