import '../../UI/Bridge/_mocks_/initialState';
import React from 'react';
import UrlAutocomplete, { UrlAutocompleteRef } from './';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { removeBookmark } from '../../../actions/bookmarks';
import { noop } from 'lodash';
import { createStackNavigator } from '@react-navigation/stack';
import { TokenSearchResponseItem } from '@metamask/token-search-discovery-controller';

const defaultState = {
  browser: { history: [{ url: 'https://www.google.com', name: 'Google' }] },
  bookmarks: [{ url: 'https://www.bookmark.com', name: 'MyBookmark' }],
  engine: {
    backgroundState: {
      PreferencesController: {
        isIpfsGatewayEnabled: false,
        tokenNetworkFilter: {
          '0x1': 'true',
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        multichainNetworkConfigurationsByChainId: {},
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: {
            EIPS: {
              1559: true,
            },
          },
        },
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
            name: 'Ethereum Mainnet',
          },
        },
        providerConfig: {
          chainId: '0x1',
          ticker: 'ETH',
          rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
          type: 'infura',
        },
      },
    },
  },
};

type RenderWithProviderParams = Parameters<typeof renderWithProvider>;

jest.mock(
  '../../hooks/TokenSearchDiscovery/useTokenSearch/useTokenSearch',
  () => {
    const searchTokens = jest.fn();
    const results: TokenSearchResponseItem[] = [];
    const reset = jest.fn();
    return jest.fn(() => ({
      results,
      isLoading: false,
      reset,
      searchTokens,
    }));
  },
);

const mockUseTSDReturnValue = ({
  results,
  isLoading,
  reset,
  searchTokens,
}: {
  results: TokenSearchResponseItem[];
  isLoading: boolean;
  reset: () => void;
  searchTokens: () => void;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const useTSD = require('../../hooks/TokenSearchDiscovery/useTokenSearch/useTokenSearch');
  useTSD.mockReturnValue({
    results,
    isLoading,
    reset,
    searchTokens,
  });
};

const Stack = createStackNavigator();
const render = (...args: RenderWithProviderParams) => {
  const Component = () => args[0];
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="UrlAutocomplete" component={Component} />
    </Stack.Navigator>,
    args[1],
    args[2],
  );
};

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenSearchDiscoveryDataController: {
      fetchSwapsTokens: jest.fn(),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const navigation = jest.requireActual('@react-navigation/native');
  return {
    ...navigation,
    useNavigation: jest.fn().mockImplementation(() => ({
      navigate: mockNavigate,
    })),
  };
});

jest.mock('../../../selectors/tokenSearchDiscoveryDataController', () => {
  const actual = jest.requireActual(
    '../../../selectors/tokenSearchDiscoveryDataController',
  );
  return {
    ...actual,
    selectSupportedSwapTokenAddresses: jest
      .fn()
      .mockImplementation(() => ['0x123', '0x456']),
  };
});

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('should show sites from dapp list', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('uni');
      jest.runAllTimers();
    });

    expect(
      await screen.findByText('Uniswap', { includeHiddenElements: true }),
    ).toBeDefined();
  });

  it('should show sites from bookmarks', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    expect(
      await screen.findByText('MyBookmark', { includeHiddenElements: true }),
    ).toBeDefined();
  });

  it('should show sites from recents/history', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('Goog');
      jest.runAllTimers();
    });

    expect(
      await screen.findByText('Google', { includeHiddenElements: true }),
    ).toBeDefined();
  });

  it('should show history and bookmarks when searching for an empty string', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('');
      jest.runAllTimers();
    });

    expect(
      await screen.findByText('Google', { includeHiddenElements: true }),
    ).toBeDefined();
    expect(
      await screen.findByText('MyBookmark', { includeHiddenElements: true }),
    ).toBeDefined();
  });

  it('should not show Recents and Favorites when nothing is found', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('nothing');
      jest.runAllTimers();
    });
    expect(
      await screen.queryByText('Recents', { includeHiddenElements: true }),
    ).toBeNull();
    expect(
      await screen.queryByText('Favorites', { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('should delete a bookmark when pressing the trash icon', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    const { store } = render(
      <UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />,
      { state: defaultState },
    );
    store.dispatch = jest.fn();

    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    const deleteFavorite = await screen.findByTestId(
      deleteFavoriteTestId(defaultState.bookmarks[0].url),
      { includeHiddenElements: true },
    );
    fireEvent.press(deleteFavorite);
    expect(store.dispatch).toHaveBeenCalledWith(
      removeBookmark({ ...defaultState.bookmarks[0], category: 'favorites' }),
    );
  });

  it('should show a loading indicator when searching tokens', async () => {
    mockUseTSDReturnValue({
      results: [],
      isLoading: true,
      reset: jest.fn(),
      searchTokens: jest.fn(),
    });
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('doge');
      jest.runAllTimers();
    });

    expect(
      await screen.findByTestId('loading-indicator', {
        includeHiddenElements: true,
      }),
    ).toBeDefined();
  });

  it('should display token search results', async () => {
    mockUseTSDReturnValue({
      results: [
        {
          tokenAddress: '0x123',
          chainId: '0x1',
          name: 'Dogecoin',
          symbol: 'DOGE',
          usdPrice: 1,
          usdPricePercentChange: {
            oneDay: 1,
          },
        },
        {
          tokenAddress: '0x456',
          chainId: '0x1',
          name: 'Dog Wif Hat',
          symbol: 'WIF',
          usdPrice: 1,
          usdPricePercentChange: {
            oneDay: 1,
          },
        },
      ],
      isLoading: false,
      reset: jest.fn(),
      searchTokens: jest.fn(),
    });
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('dog');
      jest.runAllTimers();
    });

    expect(
      await screen.findByText('Dogecoin', { includeHiddenElements: true }),
    ).toBeDefined();
  });

  it('should swap a token when the swap button is pressed', async () => {
    mockUseTSDReturnValue({
      results: [
        {
          tokenAddress: '0x123',
          chainId: '0x1',
          name: 'Dogecoin',
          symbol: 'DOGE',
          usdPrice: 1,
          usdPricePercentChange: {
            oneDay: 1,
          },
        },
      ],
      isLoading: false,
      reset: jest.fn(),
      searchTokens: jest.fn(),
    });
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('dog');
      jest.runAllTimers();
    });

    const swapButton = await screen.findByTestId(
      'autocomplete-result-swap-button',
      { includeHiddenElements: true },
    );
    fireEvent.press(swapButton);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it('should call onSelect when a bookmark is selected', async () => {
    const onSelect = jest.fn();
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={onSelect} onDismiss={noop} />, {
      state: defaultState,
    });

    const result = await screen.findByText('MyBookmark', {
      includeHiddenElements: true,
    });
    fireEvent.press(result);
    expect(onSelect).toHaveBeenCalled();
  });

  it('should call onSelect when a token is selected', async () => {
    mockUseTSDReturnValue({
      results: [
        {
          tokenAddress: '0x123',
          chainId: '0x1',
          name: 'Dogecoin',
          symbol: 'DOGE',
          usdPrice: 1,
          usdPricePercentChange: {
            oneDay: 1,
          },
        },
      ],
      isLoading: false,
      reset: jest.fn(),
      searchTokens: jest.fn(),
    });
    const onSelect = jest.fn();
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={onSelect} onDismiss={noop} />, {
      state: defaultState,
    });

    act(() => {
      ref.current?.search('dog');
      jest.runAllTimers();
    });

    const result = await screen.findByText('Dogecoin', {
      includeHiddenElements: true,
    });
    fireEvent.press(result);
    expect(onSelect).toHaveBeenCalled();
  });
});
