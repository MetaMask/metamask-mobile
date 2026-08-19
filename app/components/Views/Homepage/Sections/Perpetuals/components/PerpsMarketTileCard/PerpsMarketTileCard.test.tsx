import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import PerpsMarketTileCard from './PerpsMarketTileCard';
import { type PerpsMarketData } from '@metamask/perps-controller';

const { TouchableOpacity } = jest.requireActual('react-native');
const { mockTheme } = jest.requireActual('../../../../../../../util/theme');

const buildMockUseStyles = () => {
  const actualStyleSheet = jest.requireActual(
    './PerpsMarketTileCard.styles',
  ).default;
  return {
    styles: actualStyleSheet({
      theme: mockTheme,
      vars: { cardWidth: 148, cardHeight: 164 },
    }),
    theme: mockTheme,
  };
};

jest.mock('../../../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => buildMockUseStyles()),
}));

jest.mock('../../../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => buildMockUseStyles()),
}));

jest.mock('../../../../../../UI/Perps/components/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({
    symbol,
    testID,
  }: {
    symbol: string;
    testID?: string;
  }) {
    return <View testID={testID || 'perps-token-logo'} data-symbol={symbol} />;
  };
});

jest.mock(
  '../../../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage',
  () => {
    const { Text } = jest.requireActual('react-native');
    return function MockPerpsLeverage({
      maxLeverage,
    }: {
      maxLeverage: string;
    }) {
      return <Text>{maxLeverage}</Text>;
    };
  },
);

jest.mock('../SparklineChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockSparklineChart({
      data,
      color,
    }: {
      data: number[];
      width: number;
      height: number;
      color: string;
      strokeWidth?: number;
    }) {
      return (
        <View
          testID="sparkline-chart"
          data-points={data.length}
          data-color={color}
        />
      );
    },
  };
});

jest.mock('../../../../../../UI/Perps/hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(() => ({})),
}));

const { usePerpsLivePrices } = jest.requireMock(
  '../../../../../../UI/Perps/hooks/stream',
);
const mockUsePerpsLivePrices = usePerpsLivePrices as jest.MockedFunction<
  typeof usePerpsLivePrices
>;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => false),
}));

describe('PerpsMarketTileCard', () => {
  const mockMarketData: PerpsMarketData = {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '50x',
    price: '$52,000',
    change24h: '+$2,000',
    change24hPercent: '+4.00%',
    volume: '$2.5B',
  };

  const mockSparklineData = Array.from(
    { length: 50 },
    (_, i) => 50000 + i * 10,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLivePrices.mockReturnValue({});
  });

  it('renders market symbol and leverage', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.getByText('BTC')).toBeOnTheScreen();
    expect(screen.getByText('50x')).toBeOnTheScreen();
  });

  it('renders positive percentage change', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.getByText('+4.00%')).toBeOnTheScreen();
  });

  it('renders negative percentage change', () => {
    const bearishMarket = {
      ...mockMarketData,
      change24h: '-$1,500',
      change24hPercent: '-2.88%',
    };

    render(<PerpsMarketTileCard market={bearishMarket} />);

    expect(screen.getByText('-2.88%')).toBeOnTheScreen();
  });

  it('renders sparkline chart when sparklineData is provided', () => {
    render(
      <PerpsMarketTileCard
        market={mockMarketData}
        sparklineData={mockSparklineData}
      />,
    );

    expect(screen.getByTestId('sparkline-chart')).toBeOnTheScreen();
  });

  it('does not show shimmer when sparklineData is undefined', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.queryByTestId('sparkline-chart')).toBeNull();
    expect(screen.queryByTestId('shimmer-overlay')).toBeNull();
  });

  it('shows shimmer overlay when sparklineData has fewer than 2 points', () => {
    render(
      <PerpsMarketTileCard market={mockMarketData} sparklineData={[100]} />,
    );

    expect(screen.queryByTestId('sparkline-chart')).toBeNull();
    expect(screen.getByTestId('shimmer-overlay')).toBeOnTheScreen();
  });

  it('calls onPress with market data when pressed', async () => {
    const mockOnPress = jest.fn();
    render(
      <PerpsMarketTileCard market={mockMarketData} onPress={mockOnPress} />,
    );

    const touchable = screen.getByTestId('perps-market-tile-card');
    fireEvent.press(touchable);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockMarketData);
  });

  it('renders market percentage change even when live prices are available', () => {
    mockUsePerpsLivePrices.mockReturnValue({
      BTC: {
        price: '55000',
        percentChange24h: '5.50',
        volume24h: 3000000000,
      },
    });

    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.getByText('+4.00%')).toBeOnTheScreen();
  });

  it('falls back to market data when no live prices', () => {
    mockUsePerpsLivePrices.mockReturnValue({});

    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.getByText('+4.00%')).toBeOnTheScreen();
  });
});
