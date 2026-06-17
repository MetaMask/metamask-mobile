import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SearchTokenResults from './SearchTokenResults';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { ImportAsset } from '../../utils/utils';

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

const tokenA: ImportAsset = {
  address: '0xAAA000000000000000000000000000000000000a',
  symbol: 'AAA',
  name: 'Token A',
  decimals: 18,
  chainId: '0x1' as const,
};

const tokenB: ImportAsset = {
  address: '0xBBB000000000000000000000000000000000000b',
  symbol: 'BBB',
  name: 'Token B',
  decimals: 18,
  chainId: '0x1' as const,
};

const tokenC: ImportAsset = {
  address: '0xCCC000000000000000000000000000000000000c',
  symbol: 'CCC',
  name: 'Token C',
  decimals: 18,
  chainId: '0x1' as const,
};

const mockInitialState = {
  engine: { backgroundState: { ...backgroundState } },
};

const mockHandleSelectAsset = jest.fn();

const defaultProps = {
  searchResults: [mockToken] as ImportAsset[],
  handleSelectAsset: mockHandleSelectAsset,
  selectedAsset: [] as ImportAsset[],
  searchQuery: '',
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
    const { getByTestId } = renderComponent({ alreadyAddedTokens });
    const listItem = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    expect(listItem).toBeDisabled();
    fireEvent.press(listItem);
    expect(mockHandleSelectAsset).not.toHaveBeenCalled();
  });

  describe('selection stability across changing searchResults', () => {
    it('keeps correct token pressable when results shrink and it shifts to a new index', () => {
      const { rerender, getAllByTestId } = renderComponent({
        searchResults: [tokenA, tokenB, tokenC],
        selectedAsset: [tokenB],
        searchQuery: 'to',
      });

      rerender(
        <SearchTokenResults
          {...defaultProps}
          searchResults={[tokenB, tokenC]}
          selectedAsset={[tokenB]}
          searchQuery="tok"
        />,
      );

      const rows = getAllByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );
      fireEvent.press(rows[0]);
      expect(mockHandleSelectAsset).toHaveBeenCalledWith(tokenB);
      expect(mockHandleSelectAsset).not.toHaveBeenCalledWith(tokenC);
    });

    it('routes press to correct token after selectedAsset prop updates', () => {
      const { rerender, getAllByTestId } = renderComponent({
        searchResults: [tokenA, tokenB, tokenC],
        selectedAsset: [],
        searchQuery: 'to',
      });

      rerender(
        <SearchTokenResults
          {...defaultProps}
          searchResults={[tokenA, tokenB, tokenC]}
          selectedAsset={[tokenB]}
          searchQuery="to"
        />,
      );

      const rows = getAllByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );
      fireEvent.press(rows[1]);
      expect(mockHandleSelectAsset).toHaveBeenCalledWith(tokenB);
      fireEvent.press(rows[0]);
      expect(mockHandleSelectAsset).toHaveBeenCalledWith(tokenA);
    });

    it('keeps already-added token disabled after results reorder', () => {
      const alreadyAdded = new Set([tokenA.address.toLowerCase()]);
      const { rerender, getAllByTestId } = renderComponent({
        searchResults: [tokenA, tokenB, tokenC],
        selectedAsset: [],
        searchQuery: 'to',
        alreadyAddedTokens: alreadyAdded,
      });

      rerender(
        <SearchTokenResults
          {...defaultProps}
          searchResults={[tokenA, tokenC]}
          selectedAsset={[]}
          searchQuery="tok"
          alreadyAddedTokens={alreadyAdded}
        />,
      );

      const rows = getAllByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );
      expect(rows[0]).toBeDisabled();
      expect(rows[1]).not.toBeDisabled();
    });
  });
});
