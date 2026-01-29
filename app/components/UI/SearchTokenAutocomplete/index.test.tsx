import React, { FunctionComponent } from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  renderScreen,
} from '../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../Views/AddAsset/ImportTokenView.testIds';
import { BridgeToken } from '../Bridge/types';
import Engine from '../../../core/Engine';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { selectTokensByChainIdAndAddress } from '../../../selectors/tokensController';
import { selectMultichainAssets } from '../../../selectors/multichain/multichain';
import { isNonEvmChainId } from '../../../core/Multichain/utils';

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

jest.mock('../../../core/Multichain/utils', () => ({
  ...jest.requireActual('../../../core/Multichain/utils'),
  isNonEvmChainId: jest.fn(),
}));

const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;

const mockSelectInternalAccountByScope = jest.fn();

jest.mock('../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(
    () => mockSelectInternalAccountByScope,
  ),
}));

jest.mock('../../../selectors/tokensController', () => ({
  ...jest.requireActual('../../../selectors/tokensController'),
  selectTokensByChainIdAndAddress: jest.fn(() => ({})),
}));

jest.mock('../../../selectors/multichain/multichain', () => ({
  ...jest.requireActual('../../../selectors/multichain/multichain'),
  selectMultichainAssets: jest.fn(() => ({})),
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

  it('renders with already added EVM tokens', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const addedTokens = {
      '0x123': { address: '0x123', symbol: 'TEST', decimals: 18 },
    };

    jest.mocked(selectTokensByChainIdAndAddress).mockReturnValue(addedTokens);
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

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });

  it('renders with already added non-EVM tokens', () => {
    const mockNavigation = {
      push: jest.fn(),
      navigate: jest.fn(),
    };

    const mockNonEvmAccount = {
      id: 'non-evm-account-id',
      address: 'non-evm-address',
    };

    const addedAssets = {
      'non-evm-account-id': [
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501:solana-address-123' as const,
      ],
    };

    jest.mocked(selectMultichainAssets).mockReturnValue(addedAssets);
    mockIsNonEvmChainId.mockReturnValue(true);
    mockSelectInternalAccountByScope.mockReturnValue(mockNonEvmAccount);

    const solanaToken: BridgeToken = {
      address: 'solana-address-123',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const,
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
        allTokens={[solanaToken]}
      />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });
});
