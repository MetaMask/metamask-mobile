import React from 'react';
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
        {
          source: 'https://cointelegraph.com/news/market-update-2',
          url: 'https://cointelegraph.com/news/market-update-2',
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
