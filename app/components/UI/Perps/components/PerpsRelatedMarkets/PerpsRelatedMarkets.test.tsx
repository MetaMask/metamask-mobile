import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PerpsMarketData } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  getPerpsRelatedMarketsSelector,
  PerpsRelatedMarketsSelectorsIDs,
} from '../../Perps.testIds';
import {
  RELATED_MARKETS_EVENT_PROPERTY,
  RELATED_MARKET_CLICKED,
  RELATED_MARKETS_SOURCE,
} from '../../utils/relatedMarkets';
import PerpsRelatedMarkets from './PerpsRelatedMarkets';

const mockNavigate = jest.fn();
const mockTrack = jest.fn();
const mockUseHomepageSparklines = jest.fn();
const mockUsePerpsMarkets = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
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

jest.mock(
  '../../../../Views/Homepage/Sections/Perpetuals/hooks/useHomepageSparklines',
  () => ({
    useHomepageSparklines: (...args: unknown[]) =>
      mockUseHomepageSparklines(...args),
  }),
);

jest.mock(
  '../../../../Views/Homepage/Sections/Perpetuals/components/PerpsMarketTileCard',
  () => {
    const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
    return function MockPerpsMarketTileCard({
      market,
      onPress,
      sparklineData,
      testID,
    }: {
      market: PerpsMarketData;
      onPress?: () => void;
      sparklineData?: number[];
      testID?: string;
    }) {
      return (
        <TouchableOpacity testID={testID} onPress={onPress}>
          <Text>{market.symbol}</Text>
          <Text>{market.change24hPercent}</Text>
          <View testID={`sparkline-${market.symbol}`}>
            <Text>{sparklineData?.length ?? 0}</Text>
          </View>
        </TouchableOpacity>
      );
    };
  },
);

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
    mockUseHomepageSparklines.mockReturnValue({
      sparklines: {
        FET: [1, 2, 3],
        TAO: [3, 2, 1],
      },
    });
    mockUsePerpsMarkets.mockReturnValue(mockMarketsResult([]));
  });

  it('renders related market tiles with homepage sparkline format', () => {
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
      screen.getByTestId(getPerpsRelatedMarketsSelector.tile('FET')),
    ).toBeOnTheScreen();
    expect(mockUseHomepageSparklines).toHaveBeenCalledWith(['FET', 'TAO']);
    expect(screen.getByTestId('sparkline-FET')).toHaveTextContent('3');
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

  it('tracks tile tap and navigates with related markets source', () => {
    const targetMarket = createMarket('FET');
    mockUsePerpsMarkets.mockReturnValue(mockMarketsResult([targetMarket]));

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    fireEvent.press(
      screen.getByTestId(getPerpsRelatedMarketsSelector.tile('FET')),
    );

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

  it('tracks rail slide once', () => {
    mockUsePerpsMarkets.mockReturnValue(
      mockMarketsResult([createMarket('FET')]),
    );

    render(<PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />);

    const scrollView = screen.getByTestId(
      PerpsRelatedMarketsSelectorsIDs.SCROLL_VIEW,
    );
    fireEvent(scrollView, 'scrollBeginDrag');
    fireEvent(scrollView, 'scrollBeginDrag');

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        interaction_type: 'slide',
        section_viewed: RELATED_MARKETS_SOURCE,
        asset: 'RNDR',
      }),
    );
  });

  it('tracks rail slide again after current market changes', () => {
    mockUsePerpsMarkets.mockReturnValue(
      mockMarketsResult([createMarket('FET')]),
    );

    const { rerender } = render(
      <PerpsRelatedMarkets currentMarket={createMarket('RNDR')} />,
    );

    const scrollView = screen.getByTestId(
      PerpsRelatedMarketsSelectorsIDs.SCROLL_VIEW,
    );
    fireEvent(scrollView, 'scrollBeginDrag');

    rerender(<PerpsRelatedMarkets currentMarket={createMarket('TAO')} />);

    fireEvent(
      screen.getByTestId(PerpsRelatedMarketsSelectorsIDs.SCROLL_VIEW),
      'scrollBeginDrag',
    );

    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenLastCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      expect.objectContaining({
        interaction_type: 'slide',
        section_viewed: RELATED_MARKETS_SOURCE,
        asset: 'TAO',
      }),
    );
  });
});
