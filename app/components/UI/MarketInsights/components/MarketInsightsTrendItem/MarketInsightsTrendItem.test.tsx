import React from 'react';
import { Image } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsTrendItem from './MarketInsightsTrendItem';

describe('MarketInsightsTrendItem', () => {
  it('renders trend title and description', () => {
    const trend = {
      title: 'Macro liquidity supports risk assets',
      description: 'Broad risk-on sentiment is supporting ETH and BTC.',
      articles: [
        {
          source: 'Cointelegraph',
          url: 'https://cointelegraph.com/news/market-update-1',
        },
        { source: 'theblock.co', url: 'https://www.theblock.co/post/1234' },
      ],
    };

    const { getByText } = renderWithProvider(
      <MarketInsightsTrendItem trend={trend as never} testID="trend-item" />,
    );

    expect(getByText(trend.title)).toBeOnTheScreen();
    expect(getByText(trend.description)).toBeOnTheScreen();
  });

  it('renders stacked unique source favicon logos', () => {
    const trend = {
      title: 'Macro liquidity supports risk assets',
      description: 'Broad risk-on sentiment is supporting ETH and BTC.',
      articles: [
        {
          source: 'Cointelegraph',
          url: 'https://cointelegraph.com/news/market-update-1',
        },
        {
          source: 'Cointelegraph duplicate',
          url: 'https://cointelegraph.com/news/market-update-2',
        },
        { source: 'theblock.co', url: 'https://www.theblock.co/post/1234' },
      ],
    };

    const { UNSAFE_getAllByType } = renderWithProvider(
      <MarketInsightsTrendItem trend={trend as never} testID="trend-item" />,
    );

    // Cointelegraph entries dedupe to one favicon, plus The Block = 2.
    expect(UNSAFE_getAllByType(Image)).toHaveLength(2);
  });

  it('renders X icon for tweet sources instead of a favicon Image', () => {
    const trend = {
      title: 'Cycle discussion',
      description: 'Traders discuss repeating patterns on X.',
      articles: [],
      tweets: [
        {
          author: 'ardizor',
          contentSummary: 'Same cycle playbook.',
          date: '2026-02-17',
          url: 'https://x.com/ardizor/status/123',
        },
      ],
    };

    const { UNSAFE_queryAllByType } = renderWithProvider(
      <MarketInsightsTrendItem trend={trend as never} testID="trend-item" />,
    );

    // X source uses Icon component, not Image.
    expect(UNSAFE_queryAllByType(Image)).toHaveLength(0);
  });

  it('calls onPress when trend item is tapped', () => {
    const onPress = jest.fn();
    const trend = {
      title: 'Institutional inflows',
      description: 'Large funds keep adding BTC exposure.',
      articles: [
        { source: 'coindesk.com', url: 'https://coindesk.com/news/1' },
      ],
    };

    const { getByTestId } = renderWithProvider(
      <MarketInsightsTrendItem
        trend={trend as never}
        onPress={onPress}
        testID="trend-item"
      />,
    );

    fireEvent.press(getByTestId('trend-item'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
