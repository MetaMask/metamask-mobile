import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsRecentlyViewedRailSelectorsIDs } from '../../Perps.testIds';
import type { PerpsFeedItem } from '../../types/perpsFeedTypes';
import PerpsRecentlyViewedRail, {
  RECENTLY_VIEWED_EVENT_PROPERTY,
  RECENTLY_VIEWED_MARKET_CLICKED,
} from './PerpsRecentlyViewedRail';

const mockTrack = jest.fn();

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('../../../Trending/components/PillScrollList', () => ({
  PillScrollList: ({
    data,
    isLoading,
    renderItem,
    keyExtractor,
    listTestId,
    maxPills = 10,
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
  const MockPill = ({
    item,
    onNavigateToMarketDetails,
  }: {
    item: { market: PerpsMarketData };
    onNavigateToMarketDetails?: (market: PerpsMarketData) => void;
  }) => (
    <TouchableOpacity
      testID={`perps-market-tile-card-${item.market.symbol}`}
      onPress={() => onNavigateToMarketDetails?.(item.market)}
    >
      <Text>{item.market.symbol}</Text>
    </TouchableOpacity>
  );
  return { PerpsPillItem: MockPill };
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

describe('PerpsRecentlyViewedRail', () => {
  const mockOnMarketPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when there are no recently viewed markets', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(
      screen.queryByTestId(PerpsRecentlyViewedRailSelectorsIDs.RAIL),
    ).toBeNull();
  });

  it('renders the header and pills for each recently viewed market', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('BTC'), createMarket('ETH')]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    expect(
      screen.getByTestId(PerpsRecentlyViewedRailSelectorsIDs.RAIL),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PerpsRecentlyViewedRailSelectorsIDs.PILL_GRID),
    ).toBeOnTheScreen();
    expect(screen.getByText('Recently viewed')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-BTC')).toBeOnTheScreen();
    expect(screen.getByTestId('perps-market-tile-card-ETH')).toBeOnTheScreen();
  });

  it('preserves the newest-first order passed in via props', () => {
    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('SOL'), createMarket('BTC')]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    const grid = screen.getByTestId(
      PerpsRecentlyViewedRailSelectorsIDs.PILL_GRID,
    );
    const symbols = grid.findAllByType(jest.requireActual('react-native').Text);
    expect(symbols[0].props.children).toBe('SOL');
    expect(symbols[1].props.children).toBe('BTC');
  });

  it('caps rendered pills at 10', () => {
    const markets = Array.from({ length: 15 }, (_, i) =>
      createMarket(`MKT${i}`),
    );

    render(
      <PerpsRecentlyViewedRail
        markets={markets}
        onMarketPress={mockOnMarketPress}
      />,
    );

    const pills = screen.getAllByText(/^MKT\d+$/);
    expect(pills).toHaveLength(10);
  });

  it('tracks pill tap with market symbol and 1-based position, then invokes onMarketPress', () => {
    const target = createMarket('ETH');

    render(
      <PerpsRecentlyViewedRail
        markets={[createMarket('BTC'), target]}
        onMarketPress={mockOnMarketPress}
      />,
    );

    fireEvent.press(screen.getByTestId('perps-market-tile-card-ETH'));

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        interaction_type: RECENTLY_VIEWED_MARKET_CLICKED,
        [RECENTLY_VIEWED_EVENT_PROPERTY.MARKET]: 'ETH',
        [RECENTLY_VIEWED_EVENT_PROPERTY.POSITION]: 2,
      },
    );
    expect(mockOnMarketPress).toHaveBeenCalledWith(target, 1);
  });
});
