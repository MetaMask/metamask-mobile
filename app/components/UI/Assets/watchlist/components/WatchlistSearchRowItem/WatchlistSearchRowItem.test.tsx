import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import WatchlistSearchRowItem from './WatchlistSearchRowItem';
import { WatchlistSearchRowItemTestIds } from './WatchlistSearchRowItem.testIds';

const mockOnDismiss = jest.fn();

jest.mock('../../../../../Views/TrendingView/feeds/tokens/TokenRowItem', () => {
  const { Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({
    token,
    index,
  }: {
    token: { symbol: string };
    index: number;
  }) =>
    ReactActual.createElement(
      View,
      { testID: `mock-token-search-row-${index}` },
      ReactActual.createElement(Text, null, token.symbol),
    );
  Mock.displayName = 'TokenSearchRowItem';
  return { TokenSearchRowItem: Mock };
});

jest.mock('../WatchlistStarButton', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({ onAfterToggle }: { onAfterToggle?: () => void }) =>
    ReactActual.createElement(
      Pressable,
      {
        testID: 'watchlist-star-button',
        onPress: () => onAfterToggle?.(),
      },
      ReactActual.createElement(Text, null, 'star'),
    );
  Mock.displayName = 'WatchlistStarButton';
  return Mock;
});

const makeToken = (symbol: string, assetId: string): TrendingAsset =>
  ({
    assetId,
    symbol,
    name: symbol,
    price: '1.23',
    priceChangePct: { h24: 5 },
  }) as TrendingAsset;

describe('WatchlistSearchRowItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders token row and star', () => {
    const { getByTestId, getByText } = render(
      <WatchlistSearchRowItem
        token={makeToken('ETH', 'eip155:1/slip44:60')}
        index={0}
        onDismiss={mockOnDismiss}
      />,
    );

    expect(getByTestId(WatchlistSearchRowItemTestIds.ROW)).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
    expect(getByTestId('watchlist-star-button')).toBeDefined();
  });

  it('calls onDismiss when star is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <WatchlistSearchRowItem
        token={makeToken(
          'BTC',
          'bip122:000000000019d6689c085ae165831e93/slip44:0',
        )}
        index={1}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(getByTestId('watchlist-star-button'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
