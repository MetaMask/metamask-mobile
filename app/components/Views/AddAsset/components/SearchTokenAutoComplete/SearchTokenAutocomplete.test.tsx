import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SearchTokenAutocomplete from './SearchTokenAutocomplete';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { isNonEvmChainId } from '../../../../../core/Multichain/utils';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import {
  PriceChangeOption,
  SortDirection,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { CaipAssetType, Hex } from '@metamask/utils';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import {
  convertTrendingAssetsToImporAssets,
  ImportAsset,
} from '../../utils/utils';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

// --- Mock variables (hoisted by Jest for use inside jest.mock) ---

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockSelectInternalAccountByScope = jest.fn();
const mockAddCustomAsset = jest.fn();

// --- Module mocks ---

jest.mock('../../../../../core/Engine', () => ({
  context: {
    TokensController: {
      addTokens: jest.fn().mockResolvedValue(undefined),
    },
    MultichainAssetsController: {
      addAssets: jest.fn().mockResolvedValue(undefined),
    },
    AssetsController: {
      addCustomAsset: jest.fn(),
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

jest.mock('../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/assetsUnifyState',
  () => ({
    selectIsAssetsUnifyStateEnabled: jest.fn(),
  }),
);

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(() => ({
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

jest.mock('../../utils/utils', () => ({
  convertTrendingAssetsToImporAssets: jest.fn(() => []),
}));

// --- Typed mock references ---

const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;
const mockUseTrendingSearch = jest.mocked(useTrendingSearch);
const mockConvertTokens = jest.mocked(convertTrendingAssetsToImporAssets);
const mockToAssetId = jest.mocked(toAssetId);
const mockSelectIsAssetsUnifyStateEnabled = jest.mocked(
  selectIsAssetsUnifyStateEnabled,
);

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

const mockImportAset = {
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
} as unknown as NavigationProp<ParamListBase> & {
  push: jest.Mock;
  navigate: jest.Mock;
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
  mockConvertTokens.mockReturnValue([mockImportAset as any]);
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
    mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(false);
    mockToAssetId.mockReturnValue(
      'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType,
    );
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
    mockAddCustomAsset.mockResolvedValue(undefined);
    (Engine.context.AssetsController.addCustomAsset as jest.Mock) =
      mockAddCustomAsset;
  });

  it('renders search bar', () => {
    const { getByTestId } = renderComponent();
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.SEARCH_BAR),
    ).toBeOnTheScreen();
  });

  it('calls useTrendingSearch with MarketCap sort options', () => {
    renderComponent();

    expect(mockUseTrendingSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        sortTrendingTokensOptions: {
          option: PriceChangeOption.MarketCap,
          direction: SortDirection.Descending,
        },
      }),
    );
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
    expect(nextButton).toBeDisabled();
  });

  it('enables Next button after selecting a token', () => {
    setupWithTokenResults();

    const { getByTestId } = renderComponent();
    const tokenResult = getByTestId(
      ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
    );
    fireEvent.press(tokenResult);

    const nextButton = getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON);
    expect(nextButton).not.toBeDisabled();
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
    expect(
      getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON),
    ).not.toBeDisabled();

    fireEvent.press(tokenResult);
    expect(getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON)).toBeDisabled();
  });

  it('navigates to ConfirmAddAsset with correct params and tracks analytics', () => {
    setupWithTokenResults();

    const utils = renderComponent();
    selectTokenAndPressNext(utils);

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'ConfirmAddAsset',
      expect.objectContaining({
        selectedAsset: [
          expect.objectContaining({ address: mockImportAset.address }),
        ],
        addTokenList: expect.any(Function),
      }),
    );
    expect(mockCreateEventBuilder).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('addTokenList calls TokensController.addTokens for EVM chains', async () => {
    setupWithTokenResults();

    const utils = renderComponent();
    selectTokenAndPressNext(utils);

    const [, params] = mockNavigation.navigate.mock.calls[0];
    await params.addTokenList();

    expect(Engine.context.TokensController.addTokens).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ address: mockImportAset.address }),
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

    const [, params] = mockNavigation.navigate.mock.calls[0];
    await params.addTokenList();

    expect(
      Engine.context.MultichainAssetsController.addAssets,
    ).toHaveBeenCalledWith(['solana-address-123'], 'non-evm-account-id');
    expect(Engine.context.TokensController.addTokens).not.toHaveBeenCalled();
  });

  describe('addTokens - EVM chain', () => {
    it('disables the Next button when selectedChainId is null (no tokens to add)', () => {
      setupWithTokenResults();

      // allTokens is always [] when selectedChainId is null, so nothing can be selected
      const { getByTestId } = renderComponent({ selectedChainId: null });

      expect(
        getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON),
      ).toBeDisabled();
    });

    it('returns early when network config is not found for the chain', async () => {
      setupWithTokenResults();

      const utils = renderComponent({ selectedChainId: '0x89' as Hex });
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(Engine.context.TokensController.addTokens).not.toHaveBeenCalled();
      // TOKEN_IMPORT_CLICKED fires from goToConfirmAddToken; TOKEN_ADDED must not fire
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('does not call AssetsController when isAssetsUnifyStateEnabled is false', async () => {
      setupWithTokenResults();
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(false);

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(Engine.context.TokensController.addTokens).toHaveBeenCalled();
      expect(mockAddCustomAsset).not.toHaveBeenCalled();
    });

    it('calls AssetsController.addCustomAsset for each token when isAssetsUnifyStateEnabled is true', async () => {
      setupWithTokenResults();
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      const expectedCaipAssetType =
        'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType;
      mockToAssetId.mockReturnValue(expectedCaipAssetType);

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(Engine.context.TokensController.addTokens).toHaveBeenCalled();
      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'evm-account-id',
        expectedCaipAssetType,
      );
    });

    it('calls AssetsController.addCustomAsset once per selected token', async () => {
      const secondToken = {
        ...mockImportAset,
        address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        symbol: 'TEST2',
        assetId: 'eip155:1/erc20:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      };
      mockConvertTokens.mockReturnValue([
        mockImportAset as ImportAsset,
        secondToken as ImportAsset,
      ]);
      mockUseTrendingSearch.mockReturnValue({
        data: [mockTrendingResult],
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useTrendingSearch>);

      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      const caipAsset1 =
        'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType;
      const caipAsset2 =
        'eip155:1/erc20:0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as CaipAssetType;
      mockToAssetId
        .mockReturnValueOnce(caipAsset1)
        .mockReturnValueOnce(caipAsset2);

      const { getAllByTestId } = renderComponent();
      const tokenResults = getAllByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );
      tokenResults.forEach((result) => fireEvent.press(result));
      fireEvent.press(
        getAllByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON)[0],
      );

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).toHaveBeenCalledTimes(2);
      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'evm-account-id',
        caipAsset1,
      );
      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'evm-account-id',
        caipAsset2,
      );
    });

    it('logs warning and still tracks analytics when no EVM account found for AssetsController', async () => {
      setupWithTokenResults();
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue(null);

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('logs error but still tracks analytics when addCustomAsset throws', async () => {
      setupWithTokenResults();
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockAddCustomAsset.mockRejectedValue(new Error('contract error'));

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('skips assets where toAssetId returns undefined', async () => {
      setupWithTokenResults();
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'evm-account-id',
        address: '0xabc',
      });
      mockToAssetId.mockReturnValue(undefined);

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks analytics for each added EVM token', async () => {
      setupWithTokenResults();

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'mock-event' }),
      );
    });
  });

  describe('addTokens - non-EVM chain', () => {
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

    beforeEach(() => {
      mockIsNonEvmChainId.mockReturnValue(true);
      mockUseTrendingSearch.mockReturnValue({
        data: [mockTrendingResult],
        isLoading: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useTrendingSearch>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConvertTokens.mockReturnValue([mockNonEvmToken as any]);
    });

    it('returns early and skips addAssets and analytics when no account found', async () => {
      mockSelectInternalAccountByScope.mockReturnValue(null);

      const utils = renderComponent({ selectedChainId: solanaChainId });
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(
        Engine.context.MultichainAssetsController.addAssets,
      ).not.toHaveBeenCalled();
      // TOKEN_IMPORT_CLICKED fires from goToConfirmAddToken; TOKEN_ADDED must not fire
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('tracks analytics after successful non-EVM asset addition', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'non-evm-account-id',
        address: 'non-evm-address',
      });

      const utils = renderComponent({ selectedChainId: solanaChainId });
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(
        Engine.context.MultichainAssetsController.addAssets,
      ).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'mock-event' }),
      );
    });

    it('does not call AssetsController.addCustomAsset for non-EVM chains', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'non-evm-account-id',
        address: 'non-evm-address',
      });
      mockSelectIsAssetsUnifyStateEnabled.mockReturnValue(true);

      const utils = renderComponent({ selectedChainId: solanaChainId });
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
    });
  });
});
