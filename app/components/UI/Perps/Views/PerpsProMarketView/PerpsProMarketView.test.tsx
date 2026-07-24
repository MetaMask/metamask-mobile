import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import { Box, ButtonBase } from '@metamask/design-system-react-native';
import { CandlePeriod } from '@metamask/perps-controller';
import PerpsProMarketView from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
  PerpsOrderTypeBottomSheetSelectorsIDs,
} from '../../Perps.testIds';

interface MockRouteParams {
  market?: { symbol: string };
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
  market: { symbol: 'BTC' },
};
const mockTrack = jest.fn();

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
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useRoute: () => ({ params: mockRouteParams }),
  };
});

const renderView = () =>
  renderWithProvider(<PerpsProMarketView />, {
    state: { engine: { backgroundState } },
  });

describe('PerpsProMarketView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { market: { symbol: 'BTC' } };
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

  it('shows the asset symbol from route params in the header', () => {
    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent(/^BTC$/);
  });

  it('removes the HIP-3 dex prefix from the header symbol', () => {
    mockRouteParams = { market: { symbol: 'xyz:TSLA' } };

    const { getByTestId } = renderView();

    expect(
      getByTestId(PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL),
    ).toHaveTextContent(/^TSLA$/);
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
});
