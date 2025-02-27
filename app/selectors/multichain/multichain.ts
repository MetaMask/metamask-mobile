///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/* eslint-disable arrow-body-style */
import { MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET } from '../../core/Multichain/constants';
import { RootState } from '../../reducers';
import {
  selectChainId,
  selectEvmChainId,
  selectProviderConfig as selectEvmProviderConfig,
} from '../networkController';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
} from '../accountsController';
import { createDeepEqualSelector } from '../util';
import { BtcScope, isEvmAccountType, SolScope } from '@metamask/keyring-api';
import { selectConversionRate } from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import {
  selectAccountBalanceByChainId,
  selectAccountsByChainId,
} from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkSymbol,
  selectNonEvmNetworkConfigurationsByChainId,
} from '../multichainNetworkController';

import { InternalAccount } from '@metamask/keyring-internal-api';
import { getFormattedAddressFromInternalAccount } from '../../core/Multichain/utils';

/**
 * @deprecated TEMPORARY SOURCE OF TRUTH TBD
 * Native asset of each non evm network.
 */
export enum MultichainNativeAssets {
  Bitcoin = `${BtcScope.Mainnet}/slip44:0`,
  BitcoinTestnet = `${BtcScope.Testnet}/slip44:0`,
  Solana = `${SolScope.Mainnet}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
  SolanaDevnet = `${SolScope.Devnet}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
  SolanaTestnet = `${SolScope.Testnet}/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
}

/**
 * @deprecated TEMPORARY SOURCE OF TRUTH TBD
 * Maps network identifiers to their corresponding native asset types.
 * Each network is mapped to an array containing its native asset for consistency.
 */
export const NETWORK_ASSETS_MAP: Record<string, MultichainNativeAssets[]> = {
  [SolScope.Mainnet]: [MultichainNativeAssets.Solana],
  [SolScope.Testnet]: [MultichainNativeAssets.SolanaTestnet],
  [SolScope.Devnet]: [MultichainNativeAssets.SolanaDevnet],
  [BtcScope.Mainnet]: [MultichainNativeAssets.Bitcoin],
  [BtcScope.Testnet]: [MultichainNativeAssets.BitcoinTestnet],
};
/**
 * Get the state of the `bitcoinSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `bitcoinSupportEnabled` flag.
 */
export function selectIsBitcoinSupportEnabled(state: RootState) {
  return state.multichainSettings.bitcoinSupportEnabled;
}

/**
 * Get the state of the `bitcoinTestnetSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `bitcoinTestnetSupportEnabled` flag.
 */
export function selectIsBitcoinTestnetSupportEnabled(state: RootState) {
  return state.multichainSettings.bitcoinTestnetSupportEnabled;
}

/**
 * Get the state of the `solanaSupportEnabled` flag.
 *
 * @param {*} state
 * @returns The state of the `solanaSupportEnabled` flag.
 */
export function selectIsSolanaSupportEnabled(state: RootState) {
  return state.multichainSettings.solanaSupportEnabled;
}

export const selectMultichainDefaultToken = createDeepEqualSelector(
  selectIsEvmNetworkSelected,
  selectEvmProviderConfig,
  selectSelectedNonEvmNetworkSymbol,
  (isEvmSelected, evmProviderConfig, nonEvmTicker) => {
    const symbol = isEvmSelected ? evmProviderConfig.ticker : nonEvmTicker;
    return { symbol };
  },
);

export const selectMultichainIsMainnet = createDeepEqualSelector(
  selectIsEvmNetworkSelected,
  selectSelectedInternalAccount,
  selectEvmChainId,
  selectChainId,
  (isEvmSelected, selectedAccount, evmChainId, chainId) => {
    if (isEvmSelected) {
      return isMainNet(evmChainId);
    }

    if (!selectedAccount) {
      return false;
    }

    const mainnet = (
      MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
    )[selectedAccount.type];
    return chainId === mainnet;
  },
);

/**
 *
 * @param state - Root redux state
 * @returns - MultichainBalancesController state
 */
const selectMultichainBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainBalancesController;

export const selectMultichainBalances = createDeepEqualSelector(
  selectMultichainBalancesControllerState,
  (multichainBalancesControllerState) =>
    multichainBalancesControllerState.balances,
);

export const selectMultichainShouldShowFiat = createDeepEqualSelector(
  selectMultichainIsMainnet,
  selectIsEvmNetworkSelected,
  selectShowFiatInTestnets,
  (multichainIsMainnet, isEvmSelected, shouldShowFiatOnTestnets) => {
    const isTestnet = !multichainIsMainnet;
    if (isEvmSelected) {
      return isTestnet ? shouldShowFiatOnTestnets : true; // Is it safe to assume that we default show fiat for mainnet?
    }
    return (
      multichainIsMainnet || (isTestnet && Boolean(shouldShowFiatOnTestnets))
    );
  },
);

const selectNonEvmCachedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectSelectedNonEvmNetworkChainId,
  (selectedInternalAccount, multichainBalances, nonEvmChainId) => {
    if (!selectedInternalAccount) {
      return undefined;
    }
    // We assume that there's at least one asset type in and that is the native
    // token for that network.
    const asset = NETWORK_ASSETS_MAP[nonEvmChainId]?.[0];
    const balancesForAccount = multichainBalances?.[selectedInternalAccount.id];
    const balanceOfAsset = balancesForAccount?.[asset];
    return balanceOfAsset?.amount ?? 0;
  },
);

export const selectMultichainSelectedAccountCachedBalance =
  createDeepEqualSelector(
    selectIsEvmNetworkSelected,
    selectAccountBalanceByChainId,
    selectNonEvmCachedBalance,
    (isEvmSelected, accountBalanceByChainId, nonEvmCachedBalance) =>
      isEvmSelected
        ? accountBalanceByChainId?.balance ?? '0x0'
        : nonEvmCachedBalance,
  );

export function selectMultichainCoinRates(state: RootState) {
  return state.engine.backgroundState.RatesController.rates;
}

export const selectMultichainConversionRate = createDeepEqualSelector(
  selectIsEvmNetworkSelected,
  selectConversionRate,
  selectMultichainCoinRates,
  selectSelectedNonEvmNetworkSymbol,
  (isEvmSelected, evmConversionRate, multichaincCoinRates, nonEvmTicker) => {
    if (isEvmSelected) {
      return evmConversionRate;
    }
    // TODO: [SOLANA] - This should be mapping a caip-19 not a ticker
    return nonEvmTicker
      ? multichaincCoinRates?.[nonEvmTicker.toLowerCase()]?.conversionRate
      : undefined;
  },
);

// New selectors for all accounts
export const selectAllAccountsIsEvm = createDeepEqualSelector(
  selectInternalAccounts,
  (accounts) => {
    return accounts.reduce<Record<string, boolean>>((acc, account) => {
      acc[account.id] = isEvmAccountType(account.type);
      return acc;
    }, {});
  },
);

export const selectAllAccountsDefaultTokens = createDeepEqualSelector(
  selectInternalAccounts,
  selectEvmProviderConfig,
  selectNonEvmNetworkConfigurationsByChainId,
  (accounts, evmProviderConfig, nonEvmNetworkConfigs) => {
    return accounts.reduce<Record<string, { symbol: string }>>(
      (acc, account) => {
        if (isEvmAccountType(account.type)) {
          acc[account.id] = { symbol: evmProviderConfig.ticker };
        } else {
          // For non-EVM accounts, find the network configuration that matches the account type
          const mainnetChainId = (
            MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
          )[account.type];

          // Use the ticker from the network configuration if available
          const networkConfig = nonEvmNetworkConfigs[mainnetChainId];
          acc[account.id] = { symbol: networkConfig?.ticker || '' };
        }
        return acc;
      },
      {},
    );
  },
);

export const selectAllAccountsShouldShowFiat = createDeepEqualSelector(
  selectInternalAccounts,
  selectEvmChainId,
  selectShowFiatInTestnets,
  selectNonEvmNetworkConfigurationsByChainId,
  (accounts, evmChainId, shouldShowFiatOnTestnets, nonEvmNetworkConfigs) => {
    return accounts.reduce<Record<string, boolean>>((acc, account) => {
      const isEvm = isEvmAccountType(account.type);
      const mainnet = (
        MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
      )[account.type];

      let isMainnet = false;

      if (isEvm) {
        isMainnet = isMainNet(evmChainId);
      } else {
        // For non-EVM accounts, check if the network is mainnet
        const networkConfig = nonEvmNetworkConfigs[mainnet];
        isMainnet = networkConfig?.chainId === mainnet;
      }

      const isTestnet = !isMainnet;
      acc[account.id] = isEvm
        ? isTestnet
          ? Boolean(shouldShowFiatOnTestnets)
          : true
        : isMainnet || (isTestnet && Boolean(shouldShowFiatOnTestnets));
      return acc;
    }, {});
  },
);

export const selectAllAccountsConversionRates = createDeepEqualSelector(
  selectInternalAccounts,
  selectConversionRate,
  selectMultichainCoinRates,
  selectNonEvmNetworkConfigurationsByChainId,
  (accounts, evmConversionRate, multichaincCoinRates, nonEvmNetworkConfigs) => {
    return accounts.reduce<Record<string, number | undefined>>(
      (acc, account) => {
        if (isEvmAccountType(account.type)) {
          acc[account.id] = evmConversionRate ?? undefined;
        } else {
          // For non-EVM accounts, find the network configuration
          const mainnetChainId = (
            MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET as Record<string, string>
          )[account.type];

          const networkConfig = nonEvmNetworkConfigs[mainnetChainId];
          const ticker = networkConfig?.ticker?.toLowerCase();

          acc[account.id] = ticker
            ? multichaincCoinRates?.[ticker]?.conversionRate
            : undefined;
        }
        return acc;
      },
      {},
    );
  },
);

// Define the missing types
interface BalanceData {
  amount: string;
  // Replace any with more specific properties if known
  [key: string]: string | number | boolean | object | undefined;
}

interface MultichainBalances {
  [accountId: string]: {
    [assetId: string]: BalanceData;
  };
}

export const selectAllAccountsBalances = createDeepEqualSelector(
  selectInternalAccounts,
  selectMultichainBalances,
  selectAccountsByChainId,
  (
    accounts: InternalAccount[],
    multichainBalances: MultichainBalances,
    accountsByChainId: Record<string, Record<string, { balance: string }>>,
  ) => {
    return accounts.reduce<Record<string, string>>(
      (acc: Record<string, string>, account: InternalAccount) => {
        if (isEvmAccountType(account.type)) {
          // For EVM accounts, look through all chain balances
          const formattedAddress =
            getFormattedAddressFromInternalAccount(account);
          // Find the first non-zero balance across all chains
          for (const chainId in accountsByChainId) {
            const chainAccounts = accountsByChainId[chainId];
            const accountBalance = chainAccounts[formattedAddress]?.balance;
            if (accountBalance && accountBalance !== '0x0') {
              acc[account.id] = accountBalance;
              return acc;
            }
          }
          // If no non-zero balance found, use the first chain's balance or 0x0
          const firstChainId = Object.keys(accountsByChainId)[0];
          acc[account.id] = firstChainId
            ? accountsByChainId[firstChainId][formattedAddress]?.balance ??
              '0x0'
            : '0x0';
        } else {
          // For non-EVM accounts, we need to look through all balances
          const balancesForAccount = multichainBalances?.[account.id] || {};
          // Find the first non-zero balance
          const nonZeroBalance = Object.values(balancesForAccount).find(
            (balance): balance is BalanceData =>
              balance?.amount !== undefined && balance.amount !== '0',
          );
          acc[account.id] = nonZeroBalance?.amount ?? '0';
        }
        return acc;
      },
      {},
    );
  },
);
///: END:ONLY_INCLUDE_IF
