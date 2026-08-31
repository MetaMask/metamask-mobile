import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { View, Text as RNText } from 'react-native';
import PerpsMarketList from './PerpsMarketList';
import {
  type PerpsMarketData,
  type SortField,
} from '@metamask/perps-controller';

// Captures props passed to FlashList so tests can assert on them. `key` is a
// special React prop and never appears here, which is precisely why filter
// changes must flow through `extraData` instead.
const mockFlashListProps: Record<string, unknown>[] = [];

// Exposed via the mocked FlashList ref so tests can assert on the
// scroll-to-top behavior driven by `scrollResetKey`/`filterKey` without
// depending on FlatList's own (unrelated) scroll implementation.
const mockScrollToOffset = jest.fn();

// Tracks how many times a market row is mounted, used to prove that changing
// the filter re-renders rows without tearing them down (no remount).
const mockRowMountCount = { value: 0 };

// Records the `onPress` reference each row receives, keyed by symbol, so tests
// can assert the reference is stable across re-renders (so React.memo on the
// real row is not defeated by a new closure on every render).
const mockRowOnPressBySymbol: Record<
  string,
  ((market: PerpsMarketData) => void)[]
> = {};

// Mock dependencies
jest.mock('@shopify/flash-list', () => {
  const ReactActual = jest.requireActual('react');
  const { FlatList } = jest.requireActual('react-native');
  return {
    // forwardRef + useImperativeHandle exposes a controllable scrollToOffset
    // so tests can verify the reset behavior without depending on FlatList's
    // own (unrelated) scroll implementation, which jsdom doesn't support.
    FlashList: ReactActual.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        mockFlashListProps.push(props);
        ReactActual.useImperativeHandle(ref, () => ({
          scrollToOffset: mockScrollToOffset,
        }));
        return ReactActual.createElement(FlatList, props);
      },
    ),
  };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      contentContainer: {},
      emptyContainer: {},
    },
  }),
}));

jest.mock('../PerpsMarketRowItem', () => {
  const ReactActual = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockPerpsMarketRowItem({
    market,
    onPress,
    iconSize,
    displayMetric,
  }: {
    market: PerpsMarketData;
    onPress: (market: PerpsMarketData) => void;
    iconSize?: number;
    displayMetric?: SortField;
  }) {
    ReactActual.useEffect(() => {
      mockRowMountCount.value += 1;
    }, []);
    (mockRowOnPressBySymbol[market.symbol] ||= []).push(onPress);
    return (
      <TouchableOpacity
        // The real PerpsMarketRowItem calls `onPress?.(displayMarket)`, so the
        // mock forwards its own market rather than the press event.
        onPress={() => onPress(market)}
        testID={`perps-market-row-${market.symbol}`}
      >
        <Text>{market.symbol}</Text>
        <Text>{market.name}</Text>
        {iconSize && <Text testID="icon-size">{iconSize}</Text>}
        {displayMetric && <Text testID="display-metric">{displayMetric}</Text>}
      </TouchableOpacity>
    );
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.home.no_markets': 'No markets available',
    };
    return translations[key] || key;
  }),
}));

describe('PerpsMarketList', () => {
  const mockOnMarketPress = jest.fn();
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockFlashListProps.length = 0;
    mockRowMountCount.value = 0;
    mockScrollToOffset.mockClear();
    Object.keys(mockRowOnPressBySymbol).forEach(
      (key) => delete mockRowOnPressBySymbol[key],
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders list with markets', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('Ethereum')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
      expect(screen.getByText('Solana')).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          testID="custom-market-list"
        />,
      );

      expect(screen.getByTestId('custom-market-list')).toBeOnTheScreen();
    });

    it('renders with default testID when not provided', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByTestId('perps-market-list')).toBeOnTheScreen();
    });

    it('renders markets in provided order', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      const ethRow = screen.getByTestId('perps-market-row-ETH');
      const solRow = screen.getByTestId('perps-market-row-SOL');

      expect(btcRow).toBeOnTheScreen();
      expect(ethRow).toBeOnTheScreen();
      expect(solRow).toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('renders empty state when markets array is empty', () => {
      render(
        <PerpsMarketList markets={[]} onMarketPress={mockOnMarketPress} />,
      );

      expect(screen.getByTestId('perps-market-list-empty')).toBeOnTheScreen();
    });

    it('renders empty state with custom testID', () => {
      render(
        <PerpsMarketList
          markets={[]}
          onMarketPress={mockOnMarketPress}
          testID="custom-list"
        />,
      );

      expect(screen.getByTestId('custom-list-empty')).toBeOnTheScreen();
    });

    it('renders custom empty message', () => {
      render(
        <PerpsMarketList
          markets={[]}
          onMarketPress={mockOnMarketPress}
          emptyMessage="Custom empty message"
        />,
      );

      // Empty state is rendered - verify via testID since Text doesn't render children
      expect(screen.getByTestId('perps-market-list-empty')).toBeOnTheScreen();
    });

    it('does not render FlashList when empty', () => {
      render(
        <PerpsMarketList markets={[]} onMarketPress={mockOnMarketPress} />,
      );

      expect(screen.queryByTestId('perps-market-list')).not.toBeOnTheScreen();
    });
  });

  describe('Market Interaction', () => {
    it('calls onMarketPress when market row is pressed', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      fireEvent.press(btcRow);

      expect(mockOnMarketPress).toHaveBeenCalledTimes(1);
      expect(mockOnMarketPress).toHaveBeenCalledWith(mockMarkets[0]);
    });

    it('calls onMarketPress with correct market for different rows', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      const ethRow = screen.getByTestId('perps-market-row-ETH');
      fireEvent.press(ethRow);

      expect(mockOnMarketPress).toHaveBeenCalledTimes(1);
      expect(mockOnMarketPress).toHaveBeenCalledWith(mockMarkets[1]);
    });

    it('handles multiple market presses', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      const ethRow = screen.getByTestId('perps-market-row-ETH');
      const solRow = screen.getByTestId('perps-market-row-SOL');

      fireEvent.press(btcRow);
      fireEvent.press(ethRow);
      fireEvent.press(solRow);

      expect(mockOnMarketPress).toHaveBeenCalledTimes(3);
      expect(mockOnMarketPress).toHaveBeenNthCalledWith(1, mockMarkets[0]);
      expect(mockOnMarketPress).toHaveBeenNthCalledWith(2, mockMarkets[1]);
      expect(mockOnMarketPress).toHaveBeenNthCalledWith(3, mockMarkets[2]);
    });
  });

  describe('Props Configuration', () => {
    it('passes iconSize to market rows', () => {
      render(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
          iconSize={48}
        />,
      );

      expect(screen.getByTestId('icon-size')).toBeOnTheScreen();
      expect(screen.getByTestId('icon-size')).toHaveTextContent('48');
    });

    it('passes sortBy as displayMetric to market rows', () => {
      render(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
          sortBy="priceChange"
        />,
      );

      expect(screen.getByTestId('display-metric')).toBeOnTheScreen();
      expect(screen.getByTestId('display-metric')).toHaveTextContent(
        'priceChange',
      );
    });

    it('uses default sortBy value of volume when not provided', () => {
      render(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByTestId('display-metric')).toHaveTextContent('volume');
    });

    it('renders ListHeaderComponent when provided', () => {
      const HeaderComponent = () => (
        <View testID="custom-header">
          <RNText>Custom Header</RNText>
        </View>
      );

      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          ListHeaderComponent={HeaderComponent}
        />,
      );

      expect(screen.getByTestId('custom-header')).toBeOnTheScreen();
      expect(screen.getByText('Custom Header')).toBeOnTheScreen();
    });

    it('renders without ListHeaderComponent when not provided', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.queryByTestId('custom-header')).not.toBeOnTheScreen();
    });
  });

  describe('Data Updates', () => {
    it('updates when markets prop changes', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();

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

      rerender(
        <PerpsMarketList
          markets={newMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.queryByText('BTC')).not.toBeOnTheScreen();
      expect(screen.queryByText('ETH')).not.toBeOnTheScreen();
      expect(screen.getByText('AVAX')).toBeOnTheScreen();
      expect(screen.getByText('Avalanche')).toBeOnTheScreen();
    });

    it('transitions from markets to empty state', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-market-list-empty'),
      ).not.toBeOnTheScreen();

      rerender(
        <PerpsMarketList markets={[]} onMarketPress={mockOnMarketPress} />,
      );

      expect(screen.queryByText('BTC')).not.toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-list-empty')).toBeOnTheScreen();
    });

    it('transitions from empty state to markets', () => {
      const { rerender } = render(
        <PerpsMarketList markets={[]} onMarketPress={mockOnMarketPress} />,
      );

      expect(screen.getByTestId('perps-market-list-empty')).toBeOnTheScreen();
      expect(screen.queryByText('BTC')).not.toBeOnTheScreen();

      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(
        screen.queryByTestId('perps-market-list-empty'),
      ).not.toBeOnTheScreen();
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });

    it('updates iconSize prop correctly', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
          iconSize={32}
        />,
      );

      expect(screen.getByTestId('icon-size')).toHaveTextContent('32');

      rerender(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
          iconSize={48}
        />,
      );

      expect(screen.getByTestId('icon-size')).toHaveTextContent('48');
    });

    it('updates sortBy prop correctly', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
          sortBy="volume"
        />,
      );

      expect(screen.getByTestId('display-metric')).toHaveTextContent('volume');

      rerender(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
          sortBy="priceChange"
        />,
      );

      expect(screen.getByTestId('display-metric')).toHaveTextContent(
        'priceChange',
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles single market', () => {
      render(
        <PerpsMarketList
          markets={[mockMarkets[0]]}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.queryByText('ETH')).not.toBeOnTheScreen();
    });

    it('handles very long market list', () => {
      const longMarketList: PerpsMarketData[] = Array.from(
        { length: 100 },
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

      render(
        <PerpsMarketList
          markets={longMarketList}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByTestId('perps-market-list')).toBeOnTheScreen();
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

      render(
        <PerpsMarketList
          markets={specialMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByText('BTC-USD')).toBeOnTheScreen();
    });

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

      render(
        <PerpsMarketList
          markets={marketsWithEmptySymbol}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(screen.getByText('Unknown')).toBeOnTheScreen();
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { root, rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(root).toBeTruthy();

      rerender(
        <PerpsMarketList markets={[]} onMarketPress={mockOnMarketPress} />,
      );

      expect(screen.getByTestId('perps-market-list-empty')).toBeOnTheScreen();

      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      expect(
        screen.queryByTestId('perps-market-list-empty'),
      ).not.toBeOnTheScreen();
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });
  });

  describe('Filter changes (no remount)', () => {
    it('passes filterKey via extraData instead of keying the FlashList', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          filterKey="perps"
        />,
      );

      const lastProps = mockFlashListProps[mockFlashListProps.length - 1];
      expect(lastProps.extraData).toBe('perps');
      // `key` is consumed by React and must never be forwarded as a prop here.
      expect(lastProps.key).toBeUndefined();
    });

    it('does not remount rows when filterKey changes', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          filterKey="perps"
        />,
      );

      const mountsAfterInitialRender = mockRowMountCount.value;
      expect(mountsAfterInitialRender).toBe(mockMarkets.length);

      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          filterKey="spot"
        />,
      );

      // No additional mounts means rows (and their live-price subscriptions)
      // survived the filter change.
      expect(mockRowMountCount.value).toBe(mountsAfterInitialRender);
    });
  });

  describe('Stable onPress (React.memo not defeated)', () => {
    it('passes the same onPress reference to a row across re-renders', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          sortBy="volume"
        />,
      );

      // Force the parent to re-render without changing onMarketPress.
      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          sortBy="priceChange"
        />,
      );

      const btcOnPressRefs = mockRowOnPressBySymbol.BTC;
      expect(btcOnPressRefs.length).toBeGreaterThanOrEqual(2);
      // Every render must hand the row the exact same (stable) onPress function.
      btcOnPressRefs.forEach((ref) => {
        expect(ref).toBe(mockOnMarketPress);
      });
    });

    it('still invokes onMarketPress with the correct market when pressed', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      fireEvent.press(screen.getByTestId('perps-market-row-ETH'));

      expect(mockOnMarketPress).toHaveBeenCalledTimes(1);
      expect(mockOnMarketPress).toHaveBeenCalledWith(mockMarkets[1]);
    });
  });

  describe('FlashList Configuration', () => {
    it('uses symbol as keyExtractor', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
        />,
      );

      // Verify each market row has testID based on symbol
      expect(screen.getByTestId('perps-market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-row-ETH')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-row-SOL')).toBeOnTheScreen();
    });
  });

  describe('Scroll reset', () => {
    it('does not scroll on initial render even when scrollResetKey is set', () => {
      render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          scrollResetKey="all|browse"
        />,
      );

      expect(mockScrollToOffset).not.toHaveBeenCalled();
    });

    it('scrolls to offset 0 when scrollResetKey changes', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          scrollResetKey="all|browse"
        />,
      );

      expect(mockScrollToOffset).not.toHaveBeenCalled();

      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          scrollResetKey="all|search"
        />,
      );

      expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
      expect(mockScrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });

    it('does not scroll again when re-rendered with the same scrollResetKey', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          scrollResetKey="all|browse"
          sortBy="volume"
        />,
      );

      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          scrollResetKey="all|browse"
          sortBy="priceChange"
        />,
      );

      expect(mockScrollToOffset).not.toHaveBeenCalled();
    });

    it('falls back to filterKey to trigger the reset when scrollResetKey is not provided', () => {
      const { rerender } = render(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          filterKey="perps"
        />,
      );

      expect(mockScrollToOffset).not.toHaveBeenCalled();

      rerender(
        <PerpsMarketList
          markets={mockMarkets}
          onMarketPress={mockOnMarketPress}
          filterKey="spot"
        />,
      );

      expect(mockScrollToOffset).toHaveBeenCalledTimes(1);
      expect(mockScrollToOffset).toHaveBeenCalledWith({
        offset: 0,
        animated: true,
      });
    });
  });
});
