import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeSourceTokenSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { setSourceToken } from '../../../../../core/redux/slices/bridge';
import {
  BridgeFeatureFlagsKey,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../../../core/redux/slices/bridge');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    setSourceToken: jest.fn(actual.setSourceToken),
  };
});

describe('BridgeSourceTokenSelector', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;

  const initialState = {
    engine: {
      backgroundState: {
        BridgeController: {
          bridgeFeatureFlags: {
            [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
              chains: {
                [formatChainIdToCaip(mockChainId)]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                },
                [formatChainIdToCaip(optimismChainId)]: {
                  isActiveSrc: true,
                  isActiveDest: true,
                },
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [mockChainId]: {
                [token1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 HELLO
              },
              '0xa': {
                [token1Address]: '0x4563918244f40000' as Hex, // 5 TOKEN1 on Optimism
              },
            },
          },
        },
        TokensController: {
          allTokens: {
            [mockChainId]: {
              [mockAddress]: [
                {
                  address: token1Address,
                  symbol: 'TOKEN1',
                  decimals: 18,
                  image: 'https://token1.com/logo.png',
                  name: 'Token One',
                  aggregators: ['1inch'],
                },
                {
                  address: token2Address,
                  symbol: 'HELLO',
                  decimals: 18,
                  image: 'https://token2.com/logo.png',
                  name: 'Hello Token',
                  aggregators: ['uniswap'],
                },
              ],
            },
          },
          tokens: [
            {
              address: token1Address,
              symbol: 'TOKEN1',
              decimals: 18,
              image: 'https://token1.com/logo.png',
              name: 'Token One',
              aggregators: ['1inch'],
            },
            {
              address: token2Address,
              symbol: 'HELLO',
              decimals: 18,
              image: 'https://token2.com/logo.png',
              name: 'Hello Token',
              aggregators: ['uniswap'],
            },
          ],
        },
        NetworkController: {
          selectedNetworkClientId: 'selectedNetworkClientId',
          networksMetadata: {
            mainnet: {
              EIPS: {
                1559: true,
              },
            },
            '0xa': {
              EIPS: {
                1559: true,
              },
            },
          },
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1' as Hex,
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
            },
            '0xa': {
              chainId: '0xa' as Hex,
              rpcEndpoints: [
                {
                  networkClientId: 'optimismNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
            },
          },
          providerConfig: {
            chainId: mockChainId,
            ticker: 'ETH',
            rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
            type: 'infura',
          },
        },
        AccountTrackerController: {
          accounts: {
            [mockAddress]: {
              balance: '0x29a2241af62c0000' as Hex, // 3 ETH
            },
          },
          accountsByChainId: {
            [mockChainId]: {
              [mockAddress]: {
                balance: '0x29a2241af62c0000' as Hex, // 3 ETH
              },
            },
            '0xa': {
              [mockAddress]: {
                balance: '0x1158e460913d00000' as Hex, // 20 ETH on Optimism
              },
            },
          },
        },
        MultichainNetworkController: {
          isEvmSelected: true,
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account1',
            accounts: {
              account1: {
                id: 'account1',
                address: mockAddress,
                name: 'Account 1',
              },
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: 2000, // 1 ETH = $2000
            },
          },
          conversionRate: 2000,
        },
        TokenRatesController: {
          marketData: {
            [mockChainId]: {
              [token1Address]: {
                tokenAddress: token1Address,
                currency: 'ETH',
                price: 10, // 1 TOKEN1 = 10 ETH
              },
              [token2Address]: {
                tokenAddress: token2Address,
                currency: 'ETH',
                price: 50, // 1 TOKEN2 = 5 ETH
              },
            },
            '0xa': {
              [token1Address]: {
                tokenAddress: token1Address,
                currency: 'ETH',
                price: 8, // 1 TOKEN1 = 8 ETH on Optimism
              },
            },
          },
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc' as const,
          },
        },
        TokenListController: {
          tokenList: {
            [token1Address]: {
              name: 'Token One',
              symbol: 'TOKEN1',
              decimals: 18,
              address: token1Address,
              iconUrl: 'https://token1.com/logo.png',
              occurrences: 1,
              aggregators: [],
            },
            [token2Address]: {
              name: 'Hello Token',
              symbol: 'HELLO',
              decimals: 18,
              address: token2Address,
              iconUrl: 'https://token2.com/logo.png',
            },
          },
          tokensChainsCache: {
            [mockChainId]: {
              timestamp: Date.now(),
              data: {
                [token1Address]: {
                  name: 'Token One',
                  symbol: 'TOKEN1',
                  decimals: 18,
                  address: token1Address,
                  iconUrl: 'https://token1.com/logo.png',
                  occurrences: 1,
                  aggregators: [],
                },
                [token2Address]: {
                  name: 'Hello Token',
                  symbol: 'HELLO',
                  decimals: 18,
                  address: token2Address,
                  iconUrl: 'https://token2.com/logo.png',
                },
              },
            },
          },
        },
      },
    },
    bridge: {
      sourceAmount: undefined,
      destAmount: undefined,
      destChainId: undefined,
      sourceToken: undefined,
      destToken: undefined,
      selectedSourceChainIds: undefined,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and displays tokens', async () => {
    const { getByText, toJSON } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Header should be visible
    expect(getByText('Select token')).toBeTruthy();

    // Native token (ETH) should be visible with correct balance
    await waitFor(() => {
      expect(getByText('3 ETH')).toBeTruthy();
      expect(getByText('$6000')).toBeTruthy();
    });

    // ERC20 tokens should be visible with correct balances
    await waitFor(() => {
      expect(getByText('1 TOKEN1')).toBeTruthy();
      expect(getByText('$20000')).toBeTruthy();

      expect(getByText('2 HELLO')).toBeTruthy();
      expect(getByText('$200000')).toBeTruthy();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles token selection correctly', async () => {
    const { getByText } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    await waitFor(() => {
      const token1Element = getByText('1 TOKEN1');
      fireEvent.press(token1Element);
    });

    expect(setSourceToken).toHaveBeenCalledWith({
      address: token1Address,
      aggregators: ['1inch'],
      balance: '1',
      balanceFiat: '$20000',
      chainId: '0x1',
      decimals: 18,
      image: 'https://token1.com/logo.png',
      isETH: false,
      isNative: false,
      isStaked: false,
      name: 'Token One',
      symbol: 'TOKEN1',
      token: 'Token One',
      tokenFiatAmount: 20000,
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const closeButton = getByTestId('bridge-token-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles token search functionality correctly', async () => {
    const { getByTestId, getByText, queryByText } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    // Initially all tokens should be visible
    await waitFor(() => {
      expect(getByText('3 ETH')).toBeTruthy();
      expect(getByText('1 TOKEN1')).toBeTruthy();
      expect(getByText('2 HELLO')).toBeTruthy();
    });

    // Search for TOKEN1
    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'HELLO');

    // Should only show HELLO, not TOKEN1
    await waitFor(() => {
      expect(getByText('2 HELLO')).toBeTruthy();
      expect(queryByText('1 TOKEN1')).toBeNull();
    });

    // Search should be case-insensitive
    fireEvent.changeText(searchInput, 'hello');
    await waitFor(() => {
      expect(getByText('2 HELLO')).toBeTruthy();
      expect(queryByText('1 TOKEN1')).toBeNull();
    });
  });

  it('displays empty state when no tokens match search', async () => {
    const { getByTestId, getByText } = renderScreen(
      BridgeSourceTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      },
      { state: initialState },
    );

    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'NONEXISTENT');

    await waitFor(() => {
      expect(getByText('No tokens match', { exact: false })).toBeTruthy();
    });
  });
});
