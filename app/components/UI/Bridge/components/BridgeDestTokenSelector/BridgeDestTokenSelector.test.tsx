import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { BridgeDestTokenSelector } from '.';
import Routes from '../../../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';
import { setDestToken } from '../../../../../core/redux/slices/bridge';
import { BridgeFeatureFlagsKey } from '@metamask/bridge-controller';

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
    __esModule: true,
    ...actual,
    default: actual.default,
    setDestToken: jest.fn(actual.setDestToken),
  };
});

describe('BridgeDestTokenSelector', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockSourceChainId = '0x1' as Hex;
  const mockDestChainId = '0xa' as Hex;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;

  const initialState = {
    engine: {
      backgroundState: {
        BridgeController: {
          bridgeFeatureFlags: {
            [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
              chains: {
                '0x1': { isActiveSrc: true, isActiveDest: true },
                '0xa': { isActiveSrc: true, isActiveDest: true },
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [mockSourceChainId]: {
                [token1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
              },
              [mockDestChainId]: {
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 HELLO on Optimism
              },
            },
          },
        },
        TokensController: {
          allTokens: {
            [mockSourceChainId]: {
              [mockAddress]: [
                {
                  address: token1Address,
                  symbol: 'TOKEN1',
                  decimals: 18,
                  image: 'https://token1.com/logo.png',
                  name: 'Token One',
                  aggregators: ['1inch'],
                },
              ],
            },
            [mockDestChainId]: {
              [mockAddress]: [
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
          networkConfigurationsByChainId:  {
            [mockSourceChainId]: {
              chainId: mockSourceChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              name: 'Ethereum',
            },
            [mockDestChainId]: {
              chainId: mockDestChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'optimismNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              name: 'Optimism',
            },
          },
          providerConfig: {
            chainId: mockSourceChainId,
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
            [mockSourceChainId]: {
              [mockAddress]: {
                balance: '0x29a2241af62c0000' as Hex, // 3 ETH
              },
            },
            [mockDestChainId]: {
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
            [mockSourceChainId]: {
              [token1Address]: {
                tokenAddress: token1Address,
                currency: 'ETH',
                price: 10, // 1 TOKEN1 = 10 ETH
              },
            },
            [mockDestChainId]: {
              [token2Address]: {
                tokenAddress: token2Address,
                currency: 'ETH',
                price: 5, // 1 TOKEN2 = 5 ETH on Optimism
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
            [mockDestChainId]: {
              timestamp: Date.now(),
              data: {
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
      sourceToken: undefined,
      destToken: undefined,
      selectedSourceChainIds: [mockSourceChainId, mockDestChainId],
      selectedDestChainId: mockDestChainId,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial state and displays tokens', async () => {
    const { getByText, toJSON } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    // Header should be visible
    expect(getByText('Select token')).toBeTruthy();

    // Tokens for destination chain should be visible
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles token selection correctly', async () => {
    const { getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    await waitFor(() => {
      const token1Element = getByText('HELLO');
      fireEvent.press(token1Element);
    });

    expect(setDestToken).toHaveBeenCalledWith(expect.objectContaining({
      address: token2Address,
      aggregators: ['uniswap'],
      balance: '2',
      chainId: mockDestChainId,
      decimals: 18,
      image: 'https://token2.com/logo.png',
      name: 'Hello Token',
      symbol: 'HELLO',
    }));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles info button click correctly, navigates to Asset screen', async () => {
    const { getAllByTestId, getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    await waitFor(() => {
      expect(getByText('ETH')).toBeTruthy();
    });

    // Get the info button using its test ID
    const infoButton = getAllByTestId('token-info-button')[0];

    // Ensure we found the info button
    expect(infoButton).toBeTruthy();

    // Press the info button
    fireEvent.press(infoButton);

    // Verify navigation to Asset screen with the correct token params
    expect(mockNavigate).toHaveBeenCalledWith('Asset', expect.objectContaining({
      address: '0x0000000000000000000000000000000000000000',
      aggregators: [],
      balance: '20',
      balanceFiat: '$40000',
      chainId: '0xa',
      decimals: 18,
      image: '',
      isETH: true,
      isNative: true,
      isStaked: false,
      logo: '../images/eth-logo-new.png',
      name: 'Ethereum',
      stakedBalance: '0x0',
      symbol: 'ETH',
      ticker: 'ETH',
      tokenFiatAmount: 40000
    }));
  });

  it('handles close button correctly', () => {
    const { getByTestId } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    const closeButton = getByTestId('bridge-token-selector-close-button');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles token search functionality correctly', async () => {
    const { getByTestId, getByText, queryByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    // Initially all tokens should be visible
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
    });

    // Search for TOKEN1
    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'HELLO');

    // Should only show HELLO, not ETH
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
      expect(queryByText('ETH')).toBeNull();
    });

    // Search should be case-insensitive
    fireEvent.changeText(searchInput, 'hello');
    await waitFor(() => {
      expect(getByText('HELLO')).toBeTruthy();
      expect(queryByText('ETH')).toBeNull();
    });
  });

  it('displays empty state when no tokens match search', async () => {
    const { getByTestId, getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'NONEXISTENT');

    await waitFor(() => {
      expect(getByText('No tokens match', { exact: false })).toBeTruthy();
    });
  });

  it('navigates to destination network selector when See all is pressed', async () => {
    const { getByText } = renderScreen(
      BridgeDestTokenSelector,
      {
        name: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      },
      { state: initialState }
    );

    const seeAllButton = getByText('See all');
    fireEvent.press(seeAllButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
    });
  });
});
