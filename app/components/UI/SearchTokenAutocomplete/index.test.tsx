import React, { FunctionComponent } from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { BridgeToken } from '../Bridge/types';
import Engine from '../../../core/Engine';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

const mockAllTokens: BridgeToken[] = [
  {
    address: '0x123',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    chainId: '0x1',
  },
  {
    address: '0x456',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    chainId: '0x1',
  },
];

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PreferencesController: {
        useTokenDetection: true,
      },
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      addTokens: jest.fn().mockResolvedValue(undefined),
    },
    MultichainAssetsController: {
      addAssets: jest.fn().mockResolvedValue(undefined),
    },
    NetworkController: {
      state: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    InteractionManager: {
      runAfterInteractions: jest.fn((callback) => callback()),
    },
  };
});

const mockIsNonEvmChainId = jest.fn();

jest.mock('../../../core/Multichain/utils', () => ({
  ...jest.requireActual('../../../core/Multichain/utils'),
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
}));

const mockSelectInternalAccountByScope = jest.fn();

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(
    () => mockSelectInternalAccountByScope,
  ),
}));

describe('SearchTokenAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockIsNonEvmChainId.mockReturnValue(false);
    mockSelectInternalAccountByScope.mockReturnValue(null);
    // Reset mocks to return resolved promises
    (Engine.context.TokensController.addTokens as jest.Mock).mockResolvedValue(
      undefined,
    );
    (
      Engine.context.MultichainAssetsController.addAssets as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('renders correctly with selected chain', () => {
    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { toJSON } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('updates search results when search query changes', () => {
    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { getByTestId, getByText } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: mockInitialState,
      },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    const mockResults = [mockAsset];

    fireEvent(assetSearch, 'onSearch', {
      results: mockResults,
      searchQuery: 'TEST',
    });

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    ).toBeOnTheScreen();
    expect(getByText(mockAsset.symbol)).toBeOnTheScreen();
  });

  it('displays token detection banner when detection is disabled and search is not focused', () => {
    const stateWithDetectionDisabled = {
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          PreferencesController: {
            useTokenDetection: false,
          },
        },
      },
    };

    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { getByText } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: stateWithDetectionDisabled,
      },
    );

    expect(getByText(/token detection/i)).toBeOnTheScreen();
  });

  it('hides token detection banner when search is focused', () => {
    const stateWithDetectionDisabled = {
      ...mockInitialState,
      engine: {
        backgroundState: {
          ...mockInitialState.engine.backgroundState,
          PreferencesController: {
            useTokenDetection: false,
          },
        },
      },
    };

    const WrapperComponent = () => (
      <SearchTokenAutocomplete
        navigation={{ push: jest.fn(), navigate: jest.fn() }}
        tabLabel=""
        selectedChainId="0x1"
        allTokens={mockAllTokens}
      />
    );

    const { getByTestId, queryByText } = renderScreen(
      WrapperComponent as FunctionComponent,
      { name: 'SearchTokenAutocomplete' },
      {
        state: stateWithDetectionDisabled,
      },
    );

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent(assetSearch, 'focus');

    expect(queryByText(/token detection/i)).toBeNull();
  });

  it('navigates to ConfirmAddAsset when next button is pressed with selected asset', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    fireEvent.press(addTokenButton);

    const navigationCall = mockNavigation.push.mock.calls[0];
    const [screenName, params] = navigationCall;

    expect(screenName).toBe('ConfirmAddAsset');
    expect(params).toMatchObject({
      selectedAsset: [mockAsset],
      chainId: '0x1',
      ticker: 'ETH',
      networkName: 'Ethereum Main Network',
    });
  });

  it('disables next button when no assets are selected', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);

    expect(addTokenButton).toHaveProp('disabled', true);
  });

  it('enables next button when at least one asset is selected', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);

    expect(addTokenButton).toHaveProp('disabled', false);
  });

  it('renders with null selectedChainId', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={null}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });

  it('tracks analytics when navigating to confirm add asset', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    fireEvent.press(addTokenButton);

    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('sets searchResults to allTokens when searchQuery is empty', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const { getByTestId, getByText } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    // When search query is empty, should show all tokens
    fireEvent(assetSearch, 'onSearch', {
      results: [],
      searchQuery: '',
    });

    // Should display all tokens from allTokens
    expect(getByText('TEST')).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
  });

  it('calls TokensController.addTokens for EVM chains', async () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    mockIsNonEvmChainId.mockReturnValue(false);

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={'0x1'}
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: '0x123',
      symbol: 'TEST',
      name: 'Test Token',
      decimals: 18,
      chainId: '0x1',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'TEST',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    fireEvent.press(addTokenButton);

    // Navigate to confirm screen first
    expect(mockNavigation.push).toHaveBeenCalled();

    // Simulate calling addTokenList from the confirm screen
    const [, params] = mockNavigation.push.mock.calls[0];
    await params.addTokenList();

    // Should call addTokens for EVM chain
    expect(mockIsNonEvmChainId).toHaveBeenCalledWith('0x1');
    expect(Engine.context.TokensController.addTokens).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ address: '0x123' })]),
      'mainnet',
    );
    expect(
      Engine.context.MultichainAssetsController.addAssets,
    ).not.toHaveBeenCalled();
  });

  it('calls MultichainAssetsController.addAssets for non-EVM chains', async () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const mockNonEvmAccount = {
      id: 'non-evm-account-id',
      address: 'non-evm-address',
    };

    mockIsNonEvmChainId.mockReturnValue(true);
    mockSelectInternalAccountByScope.mockReturnValue(mockNonEvmAccount);

    const { getByTestId } = renderWithProvider(
      <SearchTokenAutocomplete
        navigation={mockNavigation}
        tabLabel={''}
        selectedChainId={
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as
            | `0x${string}`
            | SupportedCaipChainId
            | null
        }
        allTokens={mockAllTokens}
      />,
      { state: mockInitialState },
    );

    const mockAsset = {
      address: 'solana-address-123',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    };

    const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

    fireEvent(assetSearch, 'onSearch', {
      results: [mockAsset],
      searchQuery: 'SOL',
    });

    const selectAssetButton = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(selectAssetButton);

    const addTokenButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    fireEvent.press(addTokenButton);

    // Navigate to confirm screen first
    expect(mockNavigation.push).toHaveBeenCalled();

    // Simulate calling addTokenList from the confirm screen
    const [, params] = mockNavigation.push.mock.calls[0];
    await params.addTokenList();

    // Should call MultichainAssetsController.addAssets for non-EVM
    expect(mockIsNonEvmChainId).toHaveBeenCalledWith(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );
    expect(mockSelectInternalAccountByScope).toHaveBeenCalledWith(
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    );
    expect(
      Engine.context.MultichainAssetsController.addAssets,
    ).toHaveBeenCalledWith(['solana-address-123'], 'non-evm-account-id');
    expect(Engine.context.TokensController.addTokens).not.toHaveBeenCalled();
  });

  describe('Already Added Tokens Detection', () => {
    it('identifies already added EVM tokens from TokensController', () => {
      const stateWithAddedTokens = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokensController: {
              allTokens: {
                '0x1': {
                  '0xaddress': [
                    {
                      address: '0x123',
                      symbol: 'TEST',
                      decimals: 18,
                    },
                  ],
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0xaddress',
                  },
                },
              },
            },
          },
        },
      };

      const mockNavigation = {
        push: jest.fn(),
        navigate: jest.fn(),
      };

      const { getByTestId } = renderWithProvider(
        <SearchTokenAutocomplete
          navigation={mockNavigation}
          tabLabel={''}
          selectedChainId={'0x1'}
          allTokens={mockAllTokens}
        />,
        { state: stateWithAddedTokens },
      );

      const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

      fireEvent(assetSearch, 'onSearch', {
        results: mockAllTokens,
        searchQuery: '',
      });

      const multiAssetList = getByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      ).parent;

      expect(multiAssetList).toHaveProp('alreadyAddedTokens');
    });

    it('identifies already added non-EVM tokens from MultichainAssetsController', () => {
      const mockNonEvmAccount = {
        id: 'non-evm-account-id',
        address: 'non-evm-address',
      };

      const stateWithMultichainAssets = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            MultichainAssetsController: {
              accountsAssets: {
                'non-evm-account-id': [
                  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
                ],
              },
              assetsMetadata: {},
              allIgnoredAssets: {},
            },
          },
        },
      };

      mockIsNonEvmChainId.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue(mockNonEvmAccount);

      const mockNavigation = {
        push: jest.fn(),
        navigate: jest.fn(),
      };

      const { getByTestId } = renderWithProvider(
        <SearchTokenAutocomplete
          navigation={mockNavigation}
          tabLabel={''}
          selectedChainId={
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as
              | `0x${string}`
              | SupportedCaipChainId
              | null
          }
          allTokens={mockAllTokens}
        />,
        { state: stateWithMultichainAssets },
      );

      const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

      fireEvent(assetSearch, 'onSearch', {
        results: mockAllTokens,
        searchQuery: '',
      });

      const multiAssetList = getByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      ).parent;

      expect(multiAssetList).toHaveProp('alreadyAddedTokens');
    });

    it('creates empty Set when no tokens are added', () => {
      const mockNavigation = {
        push: jest.fn(),
        navigate: jest.fn(),
      };

      const { getByTestId } = renderWithProvider(
        <SearchTokenAutocomplete
          navigation={mockNavigation}
          tabLabel={''}
          selectedChainId={'0x1'}
          allTokens={mockAllTokens}
        />,
        { state: mockInitialState },
      );

      const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

      fireEvent(assetSearch, 'onSearch', {
        results: mockAllTokens,
        searchQuery: '',
      });

      const multiAssetList = getByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      ).parent;

      const alreadyAddedTokens = multiAssetList.props.alreadyAddedTokens;

      expect(alreadyAddedTokens).toBeInstanceOf(Set);
      expect(alreadyAddedTokens.size).toBe(0);
    });

    it('handles null selectedChainId gracefully', () => {
      const mockNavigation = {
        push: jest.fn(),
        navigate: jest.fn(),
      };

      const { getByTestId } = renderWithProvider(
        <SearchTokenAutocomplete
          navigation={mockNavigation}
          tabLabel={''}
          selectedChainId={null}
          allTokens={mockAllTokens}
        />,
        { state: mockInitialState },
      );

      const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

      fireEvent(assetSearch, 'onSearch', {
        results: mockAllTokens,
        searchQuery: '',
      });

      const multiAssetList = getByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      ).parent;

      const alreadyAddedTokens = multiAssetList.props.alreadyAddedTokens;

      expect(alreadyAddedTokens).toBeInstanceOf(Set);
      expect(alreadyAddedTokens.size).toBe(0);
    });

    it('normalizes addresses to lowercase in alreadyAddedTokens Set', () => {
      const stateWithMixedCaseTokens = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokensController: {
              allTokens: {
                '0x1': {
                  '0xaddress': [
                    {
                      address: '0xABC123',
                      symbol: 'TEST',
                      decimals: 18,
                    },
                  ],
                },
              },
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'account1',
                accounts: {
                  account1: {
                    address: '0xaddress',
                  },
                },
              },
            },
          },
        },
      };

      const mockNavigation = {
        push: jest.fn(),
        navigate: jest.fn(),
      };

      const { getByTestId } = renderWithProvider(
        <SearchTokenAutocomplete
          navigation={mockNavigation}
          tabLabel={''}
          selectedChainId={'0x1'}
          allTokens={mockAllTokens}
        />,
        { state: stateWithMixedCaseTokens },
      );

      const assetSearch = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);

      fireEvent(assetSearch, 'onSearch', {
        results: mockAllTokens,
        searchQuery: '',
      });

      const multiAssetList = getByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      ).parent;

      const alreadyAddedTokens = multiAssetList.props.alreadyAddedTokens;

      expect(alreadyAddedTokens.has('0xabc123')).toBe(true);
      expect(alreadyAddedTokens.has('0xABC123')).toBe(false);
    });
  });
});
