import { RootState } from '../reducers';
import {
  getNativeTokenInfo,
  selectedAccountNativeTokenCachedBalanceByChainId,
  selectAccountTokensAcrossChains,
  selectIsBitcoinSupportEnabled,
  selectIsBitcoinTestnetSupportEnabled,
} from './multichain';

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
            },
            '0x89': {
              chainId: '0x89',
              name: 'Polygon',
              nativeCurrency: 'MATIC',
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
          conversionRates: {
            ETH: 2000,
            MATIC: 1,
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
      },
    },
    multichainSettings: {
      bitcoinSupportEnabled: true,
      bitcoinTestnetSupportEnabled: false,
    },
  } as unknown as RootState;

  describe('getNativeTokenInfo', () => {
    it('should return native token info for a given chain', () => {
      const networkConfigurations =
        mockState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId;
      const result = getNativeTokenInfo(networkConfigurations, '0x1');
      expect(result).toEqual({
        symbol: 'ETH',
        decimals: 18,
        name: 'Ethereum Mainnet',
      });
    });

    it('should return default values when network config is not found', () => {
      const networkConfigurations =
        mockState.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId;
      const result = getNativeTokenInfo(networkConfigurations, '0x999');
      expect(result).toBeUndefined();
    });
  });

  describe('selectedAccountNativeTokenCachedBalanceByChainId', () => {
    it('should return native token balances for all chains', () => {
      const result =
        selectedAccountNativeTokenCachedBalanceByChainId(mockState);
      expect(result).toEqual({
        '0x1': {
          balance: '0x1',
          stakedBalance: '0x2',
          isStaked: true,
          name: 'Staked Ethereum',
        },
        '0x89': {
          balance: '0x3',
          stakedBalance: '0x0',
          isStaked: false,
          name: 'Staked Ethereum',
        },
      });
    });

    it('should return empty object when no account is selected', () => {
      const stateWithoutAccount = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountsController: {
              internalAccounts: {
                selectedAccount: undefined,
                accounts: {},
              },
            },
          },
        },
      } as unknown as RootState;

      const result =
        selectedAccountNativeTokenCachedBalanceByChainId(stateWithoutAccount);
      expect(result).toEqual({});
    });
  });

  describe('selectAccountTokensAcrossChains', () => {
    it('should return tokens across all chains for selected account', () => {
      const result = selectAccountTokensAcrossChains(mockState);
      expect(result).toHaveProperty('0x1');
      expect(result['0x1']).toHaveLength(3);

      const ethToken = result['0x1'].find(
        (token) => token.symbol === 'ETH' && !token.isStaked,
      );
      expect(ethToken).toBeDefined();
      expect(ethToken?.isNative).toBe(true);
      expect(ethToken?.isETH).toBe(true);

      const stakedEthToken = result['0x1'].find(
        (token) => token.symbol === 'ETH' && token.isStaked,
      );
      expect(stakedEthToken).toBeDefined();
      expect(stakedEthToken?.isNative).toBe(true);
      expect(stakedEthToken?.isStaked).toBe(true);

      const tk1Token = result['0x1'].find((token) => token.symbol === 'TK1');
      expect(tk1Token).toBeDefined();
      expect(tk1Token?.isNative).toBe(false);
    });

    it('should handle staked tokens correctly', () => {
      const result = selectAccountTokensAcrossChains(mockState);
      const stakedToken = result['0x1'].find((token) => token.isStaked);
      expect(stakedToken).toBeDefined();
      expect(stakedToken?.balance).toBeTruthy();
      expect(stakedToken?.name).toBe('Staked Ethereum');
      expect(stakedToken?.symbol).toBe('ETH');
      expect(stakedToken?.isNative).toBe(true);
    });

    it('should handle multiple chains correctly', () => {
      const result = selectAccountTokensAcrossChains(mockState);
      expect(result).toHaveProperty('0x89');
      const polygonTokens = result['0x89'];
      expect(polygonTokens.length).toBeGreaterThan(0);
      expect(polygonTokens.some((token) => token.symbol === 'MATIC')).toBe(
        true,
      );
    });
  });

  describe('Bitcoin Support Flags', () => {
    it('should return bitcoin support enabled state', () => {
      expect(selectIsBitcoinSupportEnabled(mockState)).toBe(true);
    });

    it('should return bitcoin testnet support enabled state', () => {
      expect(selectIsBitcoinTestnetSupportEnabled(mockState)).toBe(false);
    });
  });
});
