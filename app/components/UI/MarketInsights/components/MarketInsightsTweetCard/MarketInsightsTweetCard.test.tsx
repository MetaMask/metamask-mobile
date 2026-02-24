import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsTweetCard from './MarketInsightsTweetCard';

describe('MarketInsightsTweetCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-17T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders tweet metadata and handles card press', () => {
    const onPress = jest.fn();

    const tweet = {
      author: 'analyst_alpha',
      contentSummary: 'Momentum remains positive after CPI print.',
      date: '2026-02-17T11:00:00.000Z',
      url: 'https://x.com/user/status/1',
    };

    const { getByTestId, getByText } = renderWithProvider(
      <MarketInsightsTweetCard
        tweet={tweet as never}
        onPress={onPress}
        testID="market-insights-tweet-card"
      />,
    );

    expect(getByText('analyst_alpha')).toBeOnTheScreen();
    expect(getByText('1h ago')).toBeOnTheScreen();

    fireEvent.press(getByTestId('market-insights-tweet-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
