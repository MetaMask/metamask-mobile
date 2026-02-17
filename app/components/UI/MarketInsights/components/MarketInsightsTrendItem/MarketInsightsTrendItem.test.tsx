import React from 'react';
import { Image } from 'react-native';
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
});
