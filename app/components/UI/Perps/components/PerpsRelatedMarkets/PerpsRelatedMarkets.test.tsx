import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsRelatedMarketsSelectorsIDs } from '../../Perps.testIds';
import {
  RELATED_MARKETS_EVENT_PROPERTY,
  RELATED_MARKET_CLICKED,
  RELATED_MARKETS_HEADER_TAPPED,
  RELATED_MARKETS_SOURCE,
} from '../../utils/relatedMarkets';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';
import PerpsRelatedMarkets from './PerpsRelatedMarkets';

const mockNavigate = jest.fn();
const mockTrack = jest.fn();
const mockNavigateToMarketList = jest.fn();
const mockUsePerpsMarkets = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    canGoBack: () => true,
  }),
}));

jest.mock('../../hooks/usePerpsMarkets', () => ({
  usePerpsMarkets: (...args: unknown[]) => mockUsePerpsMarkets(...args),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('../../hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketList: mockNavigateToMarketList,
  }),
}));

jest.mock('../../../Trending/components/PillScrollList', () => ({
  PillScrollList: ({
    data,
    isLoading,
    renderItem,
    keyExtractor,
    listTestId,
    maxPills = 12,
  }: {
    data: PerpsFeedItem[];
    isLoading: boolean;
    renderItem: (item: PerpsFeedItem, index: number) => React.ReactNode;
    keyExtractor: (item: PerpsFeedItem) => string;
    listTestId: string;
    maxPills?: number;
  }) => {
    const ReactModule = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const displayData = data.slice(0, maxPills);
    return ReactModule.createElement(
      View,
      { testID: listTestId },
      isLoading
        ? ReactModule.createElement(View, { testID: 'mock-pill-skeleton' })
        : displayData.map((item: PerpsFeedItem, index: number) =>
            ReactModule.createElement(
              View,
              { key: keyExtractor(item) },
              renderItem(item, index),
            ),
          ),
    );
  },
}));

jest.mock('../../../Trending/components/SectionPillsSkeleton', () => ({
  SectionPillsSkeleton: () => null,
}));

jest.mock('../PerpsPillItem', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    PerpsPillItem: function MockPerpsPillItem({
      item,
      onNavigateToMarketDetails,
    }: {
      item: { market: PerpsMarketData };
      onNavigateToMarketDetails?: (market: PerpsMarketData) => void;
    }) {
      return (
        <TouchableOpacity
          testID={`perps-market-tile-card-${item.market.symbol}`}
          onPress={() => onNavigateToMarketDetails?.(item.market)}
        >
          <Text>{item.market.symbol}</Text>
          <Text>{item.market.change24hPercent}</Text>
        </TouchableOpacity>
      );
    },
  };
});

const createMarket = (
  symbol: string,
  overrides: Partial<PerpsMarketData> = {},
): PerpsMarketData => ({
  symbol,
  name: symbol,
  maxLeverage: '10x',
  price: '$1.00',
  change24h: '$0.01',
  change24hPercent: '+1.00%',
  volume: '$1M',
  ...overrides,
});

const mockMarketsResult = (markets: PerpsMarketData[]) => ({
  markets,
  isLoading: false,
  error: null,
  refresh: jest.fn(),
  isRefreshing: false,
});

describe('PerpsRelatedMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsMarkets.mockReturnValue(mockMarketsResult([]));
  });

  it('renders pills in a scrollable grid without sparklines', () => {
    mockUsePerpsMarkets.mockReturnValue(
      mockMarketsResult([createMarket('FET'), createMarket('TAO')]),
    );

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    expect(
      screen.getByTestId(PerpsRelatedMarketsSelectorsIDs.RAIL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsRelatedMarketsSelectorsIDs.HEADER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsRelatedMarketsSelectorsIDs.PILL_GRID),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-FET')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-TAO')).toBeOnTheScreen();
    expect(screen.getAllByText('+1.00%')).toHaveLength(2);
  });

  it('renders nothing when there are no related markets', () => {
    mockUsePerpsMarkets.mockReturnValue(
      mockMarketsResult([createMarket('RNDR')]),
    );

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    expect(
      screen.queryByTestId(PerpsRelatedMarketsSelectorsIDs.RAIL),
    ).toBeNull();
  });

  it('caps markets at 12 pills', () => {
    const markets = Array.from({ length: 15 }, (_, i) =>
      createMarket(`MKT${i}`),
    );
    mockUsePerpsMarkets.mockReturnValue(mockMarketsResult(markets));

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    const pills = screen.getAllByText(/^MKT\d+$/);
    expect(pills.length).toBeLessThanOrEqual(12);
  });

  it('tracks pill tap and navigates with related markets source', () => {
    const targetMarket = createMarket('FET');
    mockUsePerpsMarkets.mockReturnValue(mockMarketsResult([targetMarket]));

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    fireEvent.press(screen.getByTestId('perps-market-tile-card-FET'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        interaction_type: RELATED_MARKET_CLICKED,
        [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: 'RNDR',
        [RELATED_MARKETS_EVENT_PROPERTY.MARKET]: 'FET',
        [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: 'crypto',
        [RELATED_MARKETS_EVENT_PROPERTY.POSITION]: 1,
      },
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: {
        market: targetMarket,
        source: RELATED_MARKETS_SOURCE,
      },
    });
  });

  it('navigates to market list with category filter on header press', () => {
    mockUsePerpsMarkets.mockReturnValue(
      mockMarketsResult([createMarket('FET')]),
    );

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    fireEvent.press(screen.getByTestId(PerpsRelatedMarketsSelectorsIDs.HEADER));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        interaction_type: RELATED_MARKETS_HEADER_TAPPED,
        [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: 'RNDR',
        [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: 'crypto',
      },
    );
    expect(mockNavigateToMarketList).toHaveBeenCalledWith({
      source: RELATED_MARKETS_SOURCE,
      defaultMarketTypeFilter: 'crypto',
    });
  });

  it('tracks correct position for pills', () => {
    const markets = Array.from({ length: 8 }, (_, i) =>
      createMarket(`MKT${i}`),
    );
    mockUsePerpsMarkets.mockReturnValue(mockMarketsResult(markets));

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    fireEvent.press(screen.getByTestId('perps-market-tile-card-MKT7'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        interaction_type: RELATED_MARKET_CLICKED,
        [RELATED_MARKETS_EVENT_PROPERTY.POSITION]: 8,
      }),
    );
  });
});
