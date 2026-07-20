import React from 'react';
import { render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import WatchlistSearchRowItem from './WatchlistSearchRowItem';
import { WatchlistSearchRowItemTestIds } from './WatchlistSearchRowItem.testIds';

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
  const { Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = () =>
    ReactActual.createElement(
      View,
      { testID: 'watchlist-star-button' },
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
  it('renders token row and star', () => {
    const { getByTestId, getByText } = render(
      <WatchlistSearchRowItem
        token={makeToken('ETH', 'eip155:1/slip44:60')}
        index={0}
      />,
    );

    expect(getByTestId(WatchlistSearchRowItemTestIds.ROW)).toBeDefined();
    expect(getByText('ETH')).toBeDefined();
    expect(getByTestId('watchlist-star-button')).toBeDefined();
  });
});
