import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PerpsOrderBookView from './PerpsOrderBookView';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsOrderBookViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
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

// Mock usePerpsMeasurement
jest.mock('../../hooks/usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
}));

// Mock usePerpsNavigation
const mockNavigateToOrder = jest.fn();

jest.mock('../../hooks', () => ({
  usePerpsNavigation: jest.fn(() => ({
    navigateToOrder: mockNavigateToOrder,
  })),
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

// Mock BottomSheet components to avoid SafeAreaProvider requirement
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
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
        ) => <View testID="bottom-sheet">{props.children}</View>,
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
      const { getByText } = renderWithProvider(<PerpsOrderBookView />, {
        state: initialState,
      });

      expect(getByText('BTC')).toBeOnTheScreen();
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

    it('always uses nSigFigs: 5 for API (client-side aggregation)', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      // nSigFigs should always be 5 (finest granularity) regardless of grouping selection
      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          nSigFigs: 5,
        }),
      );
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

    it('subscribes to live order book with 50 levels for client-side aggregation', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          levels: 50,
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

    it('subscribes to live order book with finest nSigFigs (5) for aggregation', () => {
      renderWithProvider(<PerpsOrderBookView />, { state: initialState });

      expect(mockUsePerpsLiveOrderBook).toHaveBeenCalledWith(
        expect.objectContaining({
          nSigFigs: 5,
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
  });
});
