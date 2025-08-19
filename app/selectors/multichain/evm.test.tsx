import React from 'react';
import { Text } from 'react-native';
import { RootState } from '../../reducers';
import {
  selectedAccountNativeTokenCachedBalanceByChainId,
  selectAccountTokensAcrossChains,
  selectNativeEvmAsset,
  selectStakedEvmAsset,
  selectEvmTokens,
  selectEvmTokensWithZeroBalanceFilter,
  makeSelectAssetByAddressAndChainId,
} from './evm';
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
import {
  ETH_CHAIN_ID,
  POLYGON_CHAIN_ID,
} from '@metamask/swaps-controller/dist/constants';
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

  describe('selectedAccountNativeTokenCachedBalanceByChainId', () => {
    it('should return native token balances for all chains', () => {
      const result =
        selectedAccountNativeTokenCachedBalanceByChainId(mockState);
      expect(result).toEqual({
        '0x1': {
          balance: '0x1',
          stakedBalance: '0x2',
          isStaked: true,
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

    it('should handle multiple chains correctly', () => {
      const result = selectAccountTokensAcrossChains(mockState);
      expect(result).toHaveProperty('0x89');
      const polygonTokens = result['0x89'];
      expect(polygonTokens.length).toBeGreaterThan(0);
      expect(polygonTokens.some((token) => token.symbol === 'POL')).toBe(true);
    });
  });

  describe('selectNativeEvmAsset', () => {
    const testState: RootState = {
      engine: {
        backgroundState: {
          ...mockState.engine.backgroundState,
          AccountTrackerController: {
            accountsByChainId: {},
          },
          NetworkController: {
            ...mockState.engine.backgroundState.NetworkController,
            selectedNetworkClientId: '0x1',
          },
          AccountsController: {
            internalAccounts: {
              selectedAccount: '',
              accounts: {},
            },
          },
        },
      },
      settings: {
        showFiatOnTestnets: true,
      },
    } as unknown as RootState;
    it('should return undefined if accountBalanceByChainId is not provided', () => {
      const result = selectNativeEvmAsset(testState);
      expect(result).toBeUndefined();
    });

    it('should return the correct native EVM asset structure', () => {
      const result = selectNativeEvmAsset(mockState);

      expect(result).toEqual({
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
        isETH: true,
        balance: '< 0.00001',
        balanceFiat: '$0',
        logo: '../images/eth-logo-new.png',
        address: zeroAddress(),
      });
    });

    it('should return asset name as ticker if not ETH', () => {
      const testStateOverride = {
        ...testState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: '0x89',
            },
          },
        },
      } as unknown as RootState;
      const result = selectNativeEvmAsset(testStateOverride);

      expect(result).toEqual({
        decimals: 18,
        name: 'POL',
        symbol: 'POL',
        isETH: true,
        balance: '< 0.00001',
        balanceFiat: '$0',
        logo: '../images/eth-logo-new.png',
        address: zeroAddress(),
      });
    });
  });

  describe('selectStakedEvmAsset', () => {
    it('should return undefined if accountBalanceByChainId is not provided', () => {
      const testState: RootState = {
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {},
            },
            AccountsController: {
              internalAccounts: {
                selectedAccount: '',
                accounts: {},
              },
            },
          },
        },
        settings: {
          showFiatOnTestnets: true,
        },
      } as unknown as RootState;

      const result = selectStakedEvmAsset(testState);
      expect(result).toBeUndefined();
    });

    it('should return undefined if stakedBalance is missing', () => {
      const testState: RootState = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  balance: '0x1', // 1 ETH
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectStakedEvmAsset(testState);
      expect(result).toBeUndefined();
    });

    it('should return undefined if stakedBalance is zero', () => {
      const testState: RootState = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  balance: '0x1',
                  stakedBalance: '0x2',
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectStakedEvmAsset(testState);
      expect(result).toBeUndefined();
    });

    it('should return undefined if nativeAsset is missing', () => {
      const testState: RootState = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  balance: '0x1',
                  stakedBalance: '0x2',
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectStakedEvmAsset(testState);
      expect(result).toBeUndefined();
    });

    it('should return the correct staked EVM asset structure', () => {
      const result = selectStakedEvmAsset(mockState);

      expect(result).toEqual({
        decimals: 18,
        name: 'Staked Ethereum',
        symbol: 'ETH',
        isETH: true,
        isStaked: true,
        balance: '< 0.00001',
        balanceFiat: '$0',
        logo: '../images/eth-logo-new.png',
        address: zeroAddress(),
      });
    });
  });

  describe('selectEvmTokensWithZeroBalanceFilter', () => {
    it('should return the same memoized reference, when called with the same state', () => {
      const result1 = selectEvmTokensWithZeroBalanceFilter(mockState);
      const result2 = selectEvmTokensWithZeroBalanceFilter(mockState);
      expect(result1 === result2).toBe(true);
    });

    it('should return all tokens when hideZeroBalanceTokens is false', () => {
      const testState = {
        ...mockState,
        settings: { ...mockState.settings, hideZeroBalanceTokens: false },
      } as unknown as RootState;

      const result = selectEvmTokensWithZeroBalanceFilter(testState);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0); // Ensure all tokens are returned
    });

    it('should filter out zero balance tokens when hideZeroBalanceTokens is true', () => {
      const testState = {
        ...mockState,
        settings: { ...mockState.settings, hideZeroBalanceTokens: true },
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  '0xAddress1': {
                    balance: '0x0',
                    stakedBalance: '0x0',
                  },
                },
              },
            },
            TokenBalancesController: {
              tokenBalances: {
                '0xAddress1': {
                  '0x1': {
                    '0xToken1': '0x0', // Simulating zero balance token
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokensWithZeroBalanceFilter(testState);

      expect(result).toBeDefined();
      expect(result.length).toBe(0); // Should remove all tokens with zero balance
    });

    it('should keep native tokens when on current network, even if zero balance', () => {
      const testState = {
        ...mockState,
        settings: { ...mockState.settings, hideZeroBalanceTokens: true },
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  '0xAddress1': {
                    balance: '0x0',
                    stakedBalance: '0x0', // simulating a staked balance
                  },
                },
              },
            },
            TokenBalancesController: {
              tokenBalances: {
                '0xAddress1': {
                  '0x1': {
                    '0xToken1': '0x0',
                  },
                },
              },
            },
            PreferencesController: {
              tokenNetworkFilter: {
                '0x1': true, // user is on "current network" filter, since NetworkController has multiple networks, and we are only filtering to one chain here
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokensWithZeroBalanceFilter(testState);

      expect(result).toBeDefined();
      expect(result.every((token) => token.isNative === true)).toBeTruthy();
      expect(result.every((token) => token.balance === '0')).toBeTruthy();
      expect(result.length).toBe(2); // Native tokens should remain
    });
  });

  describe('selectEvmTokens', () => {
    it('should return the same memoized reference, when called with the same state', () => {
      const result1 = selectEvmTokens(mockState);
      const result2 = selectEvmTokens(mockState);
      expect(result1 === result2).toBe(true);
    });

    it('should return all tokens when hideZeroBalanceTokens is false', () => {
      const result = selectEvmTokens(mockState);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter out zero balance tokens when hideZeroBalanceTokens is true', () => {
      const testState = {
        ...mockState,
        settings: { ...mockState.settings, hideZeroBalanceTokens: true },
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  '0xAddress1': {
                    balance: '0x0',
                    stakedBalance: '0x0',
                  },
                },
              },
            },
            TokenBalancesController: {
              tokenBalances: {
                '0xAddress1': {
                  '0x1': {
                    '0xToken1': '0x0',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokens(testState);
      expect(result).toBeDefined();
      expect(result.length).toBe(0); // All tokens have zero balance, so none should be returned
    });

    it('when on current network, should filter out zero balance tokens except native and staking tokens when hideZeroBalanceTokens is true', () => {
      const testState = {
        ...mockState,
        settings: { ...mockState.settings, hideZeroBalanceTokens: true },
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            AccountTrackerController: {
              accountsByChainId: {
                '0x1': {
                  '0xAddress1': {
                    balance: '0x0',
                    stakedBalance: '0x2', // simulating a staked balance
                  },
                },
              },
            },
            TokenBalancesController: {
              tokenBalances: {
                '0xAddress1': {
                  '0x1': {
                    '0xToken1': '0x0',
                  },
                },
              },
            },
            PreferencesController: {
              tokenNetworkFilter: {
                '0x1': true, // user is on "current network" filter, since NetworkController has multiple networks, and we are only filtering to one chain here
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokens(testState);
      expect(result).toBeDefined();
      expect(result.length).toBe(2); // All tokens have zero balance, so none should be returned, however on current network view, we still want to show native token and staked token, even if zero
    });

    it('should return tokens only for the selected network if not on all networks', () => {
      const testState = {
        ...mockState,
        settings: { ...mockState.settings, hideZeroBalanceTokens: true },
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
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
              selectedNetworkClientId: '0x89',
            },
            PreferencesController: {
              tokenNetworkFilter: {
                '0x89': true, // user only wants to see tokens on Polygon
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokens(testState);
      expect(result).toBeDefined();
      expect(result.every((token) => token.chainId === '0x89')).toBeTruthy();
    });

    it('should return only tokens from popular EVM networks when selected', () => {
      const testState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokensController: {
              allTokens: {
                // chain not in popular networks
                '0x99': {
                  '0xAddress1': [
                    {
                      address: '0xUnpopularToken',
                      symbol: 'TKN9',
                      decimals: 18,
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokens(testState);
      expect(result).toBeDefined();
      expect(result.some((token) => token.chainId === '0x99')).toBeFalsy();
      expect(
        result.every(
          (token) => token.chainId === '0x89' || token.chainId === '0x1',
        ),
      ).toBeTruthy();
    });

    it('should categorize native and non-native tokens correctly', () => {
      const result = selectEvmTokens(mockState);

      const nativeTokens = result.filter((token) => token.isNative);
      const nonNativeTokens = result.filter((token) => !token.isNative);

      expect(nativeTokens.length).toBeGreaterThan(0);
      expect(nonNativeTokens.length).toBeGreaterThan(0);
    });

    it('should filter out testnet tokens if the all networks filter is selected', () => {
      const testState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokensController: {
              allTokens: {
                // sepolia
                '0xaa36a7': {
                  '0xAddress1': [
                    {
                      address: '0xTestnetToken',
                      symbol: 'TEST1',
                      decimals: 18,
                    },
                  ],
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokens(testState);
      expect(result).toBeDefined();
      expect(
        result.find((token) => token.chainId === '0xaa36a7'),
      ).toBeUndefined();
    });

    it('should render native and staked assets in state when no erc20 tokens are present', () => {
      const nativeAndStakedTestState = {
        ...mockState,
        engine: {
          backgroundState: {
            ...mockState.engine.backgroundState,
            TokensController: {
              allTokens: {},
            },
            AccountTrackerController: {
              accountsByChainId: {
                [ETH_CHAIN_ID]: {
                  '0xAddress1': {
                    balance: '0x1',
                    stakedBalance: '0x2',
                  },
                },
              },
            },
          },
        },
      } as unknown as RootState;

      const result = selectEvmTokens(nativeAndStakedTestState);
      expect(result).toBeDefined();
      expect(result.length).toBe(3);

      // Check for Staked Ethereum
      const stakedEth = result.find(
        (token) => token.isStaked && token.chainId === ETH_CHAIN_ID,
      );
      expect(stakedEth).toBeDefined();
      expect(stakedEth?.chainId).toBe(ETH_CHAIN_ID);
      expect(stakedEth?.name).toBe('Staked Ethereum');

      // Check for Native Ethereum
      const nativeEth = result.find(
        (token) => !token.isStaked && token.chainId === ETH_CHAIN_ID,
      );
      expect(nativeEth).toBeDefined();
      expect(nativeEth?.chainId).toBe(ETH_CHAIN_ID);
      expect(nativeEth?.name).toBe('Ethereum');

      // Check for Native Polygon
      const nativePol = result.find(
        (token) => !token.isStaked && token.chainId === POLYGON_CHAIN_ID,
      );
      expect(nativePol).toBeDefined();
      expect(nativePol?.chainId).toBe(POLYGON_CHAIN_ID);
      expect(nativePol?.name).toBe('POL');
    });
  });

  describe('Feature Flag: isRemoveGlobalNetworkSelectorEnabled', () => {
    let flagSpy: jest.SpyInstance;

    // Common test configurations
    const createTestStateWithEnabledNetworks = (
      enabledNetworks: Record<string, boolean>,
    ) =>
      ({
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: enabledNetworks,
              },
            },
            // Ensure only enabled networks have tokens
            TokensController: {
              ...mockState.engine.backgroundState.TokensController,
              allTokens: Object.fromEntries(
                Object.entries(
                  mockState.engine.backgroundState.TokensController.allTokens,
                ).filter(
                  ([chainId]) => enabledNetworks[chainId as `0x${string}`],
                ),
              ),
            },
            // Ensure only enabled networks have account balances
            AccountTrackerController: {
              ...mockState.engine.backgroundState.AccountTrackerController,
              accountsByChainId: Object.fromEntries(
                Object.entries(
                  mockState.engine.backgroundState.AccountTrackerController
                    .accountsByChainId,
                ).filter(
                  ([chainId]) => enabledNetworks[chainId as `0x${string}`],
                ),
              ),
            },
            // Ensure only enabled networks have network configurations
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: Object.fromEntries(
                Object.entries(
                  mockState.engine.backgroundState.NetworkController
                    .networkConfigurationsByChainId,
                ).filter(
                  ([chainId]) => enabledNetworks[chainId as `0x${string}`],
                ),
              ),
            },
          },
        },
      } as unknown as RootState);

    const createTestStateWithSelectedNetwork = (selectedNetworkId: string) =>
      ({
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            NetworkController: {
              ...mockState.engine.backgroundState.NetworkController,
              selectedNetworkClientId: selectedNetworkId,
              networkConfigurationsByChainId: {
                [selectedNetworkId]:
                  mockState.engine.backgroundState.NetworkController
                    .networkConfigurationsByChainId[
                    selectedNetworkId as `0x${string}`
                  ] || {},
              },
            },
            NetworkEnablementController: {
              enabledNetworkMap: {
                eip155: {
                  '0x1': true,
                  '0x89': true,
                },
              },
            },
            // Ensure only selected network has tokens
            TokensController: {
              ...mockState.engine.backgroundState.TokensController,
              allTokens: {
                [selectedNetworkId]:
                  mockState.engine.backgroundState.TokensController.allTokens[
                    selectedNetworkId as `0x${string}`
                  ] || {},
              },
            },
            // Ensure only selected network has account balances
            AccountTrackerController: {
              ...mockState.engine.backgroundState.AccountTrackerController,
              accountsByChainId: {
                [selectedNetworkId]:
                  mockState.engine.backgroundState.AccountTrackerController
                    .accountsByChainId[selectedNetworkId as `0x${string}`] ||
                  {},
              },
            },
          },
        },
      } as unknown as RootState);

    beforeEach(() => {
      jest.resetModules();
    });

    afterEach(() => {
      if (flagSpy) flagSpy.mockRestore();
    });

    describe('when feature flag is enabled', () => {
      beforeEach(() => {
        flagSpy = jest
          .spyOn(
            jest.requireActual('../../util/networks'),
            'isRemoveGlobalNetworkSelectorEnabled',
          )
          .mockReturnValue(true);
      });

      it('should filter tokens by enabled networks', () => {
        const testState = createTestStateWithEnabledNetworks({
          '0x1': true, // Only Ethereum enabled
          '0x89': false, // Polygon disabled
        });

        const result = selectEvmTokens(testState);

        expect(result.every((token) => token.chainId === '0x1')).toBe(true);
      });

      it('should fall back to default behavior when enabledNetworksByNamespace is undefined', () => {
        const testState = {
          ...mockState,
          engine: {
            ...mockState.engine,
            backgroundState: {
              ...mockState.engine.backgroundState,
              NetworkEnablementController: undefined,
            },
          },
        } as unknown as RootState;

        const result = selectEvmTokens(testState);

        // Should return all tokens as fallback behavior (same as when feature flag is disabled)
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((token) => token.chainId === '0x1')).toBe(true);
        expect(result.some((token) => token.chainId === '0x89')).toBe(true);
      });

      it('should fall back to default behavior when NetworkEnablementController is missing', () => {
        const testState = {
          ...mockState,
          engine: {
            ...mockState.engine,
            backgroundState: {
              ...mockState.engine.backgroundState,
              NetworkEnablementController: {},
            },
          },
        } as unknown as RootState;

        const result = selectEvmTokens(testState);

        // Should return all tokens as fallback behavior
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((token) => token.chainId === '0x1')).toBe(true);
        expect(result.some((token) => token.chainId === '0x89')).toBe(true);
      });

      it('should fall back to default behavior when enabledNetworkMap is undefined', () => {
        const testState = {
          ...mockState,
          engine: {
            ...mockState.engine,
            backgroundState: {
              ...mockState.engine.backgroundState,
              NetworkEnablementController: {
                enabledNetworkMap: undefined,
              },
            },
          },
        } as unknown as RootState;

        const result = selectEvmTokens(testState);

        // Should return all tokens as fallback behavior
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((token) => token.chainId === '0x1')).toBe(true);
        expect(result.some((token) => token.chainId === '0x89')).toBe(true);
      });

      it('should fall back to default behavior when EIP-155 entry is missing from enabledNetworkMap', () => {
        const testState = {
          ...mockState,
          engine: {
            ...mockState.engine,
            backgroundState: {
              ...mockState.engine.backgroundState,
              NetworkEnablementController: {
                enabledNetworkMap: {
                  // Missing eip155 key
                  bitcoin: {
                    'bip122:000000000019d6689c085ae165831e93': true,
                  },
                },
              },
            },
          },
        } as unknown as RootState;

        const result = selectEvmTokens(testState);

        // Should return all tokens as fallback behavior
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((token) => token.chainId === '0x1')).toBe(true);
        expect(result.some((token) => token.chainId === '0x89')).toBe(true);
      });

      it('should fall back to default behavior when EIP-155 entry is null', () => {
        const testState = {
          ...mockState,
          engine: {
            ...mockState.engine,
            backgroundState: {
              ...mockState.engine.backgroundState,
              NetworkEnablementController: {
                enabledNetworkMap: {
                  eip155: null,
                },
              },
            },
          },
        } as unknown as RootState;

        const result = selectEvmTokens(testState);

        // Should return all tokens as fallback behavior
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((token) => token.chainId === '0x1')).toBe(true);
        expect(result.some((token) => token.chainId === '0x89')).toBe(true);
      });
    });

    describe('when feature flag is disabled', () => {
      beforeEach(() => {
        flagSpy = jest
          .spyOn(
            jest.requireActual('../../util/networks'),
            'isRemoveGlobalNetworkSelectorEnabled',
          )
          .mockReturnValue(false);
      });

      it('should filter tokens by current network', () => {
        const testState = createTestStateWithSelectedNetwork('0x89');

        const result = selectEvmTokens(testState);

        expect(result.every((token) => token.chainId === '0x89')).toBe(true);
      });
    });
  });

  describe('makeSelectAssetByAddressAndChainId', () => {
    const mockAccountId = '0xAddress1';
    const mockAllTokens = {
      [ETH_CHAIN_ID]: {
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
      [POLYGON_CHAIN_ID]: {
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

    const testState: RootState = {
      ...mockState,
      engine: {
        ...mockState.engine,
        backgroundState: {
          ...mockState.engine.backgroundState,
          MultichainNetworkController: {
            ...mockState.engine.backgroundState.MultichainNetworkController,
            isEvmSelected: true,
          },
          TokensController: {
            allTokens: mockAllTokens,
          },
        },
      },
    } as unknown as RootState;

    it('should return undefined when EVM network is not selected', () => {
      const stateWithNonEvmNetwork = {
        ...testState,
        engine: {
          ...testState.engine,
          backgroundState: {
            ...testState.engine.backgroundState,
            MultichainNetworkController: {
              ...testState.engine.backgroundState.MultichainNetworkController,
              isEvmSelected: false,
            },
          },
        },
      } as unknown as RootState;

      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(stateWithNonEvmNetwork, {
        address: '0x123',
        chainId: '0x1',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent token', () => {
      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(testState, {
        address: '0x999',
        chainId: '0x1',
      });

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent chain', () => {
      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(testState, {
        address: '0x123',
        chainId: '0x999',
      });

      expect(result).toBeUndefined();
    });

    it('should return the correct token for valid address and chainId', () => {
      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(testState, {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chainId: '0x1',
      });

      expect(result).toHaveProperty(
        'address',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      );
      expect(result).toHaveProperty('chainId', '0x1');
      expect(result).toHaveProperty('symbol', 'USDC');
    });

    it('should handle different chain IDs correctly', () => {
      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(testState, {
        address: '0x0D1E753a25eBda689453309112904807625bEFBe',
        chainId: POLYGON_CHAIN_ID,
      });

      expect(result).toHaveProperty(
        'address',
        '0x0D1E753a25eBda689453309112904807625bEFBe',
      );
      expect(result).toHaveProperty('chainId', POLYGON_CHAIN_ID);
      expect(result).toHaveProperty('symbol', 'CAKE');
      expect(result).toHaveProperty('aggregators', [
        'CoinGecko',
        'Lifi',
        'Rubic',
      ]);
    });

    it('should handle non-native tokens correctly', () => {
      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(testState, {
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        chainId: ETH_CHAIN_ID,
      });

      expect(result).toHaveProperty(
        'address',
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      );
      expect(result).toHaveProperty('chainId', ETH_CHAIN_ID);
      expect(result).toHaveProperty('symbol', 'DAI');
      expect(result).toHaveProperty('name', 'Dai Stablecoin');
    });

    it('should handle case-insensitive address matching', () => {
      const selector = makeSelectAssetByAddressAndChainId();
      const result = selector(testState, {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Different case
        chainId: ETH_CHAIN_ID,
      });

      expect(result).toHaveProperty(
        'address',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      );
      expect(result).toHaveProperty('chainId', ETH_CHAIN_ID);
      expect(result).toHaveProperty('symbol', 'USDC');
      expect(result).toHaveProperty('name', 'USDC');
    });
  });
});

const mockAccountId = '0xAddress1';

const mockAllTokens = {
  [ETH_CHAIN_ID]: {
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
  [POLYGON_CHAIN_ID]: {
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
  [ETH_CHAIN_ID]: {
    chainId: ETH_CHAIN_ID,
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
  },
  [POLYGON_CHAIN_ID]: {
    chainId: POLYGON_CHAIN_ID,
    name: 'Polygon',
    nativeCurrency: 'POL',
  },
};

const mockAccountsByChainId = {
  [ETH_CHAIN_ID]: {
    [mockAccountId]: {
      balance: '0x1',
      stakedBalance: '0x2',
    },
  },
  [POLYGON_CHAIN_ID]: {
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
  } as EngineState,
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
    selectAccountTokensAcrossChains.memoizedResultFunc.clearCache();
    const MockComponent = () => {
      const selectedAccountTokensChains = useSelector(
        selectAccountTokensAcrossChains,
      );
      mockRenderCall();
      return (
        <>
          {selectedAccountTokensChains[ETH_CHAIN_ID]?.map((token) => (
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
      [ETH_CHAIN_ID]: {
        ...mockAllTokens[ETH_CHAIN_ID],
        [mockAccountId]: [
          ...mockAllTokens[ETH_CHAIN_ID][mockAccountId],
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

  it('should return exactly same data if state does not change', async () => {
    expect(mockRenderCall).toHaveBeenCalledTimes(1);
    mockRenderCall.mockReset();
    const result1 = selectAccountTokensAcrossChains(mockState);

    Engine.state.TokensController.allTokens = mockAllTokens;

    act(() => {
      store.dispatch({
        type: 'UPDATE_BG_STATE',
        payload: {
          key: 'TokensController',
        },
      });
    });

    const result2 = selectAccountTokensAcrossChains(mockState);

    expect(result1 === result2).toBe(true);
    // same data should not trigger re-render
    expect(mockRenderCall).toHaveBeenCalledTimes(0);
  });
});
