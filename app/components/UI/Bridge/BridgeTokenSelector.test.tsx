import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { BridgeTokenSelector } from './BridgeTokenSelector';
import Routes from '../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { setSourceToken } from '../../../core/redux/slices/bridge';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../core/redux/slices/bridge', () => {
  const actual = jest.requireActual('../../../core/redux/slices/bridge');
  return {
    setSourceToken: jest.fn(actual.setSourceToken),
  };
});

describe('BridgeTokenSelector', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockChainId = '0x1' as Hex;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;
  const token3Address = '0x0000000000000000000000000000000000000003' as Hex;

  const initialState = {
    engine: {
      backgroundState: {
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [mockChainId]: {
                [token1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 HELLO
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
          selectedNetworkClientId: '1',
          networkConfigurations: {
            [mockChainId]: {
              chainId: mockChainId,
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
            },
          },
          providerConfig: {
            chainId: mockChainId,
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
            [token3Address]: {
              name: 'Token Three',
              symbol: 'TOKEN3',
              decimals: 18,
              address: token3Address,
              iconUrl: 'https://token3.com/logo.png',
              occurrences: 1,
              aggregators: [],
            },
          },
          tokensChainsCache: {
            [mockChainId]: {
              timestamp: Date.now(),
              data: {
                [token3Address]: {
                  name: 'Token Three',
                  symbol: 'TOKEN3',
                  decimals: 18,
                  address: token3Address,
                  iconUrl: 'https://token3.com/logo.png',
                  occurrences: 1,
                  aggregators: [],
                },
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and displays tokens', async () => {
    const { getByText } = renderScreen(
      BridgeTokenSelector,
      {
        name: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      },
      { state: initialState }
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
      expect(getByText('1.0 TOKEN1')).toBeTruthy();
      expect(getByText('$20000')).toBeTruthy();

      expect(getByText('2.0 HELLO')).toBeTruthy();
      expect(getByText('$200000')).toBeTruthy();
    });
  });

  it('handles token selection correctly', async () => {
    const { getByText } = renderScreen(
      BridgeTokenSelector,
      {
        name: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    await waitFor(() => {
      const token1Element = getByText('1.0 TOKEN1');
      fireEvent.press(token1Element);
    });

    expect(setSourceToken).toHaveBeenCalledWith({
      address: token1Address,
      symbol: 'TOKEN1',
      image: 'https://token1.com/logo.png',
      decimals: 18,
      chainId: mockChainId,
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeTokenSelector,
      {
        name: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    const closeButton = getByTestId('bridge-token-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles token search functionality correctly', async () => {
    const { getByTestId, getByText, queryByText } = renderScreen(
      BridgeTokenSelector,
      {
        name: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    // Initially all tokens should be visible
    await waitFor(() => {
      expect(getByText('3 ETH')).toBeTruthy();
      expect(getByText('1.0 TOKEN1')).toBeTruthy();
      expect(getByText('2.0 HELLO')).toBeTruthy();
    });

    // Search for TOKEN1
    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'HELLO');

    // Should only show HELLO, not TOKEN1
    await waitFor(() => {
      expect(getByText('2.0 HELLO')).toBeTruthy();
      expect(queryByText('1.0 TOKEN1')).toBeNull();
    });

    // Search should be case-insensitive
    fireEvent.changeText(searchInput, 'hello');
    await waitFor(() => {
      expect(getByText('2.0 HELLO')).toBeTruthy();
      expect(queryByText('1.0 TOKEN1')).toBeNull();
    });
  });

  it('displays empty state when no tokens match search', async () => {
    const { getByTestId, getByText } = renderScreen(
      BridgeTokenSelector,
      {
        name: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'NONEXISTENT');

    await waitFor(() => {
      expect(getByText('No tokens match', { exact: false })).toBeTruthy();
    });
  });
});
