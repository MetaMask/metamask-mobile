import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './SearchTokenAutocomplete';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import Engine from '../../../../../core/Engine';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { convertAPITokensToBridgeTokens } from '../../../../UI/Bridge/hooks/useTokensWithBalances';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex } from '@metamask/utils';

// --- Mock variables (hoisted by Jest for use inside jest.mock) ---

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockSelectInternalAccountByScope = jest.fn();

// --- Module mocks ---

jest.mock('../../../../../core/Engine', () => ({
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
            rpcEndpoints: [{ networkClientId: 'mainnet' }],
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

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  })),
}));

jest.mock('../../../../../core/NotificationManager', () => ({
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

jest.mock('../../../../../core/Multichain/utils', () => ({
  ...jest.requireActual('../../../../../core/Multichain/utils'),
  isNonEvmChainId: jest.fn(),
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  ...jest.requireActual('../../../../../selectors/multichainAccounts/accounts'),
  selectSelectedInternalAccountByScope: jest.fn(
    () => mockSelectInternalAccountByScope,
  ),
}));

jest.mock('../../../../../selectors/tokensController', () => ({
  ...jest.requireActual('../../../../../selectors/tokensController'),
  selectTokensByChainIdAndAddress: jest.fn(() => ({})),
}));

jest.mock('../../../../../selectors/multichain/multichain', () => ({
  ...jest.requireActual('../../../../../selectors/multichain/multichain'),
  selectMultichainAssets: jest.fn(() => ({})),
}));

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch',
  () => ({
    useTrendingSearch: jest.fn(() => ({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    })),
  }),
);

jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalances', () => ({
  convertAPITokensToBridgeTokens: jest.fn(() => []),
}));

// --- Typed mock references ---

const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;
const mockUseTrendingSearch = jest.mocked(useTrendingSearch);
const mockConvertTokens = jest.mocked(convertAPITokensToBridgeTokens);

// --- Test data ---

const mockTrendingResult = {
  assetId: 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as const,
  decimals: 18,
  name: 'Test Token',
  symbol: 'TEST',
  marketCap: 0,
  aggregatedUsdVolume: 0,
  price: '0',
  pricePercentChange1d: '0',
};

const mockBridgeToken = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  symbol: 'TEST',
  name: 'Test Token',
  decimals: 18,
  chainId: '0x1',
  image: 'https://example.com/test.png',
  assetId: 'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678',
};

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

const mockNavigation = {
  push: jest.fn(),
  navigate: jest.fn(),
};

// --- Helpers ---

const setupWithTokenResults = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockUseTrendingSearch.mockReturnValue({
    data: [mockTrendingResult],
    isLoading: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useTrendingSearch>);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockConvertTokens.mockReturnValue([mockBridgeToken as any]);
};

const renderComponent = (
  overrides: {
    selectedChainId?: SupportedCaipChainId | Hex | null;
    state?: typeof mockInitialState;
  } = {},
) =>
  renderWithProvider(
    <SearchTokenAutocomplete
      navigation={mockNavigation}
      tabLabel=""
      selectedChainId={overrides.selectedChainId ?? '0x1'}
    />,
    { state: overrides.state ?? mockInitialState },
  );

const selectTokenAndPressNext = (utils: ReturnType<typeof renderComponent>) => {
  const tokenResult = utils.getByTestId(
    ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
  );
  fireEvent.press(tokenResult);

  const nextButton = utils.getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
  fireEvent.press(nextButton);
};

// --- Tests ---

describe('SearchTokenAutocomplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockBuild.mockReturnValue({ event: 'mock-event' });
    mockIsNonEvmChainId.mockReturnValue(false);
    mockSelectInternalAccountByScope.mockReturnValue(null);
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useTrendingSearch>);
    mockConvertTokens.mockReturnValue([]);
    (Engine.context.TokensController.addTokens as jest.Mock).mockResolvedValue(
      undefined,
    );
    (
      Engine.context.MultichainAssetsController.addAssets as jest.Mock
    ).mockResolvedValue(undefined);
  });

  it('renders search bar', () => {
    const { getByTestId } = renderComponent();
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });

  it('renders with null selectedChainId', () => {
    const { getByTestId } = renderComponent({ selectedChainId: null });
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });

  it('shows token detection banner when detection is disabled', () => {
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

    const { getByText } = renderComponent({
      state: stateWithDetectionDisabled,
    });

    expect(getByText(/token detection/i)).toBeOnTheScreen();
  });

  it('hides token detection banner when search input is focused', () => {
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

    const { getByTestId, queryByText } = renderComponent({
      state: stateWithDetectionDisabled,
    });

    const searchBar = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent(searchBar, 'focus');

    expect(queryByText(/token detection/i)).toBeNull();
  });

  it('displays tokens from search results', () => {
    setupWithTokenResults();

    const { getByText, getByTestId } = renderComponent();

    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
    ).toBeOnTheScreen();
    expect(getByText('TEST')).toBeOnTheScreen();
  });

  it('next button is disabled when no tokens are selected', () => {
    const { getByTestId } = renderComponent();
    const nextButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    expect(nextButton).toHaveProp('disabled', true);
  });

  it('enables Next button after selecting a token', () => {
    setupWithTokenResults();

    const { getByTestId } = renderComponent();
    const tokenResult = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(tokenResult);

    const nextButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    expect(nextButton).toHaveProp('disabled', false);
  });

  it('shows clear button when search has text and clears on press', () => {
    const { getByTestId, queryByTestId } = renderComponent();

    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR),
    ).toBeNull();

    const searchBar = getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR);
    fireEvent.changeText(searchBar, 'ETH');

    const clearButton = getByTestId(
      ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR,
    );
    expect(clearButton).toBeOnTheScreen();

    fireEvent.press(clearButton);

    expect(
      queryByTestId(ImportTokenViewSelectorsIDs.CLEAR_SEARCH_BAR),
    ).toBeNull();
  });

  it('deselects a previously selected token when pressed again', () => {
    setupWithTokenResults();

    const { getByTestId } = renderComponent();
    const tokenResult = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );

    fireEvent.press(tokenResult);
    expect(getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON)).toHaveProp(
      'disabled',
      false,
    );

    fireEvent.press(tokenResult);
    expect(getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON)).toHaveProp(
      'disabled',
      true,
    );
  });

  it('navigates to ConfirmAddAsset with correct params and tracks analytics', () => {
    setupWithTokenResults();

    const utils = renderComponent();
    selectTokenAndPressNext(utils);

    expect(mockNavigation.push).toHaveBeenCalledWith(
      'ConfirmAddAsset',
      expect.objectContaining({
        selectedAsset: [
          expect.objectContaining({ address: mockBridgeToken.address }),
        ],
        chainId: '0x1',
      }),
    );
    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('addTokenList calls TokensController.addTokens for EVM chains', async () => {
    setupWithTokenResults();

    const utils = renderComponent();
    selectTokenAndPressNext(utils);

    const [, params] = mockNavigation.push.mock.calls[0];
    await params.addTokenList();

    expect(Engine.context.TokensController.addTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ address: mockBridgeToken.address }),
      ]),
      'mainnet',
    );
    expect(
      Engine.context.MultichainAssetsController.addAssets,
    ).not.toHaveBeenCalled();
  });

  it('addTokenList calls MultichainAssetsController.addAssets for non-EVM chains', async () => {
    const solanaChainId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as SupportedCaipChainId;

    const mockNonEvmToken = {
      address: 'solana-address-123',
      symbol: 'SOL',
      name: 'Solana',
      decimals: 9,
      chainId: solanaChainId,
      image: 'https://example.com/sol.png',
      assetId: `${solanaChainId}/slip44:501`,
    };

    mockIsNonEvmChainId.mockReturnValue(true);
    mockSelectInternalAccountByScope.mockReturnValue({
      id: 'non-evm-account-id',
      address: 'non-evm-address',
    });

    mockUseTrendingSearch.mockReturnValue({
      data: [
        {
          ...mockTrendingResult,
          assetId: `${solanaChainId}/slip44:501`,
          symbol: 'SOL',
          name: 'Solana',
          decimals: 9,
        },
      ],
      isLoading: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useTrendingSearch>);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockConvertTokens.mockReturnValue([mockNonEvmToken as any]);

    const utils = renderComponent({ selectedChainId: solanaChainId });
    selectTokenAndPressNext(utils);

    const [, params] = mockNavigation.push.mock.calls[0];
    await params.addTokenList();

    expect(
      Engine.context.MultichainAssetsController.addAssets,
    ).toHaveBeenCalledWith(['solana-address-123'], 'non-evm-account-id');
    expect(Engine.context.TokensController.addTokens).not.toHaveBeenCalled();
  });
});
