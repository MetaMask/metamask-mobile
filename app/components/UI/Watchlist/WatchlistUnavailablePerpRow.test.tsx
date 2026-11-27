import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistUnavailablePerpRow, {
  getUnavailablePerpRemoveButtonTestId,
  getUnavailablePerpRowTestId,
} from './WatchlistUnavailablePerpRow';
import type { UnifiedWatchlistUnavailablePerp } from './types';

const ITEM: UnifiedWatchlistUnavailablePerp = {
  kind: 'perp',
  key: 'perp:btc',
  symbol: 'BTC',
  status: 'unavailable',
};

describe('WatchlistUnavailablePerpRow', () => {
  it('renders unavailable market data and removes the watched market', () => {
    const onRemove = jest.fn();
    const { getByTestId, getByText } = render(
      <WatchlistUnavailablePerpRow item={ITEM} onRemove={onRemove} />,
    );

    fireEvent.press(
      getByTestId(getUnavailablePerpRemoveButtonTestId(ITEM.symbol)),
    );

    expect(
      getByTestId(getUnavailablePerpRowTestId(ITEM.symbol)),
    ).toBeOnTheScreen();
    expect(getByText('Market data unavailable')).toBeOnTheScreen();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
