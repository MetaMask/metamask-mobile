import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '.';
import { constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { BridgeFeatureFlagsKey } from '@metamask/bridge-controller';

// Mock dependencies
jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  isPortfolioViewEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../Tokens/util', () => ({
  ...jest.requireActual('../../../Tokens/util'),
  sortAssets: jest.fn().mockImplementation((assets) => assets),
}));

describe('useTokensWithBalance', () => {
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
                '0x1': { isActiveSrc: true, isActiveDest: true },
                '0xa': { isActiveSrc: true, isActiveDest: true },
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
            optimism: {
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
    bridge: {
      sourceAmount: undefined,
      destAmount: undefined,
      destChainId: undefined,
      sourceToken: undefined,
      destToken: undefined,
      selectedSourceChainIds: [mockChainId, optimismChainId],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include native token with correct properties', async () => {
    const { result } = renderHookWithProvider(() => useTokensWithBalance({
      chainIds: [mockChainId, optimismChainId],
    }), {
      state: initialState,
    });

    await waitFor(() => {
      const nativeToken = result.current.find(token => token.isNative && token.chainId === mockChainId);
      expect(nativeToken).toMatchObject({
        address: constants.AddressZero,
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        balance: '3',
        balanceFiat: '$6000',
        tokenFiatAmount: 6000,
      });
    });
  });

  it('should show correct balances and fiat values for tokens', async () => {
    const { result } = renderHookWithProvider(() => useTokensWithBalance({
      chainIds: [mockChainId, optimismChainId],
    }), {
      state: initialState,
    });

    await waitFor(() => {
      // Ethereum chain tokens
      const token1 = result.current.find((t) => t.address === token1Address && t.chainId === mockChainId);
      const token2 = result.current.find((t) => t.address === token2Address && t.chainId === mockChainId);

      expect(token1).toMatchObject({
        balance: '1',
        balanceFiat: '$20000', // 1 TOKEN1 * 10 ETH/TOKEN1 * $2000/ETH
        tokenFiatAmount: 20000,
      });

      expect(token2).toMatchObject({
        balance: '2',
        balanceFiat: '$20000', // 2 TOKEN2 * 5 ETH/TOKEN2 * $2000/ETH
        tokenFiatAmount: 20000,
      });

      // Optimism chain tokens
      const optimismNative = result.current.find(token => token.isNative && token.chainId === optimismChainId);
      expect(optimismNative).toMatchObject({
        address: constants.AddressZero,
        symbol: 'ETH',
        chainId: optimismChainId,
        balance: '20',
        balanceFiat: '$40000', // 20 ETH * $2000/ETH
        tokenFiatAmount: 40000,
      });

      const token3 = result.current.find((t) => t.address === token3Address);
      expect(token3).toMatchObject({
        address: token3Address,
        symbol: 'TOKEN3',
        name: 'Token Three',
        chainId: optimismChainId,
        balance: '3',
        balanceFiat: '$48000', // 3 TOKEN3 * 8 ETH/TOKEN3 * $2000/ETH
        tokenFiatAmount: 48000,
      });
    });
  });

  it('should only show tokens for selected chains', async () => {
    const { result } = renderHookWithProvider(() => useTokensWithBalance({
      chainIds: [mockChainId],
    }), {
      state: initialState,
    });

    await waitFor(() => {
      // Ethereum tokens should be present
      const ethereumNative = result.current.find(token => token.isNative && token.chainId === mockChainId);
      const token1 = result.current.find(t => t.address === token1Address);
      const token2 = result.current.find(t => t.address === token2Address);

      expect(ethereumNative).toBeTruthy();
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();

      // Optimism tokens should not be present
      const optimismNative = result.current.find(token => token.isNative && token.chainId === optimismChainId);
      const token3 = result.current.find(t => t.address === token3Address);

      expect(optimismNative).toBeUndefined();
      expect(token3).toBeUndefined();

      // Verify the total number of tokens is correct (should only have Ethereum tokens)
      expect(result.current.length).toBe(3); // ETH native + TOKEN1 + TOKEN2
    });
  });

  it('should format small fiat values correctly', async () => {
    const stateWithSmallBalance = {
      ...initialState,
      engine: {
        ...initialState.engine,
        backgroundState: {
          ...initialState.engine.backgroundState,
          TokenBalancesController: {
            tokenBalances: {
              [mockAddress]: {
                [mockChainId]: {
                  [token1Address]: '0x1' as Hex, // Very small amount
                },
                [optimismChainId]: {
                  [token3Address]: '0x1' as Hex, // Very small amount on Optimism
                },
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useTokensWithBalance({
      chainIds: [mockChainId, optimismChainId],
    }), {
      state: stateWithSmallBalance,
    });

    await waitFor(() => {
      const token1 = result.current.find((t) => t.address === token1Address);
      expect(token1?.balanceFiat).toBe('$0');

      const token3 = result.current.find((t) => t.address === token3Address);
      expect(token3?.balanceFiat).toBe('$0');
    });
  });
});
