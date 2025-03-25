import { renderScreen, DeepPartial } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import BridgeView from '../Bridge';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import { BridgeState } from '../../../core/redux/slices/bridge';
import { Hex } from '@metamask/utils';
import { BridgeFeatureFlagsKey } from '@metamask/bridge-controller';
import { ethers } from 'ethers';

// TODO remove this mock once we have a real implementation
jest.mock('../../../selectors/confirmTransaction');

jest.mock('../../../core/Engine', () => ({
  context: {
    SwapsController: {
      fetchAggregatorMetadataWithCache: jest.fn(),
      fetchTopAssetsWithCache: jest.fn(),
      fetchTokenWithCache: jest.fn(),
    },
  },
}));

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: jest.fn(),
    }),
  };
});

// Mock useLatestBalance hook
jest.mock('./useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockImplementation(({
    address,
    chainId,
  }) => {
    if (!address || !chainId) return undefined;

    // Need to do this due to this error: "The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables.""
    const actualEthers = jest.requireActual('ethers');

    return {
      displayBalance: '2.0',
      atomicBalance: actualEthers.BigNumber.from('2000000000000000000'), // 2 ETH
    };
  }),
}));

describe('BridgeView', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as Hex;
  const mockChainId = '0x1' as Hex;
  const optimismChainId = '0xa' as Hex;
  const token1Address = '0x0000000000000000000000000000000000000001' as Hex;
  const token2Address = '0x0000000000000000000000000000000000000002' as Hex;
  const token3Address = '0x0000000000000000000000000000000000000003' as Hex;

  const initialState = {
    engine: {
      backgroundState: {
        BridgeController: {
          bridgeFeatureFlags: {
            [BridgeFeatureFlagsKey.MOBILE_CONFIG]: {
              chains: {
                '0x1': { isActiveSrc: true, isActiveDst: true },
                '0xa': { isActiveSrc: true, isActiveDst: true },
              },
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            [mockAddress]: {
              [mockChainId]: {
                [token1Address]: '0x0de0b6b3a7640000' as Hex, // 1 TOKEN1
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 TOKEN2
              },
              [optimismChainId]: {
                [token3Address]: '0x29a2241af62c0000' as Hex, // 3 TOKEN3
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
                  symbol: 'TOKEN2',
                  decimals: 18,
                  image: 'https://token2.com/logo.png',
                  name: 'Token Two',
                  aggregators: ['uniswap'],
                },
              ],
            },
            [optimismChainId]: {
              [mockAddress]: [
                {
                  address: token3Address,
                  symbol: 'TOKEN3',
                  decimals: 18,
                  image: 'https://token3.com/logo.png',
                  name: 'Token Three',
                  aggregators: ['optimism'],
                  chainId: optimismChainId,
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
              chainId: mockChainId,
            },
            {
              address: token2Address,
              symbol: 'TOKEN2',
              decimals: 18,
              image: 'https://token2.com/logo.png',
              name: 'Token Two',
              aggregators: ['uniswap'],
              chainId: mockChainId,
            },
            {
              address: token3Address,
              symbol: 'TOKEN3',
              decimals: 18,
              image: 'https://token3.com/logo.png',
              name: 'Token Three',
              aggregators: ['optimism'],
              chainId: optimismChainId,
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
            selectedNetworkClientId: {
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
            [mockChainId]: {
              chainId: mockChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'selectedNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              ticker: 'ETH',
              nickname: 'Ethereum Mainnet',
              name: 'Ethereum Mainnet',
            },
            [optimismChainId]: {
              chainId: optimismChainId,
              rpcEndpoints: [
                {
                  networkClientId: 'optimismNetworkClientId',
                },
              ],
              defaultRpcEndpointIndex: 0,
              nativeCurrency: 'ETH',
              ticker: 'ETH',
              nickname: 'Optimism',
              name: 'Optimism',
            },
          },
          providerConfig: {
            chainId: mockChainId,
            ticker: 'ETH',
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
            [optimismChainId]: {
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
              [ethers.constants.AddressZero as Hex]: {
                tokenAddress: ethers.constants.AddressZero as Hex,
                currency: 'ETH',
                price: 1, // 1 ETH = 1 ETH
              },
              [token1Address]: {
                tokenAddress: token1Address,
                currency: 'ETH',
                price: 10, // 1 TOKEN1 = 10 ETH
              },
              [token2Address]: {
                tokenAddress: token2Address,
                currency: 'ETH',
                price: 5, // 1 TOKEN2 = 5 ETH
              },
            },
            [optimismChainId]: {
              [token3Address]: {
                tokenAddress: token3Address,
                currency: 'ETH',
                price: 8, // 1 TOKEN3 = 8 ETH on Optimism
              },
            },
          },
        },
        PreferencesController: {
          tokenSortConfig: {
            key: 'tokenFiatAmount',
            order: 'dsc' as const,
          },
          ipfsGateway: 'https://dweb.link/ipfs/',
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
            [optimismChainId]: {
              timestamp: Date.now(),
              data: {
                [token3Address]: {
                  name: 'Token Three',
                  symbol: 'TOKEN3',
                  decimals: 18,
                  address: token3Address,
                  iconUrl: 'https://token3.com/logo.png',
                  occurrences: 1,
                  aggregators: ['optimism'],
                },
              },
            },
          },
        },
      },
    },
    settings: {
      basicFunctionalityEnabled: true,
    },
    bridge: {
      sourceToken: {
        symbol: 'ETH',
        decimals: 18,
        address: '0x0000000000000000000000000000000000000000',
        image: 'https://example.com/image.png',
        chainId: '0x1' as Hex,
      },
      destToken: undefined,
      sourceAmount: undefined,
      destAmount: undefined,
      destChainId: undefined,
      selectedSourceChainIds: [mockChainId, optimismChainId],
    } as BridgeState,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    const { getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE,
      },
      { state: mockInitialState },
    );
    expect(getByText('Select amount')).toBeDefined();
  });

  it('should open BridgeTokenSelector when clicking source token', async () => {
    const { findByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE,
      },
      { state: initialState },
    );

    // Find and click the token button
    const tokenButton = await findByText('ETH');
    expect(tokenButton).toBeTruthy();
    fireEvent.press(tokenButton);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      params: {},
    });
  });

  it('should open BridgeTokenSelector when clicking destination token area', async () => {
    const { getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE,
      },
      { state: initialState },
    );

    // Find and click the destination token area
    const destTokenArea = getByTestId('dest-token-area');
    expect(destTokenArea).toBeTruthy();

    fireEvent.press(destTokenArea);

    // Verify navigation to BridgeTokenSelector
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      params: {},
    });
  });

  it('should update source token amount when typing', () => {
    const { getByTestId, getByText } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE,
      },
      { state: initialState },
    );

    // Press number buttons to input 1.5
    fireEvent.press(getByText('9'));
    fireEvent.press(getByText('.'));
    fireEvent.press(getByText('5'));

    // Verify the input value is updated
    const input = getByTestId('source-token-area-input');
    expect(input.props.value).toBe('9.5');

    // Verify fiat value is displayed (9.5 ETH * $2000 = $19000)
    expect(getByText('$19000')).toBeTruthy();
  });

  it('should display source token symbol and balance', async () => {
    const stateWithAmount = {
      ...initialState,
      bridge: {
        ...initialState.bridge,
        sourceAmount: '1.5',
      },
    };

    const { getByText, getByTestId } = renderScreen(
      BridgeView,
      {
        name: Routes.BRIDGE,
      },
      { state: stateWithAmount },
    );

    // Verify token symbol is displayed
    expect(getByText('ETH')).toBeTruthy();

    // Verify token amount is displayed
    const input = getByTestId('source-token-area-input');
    expect(input.props.value).toBe('1.5');

    // Verify fiat value is displayed (1.5 ETH * $2000 = $3000)
    expect(getByText('$3000')).toBeTruthy();

    // Verify balance is displayed
    await waitFor(() => {
      expect(getByText('2.0 ETH')).toBeTruthy();
    });
  });

  describe('Bottom Content', () => {
    it('should show "Select amount" when no amount is entered', () => {
      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE,
        },
        { state: initialState },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('should show "Select amount" when amount is zero', () => {
      const stateWithZeroAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '0',
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE,
        },
        { state: stateWithZeroAmount },
      );

      expect(getByText('Select amount')).toBeTruthy();
    });

    it('should show "Insufficient balance" when amount exceeds balance', () => {
      const stateWithHighAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '3.0', // Balance is mocked at 2.0 ETH
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE,
        },
        { state: stateWithHighAmount },
      );

      expect(getByText('Insufficient balance')).toBeTruthy();
    });

    it('should show Continue button and Terms link when amount is valid', () => {
      const stateWithValidAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '1.0', // Less than balance of 2.0 ETH
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE,
        },
        { state: stateWithValidAmount },
      );

      expect(getByText('Continue')).toBeTruthy();
      expect(getByText('Terms & Conditions')).toBeTruthy();
    });

    // TODO: Add expectations once Continue button is implemented
    it('should handle Continue button press', () => {
      const stateWithValidAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '1.0',
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE,
        },
        { state: stateWithValidAmount },
      );

      const continueButton = getByText('Continue');
      fireEvent.press(continueButton);
    });

    it('should handle Terms & Conditions press', () => {
      const stateWithValidAmount = {
        ...initialState,
        bridge: {
          ...initialState.bridge,
          sourceAmount: '1.0',
        },
      };

      const { getByText } = renderScreen(
        BridgeView,
        {
          name: Routes.BRIDGE,
        },
        { state: stateWithValidAmount },
      );

      const termsButton = getByText('Terms & Conditions');
      fireEvent.press(termsButton);

      // TODO: Add expectations once Terms navigation is implemented
    });
  });
});
