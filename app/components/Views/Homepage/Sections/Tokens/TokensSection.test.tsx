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

jest.mock('../../../../../selectors/assets/assets-list', () => ({
  selectSortedAssetsBySelectedAccountGroup: (state: unknown) =>
    mockSortedTokenKeys(state),
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

const mockRefreshTokens = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../../UI/Tokens/util/refreshTokens', () => ({
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
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

// Mock TokenListItem and TokenListItemV2 to avoid complex import chains
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

const MockTokenListItemV2 = ({
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
      testID: `token-item-v2-${assetKey.address}`,
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
    ReactActual.createElement(Text, null, `TokenV2 ${assetKey.address}`),
  );
};

jest.mock(
  '../../../../UI/Tokens/TokenList/TokenListItemV2/TokenListItemV2',
  () => ({
    TokenListItemV2: (props: {
      assetKey: { address: string; chainId?: string };
      showRemoveMenu?: (token: unknown) => void;
    }) => MockTokenListItemV2(props),
  }),
);

const mockSelectTokenListLayoutV2Enabled = jest.fn().mockReturnValue(false);

jest.mock(
  '../../../../../selectors/featureFlagController/tokenListLayout',
  () => ({
    selectTokenListLayoutV2Enabled: () => mockSelectTokenListLayoutV2Enabled(),
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

describe('TokensSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshTokens.mockResolvedValue(undefined);
    mockUseIsZeroBalanceAccount.mockReturnValue(false);
    mockSortedTokenKeys.mockReturnValue([]);
    // Default null: balance selectors not yet initialized (cold start).
    // Prevents the heuristic from firing in tests that don't set up balance data.
    mockAccountGroupBalance.mockReturnValue(null);
    mockSelectTokenListLayoutV2Enabled.mockReturnValue(false);
    mockUsePopularTokens.mockReturnValue({
      tokens: mockPopularTokens,
      isInitialLoading: false,
      isRefreshing: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders section title for account with balance', () => {
    mockUseIsZeroBalanceAccount.mockReturnValue(false);

    renderWithProvider(
      <TokensSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Tokens')).toBeOnTheScreen();
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

    renderWithProvider(<TokensSection />);

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
      renderWithProvider(<TokensSection />);

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

      renderWithProvider(<TokensSection />);

      fireEvent(screen.getByTestId('token-item-0xsoltoken'), 'onLongPress');

      await act(async () => {
        fireEvent.press(screen.getByTestId('remove-token-confirm'));
      });

      expect(removeNonEvmToken).toHaveBeenCalledTimes(1);
      expect(removeEvmToken).not.toHaveBeenCalled();
    });

    it('hides RemoveTokenBottomSheet on cancel', () => {
      renderWithProvider(<TokensSection />);

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
});
