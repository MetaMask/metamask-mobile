import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import OwnedTokensView from './OwnedTokensView';
import { useOwnedTokens } from './useOwnedTokens';
import type { ClassifiedOwnedToken } from './ownedTokenModel';

jest.mock('./useOwnedTokens', () => ({
  useOwnedTokens: jest.fn(),
}));

jest.mock(
  '../../../../UI/Tokens/components/TokenListSecurityBadge/TokenListSecurityBadge',
  () => {
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () =>
        React.createElement(View, { testID: 'token-list-security-badge' }),
    };
  },
);

jest.mock('../../../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

const mockUseOwnedTokens = jest.mocked(useOwnedTokens);

const hiddenToken: ClassifiedOwnedToken = {
  assetId:
    'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType,
  category: 'hidden',
  isTracked: true,
  name: 'Hidden Coin',
  symbol: 'HIDE',
  decimals: 18,
  balance: '2000000000000000000',
  chainId: 'eip155:1' as CaipChainId,
  address: '0x1111111111111111111111111111111111111111',
  imageUrl: 'https://example.com/hide.png',
};

const ghostToken: ClassifiedOwnedToken = {
  assetId:
    'eip155:137/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType,
  category: 'undetected',
  isTracked: false,
  name: 'Ghost Token',
  symbol: 'GHOST',
  decimals: 6,
  balance: '10000000',
  price: '1.5',
  chainId: 'eip155:137' as CaipChainId,
  address: '0x2222222222222222222222222222222222222222',
  imageUrl: 'https://example.com/ghost.png',
};

const addTokens = jest.fn();
const refetch = jest.fn();

const renderView = () =>
  renderWithProvider(<OwnedTokensView />, {
    state: { engine: { backgroundState } },
  });

describe('OwnedTokensView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addTokens.mockResolvedValue({ addedAssetIds: [], failed: 0 });
    mockUseOwnedTokens.mockReturnValue({
      tokens: [hiddenToken, ghostToken],
      isLoading: false,
      isError: false,
      refetch,
      addTokens,
    });
  });

  it('lists hidden and undetected tokens', () => {
    const { getAllByTestId, getByTestId } = renderView();

    expect(getByTestId('owned-token-row-HIDE')).toBeOnTheScreen();
    expect(getByTestId('owned-token-row-GHOST')).toBeOnTheScreen();
    expect(getByTestId('owned-token-balance-HIDE')).toHaveTextContent('2 HIDE');
    expect(getByTestId('owned-token-balance-GHOST')).toHaveTextContent(
      '10 GHOST',
    );
    expect(getByTestId('owned-token-fiat-GHOST')).toHaveTextContent('$15.00');
    expect(getByTestId('owned-token-fiat-HIDE')).toHaveTextContent('—');
    expect(getAllByTestId('token-list-security-badge')).toHaveLength(2);
    expect(getByTestId('owned-tokens-section-hidden')).toBeOnTheScreen();
    expect(getByTestId('owned-tokens-section-undetected')).toBeOnTheScreen();
  });

  it('filters to hidden tokens', () => {
    const { getByTestId, queryByTestId } = renderView();

    fireEvent.press(getByTestId('owned-tokens-pill-hidden'));

    expect(getByTestId('owned-token-row-HIDE')).toBeOnTheScreen();
    expect(queryByTestId('owned-token-row-GHOST')).toBeNull();
  });

  it('keeps search collapsed on the pill row until it is opened', () => {
    const { getByTestId, queryByTestId } = renderView();

    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.OWNED_TOKENS_SEARCH),
    ).toBeNull();
    expect(getByTestId('owned-tokens-pill-all')).toBeOnTheScreen();

    fireEvent.press(getByTestId('owned-tokens-search-toggle'));

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.OWNED_TOKENS_SEARCH),
    ).toBeOnTheScreen();
  });

  it('filters by search text', () => {
    const { getByTestId, queryByTestId } = renderView();

    fireEvent.press(getByTestId('owned-tokens-search-toggle'));
    fireEvent.changeText(
      getByTestId(ImportTokenViewSelectorsIDs.OWNED_TOKENS_SEARCH),
      'ghost',
    );

    expect(getByTestId('owned-token-row-GHOST')).toBeOnTheScreen();
    expect(queryByTestId('owned-token-row-HIDE')).toBeNull();
  });

  it('adds only the row the user tapped', async () => {
    addTokens.mockResolvedValue({
      addedAssetIds: [ghostToken.assetId],
      failed: 0,
    });
    const { getByTestId } = renderView();

    fireEvent.press(getByTestId('owned-token-row-GHOST'));
    fireEvent.press(getByTestId(ImportTokenViewSelectorsIDs.OWNED_TOKENS_ADD));

    await waitFor(() => {
      expect(addTokens).toHaveBeenCalledWith([ghostToken]);
    });
  });

  it('shows an empty state when no tokens are waiting', () => {
    mockUseOwnedTokens.mockReturnValue({
      tokens: [],
      isLoading: false,
      isError: false,
      refetch,
      addTokens,
    });
    const { getByTestId } = renderView();

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.OWNED_TOKENS_EMPTY),
    ).toBeOnTheScreen();
  });

  it('retries after the balances request fails', () => {
    mockUseOwnedTokens.mockReturnValue({
      tokens: [],
      isLoading: false,
      isError: true,
      refetch,
      addTokens,
    });
    const { getByTestId } = renderView();

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.OWNED_TOKENS_RETRY),
    );

    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
