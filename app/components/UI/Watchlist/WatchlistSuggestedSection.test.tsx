import React from 'react';
import { render } from '@testing-library/react-native';
import WatchlistSuggestedSection from './WatchlistSuggestedSection';
import { selectWatchlistSuggestions } from './utils';

jest.mock('./WatchlistTokenRowItem', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const Mock = ({
    token,
    twClassName,
  }: {
    token: { name: string };
    twClassName?: string;
  }) =>
    ReactActual.createElement(View, {
      testID: `suggested-token-${token.name}`,
      twClassName,
    });

  Mock.displayName = 'WatchlistTokenRowItem';
  return { __esModule: true, default: Mock };
});

jest.mock('../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const Mock = ({
    market,
    twClassName,
    showBadge,
  }: {
    market: { symbol: string };
    twClassName?: string;
    showBadge?: boolean;
  }) =>
    ReactActual.createElement(View, {
      testID: `suggested-perp-${market.symbol}`,
      twClassName,
      showBadge,
    });

  Mock.displayName = 'PerpsMarketRowItem';
  return { __esModule: true, default: Mock };
});

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
  Reanimated.useReducedMotion = jest.fn(() => false);
  return Reanimated;
});

const makeToken = (name: string) => ({
  assetId: `token:${name}`,
  name,
  symbol: name.toUpperCase(),
  decimals: 18,
  balance: '0',
  isInWallet: false,
});

const makePerp = (symbol: string) => ({
  symbol,
  name: symbol,
  maxLeverage: '10x',
  price: '$1',
  change24h: '$0',
  change24hPercent: '0%',
  volume: '$1M',
});

describe('WatchlistSuggestedSection', () => {
  it('moves later suggestions up when an initial suggestion is watched', () => {
    const ether = makeToken('Ether');
    const solana = makeToken('Solana');
    const perps = ['NVDA', 'TSLA', 'GOLD'].map(makePerp);

    const { getAllByTestId, rerender } = render(
      <WatchlistSuggestedSection
        rows={selectWatchlistSuggestions([ether, solana], perps, 5)}
        hasWatchlist={false}
        onAddPress={jest.fn()}
      />,
    );

    const suggestedRows = getAllByTestId(/suggested-(token|perp)-/);

    expect(suggestedRows.map((row) => row.props.testID)).toEqual([
      'suggested-token-Ether',
      'suggested-token-Solana',
      'suggested-perp-NVDA',
      'suggested-perp-TSLA',
      'suggested-perp-GOLD',
    ]);
    expect(suggestedRows.every((row) => row.props.twClassName === 'px-0')).toBe(
      true,
    );

    rerender(
      <WatchlistSuggestedSection
        rows={selectWatchlistSuggestions([solana], perps, 4)}
        hasWatchlist
        onAddPress={jest.fn()}
      />,
    );

    expect(
      getAllByTestId(/suggested-(token|perp)-/).map((row) => row.props.testID),
    ).toEqual([
      'suggested-token-Solana',
      'suggested-perp-NVDA',
      'suggested-perp-TSLA',
      'suggested-perp-GOLD',
    ]);
  });

  it('keeps Perps visible when a saved watchlist remounts', () => {
    const tokens = ['Ether', 'Solana', 'Avalanche', 'Polygon'].map(makeToken);
    const perps = ['NVDA', 'TSLA'].map(makePerp);

    const { getAllByTestId } = render(
      <WatchlistSuggestedSection
        rows={selectWatchlistSuggestions(tokens, perps, 5)}
        hasWatchlist
        onAddPress={jest.fn()}
      />,
    );

    expect(
      getAllByTestId(/suggested-(token|perp)-/).map((row) => row.props.testID),
    ).toEqual([
      'suggested-token-Ether',
      'suggested-token-Solana',
      'suggested-perp-NVDA',
      'suggested-perp-TSLA',
      'suggested-token-Avalanche',
    ]);
  });

  it('can hide the Perps type badge', () => {
    const { getByTestId } = render(
      <WatchlistSuggestedSection
        rows={selectWatchlistSuggestions([], [makePerp('NVDA')], 1)}
        hasWatchlist
        onAddPress={jest.fn()}
        showPerpBadge={false}
      />,
    );

    expect(getByTestId('suggested-perp-NVDA')).toHaveProp('showBadge', false);
  });
});
