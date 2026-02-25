import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MarketInsightsSourcesFooter from './MarketInsightsSourcesFooter';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';
import { Pressable } from 'react-native';

describe('MarketInsightsSourcesFooter', () => {
  it('calls sources callback when sources pill is pressed', () => {
    const onSourcesPress = jest.fn();
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
      { name: 'The Block', type: 'news', url: 'https://theblock.co/article-2' },
      { name: 'Decrypt', type: 'news', url: 'https://decrypt.co/article-3' },
      {
        name: 'Bitcoin Magazine',
        type: 'social',
        url: 'https://bitcoinmagazine.com/article-4',
      },
      {
        name: 'CoinMarketCap',
        type: 'data',
        url: 'https://coinmarketcap.com/article-5',
      },
    ];

    const { getByText } = renderWithProvider(
      <MarketInsightsSourcesFooter
        sources={sources as never}
        onSourcesPress={onSourcesPress}
        testID="sources"
      />,
    );

    fireEvent.press(getByText('+1 sources'));
    expect(onSourcesPress).toHaveBeenCalledTimes(1);
  });

  it('calls thumbs callbacks when thumb buttons are pressed', () => {
    const onThumbsUp = jest.fn();
    const onThumbsDown = jest.fn();
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
    ];

    const { getByTestId } = renderWithProvider(
      <MarketInsightsSourcesFooter
        sources={sources as never}
        onThumbsUp={onThumbsUp}
        onThumbsDown={onThumbsDown}
        testID="sources"
      />,
    );

    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON));
    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON));

    expect(onThumbsUp).toHaveBeenCalledTimes(1);
    expect(onThumbsDown).toHaveBeenCalledTimes(1);
  });

  it('calls thumbs callbacks when thumb buttons are pressed', () => {
    const onThumbsUp = jest.fn();
    const onThumbsDown = jest.fn();
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
    ];

    const { getByTestId } = renderWithProvider(
      <MarketInsightsSourcesFooter
        sources={sources as never}
        onThumbsUp={onThumbsUp}
        onThumbsDown={onThumbsDown}
        testID="sources"
      />,
    );

    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON));
    fireEvent.press(getByTestId(MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON));

    expect(onThumbsUp).toHaveBeenCalledTimes(1);
    expect(onThumbsDown).toHaveBeenCalledTimes(1);
  });

  it('closes sources sheet when bottom sheet onClose is triggered', () => {
    const sources = [
      { name: 'CoinDesk', type: 'news', url: 'https://coindesk.com/article-1' },
    ];

    const { UNSAFE_getAllByType, getByTestId, queryByTestId } =
      renderWithProvider(
        <MarketInsightsSourcesFooter
          sources={sources as never}
          testID="sources"
        />,
      );

    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);
    expect(getByTestId('mock-bottom-sheet')).toBeOnTheScreen();

    fireEvent.press(getByTestId('mock-bottom-sheet-close'));
    expect(queryByTestId('mock-bottom-sheet')).toBeNull();
  });
});
