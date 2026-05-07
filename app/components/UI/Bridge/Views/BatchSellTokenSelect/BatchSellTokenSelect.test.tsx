import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextColor as DSTextColor } from '@metamask/design-system-react-native';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import {
  formatAddressToAssetId,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../../types';
import { BatchSellTokenSelect } from './BatchSellTokenSelect';
import { BatchSellTokenSelectSelectorsIDs } from './BatchSellTokenSelect.testIds';
import {
  buildBatchSellEligibleChains,
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
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockUseTokensWithBalance = jest.fn();
let mockStablecoinsByChain: Record<CaipChainId, CaipAssetType[]> = {};
let mockWalletTokens: BridgeToken[] = [];
let mockPricePercentChangesByAddress: Record<string, number | undefined> = {};
let mockTokenMarketData: Record<
  Hex,
  Record<Hex, { price?: number; pricePercentChange1d?: number }>
> = {};
let mockCurrencyRates: Record<string, { conversionRate: number }> = {};
let mockCurrentCurrency = 'usd';
let mockNativeCurrencyByChainId: Record<Hex, string | undefined> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    AvatarBaseShape: { Square: 'square' },
    AvatarNetwork: ({ testID }: { testID?: string }) => (
      <View testID={testID} />
    ),
    AvatarNetworkSize: { Xs: 'xs' },
    AvatarToken: ({ testID }: { testID?: string }) => <View testID={testID} />,
    AvatarTokenSize: { Lg: 'lg' },
    Box: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    BoxAlignItems: { Center: 'center', End: 'flex-end' },
    BoxFlexDirection: { Row: 'row' },
    BoxJustifyContent: { Between: 'space-between', Center: 'center' },
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          onClose,
          testID,
        }: {
          children?: React.ReactNode;
          onClose?: () => void;
          testID?: string;
        },
        ref: React.Ref<{
          onCloseBottomSheet: (callback?: () => void) => void;
        }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (callback?: () => void) => {
            onClose?.();
            callback?.();
          },
        }));

        return <View testID={testID}>{children}</View>;
      },
    ),
    BottomSheetFooter: ({
      primaryButtonProps,
      secondaryButtonProps,
    }: {
      primaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
        testID?: string;
      };
      secondaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
        testID?: string;
      };
    }) => (
      <View>
        {primaryButtonProps && (
          <Pressable
            onPress={primaryButtonProps.onPress}
            testID={primaryButtonProps.testID}
          >
            <Text>{primaryButtonProps.children}</Text>
          </Pressable>
        )}
        {secondaryButtonProps && (
          <Pressable
            onPress={secondaryButtonProps.onPress}
            testID={secondaryButtonProps.testID}
          >
            <Text>{secondaryButtonProps.children}</Text>
          </Pressable>
        )}
      </View>
    ),
    BottomSheetHeader: ({
      children,
      closeButtonProps,
      onClose,
    }: {
      children?: React.ReactNode;
      closeButtonProps?: { testID?: string };
      onClose?: () => void;
    }) => (
      <View>
        <Text>{children}</Text>
        <Pressable onPress={onClose} testID={closeButtonProps?.testID} />
      </View>
    ),
    Button: ({
      children,
      isDisabled,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      isDisabled?: boolean;
      onPress?: () => void;
      testID?: string;
    }) => (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(isDisabled) }}
        disabled={isDisabled}
        onPress={onPress}
        testID={testID}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
    ButtonBase: ({
      children,
      isDisabled,
      onPress,
      testID,
    }: {
      children: React.ReactNode;
      isDisabled?: boolean;
      onPress?: () => void;
      testID?: string;
    }) => (
      <Pressable disabled={isDisabled} onPress={onPress} testID={testID}>
        {children}
      </Pressable>
    ),
    ButtonIconSize: { Md: 'md' },
    ButtonSize: { Lg: 'lg' },
    ButtonVariant: { Primary: 'primary', Secondary: 'secondary' },
    Checkbox: ({
      accessibilityLabel,
      isSelected,
      onChange,
    }: {
      accessibilityLabel?: string;
      isSelected?: boolean;
      onChange?: () => void;
    }) => (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: Boolean(isSelected) }}
        onPress={onChange}
      />
    ),
    FontWeight: { Medium: 'medium' },
    Icon: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconColor: {
      IconAlternative: 'icon-alternative',
      InfoDefault: 'info-default',
    },
    IconName: {
      Arrow2Down: 'Arrow2Down',
      Arrow2Up: 'Arrow2Up',
      ArrowDown: 'ArrowDown',
      VerifiedFilled: 'VerifiedFilled',
    },
    IconSize: { Sm: 'sm' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextField: ({
      onChangeText,
      testID,
      value,
    }: {
      onChangeText: (text: string) => void;
      testID: string;
      value: string;
    }) => {
      const { TextInput } = jest.requireActual('react-native');
      return (
        <TextInput onChangeText={onChangeText} testID={testID} value={value} />
      );
    },
    TextColor: {
      ErrorDefault: 'error-default',
      PrimaryInverse: 'primary-inverse',
      SuccessDefault: 'success-default',
      TextAlternative: 'text-alternative',
      TextDefault: 'text-default',
    },
    TextVariant: {
      BodyMd: 'body-md',
      BodySm: 'body-sm',
      HeadingLg: 'heading-lg',
      HeadingMd: 'heading-md',
    },
    __esModule: true,
    default: ReactActual,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { FlatList, ScrollView } = jest.requireActual('react-native');
  return { FlatList, ScrollView };
});

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => ({
    getHeaderCompactStandardNavbarOptions: jest.fn((options) => options),
  }),
);

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextColor: {
      Alternative: 'Alternative',
      Default: 'Default',
      Error: 'Error',
      Success: 'Success',
    },
    TextVariant: {
      BodySM: 'BodySM',
      BodySMMedium: 'BodySMMedium',
    },
  };
});

jest.mock(
  '../../../../../component-library/components-temp/Buttons/ButtonToggle',
  () => {
    const { Pressable, Text } = jest.requireActual('react-native');
    return ({
      isDisabled,
      label,
      onPress,
      testID,
    }: {
      isDisabled?: boolean;
      label: React.ReactNode;
      onPress?: () => void;
      testID?: string;
    }) => (
      <Pressable disabled={isDisabled} onPress={onPress} testID={testID}>
        {typeof label === 'string' ? <Text>{label}</Text> : label}
      </Pressable>
    );
  },
);

jest.mock('../../../../../component-library/components/Buttons/Button', () => ({
  ButtonSize: { Md: 'md' },
}));

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
  selectBatchSellDestStablecoinsByChain: jest.fn(() => mockStablecoinsByChain),
  setBatchSellSourceTokens: jest.fn((tokens: BridgeToken[]) => ({
    type: 'bridge/setBatchSellSourceTokens',
    payload: tokens,
  })),
}));

jest.mock('../../utils', () => ({
  getTokenImageSource: jest.fn(() => undefined),
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
    const stablecoin =
      'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
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
        ['eip155:1' as CaipChainId]: [stablecoin],
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
    mockStablecoinsByChain = {};
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
    mockStablecoinsByChain = {
      ['eip155:1' as CaipChainId]: [
        formatAddressToAssetId(
          stablecoinAddress,
          '0x1' as Hex,
        ) as CaipAssetType,
      ],
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
    mockStablecoinsByChain = {
      ['eip155:1' as CaipChainId]: [stablecoinAssetId],
    };
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
