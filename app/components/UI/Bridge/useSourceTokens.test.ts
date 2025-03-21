import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { useSourceTokens } from './useSourceTokens';
import { constants } from 'ethers';
import { waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';

// Mock dependencies
jest.mock('../../../util/networks', () => ({
  ...jest.requireActual('../../../util/networks'),
  isPortfolioViewEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock('../Tokens/util', () => ({
  sortAssets: jest.fn().mockImplementation((assets) => assets),
}));

describe('useSourceTokens', () => {
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
                [token2Address]: '0x1bc16d674ec80000' as Hex, // 2 TOKEN2
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
              symbol: 'TOKEN2',
              decimals: 18,
              image: 'https://token2.com/logo.png',
              name: 'Token Two',
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
                price: 5, // 1 TOKEN2 = 5 ETH
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

  it('should include native token with correct properties', async () => {
    const { result } = renderHookWithProvider(() => useSourceTokens(), {
      state: initialState,
    });

    await waitFor(() => {
      const nativeToken = result.current[0];
      expect(nativeToken).toMatchObject({
        address: constants.AddressZero,
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        isNative: true,
        balance: '3',
        balanceFiat: '$6000',
        tokenFiatAmount: 6000,
      });
    });
  });

  it('should show correct balances and fiat values for tokens', async () => {
    const { result } = renderHookWithProvider(() => useSourceTokens(), {
      state: initialState,
    });

    await waitFor(() => {
      const token1 = result.current.find((t) => t.address === token1Address);
      const token2 = result.current.find((t) => t.address === token2Address);

      expect(token1).toMatchObject({
        balance: '1.0',
        balanceFiat: '$20000', // 1 TOKEN1 * 10 ETH/TOKEN1 * $2000/ETH
        tokenFiatAmount: 20000,
      });

      expect(token2).toMatchObject({
        balance: '2.0',
        balanceFiat: '$20000', // 2 TOKEN2 * 5 ETH/TOKEN2 * $2000/ETH
        tokenFiatAmount: 20000,
      });
    });
  });

  it('should include additional tokens from token list with zero balance', async () => {
    const { result } = renderHookWithProvider(() => useSourceTokens(), {
      state: initialState,
    });

    await waitFor(() => {
      const token3 = result.current.find((t) => t.address === token3Address);
      expect(token3).toMatchObject({
        balance: '0',
        balanceFiat: '$0',
        tokenFiatAmount: 0,
        name: 'Token Three',
        symbol: 'TOKEN3',
      });
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
              },
            },
          },
        },
      },
    };

    const { result } = renderHookWithProvider(() => useSourceTokens(), {
      state: stateWithSmallBalance,
    });

    await waitFor(() => {
      const token1 = result.current.find((t) => t.address === token1Address);
      expect(token1?.balanceFiat).toBe('$0');
    });
  });
});
