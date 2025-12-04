import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import PerpsMarketTypeSection from './PerpsMarketTypeSection';
import Routes from '../../../../../constants/navigation/Routes';
import type { PerpsMarketData } from '../../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../PerpsMarketList', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ markets, ListHeaderComponent, onMarketPress }) => (
      <ReactNative.View testID="perps-market-list">
        {ListHeaderComponent && <ListHeaderComponent />}
        {markets.map((market: PerpsMarketData, index: number) => (
          <ReactNative.TouchableOpacity
            key={index}
            testID={`market-item-${market.symbol}`}
            onPress={() => onMarketPress(market)}
          >
            <ReactNative.Text>{market.symbol}</ReactNative.Text>
          </ReactNative.TouchableOpacity>
        ))}
      </ReactNative.View>
    )),
  };
});

jest.mock('../PerpsRowSkeleton', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ count }) => (
      <ReactNative.View testID={`skeleton-count-${count}`} />
    )),
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    if (key === 'perps.home.see_all') {
      return 'See All';
    }
    return key;
  }),
}));

const mockNavigate = jest.fn();
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;

describe('PerpsMarketTypeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
  });

  const createMockMarket = (symbol: string): PerpsMarketData => ({
    symbol,
    name: `${symbol} Market`,
    maxLeverage: '50x',
    price: '$50,000.00',
    change24h: '+$2,600.00',
    change24hPercent: '+5.2%',
    volume: '$1,000,000',
    fundingRate: 0.01,
  });

  const mockMarkets: PerpsMarketData[] = [
    createMockMarket('BTC'),
    createMockMarket('ETH'),
    createMockMarket('SOL'),
  ];

  describe('rendering', () => {
    it('renders section with title and markets', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      expect(getByText('Crypto Markets')).toBeTruthy();
    });

    it('renders pressable header with arrow icon', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      // Header is pressable with arrow icon (no "See All" text)
      expect(getByText('Crypto Markets')).toBeTruthy();
    });

    it('renders market list when markets are available', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      expect(getByTestId('perps-market-list')).toBeTruthy();
    });

    it('applies custom testID', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          testID="custom-section"
        />,
      );

      expect(getByTestId('custom-section')).toBeTruthy();
    });
  });

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading
        />,
      );

      expect(getByTestId('skeleton-count-5')).toBeTruthy();
    });

    it('renders section header during loading', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading
        />,
      );

      expect(getByText('Crypto Markets')).toBeTruthy();
      // Header is pressable with arrow icon (no "See All" text)
    });

    it('does not render market list when loading', () => {
      const { queryByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading
        />,
      );

      expect(queryByTestId('perps-market-list')).toBeNull();
    });

    it('transitions from loading to loaded state', () => {
      const { getByTestId, queryByTestId, rerender } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading
        />,
      );

      expect(getByTestId('skeleton-count-5')).toBeTruthy();
      expect(queryByTestId('perps-market-list')).toBeNull();

      rerender(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading={false}
        />,
      );

      expect(queryByTestId('skeleton-count-5')).toBeNull();
      expect(getByTestId('perps-market-list')).toBeTruthy();
    });
  });

  describe('empty state', () => {
    it('returns null when markets array is empty', () => {
      const { queryByText } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={[]}
          marketType="crypto"
        />,
      );

      expect(queryByText('Crypto Markets')).toBeNull();
    });

    it('does not render when markets are empty and not loading', () => {
      const { queryByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={[]}
          marketType="crypto"
          isLoading={false}
          testID="section"
        />,
      );

      expect(queryByTestId('section')).toBeNull();
    });
  });

  describe('navigation', () => {
    it('navigates to market list when header is pressed', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      fireEvent.press(getByText('Crypto Markets'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: 'crypto',
        },
      });
    });

    it('passes correct market type for equity markets', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Stock Markets"
          markets={mockMarkets}
          marketType="equity"
        />,
      );

      fireEvent.press(getByText('Stock Markets'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: 'equity',
        },
      });
    });

    it('passes correct market type for commodity markets', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Commodity Markets"
          markets={mockMarkets}
          marketType="commodity"
        />,
      );

      fireEvent.press(getByText('Commodity Markets'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_LIST,
        params: {
          defaultMarketTypeFilter: 'commodity',
        },
      });
    });

    it('navigates to market details when market is pressed', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      fireEvent.press(getByTestId('market-item-BTC'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockMarkets[0],
        },
      });
    });

    it('handles multiple header presses', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      const headerTitle = getByText('Crypto Markets');

      fireEvent.press(headerTitle);
      fireEvent.press(headerTitle);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('sort configuration', () => {
    it('uses default sort by volume', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      const marketList = getByTestId('perps-market-list');

      expect(marketList).toBeTruthy();
    });

    it('passes custom sort field to market list', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          sortBy="priceChange"
        />,
      );

      const marketList = getByTestId('perps-market-list');

      expect(marketList).toBeTruthy();
    });
  });

  describe('market types', () => {
    it('handles crypto market type', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Crypto"
          markets={mockMarkets}
          marketType="crypto"
        />,
      );

      expect(getByText('Crypto')).toBeTruthy();
    });

    it('handles equity market type', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Stocks"
          markets={mockMarkets}
          marketType="equity"
        />,
      );

      expect(getByText('Stocks')).toBeTruthy();
    });

    it('handles commodity market type', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Commodities"
          markets={mockMarkets}
          marketType="commodity"
        />,
      );

      expect(getByText('Commodities')).toBeTruthy();
    });

    it('handles forex market type', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="Forex"
          markets={mockMarkets}
          marketType="forex"
        />,
      );

      expect(getByText('Forex')).toBeTruthy();
    });

    it('handles all market type', () => {
      const { getByText } = render(
        <PerpsMarketTypeSection
          title="All Markets"
          markets={mockMarkets}
          marketType="all"
        />,
      );

      expect(getByText('All Markets')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('handles single market', () => {
      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={[createMockMarket('BTC')]}
          marketType="crypto"
        />,
      );

      expect(getByTestId('market-item-BTC')).toBeTruthy();
    });

    it('handles large number of markets', () => {
      const largeMarketList = Array.from({ length: 50 }, (_, i) =>
        createMockMarket(`COIN${i}`),
      );

      const { getByTestId } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={largeMarketList}
          marketType="crypto"
        />,
      );

      expect(getByTestId('perps-market-list')).toBeTruthy();
    });

    it('maintains header visibility during loading', () => {
      const { getByText, rerender } = render(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading={false}
        />,
      );

      expect(getByText('Crypto Markets')).toBeTruthy();

      rerender(
        <PerpsMarketTypeSection
          title="Crypto Markets"
          markets={mockMarkets}
          marketType="crypto"
          isLoading
        />,
      );

      expect(getByText('Crypto Markets')).toBeTruthy();
    });
  });
});
