import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsEntryCard from './MarketInsightsEntryCard';

describe('MarketInsightsEntryCard', () => {
  it('renders summary text and handles press', () => {
    const mockPress = jest.fn();

    const report = {
      headline: 'ETH rallies on ETF optimism',
      summary: 'ETF optimism and whale accumulation are driving momentum.',
      trends: [{ title: 'ETF optimism' }, { title: 'whale accumulation' }],
      sources: [{ name: 'CoinDesk', type: 'news', url: 'coindesk.com' }],
    };

    const { getByTestId, getByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={report as never}
        timeAgo="3m ago"
        onPress={mockPress}
        caip19Id={'eip155:1/erc20:0xtest' as CaipAssetType}
        testID="market-insights-entry-card"
      />,
    );

    expect(
      getByText('ETF optimism and whale accumulation are driving momentum.'),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId('market-insights-entry-card'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
