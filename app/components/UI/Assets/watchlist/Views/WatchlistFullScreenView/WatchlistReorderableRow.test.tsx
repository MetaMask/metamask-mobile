import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { fireImpact, ImpactMoment } from '../../../../../../util/haptics';
import type { UnifiedWatchlistToken } from '../../../../Watchlist/types';
import WatchlistReorderableRow from './WatchlistReorderableRow';

jest.mock('react-native-reorderable-list', () => ({
  useReorderableDrag: jest.fn(),
}));

jest.mock('../../../../../../util/haptics', () => ({
  fireImpact: jest.fn(),
  ImpactMoment: { SliderGrip: 'SliderGrip' },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('../../../../Perps/hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({ navigateToMarketDetails: jest.fn() }),
}));

jest.mock('../../../../Watchlist/WatchlistTokenRowItem', () => {
  const { Pressable } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockTokenRow = ({
    onLongPress,
    accessibilityActions,
    onAccessibilityAction,
  }: {
    onLongPress?: () => void;
    accessibilityActions?: unknown[];
    onAccessibilityAction?: (event: {
      nativeEvent: { actionName: string };
    }) => void;
  }) =>
    ReactActual.createElement(Pressable, {
      testID: 'token-row',
      onLongPress,
      accessibilityActions,
      onAccessibilityAction,
    });
  MockTokenRow.displayName = 'WatchlistTokenRowItem';
  return { __esModule: true, default: MockTokenRow };
});

const TOKEN: UnifiedWatchlistToken = {
  kind: 'token',
  key: 'token:eip155:1/erc20:0xa',
  assetId: 'eip155:1/erc20:0xa',
  token: {
    assetId: 'eip155:1/erc20:0xa',
    symbol: 'A',
    name: 'Token A',
    decimals: 18,
    price: '1',
  } as TrendingAsset,
};

describe('WatchlistReorderableRow', () => {
  const mockDrag = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useReorderableDrag).mockReturnValue(mockDrag);
  });

  it('starts drag with haptics on long press', () => {
    const { getByTestId } = render(
      <WatchlistReorderableRow
        item={TOKEN}
        position={0}
        isDragEnabled
        canUseLivePerpsPrices
        onRemoveFromWatchlist={jest.fn()}
      />,
    );

    fireEvent(getByTestId('token-row'), 'longPress');

    expect(fireImpact).toHaveBeenCalledWith(ImpactMoment.SliderGrip);
    expect(mockDrag).toHaveBeenCalledTimes(1);
  });

  it('moves the row through the accessibility action', () => {
    const onMoveDown = jest.fn();
    const { getByTestId } = render(
      <WatchlistReorderableRow
        item={TOKEN}
        position={0}
        isDragEnabled
        canUseLivePerpsPrices
        onRemoveFromWatchlist={jest.fn()}
        onMoveDown={onMoveDown}
      />,
    );

    fireEvent(getByTestId('token-row'), 'accessibilityAction', {
      nativeEvent: { actionName: 'moveDown' },
    });

    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });
});
