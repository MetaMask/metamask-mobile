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
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../accountsController';
import { createDeepEqualSelector } from '../util';
import { Balance, BtcScope, SolScope } from '@metamask/keyring-api';
import { selectConversionRate } from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkSymbol,
} from '../multichainNetworkController';
import { parseCaipAssetType } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  MultichainAssetsControllerState,
  MultichainAssetsRatesControllerState,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

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

const getNonEvmCachedBalance = (
  internalAccount: InternalAccount,
  multichainBalances: MultichainBalancesControllerState['balances'],
  nonEvmChainId: SupportedCaipChainId,
) => {
  // We assume that there's at least one asset type in and that is the native
  // token for that network.
  const asset = MULTICHAIN_NETWORK_TO_ASSET_TYPES[nonEvmChainId]?.[0];
  const balancesForAccount = multichainBalances?.[internalAccount.id];
  const balanceOfAsset = balancesForAccount?.[asset];
  return balanceOfAsset?.amount ?? undefined;
};

const selectNonEvmCachedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectSelectedNonEvmNetworkChainId,
  (selectedInternalAccount, multichainBalances, nonEvmChainId) => {
    if (!selectedInternalAccount) {
      return undefined;
    }
    return getNonEvmCachedBalance(
      selectedInternalAccount,
      multichainBalances,
      nonEvmChainId,
    );
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

/**
 *
 * @param state - Root redux state
 * @returns - MultichainTransactionsController state
 */
const selectMultichainTransactionsControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainTransactionsController;

export const selectMultichainTransactions = createDeepEqualSelector(
  selectMultichainTransactionsControllerState,
  (multichainTransactionsControllerState) =>
    multichainTransactionsControllerState.nonEvmTransactions,
);

export function selectMultichainAssets(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsController.accountsAssets;
}

export function selectMultichainAssetsMetadata(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsController.assetsMetadata;
}

export function selectMultichainAssetsRates(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsRatesController
    .conversionRates;
}

export const selectMultichainTokenListForAccountId = createDeepEqualSelector(
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsMetadata,
  selectMultichainAssetsRates,
  selectSelectedNonEvmNetworkChainId,
  (_: RootState, accountId: string | undefined) => accountId,
  (
    multichainBalances,
    assets,
    assetsMetadata,
    assetsRates,
    nonEvmNetworkChainId,
    accountId,
  ) => {
    if (!accountId) {
      return [];
    }

    const assetIds = assets?.[accountId] || [];
    const balances = multichainBalances?.[accountId];

    const tokens = [];

    for (const assetId of assetIds) {
      const { chainId, assetNamespace } = parseCaipAssetType(assetId);

      if (chainId !== nonEvmNetworkChainId) {
        continue;
      }

      const isNative = assetNamespace === 'slip44';
      const balance = balances?.[assetId] || { amount: undefined, unit: '' };
      const rate = assetsRates?.[assetId]?.rate || '0';
      const balanceInFiat = balance.amount
        ? new BigNumber(balance.amount).times(rate)
        : undefined;

      const assetMetadataFallback = {
        name: balance.unit || '',
        symbol: balance.unit || '',
        fungible: true,
        units: [{ name: assetId, symbol: balance.unit || '', decimals: 0 }],
      };

      const metadata = assetsMetadata[assetId] || assetMetadataFallback;
      const decimals = metadata.units[0]?.decimals || 0;

      tokens.push({
        name: metadata?.name,
        address: assetId,
        symbol: metadata?.symbol,
        image: metadata?.iconUrl,
        logo: metadata?.iconUrl,
        decimals,
        chainId,
        isNative,
        balance: balance.amount,
        secondary: balanceInFiat ? balanceInFiat.toString() : undefined,
        string: '',
        balanceFiat: balanceInFiat ? balanceInFiat.toString() : undefined,
        isStakeable: false,
        aggregators: [],
        isETH: false,
        ticker: metadata.symbol,
      });
    }

    return tokens;
  },
);

export const selectMultichainTokenList = createDeepEqualSelector(
  (state: RootState) => state,
  selectSelectedInternalAccount,
  (state, selectedAccount) => {
    return selectMultichainTokenListForAccountId(state, selectedAccount?.id);
  },
);

export interface MultichainNetworkAggregatedBalance {
  totalNativeTokenBalance: Balance | undefined;
  totalBalanceFiat: number | undefined;
  balances: Record<string, Balance> | undefined;
}

export const getMultichainNetworkAggregatedBalance = (
  account: InternalAccount,
  multichainBalances: MultichainBalancesControllerState['balances'],
  multichainAssets: MultichainAssetsControllerState['accountsAssets'],
  multichainAssetsRates: MultichainAssetsRatesControllerState['conversionRates'],
  nonEvmChainId: SupportedCaipChainId,
): MultichainNetworkAggregatedBalance => {
  const assetIds = multichainAssets?.[account.id] || [];
  const balances = multichainBalances?.[account.id] || {};

  // Find the native asset for this chain
  const nativeAsset = MULTICHAIN_NETWORK_TO_ASSET_TYPES[nonEvmChainId]?.[0];

  // Default values for native token
  let totalNativeTokenBalance: Balance | undefined;
  let totalBalanceFiat: BigNumber | undefined;

  for (const assetId of assetIds) {
    const { chainId } = parseCaipAssetType(assetId);

    if (chainId !== nonEvmChainId) {
      continue;
    }

    const balance = balances[assetId] || { amount: '0', unit: '' };

    // Safely handle undefined rate
    const rate = multichainAssetsRates?.[assetId]?.rate;
    const balanceInFiat =
      balance.amount && rate
        ? new BigNumber(balance.amount).times(rate)
        : new BigNumber(0);

    // Only update native token balance if this is the native asset
    if (assetId === nativeAsset) {
      totalNativeTokenBalance = balance;
    }

    // Always add to total fiat balance
    if (totalBalanceFiat) {
      totalBalanceFiat = totalBalanceFiat.plus(balanceInFiat);
    } else {
      totalBalanceFiat = balanceInFiat;
    }
  }

  return {
    totalNativeTokenBalance,
    totalBalanceFiat: totalBalanceFiat
      ? totalBalanceFiat.toNumber()
      : undefined,
    balances,
  };
};

export const selectSelectedAccountMultichainNetworkAggregatedBalance =
  createDeepEqualSelector(
    selectSelectedInternalAccount,
    selectMultichainBalances,
    selectMultichainAssets,
    selectMultichainAssetsRates,
    selectSelectedNonEvmNetworkChainId,
    (
      selectedAccount,
      multichainBalances,
      assets,
      assetsRates,
      nonEvmNetworkChainId,
    ): MultichainNetworkAggregatedBalance => {
      if (!selectedAccount) {
        return {
          totalNativeTokenBalance: undefined,
          totalBalanceFiat: undefined,
          balances: {},
        };
      }
      return getMultichainNetworkAggregatedBalance(
        selectedAccount,
        multichainBalances,
        assets,
        assetsRates,
        nonEvmNetworkChainId,
      );
    },
  );

interface MultichainNetworkAggregatedBalanceForAllAccounts {
  [accountId: InternalAccount['id']]: MultichainNetworkAggregatedBalance;
}

export const selectMultichainNetworkAggregatedBalanceForAllAccounts =
  createDeepEqualSelector(
    selectInternalAccounts,
    selectMultichainBalances,
    selectMultichainAssets,
    selectMultichainAssetsRates,
    selectSelectedNonEvmNetworkChainId,
    (
      internalAccounts,
      multichainBalances,
      assets,
      assetsRates,
      nonEvmNetworkChainId,
    ): MultichainNetworkAggregatedBalanceForAllAccounts => {
      return internalAccounts.reduce(
        (acc, account) => ({
          ...acc,
          [account.id]: getMultichainNetworkAggregatedBalance(
            account,
            multichainBalances,
            assets,
            assetsRates,
            nonEvmNetworkChainId,
          ),
        }),
        {},
      );
    },
  );

const DEFAULT_TRANSACTION_STATE_ENTRY = {
  transactions: [],
  next: null,
  lastUpdated: 0,
};

export const selectSolanaAccountTransactions = createDeepEqualSelector(
  selectMultichainTransactions,
  selectSelectedInternalAccount,
  (nonEvmTransactions, selectedAccount) => {
    if (!selectedAccount) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    return (
      nonEvmTransactions[selectedAccount.id] ?? DEFAULT_TRANSACTION_STATE_ENTRY
    );
  },
);

///: END:ONLY_INCLUDE_IF
