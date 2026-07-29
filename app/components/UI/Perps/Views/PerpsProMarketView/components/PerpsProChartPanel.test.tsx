import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  Box,
  FilterButtonVariant,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  CandlePeriod,
  type CandleData,
  type Position,
} from '@metamask/perps-controller';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller/constants';
import type { PerpsAdvancedChartProps } from '../../../components/PerpsAdvancedChart/PerpsAdvancedChart';
import PerpsCandlePeriodSelector from '../../../components/PerpsCandlePeriodSelector/PerpsCandlePeriodSelector';
import type { PerpsChartFullscreenModalProps } from '../../../components/PerpsChartFullscreenModal/PerpsChartFullscreenModal';
import type { OhlcData } from '../../../components/TradingViewChart';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import PerpsProChartPanel from './PerpsProChartPanel';

interface MockLivePriceHeaderProps {
  currentPrice: number;
  testIDPrice?: string;
  testIDChange?: string;
}

interface MockTradingViewChartProps {
  candleData?: CandleData | null;
  tpslLines?: {
    currentPrice?: string;
  };
  onOhlcDataChange?: (data: OhlcData | null) => void;
  testID?: string;
}

const MOCK_CANDLE_DATA: CandleData = {
  symbol: 'BTC',
  interval: CandlePeriod.FifteenMinutes,
  candles: [
    {
      time: 1700000000000,
      open: '50000',
      high: '51000',
      low: '49000',
      close: '50500',
      volume: '100',
    },
  ],
};

const MOCK_POSITION: Position = {
  symbol: 'BTC',
  size: '1',
  entryPrice: '50000',
  positionValue: '50000',
  unrealizedPnl: '500',
  marginUsed: '5000',
  leverage: { type: 'isolated', value: 10 },
  liquidationPrice: '45000',
  maxLeverage: 40,
  returnOnEquity: '10',
  cumulativeFunding: { allTime: '0', sinceChange: '0', sinceOpen: '0' },
  takeProfitPrice: '55000',
  stopLossPrice: '47000',
  takeProfitCount: 1,
  stopLossCount: 1,
};

const mockTrack = jest.fn();
const mockOnCandlePeriodChange = jest.fn();
const mockOnMorePress = jest.fn();
const mockOnChartError = jest.fn();
const mockFetchMoreHistory = jest.fn();
const mockPerpsAdvancedChart = jest.fn((_props: PerpsAdvancedChartProps) => (
  <Box testID="mock-perps-advanced-chart" />
));
const mockTradingViewChart = jest.fn((props: MockTradingViewChartProps) => (
  <Box testID={props.testID ?? 'mock-trading-view-chart'} />
));
const mockLivePriceHeader = jest.fn(
  ({ currentPrice, testIDPrice, testIDChange }: MockLivePriceHeaderProps) => (
    <>
      <Box testID={testIDPrice} accessibilityLabel={String(currentPrice)} />
      <Box testID={testIDChange} />
    </>
  ),
);
const mockFullscreenModal = jest.fn(
  ({ isVisible }: PerpsChartFullscreenModalProps) =>
    isVisible ? <Box testID="mock-perps-fullscreen-chart" /> : null,
);
const mockPerpsOHLCVBar = ({ testID }: { testID?: string }) => (
  <Box testID={testID} />
);
const mockPerpsPriceDeviationWarning = ({ testID }: { testID?: string }) => (
  <Box testID={testID} />
);
const mockPerpsServiceInterruptionBanner = ({
  testID,
}: {
  testID?: string;
}) => <Box testID={testID} />;
const mockUsePerpsLiveCandles = jest.fn();
const mockUseHasExistingPosition = jest.fn();
const mockUsePerpsMarketData = jest.fn();
const mockUsePriceDeviation = jest.fn();

jest.mock('../../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../hooks/stream/usePerpsLiveCandles', () => ({
  usePerpsLiveCandles: (params: unknown) => mockUsePerpsLiveCandles(params),
}));

jest.mock('../../../hooks/useHasExistingPosition', () => ({
  useHasExistingPosition: (params: unknown) =>
    mockUseHasExistingPosition(params),
}));

jest.mock('../../../hooks/useIsPriceDeviatedAboveThreshold', () => ({
  useIsPriceDeviatedAboveThreshold: (symbol: string) =>
    mockUsePriceDeviation(symbol),
}));

jest.mock('../../../hooks', () => ({
  usePerpsMarketData: (params: unknown) => mockUsePerpsMarketData(params),
}));

jest.mock('../../../components/PerpsAdvancedChart/PerpsAdvancedChart', () => ({
  __esModule: true,
  default: (props: PerpsAdvancedChartProps) => mockPerpsAdvancedChart(props),
}));

jest.mock('../../../components/TradingViewChart', () => ({
  __esModule: true,
  default: (props: MockTradingViewChartProps) => mockTradingViewChart(props),
}));

jest.mock('../../../components/LivePriceDisplay/LivePriceHeader', () => ({
  __esModule: true,
  default: (props: MockLivePriceHeaderProps) => mockLivePriceHeader(props),
}));

jest.mock(
  '../../../components/PerpsChartFullscreenModal/PerpsChartFullscreenModal',
  () => ({
    __esModule: true,
    default: (props: PerpsChartFullscreenModalProps) =>
      mockFullscreenModal(props),
  }),
);

jest.mock('../../../components/PerpsOHLCVBar', () => ({
  __esModule: true,
  default: (props: { testID?: string }) => mockPerpsOHLCVBar(props),
}));

jest.mock('../../../components/PerpsPriceDeviationWarning', () => ({
  __esModule: true,
  default: (props: { testID?: string }) =>
    mockPerpsPriceDeviationWarning(props),
}));

jest.mock('../../../components/PerpsServiceInterruptionBanner', () => ({
  __esModule: true,
  default: (props: { testID?: string }) =>
    mockPerpsServiceInterruptionBanner(props),
}));

const getLastAdvancedChartProps = () => {
  const lastCall = mockPerpsAdvancedChart.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error('PerpsAdvancedChart was not rendered');
  }
  return lastCall[0];
};

const getLastFullscreenModalProps = () => {
  const lastCall = mockFullscreenModal.mock.calls.at(-1);
  if (!lastCall) {
    throw new Error('PerpsChartFullscreenModal was not rendered');
  }
  return lastCall[0];
};

type PerpsProChartPanelProps = React.ComponentProps<typeof PerpsProChartPanel>;

const renderChartPanel = (overrides: Partial<PerpsProChartPanelProps> = {}) =>
  render(
    <PerpsProChartPanel
      symbol="BTC"
      selectedCandlePeriod={CandlePeriod.FifteenMinutes}
      isAdvancedChartEnabled
      effectiveChartLibrary={PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED}
      onCandlePeriodChange={mockOnCandlePeriodChange}
      onMorePress={mockOnMorePress}
      onChartError={mockOnChartError}
      {...overrides}
    />,
  );

describe('PerpsProChartPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: MOCK_CANDLE_DATA,
      isLoading: false,
      hasHistoricalData: true,
      fetchMoreHistory: mockFetchMoreHistory,
    });
    mockUseHasExistingPosition.mockReturnValue({
      existingPosition: null,
    });
    mockUsePerpsMarketData.mockReturnValue({
      marketData: { szDecimals: 2 },
    });
    mockUsePriceDeviation.mockReturnValue({
      isDeviatedAboveThreshold: false,
      isLoading: false,
    });
  });

  it('renders the Advanced Chart path when its feature flag is enabled', () => {
    renderChartPanel();

    expect(screen.getByTestId('mock-perps-advanced-chart')).toBeOnTheScreen();
    expect(mockPerpsAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        fallbackCandleData: MOCK_CANDLE_DATA,
      }),
    );
  });

  it('uses the 344px Figma chart height', () => {
    renderChartPanel();

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHART_PANEL),
    ).toHaveStyle({ height: 344 });
  });

  it('uses the 76px Figma market-summary height', () => {
    renderChartPanel();

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.MARKET_SUMMARY),
    ).toHaveStyle({ height: 76 });
  });

  it('renders the Lightweight Chart path when its feature flag is disabled', () => {
    renderChartPanel({ isAdvancedChartEnabled: false });

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHART_LIGHTWEIGHT),
    ).toBeOnTheScreen();
  });

  it('renders a skeleton while Lightweight candle history is unavailable', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: true,
      hasHistoricalData: false,
      fetchMoreHistory: mockFetchMoreHistory,
    });

    renderChartPanel({ isAdvancedChartEnabled: false });

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHART_SKELETON),
    ).toBeOnTheScreen();
  });

  it('renders the configured Pro candle periods', () => {
    renderChartPanel();

    expect(screen.getByText('1m')).toBeOnTheScreen();
    expect(screen.getByText('5m')).toBeOnTheScreen();
    expect(screen.getByText('15m')).toBeOnTheScreen();
    expect(screen.getByText('1h')).toBeOnTheScreen();
    expect(screen.getByText('1d')).toBeOnTheScreen();
  });

  it('left-aligns the configured Pro candle periods', () => {
    renderChartPanel();

    expect(
      screen.UNSAFE_getByType(PerpsCandlePeriodSelector).props.groupTwClassName,
    ).toBe('gap-2 justify-start');
  });

  it('uses the Figma compact candle-period appearance', () => {
    renderChartPanel();

    const selector = screen.UNSAFE_getByType(PerpsCandlePeriodSelector);

    expect(selector.props.filterVariant).toBe(FilterButtonVariant.Secondary);
    expect(selector.props.periodButtonTwClassName).toBe('h-7 rounded px-1');
    expect(selector.props.moreButtonTwClassName).toBe('h-7 rounded px-1');
    expect(selector.props.textVariant).toBe(TextVariant.BodyXs);
  });

  it('forwards a selected Pro candle period', () => {
    renderChartPanel();

    fireEvent.press(screen.getByText('1h'));

    expect(mockOnCandlePeriodChange).toHaveBeenCalledWith(CandlePeriod.OneHour);
  });

  it('requests the More candle periods sheet', () => {
    renderChartPanel();

    fireEvent.press(
      screen.getByTestId(
        `${PerpsProMarketViewSelectorsIDs.CHART_PERIOD_SELECTOR}-more-button`,
      ),
    );

    expect(mockOnMorePress).toHaveBeenCalledTimes(1);
  });

  it('opens the existing fullscreen chart modal', () => {
    renderChartPanel();

    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.CHART_FULLSCREEN_BUTTON,
      ),
    );

    expect(screen.getByTestId('mock-perps-fullscreen-chart')).toBeOnTheScreen();
  });

  it('closes the existing fullscreen chart modal', () => {
    renderChartPanel();
    fireEvent.press(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.CHART_FULLSCREEN_BUTTON,
      ),
    );
    const fullscreenModalProps = getLastFullscreenModalProps();

    act(() => {
      fullscreenModalProps.onClose();
    });

    expect(
      screen.queryByTestId('mock-perps-fullscreen-chart'),
    ).not.toBeOnTheScreen();
  });

  it('renders the latest candle price in the market summary', () => {
    renderChartPanel();

    expect(mockLivePriceHeader).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentPrice: 50500 }),
    );
  });

  it('synchronizes the market summary with the Advanced Chart price', () => {
    renderChartPanel();

    act(() => {
      getLastAdvancedChartProps().onLatestPriceChange?.(51000);
    });

    expect(mockLivePriceHeader).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentPrice: 51000 }),
    );
  });

  it('renders OHLCV values reported by the active chart', () => {
    const ohlcData: OhlcData = {
      time: 1700000000000,
      open: '50000',
      high: '51000',
      low: '49000',
      close: '50500',
      volume: '100',
    };
    renderChartPanel();

    act(() => {
      getLastAdvancedChartProps().onCrosshairDataChange?.(ohlcData);
    });

    expect(
      screen.getByTestId(PerpsProMarketViewSelectorsIDs.CHART_OHLCV),
    ).toBeOnTheScreen();
  });

  it('passes position overlays to the active chart', () => {
    mockUseHasExistingPosition.mockReturnValue({
      existingPosition: MOCK_POSITION,
    });

    renderChartPanel();

    expect(mockPerpsAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({
        positionSize: '1',
        tpslLines: expect.objectContaining({
          entryPrice: '50000',
          takeProfitPrice: '55000',
          stopLossPrice: '47000',
          liquidationPrice: '45000',
        }),
      }),
    );
  });

  it('renders the price-deviation warning for a halted market', () => {
    mockUsePriceDeviation.mockReturnValue({
      isDeviatedAboveThreshold: true,
      isLoading: false,
    });

    renderChartPanel();

    expect(
      screen.getByTestId(
        PerpsProMarketViewSelectorsIDs.CHART_PRICE_DEVIATION_WARNING,
      ),
    ).toBeOnTheScreen();
  });

  it('forwards an Advanced Chart rendering error', () => {
    renderChartPanel();

    act(() => {
      getLastAdvancedChartProps().onError?.('WebView failed');
    });

    expect(mockOnChartError).toHaveBeenCalledWith('WebView failed');
  });
});
