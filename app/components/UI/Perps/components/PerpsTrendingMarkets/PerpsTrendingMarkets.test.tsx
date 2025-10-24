import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsTrendingMarkets from './PerpsTrendingMarkets';
import type { PerpsMarketData } from '../../controllers/types';
import Routes from '../../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      header: {},
      emptyText: {},
    },
  }),
}));

// Mock the Text component to ensure children are rendered
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextVariant: {},
    TextColor: {},
  };
});

jest.mock('../PerpsMarketList', () => {
  const { View, Text } = jest.requireActual('react-native');
  return function MockPerpsMarketList({
    markets,
    sortBy,
    onMarketPress,
    ListHeaderComponent,
  }: {
    markets: PerpsMarketData[];
    sortBy: string;
    onMarketPress: (market: PerpsMarketData) => void;
    ListHeaderComponent: React.ComponentType;
  }) {
    return (
      <View testID="perps-market-list">
        {ListHeaderComponent && <ListHeaderComponent />}
        {markets.map((market) => (
          <View
            key={market.symbol}
            testID={`market-item-${market.symbol}`}
            onTouchEnd={() => onMarketPress(market)}
          >
            <Text>{market.symbol}</Text>
            <Text>{market.name}</Text>
          </View>
        ))}
        <Text testID="sort-by">{sortBy}</Text>
      </View>
    );
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.home.trending': 'Trending',
      'perps.home.see_all': 'See all',
      'perps.home.loading': 'Loading...',
      'perps.home.no_markets': 'No markets available',
    };
    return translations[key] || key;
  },
}));

describe('PerpsTrendingMarkets', () => {
  const mockNavigate = jest.fn();
  const mockMarkets: PerpsMarketData[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$52,000',
      change24h: '+$2,000',
      change24hPercent: '+4.00%',
      volume: '$2.5B',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      maxLeverage: '25x',
      price: '$3,000',
      change24h: '-$50',
      change24hPercent: '-1.64%',
      volume: '$1.2B',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const { useNavigation } = jest.requireMock('@react-navigation/native');
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with markets data', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
      expect(screen.getByText('See all')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-list')).toBeOnTheScreen();
    });

    it('renders header with Trending title', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
    });

    it('renders See all button', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} />);

      expect(screen.getByText('See all')).toBeOnTheScreen();
    });

    it('renders PerpsMarketList with markets', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} />);

      expect(screen.getByTestId('market-item-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('market-item-ETH')).toBeOnTheScreen();
    });

    it('passes correct sortBy prop to PerpsMarketList', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} sortBy="volume" />);

      expect(screen.getByTestId('sort-by')).toHaveTextContent('volume');
    });

    it('uses default sortBy when not provided', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} />);

      expect(screen.getByTestId('sort-by')).toHaveTextContent('volume');
    });

    it('passes custom sortBy prop', () => {
      render(
        <PerpsTrendingMarkets markets={mockMarkets} sortBy="priceChange" />,
      );

      expect(screen.getByTestId('sort-by')).toHaveTextContent('priceChange');
    });
  });

  describe('Loading State', () => {
    it('shows loading text when isLoading is true', () => {
      render(<PerpsTrendingMarkets markets={[]} isLoading />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
      expect(screen.getByText('Loading...')).toBeOnTheScreen();
      expect(screen.queryByTestId('perps-market-list')).not.toBeOnTheScreen();
    });

    it('hides PerpsMarketList during loading', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} isLoading />);

      expect(screen.queryByTestId('perps-market-list')).not.toBeOnTheScreen();
    });

    it('shows header during loading', () => {
      render(<PerpsTrendingMarkets markets={[]} isLoading />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
      expect(screen.getByText('See all')).toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('shows no markets text when markets array is empty', () => {
      render(<PerpsTrendingMarkets markets={[]} />);

      expect(screen.getByText('Trending')).toBeOnTheScreen();
      expect(screen.getByText('No markets available')).toBeOnTheScreen();
    });

    it('hides PerpsMarketList when markets empty', () => {
      render(<PerpsTrendingMarkets markets={[]} />);

      expect(screen.queryByTestId('perps-market-list')).not.toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('navigates to trending view on See all click', () => {
      render(<PerpsTrendingMarkets markets={mockMarkets} />);

      const seeAllButton = screen.getByText('See all');
      fireEvent.press(seeAllButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.TRENDING,
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single market', () => {
      const singleMarket = [mockMarkets[0]];

      render(<PerpsTrendingMarkets markets={singleMarket} />);

      expect(screen.getByTestId('market-item-BTC')).toBeOnTheScreen();
      expect(screen.queryByTestId('market-item-ETH')).not.toBeOnTheScreen();
    });

    it('handles large market list', () => {
      const manyMarkets: PerpsMarketData[] = Array.from(
        { length: 20 },
        (_, i) => ({
          symbol: `TOKEN${i}`,
          name: `Token ${i}`,
          maxLeverage: '20x',
          price: `$${100 * (i + 1)}`,
          change24h: `+$${10 * (i + 1)}`,
          change24hPercent: '+5.00%',
          volume: '$1M',
        }),
      );

      const { root } = render(<PerpsTrendingMarkets markets={manyMarkets} />);

      expect(root).toBeTruthy();
      expect(screen.getByTestId('perps-market-list')).toBeOnTheScreen();
    });

    it('transitions from loading to loaded state', () => {
      const { rerender } = render(
        <PerpsTrendingMarkets markets={[]} isLoading />,
      );

      expect(screen.getByText('Loading...')).toBeOnTheScreen();

      rerender(
        <PerpsTrendingMarkets markets={mockMarkets} isLoading={false} />,
      );

      expect(screen.queryByText('Loading...')).not.toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-list')).toBeOnTheScreen();
    });

    it('transitions from empty to populated', () => {
      const { rerender } = render(<PerpsTrendingMarkets markets={[]} />);

      expect(screen.getByText('No markets available')).toBeOnTheScreen();

      rerender(<PerpsTrendingMarkets markets={mockMarkets} />);

      expect(screen.queryByText('No markets available')).not.toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-list')).toBeOnTheScreen();
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsTrendingMarkets markets={mockMarkets} />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('handles props updates correctly', () => {
      const { rerender } = render(
        <PerpsTrendingMarkets markets={mockMarkets} sortBy="volume" />,
      );

      expect(screen.getByTestId('sort-by')).toHaveTextContent('volume');

      rerender(
        <PerpsTrendingMarkets markets={mockMarkets} sortBy="fundingRate" />,
      );

      expect(screen.getByTestId('sort-by')).toHaveTextContent('fundingRate');
    });
  });
});
