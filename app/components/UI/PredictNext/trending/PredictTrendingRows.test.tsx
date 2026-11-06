import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type {
  PredictMarket,
  PredictMarketBuyButtonPressParams,
} from '../../Predict/types';
import { PredictEventValues } from '../analytics';
import { toTrendingMarket } from './internal/legacyMarkets';
import { PredictTrendingMarketCard } from './PredictTrendingMarketCard';
import { PredictTrendingSearchRow } from './PredictTrendingSearchRow';
import { getPredictTrendingMarketAnalyticsProperties } from './getPredictTrendingMarketAnalyticsProperties';

jest.mock('../../Predict/components/PredictMarket', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return ({
    market,
    entryPoint,
    isCarousel,
    onCardPress,
    onBuyButtonPress,
  }: {
    market: PredictMarket;
    entryPoint?: string;
    isCarousel?: boolean;
    onCardPress?: () => void;
    onBuyButtonPress?: (params: PredictMarketBuyButtonPressParams) => void;
  }) => (
    <>
      <Pressable testID="stub-card" onPress={onCardPress}>
        <Text>{`${market.id}|${entryPoint}|${String(Boolean(isCarousel))}`}</Text>
      </Pressable>
      <Pressable
        testID="stub-buy"
        onPress={() =>
          onBuyButtonPress?.({
            market,
            outcome: market.outcomes[0],
            outcomeToken: market.outcomes[0].tokens[0],
          })
        }
      />
    </>
  );
});

jest.mock('../../Predict/components/PredictMarketRowItem', () => {
  const { Text } = jest.requireActual('react-native');
  return ({
    market,
    entryPoint,
  }: {
    market: PredictMarket;
    entryPoint?: string;
  }) => <Text>{`row|${market.id}|${entryPoint}`}</Text>;
});

const LEGACY_MARKET = {
  id: 'market-1',
  slug: 'will-it-rain',
  title: 'Will it rain?',
  tags: ['weather'],
  outcomes: [{ id: 'outcome-1', tokens: [{ id: 'token-yes' }] }],
} as unknown as PredictMarket;
const MARKET = toTrendingMarket(LEGACY_MARKET);

describe('PredictTrendingMarketCard', () => {
  it('renders the full-width legacy card for the explore entry point', () => {
    render(<PredictTrendingMarketCard market={MARKET} />);

    expect(
      screen.getByText(
        `market-1|${PredictEventValues.ENTRY_POINT.EXPLORE}|false`,
      ),
    ).toBeOnTheScreen();
  });

  it('reports card and buy presses with the pressed market', () => {
    const onCardPress = jest.fn();
    const onBuyButtonPress = jest.fn();
    render(
      <PredictTrendingMarketCard
        market={MARKET}
        onCardPress={onCardPress}
        onBuyButtonPress={onBuyButtonPress}
      />,
    );

    fireEvent.press(screen.getByTestId('stub-card'));
    fireEvent.press(screen.getByTestId('stub-buy'));

    expect(onCardPress).toHaveBeenCalledTimes(1);
    expect(onBuyButtonPress).toHaveBeenCalledWith({ market: MARKET });
  });
});

describe('PredictTrendingSearchRow', () => {
  it('renders the legacy search row for the explore_search entry point', () => {
    render(<PredictTrendingSearchRow market={MARKET} />);

    expect(
      screen.getByText(
        `row|market-1|${PredictEventValues.ENTRY_POINT.EXPLORE_SEARCH}`,
      ),
    ).toBeOnTheScreen();
  });
});

describe('getPredictTrendingMarketAnalyticsProperties', () => {
  it('returns the market identity properties', () => {
    expect(getPredictTrendingMarketAnalyticsProperties(MARKET)).toStrictEqual({
      market_id: 'market-1',
      market_slug: 'will-it-rain',
      market_tags: ['weather'],
      market_title: 'Will it rain?',
    });
  });

  it('omits the properties a market lacks', () => {
    const market = toTrendingMarket({
      id: 'market-2',
    } as unknown as PredictMarket);

    expect(getPredictTrendingMarketAnalyticsProperties(market)).toStrictEqual({
      market_id: 'market-2',
    });
  });
});
