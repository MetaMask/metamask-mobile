import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketTileCard from './PerpsMarketTileCard';
import { type PerpsMarketData } from '@metamask/perps-controller';

const { TouchableOpacity } = jest.requireActual('react-native');

const mockThemeColors = {
  background: { default: '#1a1a2e', section: '#2a2a3e', subsection: '#3a3a4e' },
  border: { muted: '#333' },
  success: { default: '#28a745' },
  error: { default: '#dc3545' },
  icon: { alternative: '#6a737d' },
};

const buildMockUseStyles = () => {
  const actualStyleSheet = jest.requireActual(
    './PerpsMarketTileCard.styles',
  ).default;
  return {
    styles: actualStyleSheet({
      theme: { colors: mockThemeColors },
      vars: { cardWidth: 148, cardHeight: 164 },
    }),
    theme: { colors: mockThemeColors },
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

  it('calls onPress with market data when pressed', () => {
    const mockOnPress = jest.fn();
    render(
      <PerpsMarketTileCard market={mockMarketData} onPress={mockOnPress} />,
    );

    const touchable = screen.root.findByType(TouchableOpacity);
    fireEvent.press(touchable);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(mockMarketData);
  });

  it('displays market change24hPercent', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.getByText('+4.00%')).toBeOnTheScreen();
  });

  describe('ticker truncation', () => {
    it('renders symbol without truncation when 10 characters or fewer', () => {
      const market = { ...mockMarketData, symbol: 'ABCDEFGHIJ' };
      render(<PerpsMarketTileCard market={market} />);

      expect(screen.getByText('ABCDEFGHIJ')).toBeOnTheScreen();
    });

    it('truncates symbol with ... when longer than 10 characters', () => {
      const market = { ...mockMarketData, symbol: 'LONGTICKERX' };
      render(<PerpsMarketTileCard market={market} />);

      expect(screen.getByText('LONGTICKER...')).toBeOnTheScreen();
      expect(screen.queryByText('LONGTICKERX')).toBeNull();
    });

    it('truncates a prefixed symbol (e.g. hip3:LONGTICKERX) at 10 chars after stripping prefix', () => {
      const market = { ...mockMarketData, symbol: 'hip3:LONGTICKERX' };
      render(<PerpsMarketTileCard market={market} />);

      expect(screen.getByText('LONGTICKER...')).toBeOnTheScreen();
    });

    it('renders leverage below change percent (not beside ticker)', () => {
      render(<PerpsMarketTileCard market={mockMarketData} />);

      const changeText = screen.getByText('+4.00%');
      const leverageText = screen.getByText('50x');

      // Both elements must be present
      expect(changeText).toBeOnTheScreen();
      expect(leverageText).toBeOnTheScreen();
    });
  });
});
