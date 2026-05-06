import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { BridgeToken } from '../../types';
import { MultiSwapTokenSelect } from './MultiSwapTokenSelect';
import { MultiSwapTokenSelectSelectorsIDs } from './MultiSwapTokenSelect.testIds';
import {
  buildBatchSellEligibleChains,
  removeStablecoinsFromSourceTokens,
  MAX_BATCH_SELL_SOURCE_TOKENS,
  sortBatchSellTokens,
} from './MultiSwapTokenSelect.utils';
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';
import { BridgeTokenMetadata } from '../../constants/tokens';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
let mockStablecoinsByChain: Record<CaipChainId, CaipAssetType[]> = {};
let mockWalletTokens: BridgeToken[] = [];

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
  useTokensWithBalance: () => mockWalletTokens,
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
      token,
    }: {
      children?: React.ReactNode;
      onPress: (token: BridgeToken) => void;
      token: BridgeToken;
    }) => (
      <Pressable onPress={() => onPress(token)}>
        <Text>{token.symbol}</Text>
        <Text>{token.name}</Text>
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
  `${MultiSwapTokenSelectSelectorsIDs.NETWORK_PILL}-${chainId}`;

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
});

describe('MultiSwapTokenSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStablecoinsByChain = {};
    mockWalletTokens = [
      createToken({ symbol: 'ETHA', name: 'Ethereum A', tokenFiatAmount: 10 }),
    ];
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

    const { getByText, queryByText } = render(<MultiSwapTokenSelect />);

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

    const { getByTestId, queryByTestId } = render(<MultiSwapTokenSelect />);

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
      <MultiSwapTokenSelect />,
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

    const { getByText, queryByText } = render(<MultiSwapTokenSelect />);

    expect(getByText('BSCA')).toBeOnTheScreen();
    expect(queryByText('ETHA')).not.toBeOnTheScreen();
    expect(queryByText('ETHB')).not.toBeOnTheScreen();
  });

  it('shows the no sellable tokens empty state', () => {
    mockWalletTokens = [];

    const { getByText, queryByTestId } = render(<MultiSwapTokenSelect />);

    expect(getByText('No tokens. No problem.')).toBeOnTheScreen();
    expect(
      queryByTestId(MultiSwapTokenSelectSelectorsIDs.NEXT_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('navigates to Explore Tokens from the empty state', () => {
    mockWalletTokens = [];

    const { getByTestId } = render(<MultiSwapTokenSelect />);

    fireEvent.press(
      getByTestId(MultiSwapTokenSelectSelectorsIDs.EXPLORE_TOKENS_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: AppConstants.EXPLORE_TOKENS.URL,
        timestamp: expect.any(Number),
      },
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
      <MultiSwapTokenSelect />,
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

    const { getByTestId, getByText } = render(<MultiSwapTokenSelect />);

    for (let index = 0; index <= MAX_BATCH_SELL_SOURCE_TOKENS; index += 1) {
      fireEvent.press(getByText(`TOK${index}`));
    }

    const nextButton = getByTestId(
      MultiSwapTokenSelectSelectorsIDs.NEXT_BUTTON,
    );

    expect(getByText('Max 5 tokens allowed')).toBeOnTheScreen();
    expect(nextButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(nextButton);

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.BRIDGE.QUOTE_SELECTOR_VIEW,
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

    const { getByTestId, getByText } = render(<MultiSwapTokenSelect />);

    fireEvent.press(getByText('ONE'));
    expect(getByText('Continue with (1) token')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MultiSwapTokenSelectSelectorsIDs.NEXT_BUTTON));

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

    const { getByTestId, getByText } = render(<MultiSwapTokenSelect />);

    fireEvent.press(getByText('ONE'));
    fireEvent.press(getByText('TWO'));
    expect(getByText('Continue with (2) tokens')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MultiSwapTokenSelectSelectorsIDs.NEXT_BUTTON));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setBatchSellSourceTokens',
      payload: [firstToken, secondToken],
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.BRIDGE.QUOTE_SELECTOR_VIEW,
    );
  });
});
