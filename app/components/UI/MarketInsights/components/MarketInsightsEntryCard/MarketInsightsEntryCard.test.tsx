import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsEntryCard from './MarketInsightsEntryCard';

jest.mock('@react-native-masked-view/masked-view', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

jest.mock('react-native-linear-gradient', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return ({ children }: { children: React.ReactNode }) => (
    <MockView>{children}</MockView>
  );
});

describe('MarketInsightsEntryCard', () => {
  it('renders report headline and handles press', () => {
    const mockPress = jest.fn();

    const report = {
      headline: 'ETH rallies on ETF optimism',
      summary: 'ETF optimism and whale accumulation are driving momentum.',
      trends: [{ title: 'ETF optimism' }, { title: 'whale accumulation' }],
    };

    const { getByTestId, getByText } = renderWithProvider(
      <MarketInsightsEntryCard
        report={report as never}
        timeAgo="3m ago"
        onPress={mockPress}
        testID="market-insights-entry-card"
      />,
    );

    expect(getByText('ETH rallies on ETF optimism')).toBeOnTheScreen();

    fireEvent.press(getByTestId('market-insights-entry-card'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
