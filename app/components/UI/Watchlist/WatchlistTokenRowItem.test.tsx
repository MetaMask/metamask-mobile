import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import WatchlistTokenRowItem from './WatchlistTokenRowItem';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'usd'),
}));

jest.mock(
  '../Trending/hooks/useTrendingTokenPress/useTrendingTokenPress',
  () => ({
    useTrendingTokenPress: () => ({ onPress: jest.fn() }),
  }),
);

jest.mock('../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return ReactActual.forwardRef(() =>
    ReactActual.createElement(View, { testID: 'token-logo' }),
  );
});

jest.mock('../Trending/components/TrendingTokenRowItem/utils', () => ({
  getCaipChainIdFromAssetId: jest.fn(() => 'eip155:1'),
  getNetworkBadgeSrc: jest.fn(() => ({ uri: 'network' })),
  formatMarketStats: jest.fn(() => '$1M / $1M'),
}));

const token: TrendingAsset = {
  assetId: 'eip155:1/erc20:0xabc',
  symbol: 'ABC',
  name: 'Token ABC',
  decimals: 18,
  price: '1',
  marketCap: 1_000_000,
  aggregatedUsdVolume: 1_000_000,
};

describe('WatchlistTokenRowItem', () => {
  it('labels an unwatched token action as add to watchlist', () => {
    render(<WatchlistTokenRowItem token={token} onAddPress={jest.fn()} />);

    expect(screen.getByLabelText('Add to watchlist')).toBeOnTheScreen();
  });

  it('labels a watched token action as remove from watchlist', () => {
    render(
      <WatchlistTokenRowItem
        token={token}
        isWatchlisted
        onWatchlistPress={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Remove from watchlist')).toBeOnTheScreen();
  });
});
