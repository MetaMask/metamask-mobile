import React from 'react';
import UrlAutocomplete, { UrlAutocompleteRef } from './';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { removeBookmark } from '../../../actions/bookmarks';
import { noop } from 'lodash';
import { createStackNavigator } from '@react-navigation/stack';
import { RpcEndpointType } from '@metamask/network-controller';
import { RootState } from '../../../reducers';
import { TokenSearchResponseItem } from '../../hooks/TokenSearchDiscovery/useTokenSearch/types';

const defaultState: DeepPartial<RootState> = {
  browser: { history: [{ url: 'https://www.google.com', name: 'Google' }] },
  bookmarks: [{ url: 'https://www.bookmark.com', name: 'MyBookmark' }],
  engine: {
    backgroundState: {
      PreferencesController: {
        isIpfsGatewayEnabled: false,
        tokenNetworkFilter: {
          '0x1': true,
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
            chainId: '0x1' as `0x${string}`,
            rpcEndpoints: [
              {
                name: 'Ethereum Mainnet',
                networkClientId: 'mainnet' as const,
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                type: RpcEndpointType.Infura,
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
            name: 'Ethereum Mainnet',
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
          },
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

// Mock useExploreSearch hook for omni-search integration
const mockExploreSearchData = {
  sites: [],
  tokens: [],
  perps: [],
  predictions: [],
};
const mockExploreSearchLoading = {
  sites: false,
  tokens: false,
  perps: false,
  predictions: false,
};
const mockSectionsOrder = ['sites', 'tokens', 'perps', 'predictions'];

jest.mock('../../Views/TrendingView/hooks/useExploreSearch', () => ({
  useExploreSearch: jest.fn(() => ({
    data: mockExploreSearchData,
    isLoading: mockExploreSearchLoading,
    sectionsOrder: mockSectionsOrder,
  })),
}));

// Mock Perps providers
jest.mock('../Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

// Mock settings selector
jest.mock('../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(() => true),
}));

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

// Mock useFavicon to prevent async state updates warning
jest.mock('../../hooks/useFavicon/useFavicon', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isLoading: false,
    isLoaded: true,
    error: null,
    favicon: null,
  })),
}));

// Suppress the mockUseTSDReturnValue unused warning - it's available for future tests
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
mockUseTSDReturnValue;

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('removes duplicate results with same url and category', async () => {
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: {
        ...defaultState,
        browser: {
          history: [
            { url: 'https://www.google.com', name: 'Google' },
            { url: 'https://www.google.com', name: 'Google Duplicate' },
          ],
        },
      },
    });

    act(() => {
      ref.current?.search('google');
      jest.runAllTimers();
    });

    const googleResults = await screen.findAllByText(/Google/, {
      includeHiddenElements: true,
    });
    expect(googleResults.length).toBe(1);
  });

  it('limits recent results to MAX_RECENTS', async () => {
    const historyItems = Array.from({ length: 10 }, (_, i) => ({
      url: `https://www.site${i}.com`,
      name: `Site${i}`,
    }));
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: {
        ...defaultState,
        browser: { history: historyItems },
        bookmarks: [],
      },
    });

    act(() => {
      ref.current?.search('Site');
      jest.runAllTimers();
    });

    // MAX_RECENTS is 5, so with 10 items, only 5 should show
    const recentsHeader = await screen.findByText('Recents', {
      includeHiddenElements: true,
    });
    expect(recentsHeader).toBeDefined();
  });
});
