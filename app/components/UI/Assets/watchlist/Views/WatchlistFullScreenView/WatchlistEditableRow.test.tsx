import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import WatchlistEditableRow from './WatchlistEditableRow';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';

const mockMutate = jest.fn();
const mockDrag = jest.fn();

jest.mock('../../hooks/useTokenWatchlistMutations', () => ({
  useTokenWatchlistRemoveItemMutation: () => ({
    mutate: mockMutate,
  }),
}));

jest.mock('react-native-reorderable-list', () => ({
  useReorderableDrag: () => mockDrag,
}));

jest.mock(
  '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => {
    const { Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({
      token,
      tokenDetailsSource,
    }: {
      token: { name: string };
      tokenDetailsSource: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'trending-token-row-item' },
        ReactActual.createElement(
          Text,
          { testID: 'token-details-source' },
          tokenDetailsSource,
        ),
        ReactActual.createElement(Text, null, token.name),
      );
    Mock.displayName = 'TrendingTokenRowItem';
    return { __esModule: true, default: Mock };
  },
);

const createToken = (): TrendingAsset =>
  ({
    assetId: 'eip155:8453/slip44:60',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    price: '3000',
    marketCap: 0,
    aggregatedUsdVolume: 0,
  }) as TrendingAsset;

describe('WatchlistEditableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the token row with watchlist fullscreen source', () => {
    const { getByTestId, getByText } = render(
      <WatchlistEditableRow
        token={createToken()}
        position={0}
        isEditMode={false}
      />,
    );

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDITABLE_ROW),
    ).toBeDefined();
    expect(getByTestId('trending-token-row-item')).toBeDefined();
    expect(getByTestId('token-details-source').props.children).toBe(
      TokenDetailsSource.WatchlistFullscreen,
    );
    expect(getByText('Ethereum')).toBeDefined();
  });

  it('renders drag handle in edit mode', () => {
    const { getByTestId } = render(
      <WatchlistEditableRow token={createToken()} position={0} isEditMode />,
    );

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DRAG_HANDLE),
    ).toBeDefined();
  });

  it('calls reorderable drag on long press of drag handle in edit mode', () => {
    const { getByTestId } = render(
      <WatchlistEditableRow token={createToken()} position={0} isEditMode />,
    );

    fireEvent(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DRAG_HANDLE),
      'longPress',
    );

    expect(mockDrag).toHaveBeenCalledTimes(1);
  });

  it('calls remove mutation when unwatch star is pressed in edit mode', () => {
    const token = createToken();
    const { getByTestId } = render(
      <WatchlistEditableRow token={token} position={1} isEditMode />,
    );

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR),
    );

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(token.assetId);
  });

  it('does not call remove mutation when unwatch star is pressed outside edit mode', () => {
    const { getByTestId } = render(
      <WatchlistEditableRow
        token={createToken()}
        position={0}
        isEditMode={false}
      />,
    );

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR),
    );

    expect(mockMutate).not.toHaveBeenCalled();
  });
});
