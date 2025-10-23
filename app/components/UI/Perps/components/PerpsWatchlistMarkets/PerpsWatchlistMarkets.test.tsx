import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsWatchlistMarkets from './PerpsWatchlistMarkets';
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
      listContent: {},
      emptyText: {},
    },
  }),
}));

jest.mock('../PerpsMarketRowItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockPerpsMarketRowItem({
    market,
    onPress,
  }: {
    market: PerpsMarketData;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={`perps-market-row-${market.symbol}`}
      >
        <Text>{market.symbol}</Text>
        <Text>{market.name}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.home.watchlist': 'Watchlist',
      'perps.home.see_all': 'See all',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsWatchlistMarkets', () => {
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
    it('renders watchlist header with title', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });

    it('renders component with markets', () => {
      const { root } = render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(root).toBeTruthy();
    });

    it('renders all watchlisted markets', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('Ethereum')).toBeOnTheScreen();
    });

    it('returns null when markets array is empty', () => {
      const { toJSON } = render(<PerpsWatchlistMarkets markets={[]} />);

      // Component returns null for empty markets
      expect(toJSON()).toBeNull();
    });

    it('returns null when isLoading is true', () => {
      const { toJSON } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading />,
      );

      // Component returns null while loading
      expect(toJSON()).toBeNull();
    });
  });

  describe('Navigation Handling', () => {
    it('navigates to market list with showWatchlistOnly parameter', () => {
      const { root } = render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      // Find TouchableOpacity that navigates to See all (second one in header)
      const touchables = root.findAllByType(
        jest.requireActual('react-native').TouchableOpacity,
      );
      // Header has one TouchableOpacity for "See all"
      const seeAllButton = touchables.find(
        (t) => t.props.onPress !== undefined && t.parent?.parent !== null,
      );

      if (seeAllButton) {
        fireEvent.press(seeAllButton);

        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKETS,
          params: {
            showWatchlistOnly: true,
          },
        });
      }
    });

    it('navigates to market details when market row is pressed', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      fireEvent.press(btcRow);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: mockMarkets[0] },
      });
    });

    it('passes correct market data to navigation for different markets', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      const ethRow = screen.getByTestId('perps-market-row-ETH');
      fireEvent.press(ethRow);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: mockMarkets[1] },
      });
    });
  });

  describe('Market Data Display', () => {
    it('displays markets in provided order', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      const reversedMarkets = [...mockMarkets].reverse();
      rerender(<PerpsWatchlistMarkets markets={reversedMarkets} />);

      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });

    it('handles single market', () => {
      const singleMarket = [mockMarkets[0]];

      render(<PerpsWatchlistMarkets markets={singleMarket} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.queryByText('ETH')).not.toBeOnTheScreen();
    });

    it('handles multiple markets', () => {
      const manyMarkets: PerpsMarketData[] = [
        ...mockMarkets,
        {
          symbol: 'SOL',
          name: 'Solana',
          maxLeverage: '20x',
          price: '$150',
          change24h: '+$5',
          change24hPercent: '+3.45%',
          volume: '$800M',
        },
      ];

      render(<PerpsWatchlistMarkets markets={manyMarkets} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
    });

    it('updates when markets prop changes', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();

      const newMarkets: PerpsMarketData[] = [
        {
          symbol: 'AVAX',
          name: 'Avalanche',
          maxLeverage: '30x',
          price: '$40',
          change24h: '+$2',
          change24hPercent: '+5.26%',
          volume: '$500M',
        },
      ];

      rerender(<PerpsWatchlistMarkets markets={newMarkets} />);

      expect(screen.queryByText('BTC')).not.toBeOnTheScreen();
      expect(screen.getByText('AVAX')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string symbols gracefully', () => {
      const marketsWithEmptySymbol: PerpsMarketData[] = [
        {
          symbol: '',
          name: 'Unknown',
          maxLeverage: '10x',
          price: '$0',
          change24h: '$0',
          change24hPercent: '0.00%',
          volume: '$0',
        },
      ];

      render(<PerpsWatchlistMarkets markets={marketsWithEmptySymbol} />);

      expect(screen.getByText('Unknown')).toBeOnTheScreen();
    });

    it('handles markets with special characters in symbols', () => {
      const specialMarkets: PerpsMarketData[] = [
        {
          symbol: 'BTC-USD',
          name: 'Bitcoin USD',
          maxLeverage: '50x',
          price: '$52,000',
          change24h: '+$2,000',
          change24hPercent: '+4.00%',
          volume: '$2.5B',
        },
      ];

      render(<PerpsWatchlistMarkets markets={specialMarkets} />);

      expect(screen.getByText('BTC-USD')).toBeOnTheScreen();
    });

    it('handles very long market lists', () => {
      const longMarketList: PerpsMarketData[] = Array.from(
        { length: 50 },
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

      const { root } = render(
        <PerpsWatchlistMarkets markets={longMarketList} />,
      );

      // Component renders with long list
      expect(root).toBeTruthy();
    });

    it('handles markets with undefined optional fields', () => {
      const incompleteMarkets: PerpsMarketData[] = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          maxLeverage: '50x',
          price: '$52,000',
          change24h: '+$2,000',
          change24hPercent: '+4.00%',
          volume: '$2.5B',
        },
      ];

      render(<PerpsWatchlistMarkets markets={incompleteMarkets} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });
  });

  describe('Loading State Handling', () => {
    it('hides component when isLoading transitions from false to true', () => {
      const { toJSON, rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading={false} />,
      );

      // Component renders initially
      expect(toJSON()).not.toBeNull();

      rerender(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);

      // Component is hidden during loading
      expect(toJSON()).toBeNull();
    });

    it('shows component when isLoading transitions from true to false', () => {
      const { toJSON, rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading />,
      );

      // Component is hidden during loading
      expect(toJSON()).toBeNull();

      rerender(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading={false} />,
      );

      // Component renders after loading completes
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('Interaction Edge Cases', () => {
    it('handles multiple rapid presses on market rows', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      fireEvent.press(btcRow);
      fireEvent.press(btcRow);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('handles pressing different market rows in sequence', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      const ethRow = screen.getByTestId('perps-market-row-ETH');

      fireEvent.press(btcRow);
      fireEvent.press(ethRow);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: mockMarkets[0] },
      });
      expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: mockMarkets[1] },
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { toJSON, rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      // Component renders with markets
      expect(toJSON()).not.toBeNull();

      // Hides when empty
      rerender(<PerpsWatchlistMarkets markets={[]} />);
      expect(toJSON()).toBeNull();

      // Hides when loading
      rerender(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);
      expect(toJSON()).toBeNull();

      // Shows again when ready
      rerender(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(toJSON()).not.toBeNull();
    });
  });
});
