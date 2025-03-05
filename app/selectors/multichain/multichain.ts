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
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import {
  selectAccountBalanceByChainId,
  selectAccountsByChainId,
  selectAccounts,
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
 * Non evm network mapping.
 */
export enum MultichainNetworks {
  BITCOIN = 'bip122:000000000019d6689c085ae165831e93',
  BITCOIN_TESTNET = 'bip122:000000000933ea01ad0ee984209779ba',

  SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
  SOLANA_TESTNET = 'solana:4uhcVJyU9pJkvQyS88uRDiswHXSCkY3z',
}

/**
 * @deprecated TEMPORARY SOURCE OF TRUTH TBD
 * Native asset of each non evm network.
 */
export enum MultichainNativeAssets {
  Bitcoin = `${BtcScope.Mainnet}/slip44:0`,
  BitcoinTestnet = `${BtcScope.Testnet}/slip44:0`,
  Solana = `${SolScope.Mainnet}/slip44:501`,
  SolanaDevnet = `${SolScope.Devnet}/slip44:501`,
  SolanaTestnet = `${SolScope.Testnet}/slip44:501`,
}

/**
 * @deprecated TEMPORARY SOURCE OF TRUTH TBD
 * Maps network identifiers to their corresponding native asset types.
 * Each network is mapped to an array containing its native asset for consistency.
 */
export const MULTICHAIN_NETWORK_TO_ASSET_TYPES: Record<
  string,
  MultichainNativeAssets[]
> = {
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
    const asset = MULTICHAIN_NETWORK_TO_ASSET_TYPES[nonEvmChainId]?.[0];
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

interface BalanceData {
  amount: string;
  unit: string;
}

interface MultichainBalances {
  [accountId: string]: {
    [assetId: string]: BalanceData;
  };
}

const getEvmAccountBalance = (
  account: InternalAccount,
  accountsByChainId: Record<string, Record<string, { balance: string }>>,
  _accountInfoByAddress: Record<string, { balance: string }>,
  _conversionRate: number | null | undefined,
  _currentCurrency: string,
): BalanceData => {
  const formattedAddress = getFormattedAddressFromInternalAccount(account);
  const chainId = Object.keys(accountsByChainId)[0];
  const accountBalance = accountsByChainId[chainId]?.[formattedAddress];

  return {
    amount: accountBalance?.balance || '0x0',
    unit: 'ETH', // We'll need to get this from the network config
  };
};

const getNonEvmAccountBalance = (
  account: InternalAccount,
  multichainBalances: MultichainBalances,
): BalanceData => {
  const balancesForAccount = multichainBalances?.[account.id] || {};
  const nonZeroBalance = Object.values(balancesForAccount).find(
    (balance): balance is BalanceData =>
      balance?.amount !== undefined && balance.amount !== '0',
  );
  return nonZeroBalance ?? { amount: '0', unit: '' };
};

export const selectMultichainBalancesForAllAccounts = createDeepEqualSelector(
  selectInternalAccounts,
  selectMultichainBalances,
  selectAccountsByChainId,
  selectAccounts,
  selectConversionRate,
  selectCurrentCurrency,
  (
    accounts: InternalAccount[],
    multichainBalances: MultichainBalances,
    accountsByChainId: Record<string, Record<string, { balance: string }>>,
    accountInfoByAddress: Record<string, { balance: string }>,
    conversionRate: number | null | undefined,
    currentCurrency: string,
  ) => {
    return accounts.reduce<Record<string, BalanceData>>((acc, account) => {
      acc[account.id] = isEvmAccountType(account.type)
        ? getEvmAccountBalance(
            account,
            accountsByChainId,
            accountInfoByAddress,
            conversionRate,
            currentCurrency,
          )
        : getNonEvmAccountBalance(account, multichainBalances);
      return acc;
    }, {});
  },
);
///: END:ONLY_INCLUDE_IF
