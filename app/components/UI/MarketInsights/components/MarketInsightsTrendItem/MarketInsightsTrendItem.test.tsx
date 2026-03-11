import React from 'react';
import { Image } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsTrendItem from './MarketInsightsTrendItem';

describe('MarketInsightsTrendItem', () => {
  it('renders trend text and deduplicates source icons', () => {
    const trend = {
      title: 'Macro liquidity supports risk assets',
      description: 'Broad risk-on sentiment is supporting ETH and BTC.',
      articles: [
        {
          source: 'Cointelegraph',
          url: 'https://cointelegraph.com/news/market-update-1',
        },
        {
          source: 'https://cointelegraph.com/news/market-update-2',
          url: 'https://cointelegraph.com/news/market-update-2',
        },
        { source: 'theblock.co', url: 'https://www.theblock.co/post/1234' },
      ],
    };

    const { getByText, UNSAFE_getAllByType } = renderWithProvider(
      <MarketInsightsTrendItem trend={trend as never} testID="trend-item" />,
    );

    expect(getByText(trend.title)).toBeOnTheScreen();
    expect(getByText(trend.description)).toBeOnTheScreen();

    const sourceIcons = UNSAFE_getAllByType(Image);
    expect(sourceIcons).toHaveLength(2);
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

  it('shows X icon when trend has only tweets and no articles', () => {
    const trend = {
      title: 'Developer debates',
      description: 'Discussions heat up on consensus.',
      articles: [],
      tweets: [
        {
          author: 'adam3us',
          contentSummary: 'Minority protections matter.',
          date: '2026-02-17',
          url: 'https://x.com/adam3us/status/123',
        },
      ],
    };

    const { getByText, UNSAFE_getAllByType } = renderWithProvider(
      <MarketInsightsTrendItem trend={trend as never} testID="trend-item" />,
    );

    expect(getByText(trend.title)).toBeOnTheScreen();
    const sourceIcons = UNSAFE_getAllByType(Image);
    expect(sourceIcons).toHaveLength(1);
  });
});
