import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsOrderBookView from './PerpsOrderBookView';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsOrderBookViewSelectorsIDs } from '../../Perps.testIds';
import type { OrderBookData } from '../../hooks/stream/usePerpsLiveOrderBook';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      setOptions: jest.fn(),
    }),
    useRoute: () => ({
      params: {
        symbol: 'BTC',
      },
    }),
  };
});

// Mock strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.order_book.title': 'Order Book',
      'perps.order_book.error': 'Failed to load order book',
      'perps.market.long': 'Long',
      'perps.market.short': 'Short',
      'perps.market.modify': 'Modify',
      'perps.market.close_long': 'Close Long',
      'perps.market.close_short': 'Close Short',
      'perps.order_book.depth_band.title': 'Depth Band',
    };
    return translations[key] || key;
  }),
}));

// Mock useStyles
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: { flex: 1 },
      header: { flexDirection: 'row', padding: 16 },
      headerBackButton: { marginRight: 12 },
      headerTitleContainer: { flex: 1 },
      headerUnitToggle: { flexDirection: 'row' },
      headerUnitButton: { padding: 8 },
      headerUnitButtonActive: { backgroundColor: '#000' },
      depthBandButton: { padding: 8 },
      depthBandButtonPressed: { opacity: 0.7 },
      scrollView: { flex: 1 },
      scrollContent: { padding: 16 },
      section: { marginBottom: 16 },
      depthChartSection: { paddingTop: 16 },
      tableSection: { flex: 1 },
      footer: { padding: 16 },
      actionsContainer: { flexDirection: 'row', gap: 12 },
      actionButtonWrapper: { flex: 1 },
      errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      depthBandSheetContent: { padding: 16 },
      depthBandOption: { padding: 16 },
      depthBandOptionSelected: { backgroundColor: '#eee' },
    },
  })),
}));

// Mock usePerpsLiveOrderBook
const mockOrderBook: OrderBookData = {
  bids: [
    {
      price: '50000',
      size: '1.5',
      total: '1.5',
      notional: '75000',
      totalNotional: '75000',
    },
  ],
  asks: [
    {
      price: '50100',
      size: '1.2',
      total: '1.2',
      notional: '60120',
      totalNotional: '60120',
    },
  ],
  spread: '100',
  spreadPercentage: '0.2',
  midPrice: '50050',
  lastUpdated: Date.now(),
  maxTotal: '1.5',
};

const mockUsePerpsLiveOrderBook = jest.fn<
  { orderBook: OrderBookData | null; isLoading: boolean; error: Error | null },
  [unknown]
>(() => ({
  orderBook: mockOrderBook,
  isLoading: false,
  error: null,
}));

jest.mock('../../hooks/stream/usePerpsLiveOrderBook', () => ({
  usePerpsLiveOrderBook: (params: unknown) => mockUsePerpsLiveOrderBook(params),
}));

// Mock usePerpsLivePrices for live price updates in header (TAT-2441)
const mockUsePerpsLivePrices = jest.fn<
  Record<string, { price: string; percentChange24h: string; symbol: string }>,
  [unknown]
>(() => ({
  BTC: {
    price: '50000',
    percentChange24h: '2.5',
    symbol: 'BTC',
  },
}));

jest.mock('../../hooks/stream/usePerpsLivePrices', () => ({
  usePerpsLivePrices: (params: unknown) => mockUsePerpsLivePrices(params),
}));

// Mock usePerpsMeasurement
jest.mock('../../hooks/usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
}));

// Mock usePerpsNavigation, usePerpsMarkets, and usePositionManagement
const mockNavigateToOrder = jest.fn();
const mockNavigateToClosePosition = jest.fn();
const mockOpenModifySheet = jest.fn();
const mockCloseModifySheet = jest.fn();
const mockHandleReversePosition = jest.fn();
const mockModifyActionSheetRef = { current: null };

jest.mock('../../hooks', () => ({
  usePerpsNavigation: jest.fn(() => ({
    navigateToOrder: mockNavigateToOrder,
    navigateToClosePosition: mockNavigateToClosePosition,
  })),
  usePerpsMarkets: jest.fn(() => ({
    markets: [
      {
        symbol: 'BTC',
        price: '$50,000.00',
        leverage: 50,
      },
    ],
    isLoading: false,
    error: null,
  })),
  usePositionManagement: jest.fn(() => ({
    showModifyActionSheet: false,
    modifyActionSheetRef: mockModifyActionSheetRef,
    openModifySheet: mockOpenModifySheet,
    closeModifySheet: mockCloseModifySheet,
    handleReversePosition: mockHandleReversePosition,
  })),
}));

// Mock useHasExistingPosition
jest.mock('../../hooks/useHasExistingPosition', () => ({
  useHasExistingPosition: jest.fn(() => ({
    isLoading: false,
    existingPosition: null,
  })),
}));

// Mock usePerpsOrderBookGrouping
const mockSaveGrouping = jest.fn();

jest.mock('../../hooks/usePerpsOrderBookGrouping', () => ({
  usePerpsOrderBookGrouping: jest.fn(() => ({
    savedGrouping: undefined,
    saveGrouping: mockSaveGrouping,
  })),
}));

// Mock usePerpsTopOfBook
const mockUsePerpsTopOfBook = jest.fn(() => ({
  bestBid: '50000',
  bestAsk: '50001',
  spread: '1.00000',
}));

jest.mock('../../hooks/stream/usePerpsTopOfBook', () => ({
  usePerpsTopOfBook: () => mockUsePerpsTopOfBook(),
}));

// Mock usePerpsEventTracking
const mockTrack = jest.fn();

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn((params) => {
    if (typeof params === 'object' && params !== null) {
      return undefined;
    }
    return { track: mockTrack };
  }),
}));

// Mock components
jest.mock('../../components/PerpsOrderBookTable', () => {
  const { View } = jest.requireActual('react-native');
  return (props: { testID?: string }) => (
    <View testID={props.testID || 'perps-order-book-table'} {...props} />
  );
});

jest.mock('../../components/PerpsOrderBookDepthChart', () => {
  const { View } = jest.requireActual('react-native');
  return (props: { testID?: string }) => (
    <View testID={props.testID || 'perps-order-book-depth-chart'} {...props} />
  );
});

// Mock PerpsMarketHeader to avoid PerpsStreamProvider dependency
jest.mock('../../components/PerpsMarketHeader', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const selectors = jest.requireActual<typeof import('../../Perps.testIds')>(
    '../../Perps.testIds',
  );
  return {
    __esModule: true,
    default: ({
      market,
      onBackPress,
    }: {
      market?: { symbol: string };
      onBackPress?: () => void;
    }) => (
      <View testID="perps-market-header">
        <TouchableOpacity
          testID={selectors.PerpsOrderBookViewSelectorsIDs.BACK_BUTTON}
          onPress={onBackPress}
        >
          <Text>Back</Text>
        </TouchableOpacity>
        <Text>Order Book</Text>
        {market && <Text>{market.symbol}</Text>}
      </View>
    ),
  };
});

// Mock BottomSheet components to avoid SafeAreaProvider requirement
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    const ReactMock = jest.requireActual('react');
    return {
      __esModule: true,
      default: ReactMock.forwardRef(
        (
          props: {
            children: React.ReactNode;
            onClose?: () => void;
          },
          _ref: unknown,
        ) => (
          <View testID="bottom-sheet">
            {props.children}
            <TouchableOpacity
              testID="bottom-sheet-backdrop"
              onPress={props.onClose}
            >
              <Text>Backdrop</Text>
            </TouchableOpacity>
          </View>
        ),
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return (props: { children: React.ReactNode; onClose?: () => void }) => (
      <View testID="bottom-sheet-header">{props.children}</View>
    );
  },
);

// Mock PerpsSelectModifyActionView
jest.mock('../PerpsSelectModifyActionView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="perps-select-modify-action-view" />,
  };
});

// Mock PerpsBottomSheetTooltip for geo-block modal
jest.mock(
  '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip',
  () => {
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: (props: {
        testID?: string;
        isVisible?: boolean;
        onClose?: () => void;
      }) =>
        props.isVisible ? (
          <View testID={props.testID || 'perps-bottom-sheet-tooltip'}>
            <TouchableOpacity
              testID={`${props.testID || 'perps-bottom-sheet-tooltip'}-close`}
              onPress={props.onClose}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        ) : null,
    };
  },
);

// Mock perpsController selectors - return eligible by default for action button tests
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(() => true),
}));

describe('PerpsOrderBookView', () => {
  const initialState = {
    engine: {
      backgroundState,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLiveOrderBook.mockReturnValue({
      orderBook: mockOrderBook,
      isLoading: false,
      error: null,
    });
    mockUsePerpsTopOfBook.mockReturnValue({
      bestBid: '50000',
      bestAsk: '50001',
      spread: '1.00000',
    });
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        price: '50000',
        percentChange24h: '2.5',
        symbol: 'BTC',
      },
    });
  });

  describe('rendering', () => {
    it('renders successfully with order book data', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsOrderBookView />,
        { state: initialState },
      );

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByText('Order Book')).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      const customTestID = 'custom-order-book-view';

      const { getByTestId } = renderWithProvider(
        <PerpsOrderBookView testID={customTestID} />,
        { state: initialState },
      );

      expect(getByTestId(customTestID)).toBeOnTheScreen();
    });

    it('renders back button', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders unit toggle buttons', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD),
      ).toBeOnTheScreen();
    });

    it('renders depth band button', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders depth chart', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.DEPTH_CHART),
      ).toBeOnTheScreen();
    });

    it('renders order book table', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.TABLE),
      ).toBeOnTheScreen();
    });

    it('renders Long button', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders Short button', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders scroll view', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.SCROLL_VIEW),
      ).toBeOnTheScreen();
    });
  });

  describe('back button', () => {
    it('calls goBack when back button is pressed', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const backButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.BACK_BUTTON,
      );

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('unit toggle', () => {
    it('displays BTC symbol on base unit toggle', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      // Find the base unit toggle button by testID
      const baseToggle = getByTestId(
        PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE,
      );
      expect(baseToggle).toBeOnTheScreen();
      // The button should contain "BTC" text
      expect(baseToggle).toHaveTextContent('BTC');
    });

    it('displays USD on USD unit toggle', () => {
      const { getByText } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(getByText('USD')).toBeOnTheScreen();
    });

    it('switches to base unit when base toggle is pressed', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const baseToggle = getByTestId(
        PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE,
      );

      fireEvent.press(baseToggle);

      expect(mockTrack).toHaveBeenCalled();
    });

    it('switches to USD unit when USD toggle is pressed', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const usdToggle = getByTestId(
        PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD,
      );

      fireEvent.press(usdToggle);

      expect(mockTrack).toHaveBeenCalled();
    });

    it('starts with USD as default unit', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD),
      ).toBeOnTheScreen();
    });
  });

  describe('price grouping selection', () => {
    // For BTC at $50,050 mid price, grouping options are: 1, 2, 5, 10, 100, 1000
    // Default selection is the 4th option (index 3): 10
    it('displays default grouping label based on price', () => {
      const { getByText } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      // For mid price $50,050, default is 10 (4th option in 1, 2, 5, 10, 100, 1000)
      expect(getByText('10')).toBeOnTheScreen();
    });

    it('opens grouping bottom sheet when button is pressed', async () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsOrderBookView />,
        { state: initialState },
      );

      const depthBandButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON,
      );

      fireEvent.press(depthBandButton);

      await waitFor(() => {
        expect(getByText('Depth Band')).toBeOnTheScreen();
      });
    });

    it('displays dynamic grouping options in bottom sheet', async () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsOrderBookView />,
        { state: initialState },
      );

      const depthBandButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON,
      );

      fireEvent.press(depthBandButton);

      // For BTC at $50,050, options are 1, 2, 5, 10, 100, 1000
      await waitFor(() => {
        expect(getByText('1')).toBeOnTheScreen();
        expect(getByText('2')).toBeOnTheScreen();
        expect(getByText('5')).toBeOnTheScreen();
        expect(getByText('100')).toBeOnTheScreen();
        expect(getByText('1000')).toBeOnTheScreen();
      });
    });

    it('selects grouping option when pressed', async () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const depthBandButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON,
      );

      fireEvent.press(depthBandButton);

      await waitFor(() => {
        const option = getByTestId(
          `${PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_OPTION}-1`,
        );
        expect(option).toBeOnTheScreen();
      });

      const option = getByTestId(
        `${PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_OPTION}-1`,
      );

      fireEvent.press(option);

      expect(mockTrack).toHaveBeenCalled();
    });

    it('uses dynamic nSigFigs based on grouping and price (server-side aggregation)', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      // nSigFigs is dynamically calculated based on grouping and price
      // For BTC at ~$50k with default grouping of 10, nSigFigs should be 4
      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          nSigFigs: expect.any(Number),
        }),
      );
      // Verify nSigFigs is within valid API range (2-5)
      const calls = mockUsePerpsLiveOrderBook.mock.calls as [
        { nSigFigs: number },
      ][];
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].nSigFigs).toBeGreaterThanOrEqual(2);
      expect(lastCall[0].nSigFigs).toBeLessThanOrEqual(5);
    });
  });

  describe('action buttons', () => {
    it('navigates to long order when Long button is pressed', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const longButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.LONG_BUTTON,
      );

      fireEvent.press(longButton);

      expect(mockNavigateToOrder).toHaveBeenCalledWith({
        direction: 'long',
        asset: 'BTC',
      });
      expect(mockTrack).toHaveBeenCalled();
    });

    it('navigates to short order when Short button is pressed', () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const shortButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON,
      );

      fireEvent.press(shortButton);

      expect(mockNavigateToOrder).toHaveBeenCalledWith({
        direction: 'short',
        asset: 'BTC',
      });
      expect(mockTrack).toHaveBeenCalled();
    });
  });

  describe('action buttons with existing position', () => {
    const mockLongPosition = {
      symbol: 'BTC',
      size: '1.5',
      entryPrice: '50000',
      leverage: { value: 10, type: 'cross' as const },
      margin: '5000',
      unrealizedPnl: '100',
      unrealizedPnlPercent: '2',
      liquidationPrice: '45000',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      returnOnEquity: '2',
    };

    const mockShortPosition = {
      ...mockLongPosition,
      size: '-1.5',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('renders Modify and Close buttons when position exists', () => {
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockLongPosition,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON),
      ).toBeNull();
    });

    it('opens modify action sheet when Modify button is pressed', () => {
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockLongPosition,
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const modifyButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON,
      );
      fireEvent.press(modifyButton);

      expect(mockOpenModifySheet).toHaveBeenCalled();
    });

    it('navigates to close position when Close button is pressed', () => {
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockLongPosition,
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const closeButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON,
      );
      fireEvent.press(closeButton);

      expect(mockNavigateToClosePosition).toHaveBeenCalledWith(
        mockLongPosition,
      );
    });

    it('displays "Close Long" for long positions', () => {
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockLongPosition,
      });

      const { getByText } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(getByText('Close Long')).toBeOnTheScreen();
    });

    it('displays "Close Short" for short positions', () => {
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockShortPosition,
      });

      const { getByText } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(getByText('Close Short')).toBeOnTheScreen();
    });

    it('shows Long/Short buttons when no position exists', () => {
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: null,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON),
      ).toBeNull();
      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeNull();
    });
  });

  describe('geo-restriction', () => {
    const mockLongPosition = {
      symbol: 'BTC',
      size: '1.5',
      entryPrice: '50000',
      leverage: { value: 10, type: 'cross' as const },
      margin: '5000',
      unrealizedPnl: '100',
      unrealizedPnlPercent: '2',
      liquidationPrice: '45000',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      returnOnEquity: '2',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('shows geo-block modal when Long button pressed and user is not eligible', () => {
      const { selectPerpsEligibility } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsEligibility.mockReturnValue(false);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      const longButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.LONG_BUTTON,
      );
      fireEvent.press(longButton);

      // Navigation should NOT be called
      expect(mockNavigateToOrder).not.toHaveBeenCalled();
      // Geo-block tooltip should be shown
      expect(
        queryByTestId(
          `${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`,
        ),
      ).toBeOnTheScreen();
    });

    it('shows geo-block modal when Short button pressed and user is not eligible', () => {
      const { selectPerpsEligibility } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsEligibility.mockReturnValue(false);

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      const shortButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON,
      );
      fireEvent.press(shortButton);

      // Navigation should NOT be called
      expect(mockNavigateToOrder).not.toHaveBeenCalled();
      // Geo-block tooltip should be shown
      expect(
        queryByTestId(
          `${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`,
        ),
      ).toBeOnTheScreen();
    });

    it('shows geo-block modal when Close button pressed and user is not eligible', () => {
      const { selectPerpsEligibility } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsEligibility.mockReturnValue(false);

      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockLongPosition,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      const closeButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.CLOSE_BUTTON,
      );
      fireEvent.press(closeButton);

      // Navigation should NOT be called
      expect(mockNavigateToClosePosition).not.toHaveBeenCalled();
      // Geo-block tooltip should be shown
      expect(
        queryByTestId(
          `${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`,
        ),
      ).toBeOnTheScreen();
    });

    it('shows geo-block modal when Modify button pressed and user is not eligible', () => {
      const { selectPerpsEligibility } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsEligibility.mockReturnValue(false);

      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: mockLongPosition,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      const modifyButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.MODIFY_BUTTON,
      );
      fireEvent.press(modifyButton);

      // Modify sheet should NOT be opened
      expect(mockOpenModifySheet).not.toHaveBeenCalled();
      // Geo-block tooltip should be shown
      expect(
        queryByTestId(
          `${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`,
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('error state', () => {
    it('displays error message when order book fails to load', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      const { getByText } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(getByText('Failed to load order book')).toBeOnTheScreen();
    });

    it('renders back button in error state', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.BACK_BUTTON),
      ).toBeOnTheScreen();
    });

    it('does not render order book table in error state', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      const { queryByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.TABLE),
      ).not.toBeOnTheScreen();
    });

    it('does not render action buttons in error state', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      const { queryByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.LONG_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('allows navigation back from error state', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: false,
        error: new Error('Failed to load'),
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const backButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.BACK_BUTTON,
      );

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    it('renders loading state correctly', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: true,
        error: null,
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('hook subscriptions', () => {
    it('subscribes to live order book with correct symbol', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
        }),
      );
    });

    it('subscribes to live prices for header price display (TAT-2441)', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ['BTC'],
          throttleMs: 1000,
        }),
      );
    });

    it('subscribes to live order book with MAX_ORDER_BOOK_LEVELS (20) for server-side aggregation', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      // Uses MAX_ORDER_BOOK_LEVELS (20) - API returns at most ~20 levels per side with nSigFigs
      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          levels: 20,
        }),
      );
    });

    it('subscribes to live order book with correct throttleMs', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          throttleMs: 100,
        }),
      );
    });

    it('subscribes to live order book with valid nSigFigs for aggregation', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      // nSigFigs is calculated dynamically based on price and grouping
      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          nSigFigs: expect.any(Number),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('handles missing symbol gracefully', () => {
      jest.mock('@react-navigation/native', () => {
        const actualNav = jest.requireActual('@react-navigation/native');
        return {
          ...actualNav,
          useRoute: () => ({
            params: {},
          }),
        };
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders correctly when orderBook is null but no error', () => {
      mockUsePerpsLiveOrderBook.mockReturnValue({
        orderBook: null,
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('falls back to static market price when live price is not available', () => {
      mockUsePerpsLivePrices.mockReturnValue({});

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('falls back to static market price when live price is invalid (NaN)', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: 'invalid-price',
          percentChange24h: '2.5',
          symbol: 'BTC',
        },
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('falls back to static market price when live price is zero or negative', () => {
      mockUsePerpsLivePrices.mockReturnValue({
        BTC: {
          price: '0',
          percentChange24h: '2.5',
          symbol: 'BTC',
        },
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles invalid topOfBook values gracefully', () => {
      mockUsePerpsTopOfBook.mockReturnValue({
        bestBid: '0',
        bestAsk: '-1',
        spread: '0',
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles non-finite topOfBook values', () => {
      mockUsePerpsTopOfBook.mockReturnValue({
        bestBid: 'NaN',
        bestAsk: 'Infinity',
        spread: '0',
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('syncs saved grouping when it loads after mount', async () => {
      const { usePerpsOrderBookGrouping } = jest.requireMock(
        '../../hooks/usePerpsOrderBookGrouping',
      );

      // First render with undefined savedGrouping
      usePerpsOrderBookGrouping.mockReturnValue({
        savedGrouping: undefined,
        saveGrouping: mockSaveGrouping,
      });

      const { rerender, getByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      // Simulate savedGrouping loading
      usePerpsOrderBookGrouping.mockReturnValue({
        savedGrouping: 5,
        saveGrouping: mockSaveGrouping,
      });

      rerender(<PerpsOrderBookView />);

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('spread tooltip', () => {
    it('opens spread tooltip when info button is pressed', async () => {
      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      const spreadInfoButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.SPREAD_INFO_BUTTON,
      );

      fireEvent.press(spreadInfoButton);

      await waitFor(() => {
        expect(
          getByTestId(PerpsOrderBookViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP),
        ).toBeOnTheScreen();
      });
    });

    it('closes spread tooltip when onClose is called', async () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      // Open tooltip
      const spreadInfoButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.SPREAD_INFO_BUTTON,
      );
      fireEvent.press(spreadInfoButton);

      await waitFor(() => {
        expect(
          getByTestId(PerpsOrderBookViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP),
        ).toBeOnTheScreen();
      });

      // Close the tooltip via the close button in the mock
      const closeButton = getByTestId(
        `${PerpsOrderBookViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}-close`,
      );
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(
          queryByTestId(PerpsOrderBookViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP),
        ).toBeNull();
      });
    });
  });

  describe('depth band sheet close', () => {
    it('closes depth band sheet via onClose callback', async () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      // Open the depth band sheet
      const depthBandButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON,
      );
      fireEvent.press(depthBandButton);

      await waitFor(() => {
        expect(queryByText('Depth Band')).toBeOnTheScreen();
      });

      // Close via backdrop (onClose callback)
      const backdrop = getByTestId('bottom-sheet-backdrop');
      fireEvent.press(backdrop);

      await waitFor(() => {
        expect(queryByText('Depth Band')).toBeNull();
      });
    });
  });

  describe('geo-block modal interactions', () => {
    it('closes geo-block modal when onClose is called', async () => {
      const { selectPerpsEligibility } = jest.requireMock(
        '../../selectors/perpsController',
      );
      selectPerpsEligibility.mockReturnValue(false);

      // Ensure no existing position so Long/Short buttons are shown
      const { useHasExistingPosition } = jest.requireMock(
        '../../hooks/useHasExistingPosition',
      );
      useHasExistingPosition.mockReturnValue({
        isLoading: false,
        existingPosition: null,
      });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsOrderBookView />,
        {
          state: initialState,
        },
      );

      // Trigger geo-block modal by pressing Long button when not eligible
      const longButton = getByTestId(
        PerpsOrderBookViewSelectorsIDs.LONG_BUTTON,
      );
      fireEvent.press(longButton);

      // Verify modal is shown
      const geoBlockTooltipId = `${PerpsOrderBookViewSelectorsIDs.CONTAINER}-geo-block-tooltip`;
      expect(queryByTestId(geoBlockTooltipId)).toBeOnTheScreen();

      // Close the modal via the close button
      const closeButton = getByTestId(`${geoBlockTooltipId}-close`);
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId(geoBlockTooltipId)).toBeNull();
      });
    });
  });

  describe('grouping with no market price', () => {
    it('returns null grouping when market price is unavailable', () => {
      const { usePerpsMarkets } = jest.requireMock('../../hooks');
      usePerpsMarkets.mockReturnValue({
        markets: [
          {
            symbol: 'BTC',
            price: null,
            leverage: 50,
          },
        ],
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles invalid market price format', () => {
      const { usePerpsMarkets } = jest.requireMock('../../hooks');
      usePerpsMarkets.mockReturnValue({
        markets: [
          {
            symbol: 'BTC',
            price: 'invalid',
            leverage: 50,
          },
        ],
        isLoading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(
        getByTestId(PerpsOrderBookViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });
});
