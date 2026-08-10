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
    AssetsController: {
      addCustomAsset: jest.fn(),
    },
  },
}));

jest.mock('../../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  toAssetId: jest.fn(),
}));

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

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch',
  () => ({
    useTrendingSearch: jest.fn(() => ({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
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
    loadMore: jest.fn(),
    isLoadingMore: false,
    hasNextPage: false,
    totalCount: undefined,
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
    mockSelectInternalAccountByScope.mockReturnValue({
      id: 'evm-account-id',
      address: '0xabc',
    });
    mockToAssetId.mockReturnValue(
      'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType,
    );
    mockUseTrendingSearch.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasNextPage: false,
      totalCount: undefined,
    } as ReturnType<typeof useTrendingSearch>);
    mockConvertTokens.mockReturnValue([]);
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

  describe('addTokens - EVM chain', () => {
    it('disables the Next button when selectedChainId is null (no tokens to add)', () => {
      setupWithTokenResults();

      // allTokens is always [] when selectedChainId is null, so nothing can be selected
      const { getByTestId } = renderComponent({ selectedChainId: null });

      expect(
        getByTestId(ImportTokenViewSelectorsIDs.NEXT_BUTTON),
      ).toBeDisabled();
    });

    it('calls AssetsController.addCustomAsset for each selected token', async () => {
      setupWithTokenResults();
      const expectedCaipAssetType =
        'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType;
      mockToAssetId.mockReturnValue(expectedCaipAssetType);

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'evm-account-id',
        expectedCaipAssetType,
        expect.objectContaining({
          address: '0x1234567890abcdef1234567890abcdef12345678',
        }),
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
        loadMore: jest.fn(),
        isLoadingMore: false,
        hasNextPage: false,
        totalCount: undefined,
      } as ReturnType<typeof useTrendingSearch>);

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
        expect.objectContaining({
          address: '0x1234567890abcdef1234567890abcdef12345678',
        }),
      );
      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'evm-account-id',
        caipAsset2,
        expect.objectContaining({
          address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        }),
      );
    });

    it('returns early without adding or TOKEN_ADDED when no account found', async () => {
      setupWithTokenResults();
      mockSelectInternalAccountByScope.mockReturnValue(null);

      const utils = renderComponent();
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('logs error but still tracks analytics when addCustomAsset throws', async () => {
      setupWithTokenResults();
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

    const solanaAddress =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:3iQL8BFS2vE7mww4ehAqQHAsbmRNCrPxizWAT2Zfyr9y';
    const mockNonEvmToken = {
      address: solanaAddress,
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
        loadMore: jest.fn(),
        isLoadingMore: false,
        hasNextPage: false,
        totalCount: undefined,
      } as ReturnType<typeof useTrendingSearch>);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockConvertTokens.mockReturnValue([mockNonEvmToken as any]);
    });

    it('returns early without adding or TOKEN_ADDED when no account found', async () => {
      mockSelectInternalAccountByScope.mockReturnValue(null);

      const utils = renderComponent({ selectedChainId: solanaChainId });
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.TOKEN_ADDED,
      );
    });

    it('calls AssetsController.addCustomAsset and tracks analytics', async () => {
      mockSelectInternalAccountByScope.mockReturnValue({
        id: 'non-evm-account-id',
        address: 'non-evm-address',
      });

      const utils = renderComponent({ selectedChainId: solanaChainId });
      selectTokenAndPressNext(utils);

      const [, params] = mockNavigation.navigate.mock.calls[0];
      await params.addTokenList();

      expect(mockAddCustomAsset).toHaveBeenCalledWith(
        'non-evm-account-id',
        solanaAddress,
        expect.objectContaining({ address: solanaAddress }),
      );
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'mock-event' }),
      );
    });
  });

  describe('already added tokens from AssetsController', () => {
    const assetId =
      'eip155:1/erc20:0x1234567890abcdef1234567890abcdef12345678' as CaipAssetType;

    it('disables a token present in customAssets', () => {
      setupWithTokenResults();

      const stateWithCustomAsset = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AssetsController: {
              customAssets: {
                'evm-account-id': [assetId],
              },
              assetsBalance: {},
              assetPreferences: {},
              assetsInfo: {},
              assetsPrice: {},
              selectedCurrency: 'usd',
            },
          },
        },
      };

      const { getByTestId } = renderComponent({
        state: stateWithCustomAsset as typeof mockInitialState,
      });

      expect(
        getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
      ).toBeDisabled();
    });

    it('keeps a hidden token selectable so it can be re-imported', () => {
      setupWithTokenResults();

      const stateWithHiddenAsset = {
        ...mockInitialState,
        engine: {
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            AssetsController: {
              customAssets: {},
              assetsBalance: {
                'evm-account-id': {
                  [assetId]: { amount: '1' },
                },
              },
              assetPreferences: {
                [assetId]: { hidden: true },
              },
              assetsInfo: {},
              assetsPrice: {},
              selectedCurrency: 'usd',
            },
          },
        },
      };

      const { getByTestId } = renderComponent({
        state: stateWithHiddenAsset as typeof mockInitialState,
      });

      expect(
        getByTestId(ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT),
      ).not.toBeDisabled();
    });
  });

  describe('Arc USDC ERC-20 filtering', () => {
    const ARC_CHAIN_ID = '0x13b2' as Hex;
    const ARC_ERC20_ADDRESS = '0x3600000000000000000000000000000000000000';
    const NATIVE_ADDRESS = '0x0000000000000000000000000000000000000000';

    const arcErc20Token = {
      address: ARC_ERC20_ADDRESS,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: ARC_CHAIN_ID,
      image: '',
    };
    const arcNativeToken = {
      address: NATIVE_ADDRESS,
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      chainId: ARC_CHAIN_ID,
      image: '',
    };

    it('hides Arc USDC ERC-20 from search results on Arc chain', () => {
      mockConvertTokens.mockReturnValue([arcErc20Token, arcNativeToken]);

      const { queryAllByTestId } = renderComponent({
        selectedChainId: ARC_CHAIN_ID,
      });

      const results = queryAllByTestId(
        ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT,
      );
      expect(results).toHaveLength(1);
    });
  });
});
