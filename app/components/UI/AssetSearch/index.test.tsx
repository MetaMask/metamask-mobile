import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import AssetSearch from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import Engine from '../../../core/Engine';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import { fireEvent } from '@testing-library/react-native';
import { act } from '@testing-library/react-hooks';
const mockedEngine = Engine;

// Mock timers for debounce testing
jest.useFakeTimers();

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(''),
  context: {
    KeyringController: {
      getQRKeyringState: async () => ({ subscribe: () => ({}) }),
    },
    TokenListController: {
      tokensChainsCache: {
        '0x1': {
          data: [
            {
              '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': {
                address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
                symbol: 'SNX',
                decimals: 18,
                name: 'Synthetix Network Token',
                iconUrl:
                  'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f.png',
                type: 'erc20',
                aggregators: [
                  'Aave',
                  'Bancor',
                  'CMC',
                  'Crypto.com',
                  'CoinGecko',
                  '1inch',
                  'PMM',
                  'Synthetix',
                  'Zerion',
                  'Lifi',
                ],
                occurrences: 10,
                fees: {
                  '0x5fd79d46eba7f351fe49bff9e87cdea6c821ef9f': 0,
                  '0xda4ef8520b1a57d7d63f1e249606d1a459698876': 0,
                },
              },
            },
          ],
        },
      },
    },
  },
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('AssetSearch', () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  const mockAllTokens = [
    {
      address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
      symbol: 'SNX',
      decimals: 18,
      chainId: '0x1' as const,
    },
  ];

  it('renders correctly with allTokens', () => {
    const { toJSON } = renderWithProvider(
      <AssetSearch
        onSearch={jest.fn}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allTokens={mockAllTokens}
      />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onSearch on mount with initial empty results and search query', () => {
    const onSearch = jest.fn();

    renderWithProvider(
      <AssetSearch
        onSearch={onSearch}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allTokens={mockAllTokens}
      />,
      { state: initialState },
    );

    expect(onSearch).toHaveBeenCalledWith({
      results: [],
      searchQuery: '',
    });
  });

  it('calls onSearch when clear button is pressed with empty results and search query', () => {
    const onSearch = jest.fn();

    const { getByTestId } = renderWithProvider(
      <AssetSearch
        onSearch={onSearch}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allTokens={mockAllTokens}
      />,
      { state: initialState },
    );

    // Clear initial mount call
    onSearch.mockClear();

    // First, set a search value
    const searchBar = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent.changeText(searchBar, 'SNX');

    // Advance timers to trigger the debounce (300ms default)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Wait for the search to complete and clear previous calls
    expect(onSearch).toHaveBeenCalled();
    onSearch.mockClear();

    // Now clear the search
    const clearSearchBar = getByTestId(
      ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR,
    );
    fireEvent.press(clearSearchBar);

    // Advance timers to trigger the debounce and useEffect
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [],
        searchQuery: '',
      }),
    );
  });

  it('renders with empty allTokens array', () => {
    const { toJSON } = renderWithProvider(
      <AssetSearch
        onSearch={jest.fn}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allTokens={[]}
      />,
      { state: initialState },
    );
    expect(toJSON()).toBeDefined();
  });

  it('calls onSearch with searchResults and debouncedSearchString when search text changes', () => {
    const onSearch = jest.fn();

    const { getByTestId } = renderWithProvider(
      <AssetSearch
        onSearch={onSearch}
        onFocus={jest.fn}
        onBlur={jest.fn}
        allTokens={mockAllTokens}
      />,
      { state: initialState },
    );

    onSearch.mockClear();

    const searchBar = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent.changeText(searchBar, 'SNX');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(onSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        results: expect.any(Array),
        searchQuery: 'SNX',
      }),
    );
  });
});
