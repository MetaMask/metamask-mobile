import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TokensSection from './TokensSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoToBuy = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

// Mock useRampNavigation to avoid deep import chain
jest.mock('../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

const mockUseIsZeroBalanceAccount = jest.fn();
const mockUsePopularTokens = jest.fn();

jest.mock('./hooks', () => ({
  useIsZeroBalanceAccount: () => mockUseIsZeroBalanceAccount(),
  usePopularTokens: () => mockUsePopularTokens(),
}));

const mockSortedTokenKeys = jest.fn();
const mockAccountGroupBalance = jest.fn();

let mockPopularNetworks: string[] = [];
jest.mock(
  '../../../../hooks/useNetworkEnablement/useNetworkEnablement',
  () => ({
    useNetworkEnablement: () => ({
      popularNetworks: mockPopularNetworks,
    }),
  }),
);

jest.mock('../../../../../selectors/assets/assets-list', () => ({
  selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance: (
    state: unknown,
    chainIds: string[],
  ) => mockSortedTokenKeys(state, chainIds),
}));

jest.mock('../../../../../selectors/assets/balances', () => ({
  selectAccountGroupBalanceForEmptyState: (state: unknown) =>
    mockAccountGroupBalance(state),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: () => false,
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'usd',
}));

jest.mock('../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest
    .fn()
    .mockReturnValue(() => undefined),
}));

const mockNetworkConfigurations = {};
jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({})),
  selectNetworkConfigurations: jest.fn(() => mockNetworkConfigurations),
}));

jest.mock('../../../../UI/Earn/selectors/featureFlags', () => ({
  selectIsMusdConversionFlowEnabledFlag: jest.fn(() => false),
}));

const mockUseMusdConversionEligibility = jest.fn(() => ({ isEligible: false }));
jest.mock('../../../../UI/Earn/hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: () => mockUseMusdConversionEligibility(),
}));

const mockRefreshTokens = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../UI/Tokens/util/refreshTokens', () => ({
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
}));

const mockFetchTrendingTokens = jest.fn().mockResolvedValue(undefined);
const mockUseTrendingRequest = jest.fn(() => ({
  results: [] as Record<string, unknown>[],
  isLoading: false,
  error: null,
  fetch: mockFetchTrendingTokens,
}));
jest.mock(
  '../../../../UI/Trending/hooks/useTrendingRequest/useTrendingRequest',
  () => ({
    useTrendingRequest: (...args: unknown[]) =>
      Reflect.apply(mockUseTrendingRequest, undefined, args),
  }),
);

const mockShouldShowTokenListItemCta = jest.fn().mockReturnValue(false);
jest.mock('../../../../UI/Earn/hooks/useMusdCtaVisibility', () => ({
  useMusdCtaVisibility: () => ({
    shouldShowTokenListItemCta: mockShouldShowTokenListItemCta,
  }),
}));

// Mock ErrorState to avoid design system import chain and enable testID queries
jest.mock('../../components/ErrorState', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ title, onRetry }: { title: string; onRetry: () => void }) =>
      ReactActual.createElement(
        View,
        { testID: 'error-state' },
        ReactActual.createElement(Text, null, title),
        ReactActual.createElement(
          TouchableOpacity,
          { testID: 'error-state-retry-button', onPress: onRetry },
          ReactActual.createElement(Text, null, 'Retry'),
        ),
      ),
  };
});

// Mock PopularTokensSkeleton to avoid react-native-skeleton-placeholder import
jest.mock('./components/PopularTokensSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="skeleton-placeholder" />,
  };
});

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ token }: { token: { assetId: string; name: string } }) => (
        <Text testID={`trending-token-row-${token.assetId}`}>{token.name}</Text>
      ),
    };
  },
);

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => <View testID="trending-token-skeleton" />,
    };
  },
);

// Mock TokenListItem to avoid complex import chains
const MockTokenListItem = ({
  assetKey,
  showRemoveMenu,
}: {
  assetKey: { address: string; chainId?: string };
  showRemoveMenu?: (token: unknown) => void;
}) => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return ReactActual.createElement(
    TouchableOpacity,
    {
      testID: `token-item-${assetKey.address}`,
      onLongPress: () =>
        showRemoveMenu?.({
          address: assetKey.address,
          chainId: assetKey.chainId,
          name: `Token ${assetKey.address}`,
          symbol: 'TKN',
          decimals: 18,
          image: '',
          balance: '0',
          logo: undefined,
          isETH: false,
        }),
    },
    ReactActual.createElement(Text, null, `Token ${assetKey.address}`),
  );
};

jest.mock(
  '../../../../UI/Tokens/TokenList/TokenListItem/TokenListItem',
  () => ({
    TokenListItem: (props: {
      assetKey: { address: string; chainId?: string };
      showRemoveMenu?: (token: unknown) => void;
    }) => MockTokenListItem(props),
  }),
);

// Mock PopularTokenRow to avoid deep import chains (AvatarToken uses selectors)
jest.mock('./components/PopularTokenRow', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({
      token,
    }: {
      token: {
        assetId: string;
        name: string;
        price?: number;
        priceChange1d?: number;
      };
    }) =>
      ReactActual.createElement(
        View,
        { testID: `popular-token-row-${token.assetId}` },
        ReactActual.createElement(Text, null, token.name),
        token.price !== undefined &&
          ReactActual.createElement(
            Text,
            { testID: `price-${token.assetId}` },
            `$${token.price.toFixed(2)}`,
          ),
        token.priceChange1d !== undefined &&
          ReactActual.createElement(
            Text,
            { testID: `change-${token.assetId}` },
            `${token.priceChange1d >= 0 ? '+' : ''}${token.priceChange1d.toFixed(2)}%`,
          ),
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: `buy-button-${token.assetId}`,
            onPress: () =>
              jest
                .requireMock('../../../../UI/Ramp/hooks/useRampNavigation')
                .useRampNavigation()
                .goToBuy({ assetId: token.assetId }),
          },
          ReactActual.createElement(Text, null, 'Buy'),
        ),
      ),
  };
});

// Mock RemoveTokenBottomSheet (default export)
jest.mock('../../../../UI/Tokens/TokenList/RemoveTokenBottomSheet', () => {
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  const MockRemoveTokenBottomSheet = ({
    isVisible,
    onRemove,
    onClose,
  }: {
    isVisible: boolean;
    onRemove: () => void;
    onClose: () => void;
  }) =>
    isVisible ? (
      <View testID="remove-token-bottom-sheet">
        <TouchableOpacity testID="remove-token-confirm" onPress={onRemove}>
          <Text>Remove</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="remove-token-cancel" onPress={onClose}>
          <Text>Cancel</Text>
        </TouchableOpacity>
      </View>
    ) : null;
  return {
    __esModule: true,
    default: MockRemoveTokenBottomSheet,
  };
});

// Mock ScamWarningModal
jest.mock(
  '../../../../UI/Tokens/TokenList/ScamWarningModal/ScamWarningModal',
  () => ({
    ScamWarningModal: () => null,
  }),
);

// Mock useAnalytics
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(),
  }),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
    TRENDING_TOKENS: 'trending_tokens',
    TRENDING_PERPS: 'trending_perps',
    TRENDING_PREDICT: 'trending_predict',
  },
}));

// Mock token removal utilities
jest.mock('../../../../UI/Tokens/util', () => ({
  removeEvmToken: jest.fn().mockResolvedValue(undefined),
  removeNonEvmToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: jest.fn().mockReturnValue(false),
}));

const mockPopularTokens = [
  {
    assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    name: 'MetaMask USD',
    symbol: 'mUSD',
    iconUrl: 'https://example.com/musd.png',
    price: 1.0,
    priceChange1d: 0.01,
  },
  {
    assetId: 'eip155:1/slip44:60',
    name: 'Ethereum',
    symbol: 'ETH',
    iconUrl: 'https://example.com/eth.png',
    price: 3000.0,
    priceChange1d: 2.5,
  },
];

const mockTrendingTokenData = [
  {
    assetId: 'eip155:1/slip44:60',
    name: 'Ethereum',
    symbol: 'ETH',
    price: '3000',
    decimals: 18,
  },
  {
    assetId: 'eip155:1/erc20:0xabc',
    name: 'TokenA',
    symbol: 'TKA',
    price: '10',
    decimals: 18,
  },
  {
    assetId: 'eip155:1/erc20:0xdef',
    name: 'TokenB',
    symbol: 'TKB',
    price: '5',
    decimals: 18,
  },
];

describe('TokensSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshTokens.mockResolvedValue(undefined);
    mockUseTrendingRequest.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      fetch: mockFetchTrendingTokens,
    });
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([]);
    mockPopularNetworks = ['eip155:1', '0xa'];
    // Default null: balance selectors not yet initialized (cold start).
    // Prevents the heuristic from firing in tests that don't set up balance data.
    mockAccountGroupBalance.mockReturnValue(null);
    mockUsePopularTokens.mockReturnValue({
      tokens: mockPopularTokens,
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      refetch: jest.fn(),
    });
    // Cash section disabled by default so TokensSection shows all tokens (including mUSD) unless a test opts in.
    jest
      .requireMock('../../../../UI/Earn/selectors/featureFlags')
      .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(false);
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: false });
  });

  it('renders section title for account with balance', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
  });

  it('enables useTrendingRequest only in trending-only mode', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);

    const { unmount: unmountDefault } = renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );
    expect(mockUseTrendingRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    unmountDefault();

    mockUseTrendingRequest.mockClear();

    const { unmount: unmountPositions } = renderWithProvider(
      <TokensSection
        sectionIndex={0}
        totalSectionsLoaded={1}
        mode="positions-only"
      />,
    );
    expect(mockUseTrendingRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    unmountPositions();

    mockUseTrendingRequest.mockClear();

    renderWithProvider(
      <TokensSection
        sectionIndex={0}
        totalSectionsLoaded={1}
        mode="trending-only"
      />,
    );
    expect(mockUseTrendingRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('renders "Tokens" title for zero balance account', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
  });

  it('renders popular tokens for zero balance account', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
    expect(screen.getByText('Ethereum')).toBeOnTheScreen();
  });

  it('renders Buy button for popular tokens in zero balance state', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getAllByText('Buy')).toHaveLength(2);
  });

  it('calls goToBuy with assetId when Buy button is pressed', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    const buyButtons = screen.getAllByText('Buy');
    fireEvent.press(buyButtons[0]);

    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    });
  });

  it('uses popular network list for token list (selectSortedAssetsBySelectedAccountGroupForChainIdsByBalance)', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    const popularChainIds = ['eip155:1', '0xa'];
    mockPopularNetworks = popularChainIds;
    mockSortedTokenKeys.mockReturnValue([]);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(mockSortedTokenKeys).toHaveBeenCalledWith(
      expect.anything(),
      popularChainIds,
    );
  });

  it('renders token list items for account with tokens', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
      { chainId: '0x1', address: '0xtoken2', isStaked: false },
    ]);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
    expect(screen.getByTestId('token-item-0xtoken2')).toBeOnTheScreen();
  });

  it('limits displayed tokens to MAX_TOKENS_DISPLAYED (5)', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
      { chainId: '0x1', address: '0xtoken2', isStaked: false },
      { chainId: '0x1', address: '0xtoken3', isStaked: false },
      { chainId: '0x1', address: '0xtoken4', isStaked: false },
      { chainId: '0x1', address: '0xtoken5', isStaked: false },
      { chainId: '0x1', address: '0xtoken6', isStaked: false },
      { chainId: '0x1', address: '0xtoken7', isStaked: false },
    ]);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
    expect(screen.getByTestId('token-item-0xtoken5')).toBeOnTheScreen();
    expect(screen.queryByTestId('token-item-0xtoken6')).toBeNull();
    expect(screen.queryByTestId('token-item-0xtoken7')).toBeNull();
  });

  it('filters out mUSD from displayed tokens (mUSD is shown only in Cash section)', () => {
    const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
    jest
      .requireMock('../../../../UI/Earn/selectors/featureFlags')
      .selectIsMusdConversionFlowEnabledFlag.mockReturnValue(true);
    mockUseMusdConversionEligibility.mockReturnValue({ isEligible: true });
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: MUSD_ADDRESS, isStaked: false },
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
    ]);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.queryByTestId(`token-item-${MUSD_ADDRESS}`)).toBeNull();
    expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
  });

  it('navigates to tokens full view on title press', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByLabelText('Tokens'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.TOKENS_FULL_VIEW);
  });

  it('renders ErrorState when popular tokens fail to load for zero balance account', async () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);
    mockUsePopularTokens.mockReturnValue({
      tokens: [
        {
          assetId: 'eip155:1/slip44:60',
          name: 'Ethereum',
          symbol: 'ETH',
          iconUrl: 'https://example.com/eth.png',
          price: undefined,
          priceChange1d: undefined,
        },
      ],
      isInitialLoading: false,
      isRefreshing: false,
      error: new Error('Network error'),
      refetch: jest.fn(),
    });

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeOnTheScreen();
    });
    expect(screen.getByText('Unable to load tokens')).toBeOnTheScreen();
  });

  it('renders popular token rows when zero balance and no error', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(true);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.queryByTestId('error-state')).toBeNull();
    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
  });

  it('renders ErrorState when refreshTokens throws for non-zero balance account', async () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
    ]);
    mockRefreshTokens.mockRejectedValue(new Error('Network error'));

    const ref = React.createRef<{ refresh: () => Promise<void> }>();
    renderWithProvider(
      <TokensSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
    );

    await act(async () => {
      await ref.current?.refresh();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeOnTheScreen();
    });
    expect(screen.getByText('Unable to load tokens')).toBeOnTheScreen();
  });

  it('clears error and shows token items on retry after ownership path error', async () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
    ]);
    mockRefreshTokens.mockRejectedValueOnce(new Error('Network error'));

    const ref = React.createRef<{ refresh: () => Promise<void> }>();
    renderWithProvider(
      <TokensSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
    );

    await act(async () => {
      await ref.current?.refresh();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(screen.getByTestId('error-state-retry-button'));
    });

    await waitFor(() => {
      expect(screen.queryByTestId('error-state')).toBeNull();
      expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
    });
  });

  it('does not render ErrorState when balance has not loaded and token list is empty (cold start)', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([]);
    mockAccountGroupBalance.mockReturnValue(null);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.queryByTestId('error-state')).toBeNull();
  });

  it('renders ErrorState when account has balance but selector returns no tokens', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([]);
    mockAccountGroupBalance.mockReturnValue({
      totalBalanceInUserCurrency: 100,
      userCurrency: 'usd',
    });

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('error-state')).toBeOnTheScreen();
    expect(screen.getByText('Unable to load tokens')).toBeOnTheScreen();
  });

  it('retries data fetch when retry is pressed on heuristic error', async () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([]);
    mockAccountGroupBalance.mockReturnValue({
      totalBalanceInUserCurrency: 100,
      userCurrency: 'usd',
    });

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByTestId('error-state')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId('error-state-retry-button'));
    });

    expect(mockRefreshTokens).toHaveBeenCalledTimes(1);
  });

  it('does not show RemoveTokenBottomSheet by default', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
    ]);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(
      screen.queryByTestId('remove-token-bottom-sheet'),
    ).not.toBeOnTheScreen();
  });

  describe('token removal', () => {
    const { removeEvmToken, removeNonEvmToken } = jest.requireMock(
      '../../../../UI/Tokens/util',
    );
    const { isNonEvmChainId } = jest.requireMock(
      '../../../../../core/Multichain/utils',
    );

    beforeEach(() => {
      mockUseIsZeroBalanceAccount.mockReturnValue(false);
      mockSortedTokenKeys.mockReturnValue([
        { chainId: '0x1', address: '0xtoken1', isStaked: false },
      ]);
      removeEvmToken.mockClear();
      removeNonEvmToken.mockClear();
      isNonEvmChainId.mockReturnValue(false);
    });

    it('shows RemoveTokenBottomSheet on long press and calls removeEvmToken on confirm', async () => {
      renderWithProvider(
        <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent(screen.getByTestId('token-item-0xtoken1'), 'onLongPress');

      expect(screen.getByTestId('remove-token-bottom-sheet')).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(screen.getByTestId('remove-token-confirm'));
      });

      expect(removeEvmToken).toHaveBeenCalledTimes(1);
      expect(removeNonEvmToken).not.toHaveBeenCalled();
    });

    it('calls removeNonEvmToken for non-EVM tokens', async () => {
      isNonEvmChainId.mockReturnValue(true);
      mockSortedTokenKeys.mockReturnValue([
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          address: '0xsoltoken',
          isStaked: false,
        },
      ]);

      renderWithProvider(
        <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent(screen.getByTestId('token-item-0xsoltoken'), 'onLongPress');

      await act(async () => {
        fireEvent.press(screen.getByTestId('remove-token-confirm'));
      });

      expect(removeNonEvmToken).toHaveBeenCalledTimes(1);
      expect(removeEvmToken).not.toHaveBeenCalled();
    });

    it('hides RemoveTokenBottomSheet on cancel', () => {
      renderWithProvider(
        <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent(screen.getByTestId('token-item-0xtoken1'), 'onLongPress');

      expect(screen.getByTestId('remove-token-bottom-sheet')).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('remove-token-cancel'));

      expect(
        screen.queryByTestId('remove-token-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });
  });

  it('calls refreshTokens for non-zero balance pull-to-refresh', async () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([
      { chainId: '0x1', address: '0xtoken1', isStaked: false },
    ]);

    const ref = React.createRef<{ refresh: () => Promise<void> }>();
    renderWithProvider(
      <TokensSection ref={ref} sectionIndex={0} totalSectionsLoaded={1} />,
    );

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(mockRefreshTokens).toHaveBeenCalledTimes(1);
    expect(mockRefreshTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        isSolanaSelected: false,
      }),
    );
  });

  describe('mode="positions-only"', () => {
    it('returns null when account has zero balance', () => {
      mockUseIsZeroBalanceAccount.mockReturnValue(true);

      const { toJSON } = renderWithProvider(
        <TokensSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="positions-only"
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders token items when account has balance', () => {
      mockUseIsZeroBalanceAccount.mockReturnValue(false);
      mockSortedTokenKeys.mockReturnValue([
        { chainId: '0x1', address: '0xtoken1', isStaked: false },
      ]);

      renderWithProvider(
        <TokensSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="positions-only"
        />,
      );

      expect(screen.getByTestId('token-item-0xtoken1')).toBeOnTheScreen();
    });
  });

  describe('mode="trending-only"', () => {
    it('renders trending token row items', () => {
      mockUseTrendingRequest.mockReturnValue({
        results: mockTrendingTokenData,
        isLoading: false,
        error: null,
        fetch: mockFetchTrendingTokens,
      });

      renderWithProvider(
        <TokensSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="trending-only"
        />,
      );

      expect(
        screen.getByTestId('trending-token-row-eip155:1/slip44:60'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('trending-token-row-eip155:1/erc20:0xabc'),
      ).toBeOnTheScreen();
    });

    it('renders skeletons while trending data is loading', () => {
      mockUseTrendingRequest.mockReturnValue({
        results: [],
        isLoading: true,
        error: null,
        fetch: mockFetchTrendingTokens,
      });

      renderWithProvider(
        <TokensSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="trending-only"
        />,
      );

      expect(screen.getAllByTestId('trending-token-skeleton')).toHaveLength(3);
    });

    it('uses titleOverride when provided', () => {
      mockUseTrendingRequest.mockReturnValue({
        results: mockTrendingTokenData,
        isLoading: false,
        error: null,
        fetch: mockFetchTrendingTokens,
      });

      renderWithProvider(
        <TokensSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="trending-only"
          titleOverride="Trending tokens"
        />,
      );

      expect(screen.getByText('Trending tokens')).toBeOnTheScreen();
    });

    it('navigates to trending tokens full view on title press', () => {
      mockUseTrendingRequest.mockReturnValue({
        results: mockTrendingTokenData,
        isLoading: false,
        error: null,
        fetch: mockFetchTrendingTokens,
      });

      renderWithProvider(
        <TokensSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="trending-only"
          titleOverride="Trending tokens"
        />,
      );

      fireEvent.press(screen.getByLabelText('Trending tokens'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.TRENDING_TOKENS_FULL_VIEW,
      );
    });

    it('calls fetchTrendingTokens on refresh', async () => {
      mockUseTrendingRequest.mockReturnValue({
        results: mockTrendingTokenData,
        isLoading: false,
        error: null,
        fetch: mockFetchTrendingTokens,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(
        <TokensSection
          ref={ref}
          sectionIndex={0}
          totalSectionsLoaded={1}
          mode="trending-only"
        />,
      );

      await act(async () => {
        await ref.current?.refresh();
      });

      expect(mockFetchTrendingTokens).toHaveBeenCalledTimes(1);
    });
  });
});
