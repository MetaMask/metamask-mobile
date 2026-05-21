import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextColor as DSTextColor } from '@metamask/design-system-react-native';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { BridgeToken } from '../../types';
import { BatchSellTokenSelect } from './BatchSellTokenSelect';
import { BatchSellTokenSelectSelectorsIDs } from './BatchSellTokenSelect.testIds';
import {
  buildBatchSellEligibleChains,
  getBatchSellDestinationToken,
  removeStablecoinsFromSourceTokens,
  MAX_BATCH_SELL_SOURCE_TOKENS,
  SUPPORTED_BATCH_SELL_CHAIN_IDS,
  sortBatchSellTokens,
} from './BatchSellTokenSelect.utils';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeTokenMetadata } from '../../constants/tokens';
import {
  TextColor as ComponentLibraryTextColor,
  TextVariant as ComponentLibraryTextVariant,
} from '../../../../../component-library/components/Texts/Text';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockUseTokensWithBalance = jest.fn();
let mockDestinationStablecoins: BridgeToken[] = [];
let mockDestinationStablecoinsByChain: Partial<
  Record<CaipChainId, BridgeToken[]>
> = {};
let mockWalletTokens: BridgeToken[] = [];
let mockPricePercentChangesByAddress: Record<string, number | undefined> = {};
let mockTokenMarketData: Record<
  Hex,
  Record<Hex, { price?: number; pricePercentChange1d?: number }>
> = {};
let mockCurrencyRates: Record<string, { conversionRate: number }> = {};
let mockCurrentCurrency = 'usd';
let mockNativeCurrencyByChainId: Record<Hex, string | undefined> = {};
const usdcAssetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const DesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    ...DesignSystem,
    Checkbox: ({
      accessibilityLabel,
      isSelected,
      onChange,
    }: {
      accessibilityLabel?: string;
      isSelected?: boolean;
      onChange?: () => void;
    }) =>
      ReactActual.createElement(Pressable, {
        accessibilityLabel,
        accessibilityRole: 'checkbox',
        accessibilityState: { checked: Boolean(isSelected) },
        onPress: onChange,
      }),
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, props, children),
  };
});

jest.mock('../../hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: (options?: { chainIds?: CaipChainId[] }) =>
    mockUseTokensWithBalance(options),
}));

jest.mock('../../../Tokens/hooks/useTokenPricePercentageChange', () => ({
  useTokenPricePercentageChange: ({ address }: { address?: string }) =>
    address ? mockPricePercentChangesByAddress[address] : undefined,
}));

jest.mock('../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => mockTokenMarketData),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(() => mockCurrencyRates),
  selectCurrentCurrency: jest.fn(() => mockCurrentCurrency),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectNativeCurrencyByChainId: jest.fn(
    (_state: unknown, chainId: Hex) => mockNativeCurrencyByChainId[chainId],
  ),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  resetBridgeState: jest.fn(() => ({
    type: 'bridge/resetBridgeState',
  })),
  selectBatchSellDestStablecoins: jest.fn(() => mockDestinationStablecoins),
  selectBatchSellDestStablecoinsByChain: jest.fn(
    () => mockDestinationStablecoinsByChain,
  ),
  setBatchSellSourceTokens: jest.fn((tokens: BridgeToken[]) => ({
    type: 'bridge/setBatchSellSourceTokens',
    payload: tokens,
  })),
}));

jest.mock('../../components/TokenSelectorItem', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    TokenSelectorItem: ({
      children,
      onPress,
      secondaryRowContent,
      shouldChangeSelectedStyle,
      shouldShowNetworkIcon,
      token,
      tokenBalanceTextProps,
    }: {
      children?: React.ReactNode;
      onPress: (token: BridgeToken) => void;
      secondaryRowContent?: React.ReactNode;
      shouldChangeSelectedStyle?: boolean;
      shouldShowNetworkIcon?: boolean;
      token: BridgeToken;
      tokenBalanceTextProps?: {
        textColor?: string;
        textStyle?: object;
        textVariant?: string;
      };
    }) => (
      <Pressable onPress={() => onPress(token)}>
        <Text>{token.symbol}</Text>
        {secondaryRowContent ?? <Text>{token.name}</Text>}
        <Text
          color={tokenBalanceTextProps?.textColor}
          style={tokenBalanceTextProps?.textStyle}
          testID={`token-balance-${token.symbol}`}
          variant={tokenBalanceTextProps?.textVariant}
        >
          {token.balance} {token.symbol}
        </Text>
        <Text testID={`token-selected-style-${token.symbol}`}>
          {String(shouldChangeSelectedStyle)}
        </Text>
        <Text testID={`token-network-icon-${token.symbol}`}>
          {String(shouldShowNetworkIcon)}
        </Text>
        <View>{children}</View>
      </Pressable>
    ),
  };
});

const createToken = (overrides: Partial<BridgeToken>): BridgeToken => ({
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'TST',
  name: 'Test Token',
  balance: '1',
  balanceFiat: '$1.00',
  tokenFiatAmount: 1,
  ...overrides,
});

const getNetworkPillTestId = (chainId: CaipChainId) =>
  `${BatchSellTokenSelectSelectorsIDs.NETWORK_PILL}-${chainId}`;

describe('filterBatchSellDestinationStablecoins', () => {
  it('excludes configured stablecoins', () => {
    const stablecoinAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const highBalanceToken = createToken({
      symbol: 'HIGH',
      address: '0x2222222222222222222222222222222222222222',
      tokenFiatAmount: 50,
    });
    const lowBalanceToken = createToken({
      symbol: 'LOW',
      address: '0x3333333333333333333333333333333333333333',
      tokenFiatAmount: 10,
    });
    const stablecoinToken = createToken({
      symbol: 'USDC',
      address: stablecoinAddress,
      tokenFiatAmount: 100,
    });

    const result = removeStablecoinsFromSourceTokens({
      tokens: [lowBalanceToken, stablecoinToken, highBalanceToken],
      stablecoinsByChain: {
        ['eip155:1' as CaipChainId]: [BridgeTokenMetadata[usdcAssetId]],
      },
    });

    expect(result.map((token) => token.symbol)).toEqual(['LOW', 'HIGH']);
  });
});

describe('buildBatchSellEligibleNetworks', () => {
  it('sorts eligible networks by highest aggregate fiat value', () => {
    const result = buildBatchSellEligibleChains([
      createToken({
        symbol: 'ETHA',
        address: '0x1111111111111111111111111111111111111111',
        chainId: '0x1' as Hex,
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'BSCA',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x38' as Hex,
        tokenFiatAmount: 100,
      }),
      createToken({
        symbol: 'BASEA',
        address: '0x3333333333333333333333333333333333333333',
        chainId: '0x2105' as Hex,
        tokenFiatAmount: 50,
      }),
      createToken({
        symbol: 'ETHB',
        address: '0x4444444444444444444444444444444444444444',
        chainId: '0x1' as Hex,
        tokenFiatAmount: 5,
      }),
    ]);

    expect(result.map((network) => network.chainId)).toEqual([
      'eip155:56',
      'eip155:8453',
      'eip155:1',
    ]);
  });
});

describe('getBatchSellDestinationToken', () => {
  it('returns the first configured stablecoin with local metadata', () => {
    const result = getBatchSellDestinationToken('0x1' as Hex, [
      BridgeTokenMetadata[usdcAssetId],
    ]);

    expect(result).toEqual(BridgeTokenMetadata[usdcAssetId]);
  });

  it('returns undefined when no configured stablecoin matches the source chain', () => {
    const result = getBatchSellDestinationToken('0x38' as Hex, [
      BridgeTokenMetadata[usdcAssetId],
    ]);

    expect(result).toBeUndefined();
  });

  it('returns undefined when there are no configured stablecoins', () => {
    const result = getBatchSellDestinationToken('0x1' as Hex, []);

    expect(result).toBeUndefined();
  });
});

describe('sortBatchSellTokens', () => {
  it('sorts tokens by highest fiat value', () => {
    const result = sortBatchSellTokens([
      createToken({
        symbol: 'ETHA',
        address: '0x1111111111111111111111111111111111111111',
        chainId: '0x1' as Hex,
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'BSCA',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x38' as Hex,
        tokenFiatAmount: 100,
      }),
      createToken({
        symbol: 'BASEA',
        address: '0x3333333333333333333333333333333333333333',
        chainId: '0x2105' as Hex,
        tokenFiatAmount: 50,
      }),
      createToken({
        symbol: 'ETHB',
        address: '0x4444444444444444444444444444444444444444',
        chainId: '0x1' as Hex,
        tokenFiatAmount: 5,
      }),
    ]);

    expect(result.map((token) => token.symbol)).toEqual([
      'BSCA',
      'BASEA',
      'ETHA',
      'ETHB',
    ]);
  });

  it('sorts tokens by lowest fiat value when ascending', () => {
    const result = sortBatchSellTokens(
      [
        createToken({
          symbol: 'ETHA',
          address: '0x1111111111111111111111111111111111111111',
          chainId: '0x1' as Hex,
          tokenFiatAmount: 10,
        }),
        createToken({
          symbol: 'BSCA',
          address: '0x2222222222222222222222222222222222222222',
          chainId: '0x38' as Hex,
          tokenFiatAmount: 100,
        }),
        createToken({
          symbol: 'BASEA',
          address: '0x3333333333333333333333333333333333333333',
          chainId: '0x2105' as Hex,
          tokenFiatAmount: 50,
        }),
      ],
      'asc',
    );

    expect(result.map((token) => token.symbol)).toEqual([
      'ETHA',
      'BASEA',
      'BSCA',
    ]);
  });
});

describe('BatchSellTokenSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationStablecoins = [];
    mockDestinationStablecoinsByChain = {};
    mockPricePercentChangesByAddress = {};
    mockTokenMarketData = {};
    mockCurrencyRates = {
      ETH: { conversionRate: 1 },
    };
    mockCurrentCurrency = 'usd';
    mockNativeCurrencyByChainId = {
      ['0x1' as Hex]: 'ETH',
      ['0x38' as Hex]: 'BNB',
    };
    mockWalletTokens = [
      createToken({ symbol: 'ETHA', name: 'Ethereum A', tokenFiatAmount: 10 }),
    ];
    mockUseTokensWithBalance.mockImplementation(
      (options?: { chainIds?: CaipChainId[] }) => {
        if (!options?.chainIds) {
          return mockWalletTokens;
        }

        return mockWalletTokens.filter((token) =>
          options.chainIds?.includes(
            formatChainIdToCaip(token.chainId) as CaipChainId,
          ),
        );
      },
    );
  });

  it('renders only eligible wallet tokens', () => {
    const stablecoinAddress = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    mockDestinationStablecoins = [BridgeTokenMetadata[usdcAssetId]];
    mockDestinationStablecoinsByChain = {
      ['eip155:1' as CaipChainId]: mockDestinationStablecoins,
    };
    mockWalletTokens = [
      createToken({ symbol: 'SELL', name: 'Sell Token' }),
      createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        address: stablecoinAddress,
      }),
    ];

    const { getByText, queryByText } = render(<BatchSellTokenSelect />);

    expect(getByText('Select up to 5 tokens')).toBeOnTheScreen();
    expect(
      getByText('All tokens need to be on the same network.'),
    ).toBeOnTheScreen();
    expect(getByText('SELL')).toBeOnTheScreen();
    expect(queryByText('USDC')).not.toBeOnTheScreen();
  });

  it('resets bridge state on unmount', () => {
    const { unmount } = render(<BatchSellTokenSelect />);

    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: 'bridge/resetBridgeState',
    });

    unmount();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/resetBridgeState',
    });
  });

  it('renders network pills only for networks with token balances', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'ETHA',
        name: 'Ethereum A',
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'BSCA',
        name: 'BSC A',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x38' as Hex,
        tokenFiatAmount: 5,
      }),
    ];

    const { getByTestId, queryByTestId } = render(<BatchSellTokenSelect />);

    expect(
      getByTestId(getNetworkPillTestId('eip155:1' as CaipChainId)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(getNetworkPillTestId('eip155:56' as CaipChainId)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getNetworkPillTestId('eip155:59144' as CaipChainId)),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(getNetworkPillTestId('eip155:8453' as CaipChainId)),
    ).not.toBeOnTheScreen();
  });

  it('does not render network pills for unsupported networks', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'ETHA',
        name: 'Ethereum A',
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'AVAXA',
        name: 'Avalanche A',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0xa86a' as Hex,
        tokenFiatAmount: 100,
      }),
    ];

    const { getByTestId, queryByTestId, queryByText } = render(
      <BatchSellTokenSelect />,
    );

    expect(mockUseTokensWithBalance).toHaveBeenCalledWith({
      chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
    });
    expect(
      getByTestId(getNetworkPillTestId('eip155:1' as CaipChainId)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getNetworkPillTestId('eip155:43114' as CaipChainId)),
    ).not.toBeOnTheScreen();
    expect(queryByText('AVAXA')).not.toBeOnTheScreen();
  });

  it('filters tokens to the selected network pill', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'ETHA',
        name: 'Ethereum A',
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'BSCA',
        name: 'BSC A',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x38' as Hex,
        tokenFiatAmount: 5,
      }),
    ];

    const { getByTestId, getByText, queryByText } = render(
      <BatchSellTokenSelect />,
    );

    expect(getByText('ETHA')).toBeOnTheScreen();
    expect(queryByText('BSCA')).not.toBeOnTheScreen();

    fireEvent.press(
      getByTestId(getNetworkPillTestId('eip155:56' as CaipChainId)),
    );

    expect(getByText('BSCA')).toBeOnTheScreen();
    expect(queryByText('ETHA')).not.toBeOnTheScreen();
  });

  it('selects the highest fiat network on entry', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'ETHA',
        name: 'Ethereum A',
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'BSCA',
        name: 'BSC A',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x38' as Hex,
        tokenFiatAmount: 20,
      }),
      createToken({
        symbol: 'ETHB',
        name: 'Ethereum B',
        address: '0x3333333333333333333333333333333333333333',
        tokenFiatAmount: 5,
      }),
    ];

    const { getByText, queryByText } = render(<BatchSellTokenSelect />);

    expect(getByText('BSCA')).toBeOnTheScreen();
    expect(queryByText('ETHA')).not.toBeOnTheScreen();
    expect(queryByText('ETHB')).not.toBeOnTheScreen();
  });

  it('toggles token sorting when pressing the balance header', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'HIGH',
        name: 'High Token',
        address: '0x1111111111111111111111111111111111111111',
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'LOW',
        name: 'Low Token',
        address: '0x2222222222222222222222222222222222222222',
        tokenFiatAmount: 1,
      }),
      createToken({
        symbol: 'MID',
        name: 'Mid Token',
        address: '0x3333333333333333333333333333333333333333',
        tokenFiatAmount: 5,
      }),
    ];

    const { getAllByTestId, getByTestId } = render(<BatchSellTokenSelect />);
    const balanceSortButton = getByTestId(
      BatchSellTokenSelectSelectorsIDs.BALANCE_SORT_BUTTON,
    );
    const getTokenRowSymbols = () =>
      getAllByTestId(
        new RegExp(`^${BatchSellTokenSelectSelectorsIDs.TOKEN_ROW}-`),
      ).map((row) =>
        row.props.testID.replace(
          `${BatchSellTokenSelectSelectorsIDs.TOKEN_ROW}-`,
          '',
        ),
      );

    expect(balanceSortButton.props.style).toBeUndefined();
    expect(getTokenRowSymbols()).toEqual(['HIGH', 'MID', 'LOW']);

    fireEvent.press(balanceSortButton);

    expect(getTokenRowSymbols()).toEqual(['LOW', 'MID', 'HIGH']);

    fireEvent.press(balanceSortButton);

    expect(getTokenRowSymbols()).toEqual(['HIGH', 'MID', 'LOW']);
  });

  it('renders token prices and percentage changes with wallet colors', () => {
    const gainToken = createToken({
      symbol: 'GAIN',
      name: 'Gain Token',
      address: '0x2222222222222222222222222222222222222222',
      tokenFiatAmount: 10,
    });
    const lossToken = createToken({
      symbol: 'LOSS',
      name: 'Loss Token',
      address: '0x3333333333333333333333333333333333333333',
      tokenFiatAmount: 5,
    });
    mockWalletTokens = [gainToken, lossToken];
    mockPricePercentChangesByAddress = {
      [gainToken.address]: 1.23,
      [lossToken.address]: -4.56,
    };
    mockCurrencyRates = {
      ETH: { conversionRate: 2000 },
    };
    mockTokenMarketData = {
      ['0x1' as Hex]: {
        [gainToken.address as Hex]: { price: 1.17226 },
        [lossToken.address as Hex]: { price: 0.5 },
      },
    };

    const { getByTestId, getByText } = render(<BatchSellTokenSelect />);

    expect(getByText('$2,344.52')).toBeOnTheScreen();
    expect(getByText('$1,000.00')).toBeOnTheScreen();
    expect(getByText('+1.23%')).toBeOnTheScreen();
    expect(getByText('-4.56%')).toBeOnTheScreen();
    expect(getByText('+1.23%').props.color).toBe(DSTextColor.SuccessDefault);
    expect(getByText('-4.56%').props.color).toBe(DSTextColor.ErrorDefault);
    expect(getByTestId('token-balance-GAIN').props.variant).toBe(
      ComponentLibraryTextVariant.BodySMMedium,
    );
    expect(getByTestId('token-balance-GAIN').props.color).toBe(
      ComponentLibraryTextColor.Alternative,
    );
    expect(getByTestId('token-balance-GAIN').props.style).toMatchObject({
      textAlign: 'right',
      paddingHorizontal: 0,
    });
  });

  it('disables TokenSelectorItem selected row styling and network icons for Batch Sell rows', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'STYLE',
        name: 'Style Token',
      }),
    ];

    const { getByTestId } = render(<BatchSellTokenSelect />);

    expect(getByTestId('token-selected-style-STYLE').props.children).toBe(
      'false',
    );
    expect(getByTestId('token-network-icon-STYLE').props.children).toBe(
      'false',
    );
  });

  it('shows the no sellable tokens empty state', () => {
    mockWalletTokens = [];

    const { getByText, queryByTestId } = render(<BatchSellTokenSelect />);

    expect(
      getByText('No tokens. No problem. Explore and buy tokens to batch sell.'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(BatchSellTokenSelectSelectorsIDs.NEXT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('shows the no sellable tokens empty state when wallet only has destination stablecoins', () => {
    const stablecoin = BridgeTokenMetadata[usdcAssetId];
    mockDestinationStablecoins = [stablecoin];
    mockDestinationStablecoinsByChain = {
      ['eip155:1' as CaipChainId]: [stablecoin],
    };
    mockWalletTokens = [
      createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        address: stablecoin.address,
        chainId: stablecoin.chainId as Hex,
        tokenFiatAmount: 100,
      }),
    ];

    const { getByTestId, queryByTestId, queryByText } = render(
      <BatchSellTokenSelect />,
    );

    expect(
      getByTestId(BatchSellTokenSelectSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getNetworkPillTestId('eip155:1' as CaipChainId)),
    ).not.toBeOnTheScreen();
    expect(queryByText('USDC')).not.toBeOnTheScreen();
    expect(
      queryByTestId(BatchSellTokenSelectSelectorsIDs.NEXT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('omits stablecoin-only network pills when another chain has a sellable token', () => {
    const stablecoin = BridgeTokenMetadata[usdcAssetId];
    mockDestinationStablecoinsByChain = {
      ['eip155:1' as CaipChainId]: [stablecoin],
    };
    mockWalletTokens = [
      createToken({
        symbol: 'USDC',
        name: 'USD Coin',
        address: stablecoin.address,
        chainId: stablecoin.chainId as Hex,
        tokenFiatAmount: 100,
      }),
      createToken({
        symbol: 'BASEA',
        name: 'Base A',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x2105' as Hex,
        tokenFiatAmount: 1,
      }),
    ];

    const { getByTestId, getByText, queryByTestId, queryByText } = render(
      <BatchSellTokenSelect />,
    );

    expect(
      getByTestId(getNetworkPillTestId('eip155:8453' as CaipChainId)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getNetworkPillTestId('eip155:1' as CaipChainId)),
    ).not.toBeOnTheScreen();
    expect(getByText('BASEA')).toBeOnTheScreen();
    expect(queryByText('USDC')).not.toBeOnTheScreen();
  });

  it('navigates to Explore Tokens from the empty state', () => {
    mockWalletTokens = [];

    const { getByTestId } = render(<BatchSellTokenSelect />);

    fireEvent.press(
      getByTestId(BatchSellTokenSelectSelectorsIDs.EXPLORE_TOKENS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
    });
  });

  it('clears selected tokens when changing networks', () => {
    mockWalletTokens = [
      createToken({
        symbol: 'ETHA',
        name: 'Ethereum A',
        tokenFiatAmount: 10,
      }),
      createToken({
        symbol: 'BSCA',
        name: 'BSC A',
        address: '0x2222222222222222222222222222222222222222',
        chainId: '0x38' as Hex,
        tokenFiatAmount: 5,
      }),
    ];

    const { getByTestId, getByText, queryByText } = render(
      <BatchSellTokenSelect />,
    );

    fireEvent.press(getByText('ETHA'));

    const bscNetworkPill = getByTestId(
      getNetworkPillTestId('eip155:56' as CaipChainId),
    );

    expect(queryByText('BSCA')).not.toBeOnTheScreen();
    expect(getByText('Continue with (1) token')).toBeOnTheScreen();
    expect(bscNetworkPill.props.disabled).not.toBe(true);

    fireEvent.press(bscNetworkPill);

    expect(getByText('BSCA')).toBeOnTheScreen();
    expect(queryByText('ETHA')).not.toBeOnTheScreen();
    expect(getByText('Next')).toBeOnTheScreen();
  });

  it('disables the primary button when more than five tokens are selected', () => {
    mockWalletTokens = Array.from({ length: 6 }, (_, index) =>
      createToken({
        symbol: `TOK${index}`,
        name: `Token ${index}`,
        address: `0x${String(index + 1).repeat(40)}`,
        tokenFiatAmount: 10 - index,
      }),
    );

    const { getByTestId, getByText } = render(<BatchSellTokenSelect />);

    for (let index = 0; index <= MAX_BATCH_SELL_SOURCE_TOKENS; index += 1) {
      fireEvent.press(getByText(`TOK${index}`));
    }

    const nextButton = getByTestId(
      BatchSellTokenSelectSelectorsIDs.NEXT_BUTTON,
    );

    expect(getByText('Max 5 tokens allowed')).toBeOnTheScreen();
    expect(nextButton.props.accessibilityState.disabled).toBe(true);

    mockDispatch.mockClear();
    fireEvent.press(nextButton);

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.BRIDGE.BATCH_SELL_REVIEW,
    );
  });

  it('opens the high-rate alert route for one selected token', () => {
    const stablecoinAssetId =
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
    const selectedToken = createToken({ symbol: 'ONE' });
    mockDestinationStablecoins = [BridgeTokenMetadata[stablecoinAssetId]];
    mockWalletTokens = [selectedToken];

    const { getByTestId, getByText } = render(<BatchSellTokenSelect />);

    fireEvent.press(getByText('ONE'));
    expect(getByText('Continue with (1) token')).toBeOnTheScreen();

    fireEvent.press(getByTestId(BatchSellTokenSelectSelectorsIDs.NEXT_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.HIGH_RATE_ALERT_MODAL,
      params: {
        sourceToken: selectedToken,
        destToken: BridgeTokenMetadata[stablecoinAssetId],
      },
    });
  });

  it('dispatches selected source tokens for multi-token handoff', () => {
    const firstToken = createToken({ symbol: 'ONE' });
    const secondToken = createToken({
      symbol: 'TWO',
      address: '0x2222222222222222222222222222222222222222',
    });
    mockWalletTokens = [firstToken, secondToken];

    const { getByTestId, getByText } = render(<BatchSellTokenSelect />);

    fireEvent.press(getByText('ONE'));
    fireEvent.press(getByText('TWO'));
    expect(getByText('Continue with (2) tokens')).toBeOnTheScreen();

    fireEvent.press(getByTestId(BatchSellTokenSelectSelectorsIDs.NEXT_BUTTON));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setBatchSellSourceTokens',
      payload: [firstToken, secondToken],
    });
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.BATCH_SELL_REVIEW);
  });
});
