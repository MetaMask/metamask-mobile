import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AssetType } from '../../../types/token';
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

jest.mock('../../../hooks/send/evm/useSelectedEVMAccountTokens', () => ({
  useSelectedEVMAccountTokens: jest.fn(),
}));

jest.mock('../../../hooks/send/useTokenSearch', () => ({
  useTokenSearch: jest.fn(),
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
  TokenList: ({
    tokens,
    hasActiveFilters,
    onClearFilters,
  }: {
    tokens: AssetType[];
    hasActiveFilters?: boolean;
    onClearFilters?: () => void;
  }) => {
    const { View, Text, Pressable } = jest.requireActual('react-native');

    return (
      <View testID="token-list">
        <Text>TokenList with {tokens.length} tokens</Text>
        {hasActiveFilters && (
          <Text testID="has-active-filters">Has active filters</Text>
        )}
        {onClearFilters && (
          <Pressable testID="clear-filters-button" onPress={onClearFilters}>
            <Text>Clear filters</Text>
          </Pressable>
        )}
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
    };
    return mockStrings[key] || key;
  }),
}));

import { useSelectedEVMAccountTokens } from '../../../hooks/send/evm/useSelectedEVMAccountTokens';
import { useTokenSearch } from '../../../hooks/send/useTokenSearch';
import { useAssetSelectionMetrics } from '../../../hooks/send/metrics/useAssetSelectionMetrics';

const mockUseSelectedEVMAccountTokens = jest.mocked(
  useSelectedEVMAccountTokens,
);
const mockUseTokenSearch = jest.mocked(useTokenSearch);
const mockUseAssetSelectionMetrics = jest.mocked(useAssetSelectionMetrics);
const mockSetSearchQuery = jest.fn();
const mockClearSearch = jest.fn();
const mockSetAssetListSize = jest.fn();
const mockSetNoneAssetFilterMethod = jest.fn();
const mockSetSearchAssetFilterMethod = jest.fn();

describe('Asset', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelectedEVMAccountTokens.mockReturnValue(mockTokens);

    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: mockTokens,
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
    expect(screen.getByTestId('token-list')).toBeOnTheScreen();
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
  });

  it('renders filtered tokens in TokenList', () => {
    const filteredTokens = [mockTokens[0]];
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens,
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
      clearSearch: mockClearSearchLocal,
    }));

    render(<Asset />);

    expect(screen.getByText('TokenList with 2 tokens')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByTestId('has-active-filters')).toBeOnTheScreen();
  });

  it('handles network filter state changes', () => {
    render(<Asset />);

    expect(screen.queryByTestId('has-active-filters')).toBeNull();

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByTestId('has-active-filters')).toBeOnTheScreen();
  });

  it('exposes clear filter controls', () => {
    render(<Asset />);

    fireEvent.press(screen.getByTestId('expose-clear-function'));

    expect(screen.getByTestId('network-filter')).toBeOnTheScreen();
  });

  it('shows hasActiveFilters when search query exists', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByTestId('has-active-filters')).toBeOnTheScreen();
  });

  it('shows hasActiveFilters when network filter is active', () => {
    render(<Asset />);

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByTestId('has-active-filters')).toBeOnTheScreen();
  });

  it('shows hasActiveFilters when both search and network filters are active', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    fireEvent.press(screen.getByTestId('apply-network-filter'));

    expect(screen.getByTestId('has-active-filters')).toBeOnTheScreen();
  });

  it('does not show hasActiveFilters when no filters are active', () => {
    render(<Asset />);

    expect(screen.queryByTestId('has-active-filters')).toBeNull();
  });

  it('provides onClearFilters to TokenList when filters are active', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(screen.getByTestId('clear-filters-button')).toBeOnTheScreen();
  });

  it('calls clearSearch when onClearFilters is triggered', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    fireEvent.press(screen.getByTestId('clear-filters-button'));

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  it('calls both clearSearch and clearNetworkFilters when both are active', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: 'ETH',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    fireEvent.press(screen.getByTestId('expose-clear-function'));
    fireEvent.press(screen.getByTestId('apply-network-filter'));

    fireEvent.press(screen.getByTestId('clear-filters-button'));

    expect(mockClearSearch).toHaveBeenCalledTimes(1);
  });

  it('maintains existing search functionality with network filters', () => {
    render(<Asset />);

    const searchInput = screen.getByTestId('search-input');

    fireEvent.changeText(searchInput, 'ETH');
    expect(mockSetSearchQuery).toHaveBeenCalledWith('ETH');

    fireEvent.press(screen.getByTestId('apply-network-filter'));
    expect(screen.getByTestId('has-active-filters')).toBeOnTheScreen();
  });

  it('maintains asset list size tracking with network filtering', () => {
    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: mockTokens,
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetAssetListSize).toHaveBeenCalledWith('2');

    mockSetAssetListSize.mockClear();

    mockUseTokenSearch.mockReturnValue({
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      filteredTokens: [mockTokens[0]],
      clearSearch: mockClearSearch,
    });

    render(<Asset />);

    expect(mockSetAssetListSize).toHaveBeenCalledWith('1');
  });
});
