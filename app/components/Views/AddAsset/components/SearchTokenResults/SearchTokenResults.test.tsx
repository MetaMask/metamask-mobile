import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SearchTokenResults from './SearchTokenResults';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { BridgeToken } from '../../../../UI/Bridge/types';

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: jest.fn().mockReturnValue('mockedImageSource'),
}));

jest.mock('../../../../UI/AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn().mockReturnValue('mockedImageSource'),
}));

const mockToken = {
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  symbol: 'USDT',
  name: 'Tether USD',
  image: 'https://example.com/usdt.png',
  decimals: 6,
  chainId: '0x1' as const,
};

const mockInitialState = {
  engine: { backgroundState: { ...backgroundState } },
};

const mockHandleSelectAsset = jest.fn();

const defaultProps = {
  searchResults: [mockToken] as BridgeToken[],
  handleSelectAsset: mockHandleSelectAsset,
  selectedAsset: [] as BridgeToken[],
  searchQuery: '',
  chainId: '0x1',
  networkName: 'Ethereum',
  alreadyAddedTokens: undefined as Set<string> | undefined,
  isLoading: false,
};

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) =>
  renderWithProvider(<SearchTokenResults {...defaultProps} {...overrides} />, {
    state: mockInitialState,
  });

describe('SearchTokenResults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows skeleton loaders when loading', () => {
    const { queryByText, queryByTestId } = renderComponent({
      isLoading: true,
    });

    expect(queryByText('Tether USD')).toBeNull();
    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    ).toBeNull();
  });

  it('shows empty description when no results and no query', () => {
    const { getByText } = renderComponent({
      searchResults: [],
      searchQuery: '',
    });

    expect(getByText('Search for any token and import it')).toBeOnTheScreen();
  });

  it('shows "no tokens found" when no results but has query', () => {
    const { getByText } = renderComponent({
      searchResults: [],
      searchQuery: 'USDT',
    });

    expect(
      getByText("We couldn't find any tokens with that name."),
    ).toBeOnTheScreen();
  });

  it('renders token name and symbol from search results', () => {
    const { getByText } = renderComponent();

    expect(getByText('Tether USD')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('calls handleSelectAsset when a token is pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    );

    expect(mockHandleSelectAsset).toHaveBeenCalledWith(mockToken);
  });

  it('disables already-added tokens and does not call handleSelectAsset', () => {
    const alreadyAddedTokens = new Set([mockToken.address]);

    const { getByTestId } = renderComponent({
      alreadyAddedTokens,
    });

    const listItem = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );

    expect(listItem).toHaveProp('disabled', true);

    fireEvent.press(listItem);
    expect(mockHandleSelectAsset).not.toHaveBeenCalled();
  });
});
