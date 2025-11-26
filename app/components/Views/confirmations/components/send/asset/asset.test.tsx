import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AssetType, Nft } from '../../../types/token';
import { useSendTokens } from '../../../hooks/send/useSendTokens';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { useEVMNfts } from '../../../hooks/send/useNfts';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';
import { Asset } from './asset';

const mockTokens: AssetType[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    balance: '1.5',
    balanceFiat: '$3000.00',
    image: 'https://example.com/eth.png',
    aggregators: [],
    logo: 'https://example.com/eth.png',
    isETH: true,
    isNative: true,
    ticker: 'ETH',
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    chainId: '0x1',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    balance: '1000.0',
    balanceFiat: '$1000.00',
    image: 'https://example.com/usdc.png',
    aggregators: [],
    logo: 'https://example.com/usdc.png',
    isETH: false,
    isNative: false,
    ticker: 'USDC',
  },
];

const mockNfts: Nft[] = [
  {
    address: '0x1234567890123456789012345678901234567890',
    standard: 'ERC721',
    name: 'Cool NFT #1',
    collectionName: 'Cool Collection',
    image: 'https://example.com/nft1.png',
    chainId: '0x1',
    tokenId: '1',
    accountId: 'account1',
    networkBadgeSource: { uri: 'https://example.com/badge.png' },
  },
  {
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    standard: 'ERC1155',
    name: 'Awesome NFT #2',
    collectionName: 'Awesome Collection',
    image: 'https://example.com/nft2.png',
    chainId: '0x1',
    tokenId: '2',
    accountId: 'account1',
    networkBadgeSource: { uri: 'https://example.com/badge.png' },
  },
];

jest.mock('../../../hooks/send/useSendTokens', () => ({
  useSendTokens: jest.fn(),
}));

jest.mock('../../../hooks/send/useTokenSearch', () => ({
  useTokenSearch: jest.fn(),
}));

jest.mock('../../../hooks/send/useNfts', () => ({
  useEVMNfts: jest.fn(),
}));

jest.mock('../../../hooks/send/metrics/useAssetSelectionMetrics', () => ({
  useAssetSelectionMetrics: jest.fn(),
}));

jest.mock(
  '../../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const { TextInput } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        value,
        onChangeText,
        placeholder,
        onPressClearButton,
        showClearButton,
      }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
      any) => (
        <TextInput
          testID="search-input"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          onPressClearButton={onPressClearButton}
          showClearButton={showClearButton}
        />
      ),
    };
  },
);

jest.mock('../../token-list', () => ({
  TokenList: ({ tokens }: { tokens: AssetType[] }) => {
    const { View, Text } = jest.requireActual('react-native');

    return (
      <View testID="token-list">
        <Text>TokenList with {tokens.length} tokens</Text>
      </View>
    );
  },
}));

jest.mock('../../nft-list', () => ({
  NftList: ({ nfts }: { nfts: Nft[] }) => {
    const { View, Text } = jest.requireActual('react-native');

    return (
      <View testID="nft-list">
        <Text>NftList with {nfts.length} nfts</Text>
      </View>
    );
  },
}));

jest.mock('../../network-filter', () => ({
  NetworkFilter: ({
    tokens,
    onFilteredTokensChange,
    onNetworkFilterStateChange,
    onExposeFilterControls,
  }: {
    tokens: AssetType[];
    onFilteredTokensChange: (tokens: AssetType[]) => void;
    onNetworkFilterStateChange: (hasActiveFilter: boolean) => void;
    onExposeFilterControls: (clearFilters: () => void) => void;
  }) => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    const { useState } = jest.requireActual('react');

    const [isFiltered, setIsFiltered] = useState(false);

    return (
      <View testID="network-filter">
        <Pressable
          testID="apply-network-filter"
          onPress={() => {
            if (!isFiltered) {
              const filteredTokens = [tokens[0]];
              onFilteredTokensChange(filteredTokens);
              onNetworkFilterStateChange(true);
              setIsFiltered(true);
            }
          }}
        >
          <Text>Apply Network Filter</Text>
        </Pressable>
        <Pressable
          testID="expose-clear-function"
          onPress={() => {
            const clearFunction = () => {
              onFilteredTokensChange(tokens);
              onNetworkFilterStateChange(false);
              setIsFiltered(false);
            };
            onExposeFilterControls(clearFunction);
          }}
        >
          <Text>Expose Clear Function</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'send.search_tokens_and_nfts': 'Search tokens and NFTs',
      'send.tokens': 'Tokens',
      'send.nfts': 'NFTs',
      'send.no_tokens_match_filters': 'No tokens match your filters',
      'send.clear_filters': 'Clear all filters',
      'send.no_assets_available': 'No assets available',
    };
    return mockStrings[key] || key;
  }),
}));

const mockUseSendTokens = jest.mocked(useSendTokens);
const mockUseTokenSearch = jest.mocked(useTokenSearch);
const mockUseEVMNfts = jest.mocked(useEVMNfts);
const mockUseAssetSelectionMetrics = jest.mocked(useAssetSelectionMetrics);
const mockSetSearchQuery = jest.fn();
const mockClearSearch = jest.fn();
const mockSetAssetListSize = jest.fn();
const mockSetNoneAssetFilterMethod = jest.fn();
const mockSetSearchAssetFilterMethod = jest.fn();

describe('Asset', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSendTokens.mockReturnValue(mockTokens);
    mockUseEVMNfts.mockReturnValue(mockNfts);

    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: mockTokens,
      filteredNfts: mockNfts,
      clearSearch: mockClearSearch,
    });

    mockUseAssetSelectionMetrics.mockReturnValue({
      setAssetListSize: mockSetAssetListSize,
      setNoneAssetFilterMethod: mockSetNoneAssetFilterMethod,
      setSearchAssetFilterMethod: mockSetSearchAssetFilterMethod,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('renders the component correctly', () => {
    render(<Asset />);

    expect(screen.getByTestId('search-input')).toBeOnTheScreen();
    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getByTestId('token-list')).toBeOnTheScreen();
    expect(screen.getByTestId('nft-list')).toBeOnTheScreen();
    expect(screen.getByTestId('network-filter')).toBeOnTheScreen();
  });

  it('displays search input with correct placeholder', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput.props.placeholder).toBe('Search tokens and NFTs');
  });

  it('renders TokenList with filtered tokens', () => {
    render(<Asset />);

    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();
  });

  it('renders NftList with filtered nfts', () => {
    render(<Asset />);

    expect(screen.getByText('NftList with 2 nfts')).toBeOnTheScreen();
  });

  it('does not render NftList when hideNfts is true', () => {
    render(<Asset hideNfts />);
    expect(screen.queryByTestId('nft-list')).toBeNull();
  });

  it('handles search input changes', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent.changeText(searchInput, 'ETH');

    expect(mockSetSearchQuery).toHaveBeenCalledWith('ETH');
  });

  it('shows clear button when search query has content', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput.props.showClearButton).toBe(true);
  });

  it('hides clear button when search query is empty', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    expect(searchInput.props.showClearButton).toBe(false);
  });

  it('calls clearSearch when clear button is pressed', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');
    fireEvent(searchInput, 'onPressClearButton');

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  it('updates asset list size when filtered tokens change', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetAssetListSize).toHaveBeenCalledWith('1');
  });

  it('calls setSearchAssetFilterMethod when search query has content', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetSearchAssetFilterMethod).toHaveBeenCalledTimes(1);
  });

  it('calls setNoneAssetFilterMethod when search query is empty', () => {
    render(<Asset />);

    expect(mockSetNoneAssetFilterMethod).toHaveBeenCalledTimes(1);
  });

  it('displays correct section labels', () => {
    render(<Asset />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('NFTs')).toBeOnTheScreen();
  });

  it('renders filtered tokens in TokenList', () => {
    const filteredTokens = [mockTokens[0]];
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens,
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('TokenList with 1 tokens')).toBeOnTheScreen();
  });

  it('renders NetworkFilter component', () => {
    render(<Asset />);

    expect(screen.getByTestId('network-filter')).toBeOnTheScreen();
  });

  it('updates filtered tokens when network filter changes', () => {
    const mockSetSearchQueryLocal = jest.fn();
    const mockClearSearchLocal = jest.fn();

    mockUseTokenSearch.mockImplementation((tokens) => ({
      searchQuery: '',
      setSearchQuery: mockSetSearchQueryLocal,
      filteredTokens: tokens,
      filteredNfts: mockNfts,
      clearSearch: mockClearSearchLocal,
    }));

    render(<Asset />);

    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByText('TokenList with 1 tokens')).toBeOnTheScreen();
  });

  it('handles network filter state changes', () => {
    render(<Asset />);

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByTestId('network-filter')).toBeOnTheScreen();
  });

  it('exposes clear filter controls', () => {
    render(<Asset />);

    fireEvent.press(screen.getByTestId('expose-clear-function'));

    expect(screen.getByTestId('network-filter')).toBeOnTheScreen();
  });

  it('renders tokens and nfts when search query exists and results found', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('TokenList with 1 tokens')).toBeOnTheScreen();
  });

  it('renders tokens and nfts when network filter is active and results found', () => {
    render(<Asset />);

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();
    expect(screen.getByText('NftList with 2 nfts')).toBeOnTheScreen();
  });

  it('renders tokens and nfts when both search and network filters are active and results found', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('TokenList with 1 tokens')).toBeOnTheScreen();
  });

  it('does not show filter indicators when no filters are active', () => {
    render(<Asset />);

    expect(screen.queryByText('Clear all filters')).toBeNull();
    expect(screen.queryByText('No tokens match your filters')).toBeNull();
  });

  it('shows clear filters button only when no results and filters are active', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'xyz',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('Clear all filters')).toBeOnTheScreen();
  });

  it('calls clearSearch when clear filters button is pressed in no results state', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'xyz',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    const clearFiltersButton = screen.getByText('Clear all filters');
    fireEvent.press(clearFiltersButton);

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  it('calls both clearSearch and clearNetworkFilters when both are active in no results state', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'xyz',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    fireEvent.press(screen.getByTestId('expose-clear-function'));
    fireEvent.press(screen.getByTestId('apply-network-filter'));

    const clearFiltersButton = screen.getByText('Clear all filters');
    fireEvent.press(clearFiltersButton);

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  it('maintains existing search functionality with network filters', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');

    fireEvent.changeText(searchInput, 'ETH');
    expect(mockSetSearchQuery).toHaveBeenCalledWith('ETH');

    fireEvent.press(screen.getByTestId('apply-network-filter'));
    expect(screen.getByTestId('network-filter')).toBeOnTheScreen();
  });

  it('maintains asset list size tracking with network filtering', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: mockTokens,
      filteredNfts: mockNfts,
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetAssetListSize).toHaveBeenCalledWith('2');

    mockSetAssetListSize.mockClear();

    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetAssetListSize).toHaveBeenCalledWith('1');
  });

  it('shows no results message with clear filters button when filters are active and no results', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'xyz',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('No tokens match your filters')).toBeOnTheScreen();
    expect(screen.getByText('Clear all filters')).toBeOnTheScreen();
  });

  it('shows no assets available message when no filters and no results', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('No assets available')).toBeOnTheScreen();
    expect(screen.queryByText('Clear all filters')).toBeNull();
  });

  it('calls handleClearAllFilters when clear filters button is pressed', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'xyz',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    fireEvent.press(screen.getByTestId('expose-clear-function'));

    const clearFiltersButton = screen.getByText('Clear all filters');
    fireEvent.press(clearFiltersButton);

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  it('does not show tokens section when no filtered tokens', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: mockNfts,
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.queryByText('Tokens')).toBeNull();
    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getByText('NftList with 2 nfts')).toBeOnTheScreen();
  });

  it('does not show nfts section when no filtered nfts', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: mockTokens,
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.queryByText('NFTs')).toBeNull();
    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();
  });

  it('handles empty asset list size correctly', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [],
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetAssetListSize).toHaveBeenCalledWith('');
  });

  it('works correctly with empty nfts from useEVMNfts', () => {
    mockUseEVMNfts.mockReturnValue([]);
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: mockTokens,
      filteredNfts: [],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.queryByText('NFTs')).toBeNull();
    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();
  });

  it('renders both tokens and nfts sections when both have results', () => {
    render(<Asset />);

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
    expect(screen.getByText('NFTs')).toBeOnTheScreen();
    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();
    expect(screen.getByText('NftList with 2 nfts')).toBeOnTheScreen();
  });

  it('renders only tokens from tokenFilter prop if provided', () => {
    const tokenFilter = (assets: AssetType[]) =>
      assets.filter(
        (asset) =>
          asset.address === '0x1234567890123456789012345678901234567890',
      );

    render(<Asset tokenFilter={tokenFilter} />);

    expect(mockUseTokenSearch).toHaveBeenCalledWith(
      [mockTokens[0]],
      expect.anything(),
      expect.anything(),
    );
  });
});
