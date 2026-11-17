import React, { useEffect, useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import PerpsMarketTileCard from './PerpsMarketTileCard';
import { useStyles } from '../../../../../../hooks/useStyles';
import {
  type PerpsMarketData,
  type PriceUpdate,
} from '@metamask/perps-controller';
import {
  PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS,
  PERPS_TILE_LIVE_PRICE_THROTTLE_MS,
} from './PerpsMarketTileCard.utils';

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

const mockTokenLogoRender = jest.fn();

jest.mock('../../../../../../UI/Perps/components/PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({
    symbol,
    testID,
  }: {
    symbol: string;
    testID?: string;
  }) {
    mockTokenLogoRender();
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
      width,
      height,
      color,
      revealColor,
    }: {
      data: number[];
      width: number;
      height: number;
      color: string;
      strokeWidth?: number;
      revealColor?: string;
    }) {
      return (
        <View
          testID="sparkline-chart"
          data-points={data.length}
          data-width={width}
          data-height={height}
          data-color={color}
          data-reveal-color={revealColor}
        />
      );
    },
  };
});

jest.mock('../../../../../../UI/Perps/hooks/stream', () => ({
  usePerpsLivePrices: jest.fn(),
}));

const { usePerpsLivePrices } = jest.requireMock(
  '../../../../../../UI/Perps/hooks/stream',
);
const mockUsePerpsLivePrices = usePerpsLivePrices as jest.Mock;

let emitLivePrices: (prices: Record<string, PriceUpdate>) => void = () =>
  undefined;

const useControllableLivePrices = () => {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  useEffect(() => {
    emitLivePrices = setPrices;
  }, []);
  return prices;
};

const buildLivePrice = (overrides: Partial<PriceUpdate> = {}): PriceUpdate => ({
  symbol: 'BTC',
  price: '55000',
  timestamp: 1,
  isTradable: true,
  percentChange24h: '5.50',
  ...overrides,
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
    mockUsePerpsLivePrices.mockImplementation(useControllableLivePrices);
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

  it('sizes the card and sparkline to the 188px design by default', () => {
    render(
      <PerpsMarketTileCard
        market={mockMarketData}
        sparklineData={mockSparklineData}
      />,
    );

    expect(jest.mocked(useStyles)).toHaveBeenCalledWith(expect.any(Function), {
      cardWidth: 188,
      cardHeight: 188,
    });
    const sparkline = screen.getByTestId('sparkline-chart');
    expect(sparkline.props['data-width']).toBe(156);
    expect(sparkline.props['data-height']).toBe(86);
  });

  it('renders the card on the muted background', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(screen.getByTestId('perps-market-tile-card')).toHaveStyle({
      backgroundColor: mockTheme.colors.background.muted,
    });
  });

  it('covers the sparkline reveal with the opaque section colour', () => {
    render(
      <PerpsMarketTileCard
        market={mockMarketData}
        sparklineData={mockSparklineData}
      />,
    );

    expect(
      screen.getByTestId('sparkline-chart').props['data-reveal-color'],
    ).toBe(mockTheme.colors.background.section);
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

  it('renders the snapshot price on first render', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(
      screen.getByTestId('perps-market-tile-card-price-BTC'),
    ).toHaveTextContent('$52,000');
    expect(screen.getByText('+4.00%')).toBeOnTheScreen();
  });

  it('shrinks a long price to fit instead of truncating it', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    const price = screen.getByTestId('perps-market-tile-card-price-BTC');

    expect(price).toHaveProp('adjustsFontSizeToFit', true);
    expect(price).toHaveProp('minimumFontScale', 0.8);
  });

  it('updates the price and change percent from a live tick', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    act(() => {
      emitLivePrices({ BTC: buildLivePrice() });
    });

    expect(
      screen.getByTestId('perps-market-tile-card-price-BTC'),
    ).toHaveTextContent('$55,000');
    expect(screen.getByText('+5.50%')).toBeOnTheScreen();
    expect(screen.queryByText('+4.00%')).toBeNull();
  });

  it('shows a negative live change percent', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    act(() => {
      emitLivePrices({ BTC: buildLivePrice({ percentChange24h: '-1.25' }) });
    });

    expect(screen.getByText('-1.25%')).toBeOnTheScreen();
  });

  it('does not re-render the card body when a tick keeps the same formatted values', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);
    const initialRenderCount = mockTokenLogoRender.mock.calls.length;

    act(() => {
      emitLivePrices({
        BTC: buildLivePrice({ price: '52000', percentChange24h: '4.00' }),
      });
    });

    expect(mockTokenLogoRender).toHaveBeenCalledTimes(initialRenderCount);
  });

  it('subscribes to the market symbol at the default throttle when tiers are unknown', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['BTC'],
      throttleMs: PERPS_TILE_LIVE_PRICE_THROTTLE_MS,
    });
  });

  it('subscribes at the constrained throttle on a slow cellular network', () => {
    render(
      <PerpsMarketTileCard
        market={mockMarketData}
        deviceCapability={{
          hardwareTier: 'HIGH',
          networkTier: 'SLOW_CELLULAR',
        }}
      />,
    );

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith({
      symbols: ['BTC'],
      throttleMs: PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS,
    });
  });

  it('does not subscribe to live prices when the network tier is NONE', () => {
    render(
      <PerpsMarketTileCard
        market={mockMarketData}
        deviceCapability={{ hardwareTier: 'HIGH', networkTier: 'NONE' }}
      />,
    );

    expect(mockUsePerpsLivePrices).toHaveBeenCalledWith(
      expect.objectContaining({ symbols: [] }),
    );
    expect(mockUsePerpsLivePrices).not.toHaveBeenCalledWith(
      expect.objectContaining({ symbols: ['BTC'] }),
    );
    expect(
      screen.getByTestId('perps-market-tile-card-price-BTC'),
    ).toHaveTextContent('$52,000');
  });

  it('renders the fallback price display when the price is unavailable', () => {
    render(<PerpsMarketTileCard market={{ ...mockMarketData, price: '' }} />);

    expect(
      screen.getByTestId('perps-market-tile-card-price-BTC'),
    ).toHaveTextContent('$---');
  });

  it('keeps the snapshot price when a live tick has no usable price', () => {
    render(<PerpsMarketTileCard market={mockMarketData} />);

    act(() => {
      emitLivePrices({ BTC: buildLivePrice({ price: '0' }) });
    });

    expect(
      screen.getByTestId('perps-market-tile-card-price-BTC'),
    ).toHaveTextContent('$52,000');
  });

  it('renders the favorite badge when showFavoriteTag is true', () => {
    render(<PerpsMarketTileCard market={mockMarketData} showFavoriteTag />);

    expect(screen.getByTestId('favorite-badge-BTC')).toBeOnTheScreen();
  });
});
