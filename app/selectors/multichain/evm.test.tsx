import React from 'react';
import { Text } from 'react-native';
import { RootState } from '../../reducers';
import {
  selectedAccountNativeTokenCachedBalanceByChainIdForAddress,
  selectAccountTokensAcrossChainsForAddress,
  selectNativeTokensAcrossChainsForAddress,
} from './evm';
import { selectAllTokens } from '../tokensController';
import { TokenI } from '../../components/UI/Tokens/types';
import { SolScope } from '@metamask/keyring-api';
import { GetByQuery } from '@testing-library/react-native/build/queries/make-queries';
import {
  TextMatch,
  TextMatchOptions,
} from '@testing-library/react-native/build/matches';
import { CommonQueryOptions } from '@testing-library/react-native/build/queries/options';
import { Store } from 'redux';
import { useSelector } from 'react-redux';
import renderWithProvider from '../../util/test/renderWithProvider';
import Engine, { EngineState } from '../../core/Engine';
import { act } from '@testing-library/react-native';
import {
  AccountTrackerController,
  TokensController,
} from '@metamask/assets-controllers';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { zeroAddress } from 'ethereumjs-util';

describe('Multichain Selectors', () => {
  const mockState: RootState = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': {
              chainId: '0x1',
              name: 'Ethereum Mainnet',
              nativeCurrency: 'ETH',
              rpcEndpoints: [{ networkClientId: '0x1' }],
            },
            '0x89': {
              chainId: '0x89',
              name: 'Polygon',
              nativeCurrency: 'POL',
              rpcEndpoints: [{ networkClientId: '0x89' }],
            },
          },
        },
        AccountTrackerController: {
          accountsByChainId: {
            '0x1': {
              '0xAddress1': {
                balance: '0x1',
                stakedBalance: '0x2',
              },
            },
            '0x89': {
              '0xAddress1': {
                balance: '0x3',
                stakedBalance: '0x0',
              },
            },
          },
        },
        TokensController: {
          allTokens: {
            '0x1': {
              '0xAddress1': [
                {
                  address: '0xToken1',
                  symbol: 'TK1',
                  decimals: 18,
                  balance: '1000000000000000000',
                },
              ],
            },
          },
        },
        TokenBalancesController: {
          tokenBalances: {
            '0xAddress1': {
              '0x1': {
                '0xToken1': '0x1',
              },
            },
          },
        },
        TokenRatesController: {
          marketData: {
            '0x1': {
              '0xToken1': { price: 100 },
            },
          },
        },
        CurrencyRateController: {
          currentCurrency: 'USD',
          currencyRates: {
            ETH: {
              conversionRate: 2000,
            },
            POL: {
              conversionRate: 1,
            },
          },
        },
        AccountsController: {
          internalAccounts: {
            selectedAccount: '0xAddress1',
            accounts: {
              '0xAddress1': {
                address: '0xAddress1',
              },
            },
          },
        },
        MultichainNetworkController: {
          multichainNetworkConfigurationsByChainId: {
            [SolScope.Mainnet]: {
              chainId: SolScope.Mainnet,
            },
          },

          isEvmSelected: true,
          selectedMultichainNetworkChainId: SolScope.Mainnet,
        },
        NetworkEnablementController: {
          enabledNetworkMap: {
            eip155: {
              '0x1': true,
              '0x89': true,
            },
          },
        },
        PreferencesController: {
          tokenNetworkFilter: {
            '0x1': true,
            '0x89': true,
          },
        },
      },
    },
    settings: {
      showFiatOnTestnets: true,
    },
  } as unknown as RootState;

  const MOCK_SELECTED_ADDRESS = '0xAddress1';

  describe('selectedAccountNativeTokenCachedBalanceByChainIdForAddress', () => {
    it('returns native token balances for every chain', () => {
      const result = selectedAccountNativeTokenCachedBalanceByChainIdForAddress(
        mockState,
        MOCK_SELECTED_ADDRESS,
      );
      expect(result).toEqual({
        '0x1': {
          balance: '0x1',
          stakedBalance: '0x2',
          isStaked: false,
          name: '',
        },
        '0x89': {
          balance: '0x3',
          stakedBalance: '0x0',
          isStaked: false,
          name: '',
        },
      });
    });

    it('returns an empty object when no address is provided', () => {
      const result = selectedAccountNativeTokenCachedBalanceByChainIdForAddress(
        mockState,
        undefined,
      );
      expect(result).toEqual({});
    });
  });

  describe('selectAccountTokensAcrossChainsForAddress', () => {
    it('returns tokens across all chains for the given account', () => {
      const result = selectAccountTokensAcrossChainsForAddress(
        mockState,
        MOCK_SELECTED_ADDRESS,
      );
      expect(result).toHaveProperty('0x1');

      const chain1Tokens = result['0x1'] || [];
      expect(chain1Tokens.length).toBeGreaterThan(0);

      const ethToken = chain1Tokens.find(
        (token) => token.symbol === 'Ethereum' && !token.isStaked,
      );
      expect(ethToken).toBeDefined();
      expect(ethToken?.isNative).toBe(true);
      expect(ethToken?.isETH).toBe(true);

      const stakedEthToken = chain1Tokens.find(
        (token) => token.symbol === 'Ethereum' && token.isStaked,
      );
      expect(stakedEthToken).toBeDefined();
      expect(stakedEthToken?.isNative).toBe(true);
      expect(stakedEthToken?.isStaked).toBe(true);

      const tk1Token = chain1Tokens.find((token) => token.symbol === 'TK1');
      expect(tk1Token).toBeDefined();
      expect(tk1Token?.isNative).toBe(false);
    });

    it('includes tokens from every configured chain', () => {
      const result = selectAccountTokensAcrossChainsForAddress(
        mockState,
        MOCK_SELECTED_ADDRESS,
      );
      expect(result).toHaveProperty('0x89');
      const polygonTokens = result['0x89'];
      expect(polygonTokens.length).toBeGreaterThan(0);
      expect(polygonTokens.some((token) => token.symbol === 'POL')).toBe(true);
    });
  });

  describe('selectAccountTokensAcrossChainsForAddress memoization', () => {
    const POLYGON_NATIVE_TOKEN_ADDRESS =
      '0x0000000000000000000000000000000000001010';

    // Produces a new root state object with a slice the selector never reads,
    // standing in for the unrelated dispatches that happen constantly at runtime.
    const withUnrelatedSliceChange = (nonce: number) =>
      ({
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            GasFeeController: { gasFeeEstimates: { nonce } },
          },
        },
      }) as unknown as RootState;

    const withExtraMainnetToken = () =>
      ({
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokensController: {
              allTokens: {
                '0x1': {
                  '0xAddress1': [
                    ...mockState.engine.backgroundState.TokensController
                      .allTokens['0x1']['0xAddress1'],
                    {
                      address: '0xToken2',
                      symbol: 'TK2',
                      decimals: 18,
                      balance: '2000000000000000000',
                    },
                  ],
                },
              },
            },
          },
        },
      }) as unknown as RootState;

    const selectTokensForMockAccount = (state: RootState) =>
      selectAccountTokensAcrossChainsForAddress(state, MOCK_SELECTED_ADDRESS);

    beforeEach(() => {
      selectAllTokens.clearCache();
      selectedAccountNativeTokenCachedBalanceByChainIdForAddress.clearCache();
      selectNativeTokensAcrossChainsForAddress.clearCache();
      selectAccountTokensAcrossChainsForAddress.clearCache();
    });

    it('aggregates native, staked and ERC20 tokens per chain', () => {
      const result = selectTokensForMockAccount(mockState);
      const summarize = (tokens: TokenI[]) =>
        tokens.map((token) => ({
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          balance: token.balance,
          balanceFiat: token.balanceFiat,
          isNative: token.isNative,
          isStaked: token.isStaked,
        }));

      expect(Object.keys(result)).toStrictEqual(['0x1', '0x89']);
      expect(summarize(result['0x1'] as TokenI[])).toStrictEqual([
        {
          address: zeroAddress(),
          name: 'Ethereum',
          symbol: 'Ethereum',
          balance: '< 0.00001',
          balanceFiat: '$0',
          isNative: true,
          isStaked: false,
        },
        {
          address: zeroAddress(),
          name: 'Staked Ethereum',
          symbol: 'Ethereum',
          balance: '< 0.00001',
          balanceFiat: '$0',
          isNative: true,
          isStaked: true,
        },
        {
          address: '0xToken1',
          name: undefined,
          symbol: 'TK1',
          balance: '1000000000000000000',
          balanceFiat: '',
          isNative: false,
          isStaked: false,
        },
      ]);
      expect(summarize(result['0x89'] as TokenI[])).toStrictEqual([
        {
          address: POLYGON_NATIVE_TOKEN_ADDRESS,
          name: 'POL',
          symbol: 'POL',
          balance: '< 0.00001',
          balanceFiat: '$0',
          isNative: true,
          isStaked: false,
        },
        {
          address: POLYGON_NATIVE_TOKEN_ADDRESS,
          name: 'Staked Ethereum',
          symbol: 'POL',
          balance: '0',
          balanceFiat: '$0',
          isNative: true,
          isStaked: true,
        },
      ]);
    });

    it('returns the same reference when an unrelated slice changes', () => {
      const first = selectTokensForMockAccount(mockState);
      const second = selectTokensForMockAccount(withUnrelatedSliceChange(1));

      expect(second).toBe(first);
    });

    it('does not re-run the token aggregation when an unrelated slice changes', () => {
      selectTokensForMockAccount(mockState);
      const recomputationsBefore =
        selectAccountTokensAcrossChainsForAddress.recomputations();

      selectTokensForMockAccount(withUnrelatedSliceChange(1));
      selectTokensForMockAccount(withUnrelatedSliceChange(2));

      expect(selectAccountTokensAcrossChainsForAddress.recomputations()).toBe(
        recomputationsBefore,
      );
    });

    it('re-runs the token aggregation when the token slice changes', () => {
      selectTokensForMockAccount(mockState);
      const recomputationsBefore =
        selectAccountTokensAcrossChainsForAddress.recomputations();

      selectTokensForMockAccount(withExtraMainnetToken());

      expect(selectAccountTokensAcrossChainsForAddress.recomputations()).toBe(
        recomputationsBefore + 1,
      );
    });

    it('includes the added token once the token slice changes', () => {
      selectTokensForMockAccount(mockState);

      const after = selectTokensForMockAccount(withExtraMainnetToken());

      expect(after['0x1'].some((token) => token.symbol === 'TK2')).toBe(true);
    });

    it('returns an empty map when no address is provided', () => {
      expect(
        selectAccountTokensAcrossChainsForAddress(mockState, undefined),
      ).toStrictEqual({});
    });
  });
});

const mockAccountId = '0xAddress1';

const mockAllTokens = {
  [CHAIN_IDS.MAINNET]: {
    [mockAccountId]: [
      {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
        name: 'USDC',
      },
      {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        symbol: 'DAI',
        decimals: 18,
        name: 'Dai Stablecoin',
      },
    ],
  },
  [CHAIN_IDS.POLYGON]: {
    [mockAccountId]: [
      {
        address: '0x0D1E753a25eBda689453309112904807625bEFBe',
        symbol: 'CAKE',
        decimals: 18,
        image:
          'https://static.cx.metamask.io/api/v1/tokenIcons/59144/0x0d1e753a25ebda689453309112904807625befbe.png',
        aggregators: ['CoinGecko', 'Lifi', 'Rubic'],
      },
    ],
  },
};

const mockNetworkConfigurationsByChainId = {
  [CHAIN_IDS.MAINNET]: {
    chainId: CHAIN_IDS.MAINNET,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
  },
  [CHAIN_IDS.POLYGON]: {
    chainId: CHAIN_IDS.POLYGON,
    name: 'Polygon',
    nativeCurrency: 'POL',
  },
};

const mockAccountsByChainId = {
  [CHAIN_IDS.MAINNET]: {
    [mockAccountId]: {
      balance: '0x1',
      stakedBalance: '0x2',
    },
  },
  [CHAIN_IDS.POLYGON]: {
    [mockAccountId]: {
      balance: '0x3',
    },
  },
};

const mockInternalAccounts = {
  selectedAccount: mockAccountId,
  accounts: {
    [mockAccountId]: {
      address: mockAccountId,
    },
  },
};

// Mock Engine for render tests
jest.mock('../../core/Engine', () => ({
  context: {},
  state: {
    NetworkController: {
      networkConfigurationsByChainId: mockNetworkConfigurationsByChainId,
    },
    AccountTrackerController: {
      accountsByChainId: mockAccountsByChainId,
    } as Partial<AccountTrackerController['state']>,
    TokensController: {
      allTokens: mockAllTokens,
    } as Partial<TokensController['state']>,
    AccountsController: {
      internalAccounts: mockInternalAccounts,
    } as unknown as Partial<AccountsControllerState>,
  } as unknown as EngineState,
}));

describe('re-renders', () => {
  const mockState: RootState = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: mockNetworkConfigurationsByChainId,
        },
        AccountTrackerController: {
          accountsByChainId: mockAccountsByChainId,
        },
        TokensController: {
          allTokens: mockAllTokens,
        },
        AccountsController: {
          internalAccounts: mockInternalAccounts,
        },
      },
    },
  } as unknown as RootState;
  const mockRenderCall = jest.fn();
  let getByText: GetByQuery<TextMatch, CommonQueryOptions & TextMatchOptions>;
  let store: Store;

  beforeEach(() => {
    mockRenderCall.mockReset();
    // Clear memoized selectors for each test
    selectAccountTokensAcrossChainsForAddress.clearCache();
    const MockComponent = () => {
      const selectedAccountTokensChains = useSelector((state: RootState) =>
        selectAccountTokensAcrossChainsForAddress(state, mockAccountId),
      );
      mockRenderCall();
      return (
        <>
          {selectedAccountTokensChains[CHAIN_IDS.MAINNET]?.map((token) => (
            <Text key={token.address}>{token.name}</Text>
          ))}
        </>
      );
    };
    const { store: testStore, getByText: testGetByText } = renderWithProvider(
      <MockComponent />,
      {
        state: mockState,
      },
    );
    getByText = testGetByText;
    store = testStore;
  });

  it('re-renders token list once when new token is added', async () => {
    expect(mockRenderCall).toHaveBeenCalledTimes(1);
    mockRenderCall.mockReset();

    const newToken = {
      address: '0xNewTokenAddress',
      symbol: 'NEW',
      decimals: 18,
      name: 'New Token',
    };

    Engine.state.TokensController.allTokens = {
      ...mockAllTokens,
      [CHAIN_IDS.MAINNET]: {
        ...mockAllTokens[CHAIN_IDS.MAINNET],
        [mockAccountId]: [
          ...mockAllTokens[CHAIN_IDS.MAINNET][mockAccountId],
          newToken,
        ],
      },
    };

    act(() => {
      store.dispatch({
        type: 'UPDATE_BG_STATE',
        payload: {
          key: 'TokensController',
        },
      });
    });

    expect(mockRenderCall).toHaveBeenCalledTimes(1);
    expect(getByText(newToken.name)).toBeDefined();
  });

  it('returns identical data when state does not change', async () => {
    expect(mockRenderCall).toHaveBeenCalledTimes(1);
    mockRenderCall.mockReset();
    const result1 = selectAccountTokensAcrossChainsForAddress(
      mockState,
      mockAccountId,
    );

    Engine.state.TokensController.allTokens = mockAllTokens;

    act(() => {
      store.dispatch({
        type: 'UPDATE_BG_STATE',
        payload: {
          key: 'TokensController',
        },
      });
    });

    const result2 = selectAccountTokensAcrossChainsForAddress(
      mockState,
      mockAccountId,
    );

    expect(result1 === result2).toBe(true);
    // same data should not trigger re-render
    expect(mockRenderCall).toHaveBeenCalledTimes(0);
  });
});
