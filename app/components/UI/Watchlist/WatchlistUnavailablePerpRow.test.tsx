import React from 'react';
import { render } from '@testing-library/react-native';
import { ListItem } from '@metamask/design-system-react-native';
import WatchlistUnavailablePerpRow from './WatchlistUnavailablePerpRow';
import type { UnifiedWatchlistUnavailablePerp } from './types';

const item: UnifiedWatchlistUnavailablePerp = {
  kind: 'perp',
  key: 'perp:btc',
  symbol: 'BTC',
  status: 'unavailable',
};

describe('WatchlistUnavailablePerpRow', () => {
  it('does not advertise a row action when only removal is available', () => {
    const { UNSAFE_getByType: getByType } = render(
      <WatchlistUnavailablePerpRow item={item} onRemove={jest.fn()} />,
    );

    expect(getByType(ListItem).props.isInteractive).toBe(false);
  });

  it('keeps the row interactive when long-press reorder is available', () => {
    const { UNSAFE_getByType: getByType } = render(
      <WatchlistUnavailablePerpRow
        item={item}
        onRemove={jest.fn()}
        onLongPress={jest.fn()}
      />,
    );

    expect(getByType(ListItem).props.isInteractive).toBe(true);
  });
});
