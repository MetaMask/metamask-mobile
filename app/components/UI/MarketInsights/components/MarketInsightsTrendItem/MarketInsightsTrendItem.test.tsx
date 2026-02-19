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
        { source: 'cointelegraph.com' },
        { source: 'cointelegraph.com' },
        { source: 'theblock.co' },
      ],
    };

    const { getByText, UNSAFE_getAllByType } = renderWithProvider(
      <MarketInsightsTrendItem trend={trend as never} testID="trend-item" />,
    );

    expect(getByText(trend.title)).toBeTruthy();
    expect(getByText(trend.description)).toBeTruthy();

    const sourceIcons = UNSAFE_getAllByType(Image);
    expect(sourceIcons).toHaveLength(2);
  });

  it('calls onPress when trend item is tapped', () => {
    const onPress = jest.fn();
    const trend = {
      title: 'Institutional inflows',
      description: 'Large funds keep adding BTC exposure.',
      articles: [{ source: 'coindesk.com' }],
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
