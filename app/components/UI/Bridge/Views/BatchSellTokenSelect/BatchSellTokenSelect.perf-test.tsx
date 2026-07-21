import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { measureRenders } from 'reassure';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { BridgeToken } from '../../types';
import { BatchSellTokenSelect } from './BatchSellTokenSelect';

const mockDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockOnSetRpcTarget = jest.fn();
const mockOnNonEvmNetworkChange = jest.fn();
const mockTrackBatchSellTokenPageContinueClicked = jest.fn();
const mockUseTokensWithBalance = jest.fn();
let mockWalletTokens: BridgeToken[] = [];
let mockCommittedSourceTokens: BridgeToken[] = [];
let mockTokenMarketData: Record<
  Hex,
  Record<Hex, { price?: number; pricePercentChange1d?: number }>
> = {};
let mockCurrencyRates: Record<string, { conversionRate: number }> = {};
let mockCurrentCurrency = 'usd';
let mockNativeCurrencyByChainId: Record<Hex, string | undefined> = {};
let mockMultichainAssetsRates = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../hooks/useRefreshSmartTransactionsLiveness', () => ({
  useRefreshSmartTransactionsLiveness: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        setLocation: jest.fn(),
      },
    },
  },
}));

jest.mock('../../hooks/useTrackBatchSellTokenPageViewed', () => ({
  useTrackBatchSellTokenPageViewed: jest.fn(),
}));

jest.mock('../../hooks/useTrackBatchSellTokenPageContinueClicked', () => ({
  useTrackBatchSellTokenPageContinueClicked: jest.fn(
    () => mockTrackBatchSellTokenPageContinueClicked,
  ),
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

jest.mock('../../../../Views/NetworkSelector/useSwitchNetworks', () => ({
  useSwitchNetworks: jest.fn(() => ({
    onSetRpcTarget: mockOnSetRpcTarget,
    onNonEvmNetworkChange: mockOnNonEvmNetworkChange,
  })),
}));

jest.mock('../../../../../selectors/selectedNetworkController', () => ({
  useNetworkInfo: jest.fn(() => ({
    chainId: '0x1',
    domainIsConnectedDapp: false,
    networkName: 'Ethereum Mainnet',
  })),
}));

jest.mock('../../../../../selectors/multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(() => true),
  selectSelectedNonEvmNetworkChainId: jest.fn(() => undefined),
}));

jest.mock('../../hooks/useTokensWithBalance', () => ({
  useTokensWithBalance: (options?: { chainIds?: CaipChainId[] }) =>
    mockUseTokensWithBalance(options),
}));

jest.mock('../../../Tokens/hooks/useTokenPricePercentageChange', () => ({
  useTokenPricePercentageChange: ({ address }: { address?: string }) =>
    address ? 1.23 : undefined,
}));

jest.mock('../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => mockTokenMarketData),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(() => mockCurrencyRates),
  selectCurrentCurrency: jest.fn(() => mockCurrentCurrency),
}));

jest.mock('../../../../../selectors/multichain/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(() => mockMultichainAssetsRates),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  selectNativeCurrencyByChainId: jest.fn(
    (_state: unknown, chainId: Hex) => mockNativeCurrencyByChainId[chainId],
  ),
  selectEvmNetworkConfigurationsByChainId: jest.fn(() => ({})),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  resetBridgeState: jest.fn(() => ({
    type: 'bridge/resetBridgeState',
  })),
  selectBatchSellDestStablecoins: jest.fn(() => []),
  selectBatchSellDestStablecoinsByChain: jest.fn(() => ({})),
  selectBatchSellSourceTokens: jest.fn(() => mockCommittedSourceTokens),
  setBatchSellSourceTokens: jest.fn((tokens: BridgeToken[]) => ({
    type: 'bridge/setBatchSellSourceTokens',
    payload: tokens,
  })),
  setBatchSellSourceTokenAmounts: jest.fn(() => ({
    type: 'bridge/setBatchSellSourceTokenAmounts',
  })),
  setBatchSellDestToken: jest.fn(() => ({
    type: 'bridge/setBatchSellDestToken',
  })),
  setBatchSellTokenSlippages: jest.fn(() => ({
    type: 'bridge/setBatchSellTokenSlippages',
  })),
}));

jest.mock('../../components/TokenSelectorItem', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  return {
    TokenSelectorItem: ({
      children,
      onPress,
      secondaryRowContent,
      token,
    }: {
      children?: React.ReactNode;
      onPress: (token: BridgeToken) => void;
      secondaryRowContent?: React.ReactNode;
      token: BridgeToken;
    }) => (
      <Pressable
        onPress={() => onPress(token)}
        testID={`batch-sell-token-press-${token.symbol}`}
      >
        <Text>{token.symbol}</Text>
        {secondaryRowContent ?? <Text>{token.name}</Text>}
        <View>{children}</View>
      </Pressable>
    ),
  };
});

function createToken(index: number): BridgeToken {
  const address = `0x${index.toString(16).padStart(40, '0')}`;

  return {
    address,
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: `TOK${index}`,
    name: `Token ${index}`,
    balance: String(index + 1),
    balanceFiat: `$${index + 1}.00`,
    tokenFiatAmount: index + 1,
  };
}

function createTokenMarketData(tokens: BridgeToken[]) {
  return tokens.reduce<
    Record<Hex, { price: number; pricePercentChange1d: number }>
  >((marketData, token, index) => {
    marketData[token.address as Hex] = {
      price: index + 1,
      pricePercentChange1d: 1.23,
    };

    return marketData;
  }, {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWalletTokens = Array.from({ length: 40 }, (_value, index) =>
    createToken(index + 1),
  );
  mockCommittedSourceTokens = [];
  mockTokenMarketData = {
    ['0x1' as Hex]: createTokenMarketData(mockWalletTokens),
  };
  mockCurrencyRates = {
    ETH: { conversionRate: 1 },
  };
  mockCurrentCurrency = 'usd';
  mockMultichainAssetsRates = {};
  mockNativeCurrencyByChainId = {
    ['0x1' as Hex]: 'ETH',
  };
  mockUseTokensWithBalance.mockImplementation(
    (options?: { chainIds?: CaipChainId[] }) => {
      if (!options?.chainIds) return mockWalletTokens;

      return mockWalletTokens.filter((token) =>
        options.chainIds?.includes(
          formatChainIdToCaip(token.chainId) as CaipChainId,
        ),
      );
    },
  );
});

test('selects one token from a populated batch sell token list', async () => {
  await measureRenders(<BatchSellTokenSelect />, {
    scenario: async (screen) => {
      fireEvent.press(screen.getByTestId('batch-sell-token-press-TOK35'));

      await screen.findByText('Continue with (1) token');
    },
  });
});
