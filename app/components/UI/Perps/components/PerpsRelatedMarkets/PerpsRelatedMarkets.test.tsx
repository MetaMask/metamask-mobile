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
  type RelatedMarketCollection,
} from '../../utils/relatedMarkets';
import PerpsRelatedMarkets from './PerpsRelatedMarkets';

const mockNavigate = jest.fn();
const mockTrack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('../PerpsTokenLogo', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({ testID }: { testID?: string }) {
    return <View testID={testID} />;
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

const collection: RelatedMarketCollection = {
  id: 'ai',
  label: 'AI',
  type: 'thematic',
  symbols: ['RNDR', 'FET', 'TAO'],
};

describe('PerpsRelatedMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders related market tiles with price and 24h change', () => {
    render(
      <PerpsRelatedMarkets
        currentMarket={createMarket('RNDR')}
        collection={collection}
        markets={[createMarket('FET'), createMarket('TAO')]}
      />,
    );

    expect(
      screen.getByTestId(PerpsRelatedMarketsSelectorsIDs.RAIL),
    ).toBeOnTheScreen();
    expect(screen.getByText('Related markets')).toBeOnTheScreen();
    expect(
      screen.getByTestId(getPerpsRelatedMarketsSelector.tile('FET')),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getPerpsRelatedMarketsSelector.tilePrice('FET')),
    ).toHaveTextContent('$1.00');
    expect(
      screen.getByTestId(getPerpsRelatedMarketsSelector.tileChange('FET')),
    ).toHaveTextContent('+1.00%');
  });

  it('tracks tile tap and navigates with related markets source', () => {
    const targetMarket = createMarket('FET');

    render(
      <PerpsRelatedMarkets
        currentMarket={createMarket('RNDR')}
        collection={collection}
        markets={[targetMarket]}
      />,
    );

    fireEvent.press(
      screen.getByTestId(getPerpsRelatedMarketsSelector.tile('FET')),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        interaction_type: RELATED_MARKET_CLICKED,
        [RELATED_MARKETS_EVENT_PROPERTY.SOURCE_MARKET]: 'RNDR',
        [RELATED_MARKETS_EVENT_PROPERTY.MARKET]: 'FET',
        [RELATED_MARKETS_EVENT_PROPERTY.CATEGORY]: 'ai',
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
    render(
      <PerpsRelatedMarkets
        currentMarket={createMarket('RNDR')}
        collection={collection}
        markets={[createMarket('FET')]}
      />,
    );

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
});
