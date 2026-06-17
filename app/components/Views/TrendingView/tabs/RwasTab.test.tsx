/**
 * RwasTab — unit tests
 *
 * Covers:
 * 1. Renders the perps toggle block when data is available.
 * 2. Returns null for the perps block when data is empty and not loading.
 * 3. Hides the perps section when the perps feature flag is off.
 * 4. Calls navigateToPerpsMarketList with the correct filter when "View All" is pressed.
 * 5. Renders the stocks section when stocks data is available.
 */

jest.mock('@shopify/flash-list', () => {
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  return { FlashList: RN.FlatList };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const twFn = () => ({});
  twFn.style = () => ({});
  return { useTailwind: () => twFn };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../search/analytics', () => ({
  trackExploreInteracted: jest.fn(),
  trackExploreSectionSeeAll: jest.fn(),
}));

jest.mock('../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../UI/Predict', () => ({
  selectPredictEnabledFlag: jest.fn(() => false),
}));

jest.mock('../feeds/perps/usePerpsFeed');
jest.mock('../feeds/stocks/useStocksFeed', () => ({
  useStocksFeed: jest.fn(),
  STOCKS_FEED_PREVIEW_PAGE_SIZE: 3,
}));
jest.mock('../feeds/predictions/usePredictionsFeed');

jest.mock('../feeds/predictions/PredictionsCarouselSection', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPredictionsCarouselSection() {
    return <View testID="predictions-carousel" />;
  };
});

jest.mock('../feeds/perps/PerpsSectionProvider', () => {
  const { Fragment } = jest.requireActual('react');
  return function MockPerpsSectionProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <Fragment>{children}</Fragment>;
  };
});

const mockNavigateToPerpsMarketList = jest.fn();
jest.mock('../feeds/perps/perpsNavigation', () => ({
  navigateToPerpsMarketList: (...args: unknown[]) =>
    mockNavigateToPerpsMarketList(...args),
}));

jest.mock('../feeds/tokens/TokenRowItem', () => {
  const { View } = jest.requireActual('react-native');
  return {
    TokenRowItem: function MockTokenRowItem() {
      return <View testID="mock-token-row-item" />;
    },
  };
});

jest.mock(
  '../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return function MockTrendingTokensSkeleton() {
      return <View testID="mock-trending-skeleton" />;
    };
  },
);

jest.mock('../../../UI/Trending/components/TrendingTokenRowItem/utils', () => ({
  getCaipChainIdFromAssetId: jest.fn(() => 'eip155:1'),
}));

jest.mock('../feeds/perps/PerpsToggleBlock', () => {
  const { TouchableOpacity, Text: RNText } = jest.requireActual('react-native');
  const MockPerpsToggleBlock = ({
    onViewAll,
    sortOptionId,
    defaultPillKey,
    headerTestID,
  }: {
    title: string;
    onViewAll: (filter: string, sort: string) => void;
    sortOptionId: string;
    defaultPillKey: string;
    headerTestID: string;
    isLoading: boolean;
  }) => (
    <TouchableOpacity
      testID={headerTestID}
      onPress={() => onViewAll(defaultPillKey, sortOptionId)}
    >
      <RNText testID="mock-perps-toggle-block">perps-block</RNText>
    </TouchableOpacity>
  );
  MockPerpsToggleBlock.displayName = 'MockPerpsToggleBlock';
  return MockPerpsToggleBlock;
});

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { usePerpsFeed } from '../feeds/perps/usePerpsFeed';
import { useStocksFeed } from '../feeds/stocks/useStocksFeed';
import { usePredictionsFeed } from '../feeds/predictions/usePredictionsFeed';
import RwasTab from './RwasTab';

const mockUsePerpsFeed = jest.mocked(usePerpsFeed);
const mockUseStocksFeed = jest.mocked(useStocksFeed);
const mockUsePredictionsFeed = jest.mocked(usePredictionsFeed);

const mockNavigation = { navigate: jest.fn() };

const makeMarket = (symbol: string, type: string): PerpsMarketData =>
  ({
    symbol,
    name: symbol,
    marketType: type,
    price: '$1.00',
    change24h: '+1%',
    change24hPercent: '1',
    volume: '$100M',
    maxLeverage: '10x',
    isHip3: false,
  }) as PerpsMarketData;

const makeFeedItem = (market: PerpsMarketData) => ({
  market,
  isWatchlisted: false,
});

const DEFAULT_PERPS_FEED = {
  data: [
    makeFeedItem(makeMarket('GOLD', 'commodity')),
    makeFeedItem(makeMarket('AAPL', 'stock')),
    makeFeedItem(makeMarket('EURUSD', 'forex')),
  ],
  isLoading: false,
  defaultSortOptionId: 'priceChange' as const,
  refetch: jest.fn(),
};

const DEFAULT_REFRESH = { trigger: 0, silentRefresh: false };

const renderTab = () =>
  render(
    <RwasTab
      refresh={DEFAULT_REFRESH}
      refreshing={false}
      onRefresh={jest.fn()}
    />,
  );

describe('RwasTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectPerpsEnabledFlag) return true;
      return false;
    });
    mockUsePerpsFeed.mockReturnValue(DEFAULT_PERPS_FEED);
    mockUseStocksFeed.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUsePredictionsFeed.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
  });

  it('renders the perps toggle block when data is available', () => {
    const { getByTestId } = renderTab();
    expect(getByTestId('mock-perps-toggle-block')).toBeTruthy();
  });

  it('does not render the perps block when data is empty and not loading', () => {
    mockUsePerpsFeed.mockReturnValue({
      ...DEFAULT_PERPS_FEED,
      data: [],
      isLoading: false,
    });

    const { queryByTestId } = renderTab();
    expect(queryByTestId('mock-perps-toggle-block')).toBeNull();
  });

  it('renders the perps block while loading even with no data', () => {
    mockUsePerpsFeed.mockReturnValue({
      ...DEFAULT_PERPS_FEED,
      data: [],
      isLoading: true,
    });

    const { getByTestId } = renderTab();
    expect(getByTestId('mock-perps-toggle-block')).toBeTruthy();
  });

  it('does not render the perps section when perps feature flag is off', () => {
    (useSelector as jest.Mock).mockReturnValue(false);

    const { queryByTestId } = renderTab();
    expect(queryByTestId('mock-perps-toggle-block')).toBeNull();
  });

  it('calls navigateToPerpsMarketList with correct filter when View All is pressed', () => {
    const { getByTestId } = renderTab();

    act(() => {
      fireEvent.press(getByTestId('section-header-view-all-rwa_perps'));
    });

    expect(mockNavigateToPerpsMarketList).toHaveBeenCalledWith(
      mockNavigation,
      'stock',
      'priceChange',
    );
  });

  it('renders stocks section when stocks data is present', () => {
    mockUseStocksFeed.mockReturnValue({
      data: [
        {
          symbol: 'AAPL',
          name: 'Apple',
          assetId: 'eip155:1/erc20:0xabc',
          decimals: 18,
          price: '150',
          aggregatedUsdVolume: 1000,
          marketCap: 2000,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderTab();
    expect(getByTestId('section-header-view-all-stocks')).toBeTruthy();
  });

  it('hides stocks section when stocks data is empty and not loading', () => {
    mockUseStocksFeed.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { queryByTestId } = renderTab();
    expect(queryByTestId('section-header-view-all-stocks')).toBeNull();
  });

  it('navigates to RWA tokens full view when stocks View All is pressed', () => {
    mockUseStocksFeed.mockReturnValue({
      data: [
        {
          symbol: 'AAPL',
          name: 'Apple',
          assetId: 'eip155:1/erc20:0xabc',
          decimals: 18,
          price: '150',
          aggregatedUsdVolume: 1000,
          marketCap: 2000,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId } = renderTab();
    fireEvent.press(getByTestId('section-header-view-all-stocks'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('RWATokensFullView');
  });
});
