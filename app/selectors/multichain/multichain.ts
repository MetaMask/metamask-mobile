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
import { Balance } from '@metamask/keyring-api';
import { selectConversionRate } from '../currencyRateController';
import { isMainNet } from '../../util/networks';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkSymbol,
} from '../multichainNetworkController';
import {
  CaipAssetId,
  CaipAssetType,
  parseCaipAssetType,
} from '@metamask/utils';
import BigNumber from 'bignumber.js';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  MultichainAssetsControllerState,
  MultichainAssetsRatesControllerState,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';
import {
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
import { TokenI } from '../../components/UI/Tokens/types';
import { createSelector } from 'reselect';

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
  (multichainIsMainnet, isEvmSelected, shouldShowFiatOnTestnets): boolean => {
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
  const asset =
    AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[nonEvmChainId].nativeCurrency;
  const balancesForAccount = multichainBalances?.[internalAccount.id];
  const balanceOfAsset = balancesForAccount?.[asset];
  return balanceOfAsset?.amount ?? undefined;
};

export const selectNonEvmCachedBalance = createDeepEqualSelector(
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

// TODO: refactor this file to use createDeepEqualSelector
export function selectMultichainAssets(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsController.accountsAssets;
}

export function selectMultichainAssetsMetadata(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsController.assetsMetadata;
}

function selectMultichainAssetsRatesState(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsRatesController
    .conversionRates;
}

export const selectMultichainAssetsRates = createDeepEqualSelector(
  selectMultichainAssetsRatesState,
  (conversionRates) => conversionRates,
  { devModeChecks: { identityFunctionCheck: 'never' } },
);

export function selectMultichainHistoricalPrices(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsRatesController
    .historicalPrices;
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
        name: metadata?.name ?? '',
        address: assetId,
        symbol: metadata?.symbol ?? '',
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
export interface MultichainNetworkAggregatedBalance {
  totalNativeTokenBalance: Balance | undefined;
  totalBalanceFiat: number | undefined;
  tokenBalances: Record<string, Balance> | undefined;
  fiatBalances: Record<CaipAssetType, string> | undefined;
}

export const getMultichainNetworkAggregatedBalance = (
  account: InternalAccount,
  multichainBalances: MultichainBalancesControllerState['balances'],
  multichainAssets: MultichainAssetsControllerState['accountsAssets'],
  multichainAssetsRates: MultichainAssetsRatesControllerState['conversionRates'],
): MultichainNetworkAggregatedBalance => {
  const assetIds = multichainAssets?.[account.id] || [];
  const balances = multichainBalances?.[account.id] || {};

  // Default values for native token
  let totalNativeTokenBalance: Balance | undefined;
  let totalBalanceFiat: BigNumber | undefined;
  const fiatBalances: Record<string, string> = {};

  for (const assetId of assetIds) {
    const { chainId } = parseCaipAssetType(assetId);
    const nativeAssetId =
      AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[
        chainId as SupportedCaipChainId
      ]?.nativeCurrency;

    const balance = balances[assetId] || { amount: '0', unit: '' };

    // Safely handle undefined rate
    const rate = multichainAssetsRates?.[assetId]?.rate;
    const balanceInFiat =
      balance.amount && rate
        ? new BigNumber(balance.amount).times(rate)
        : new BigNumber(0);
    fiatBalances[assetId] = balanceInFiat.toString();

    // If the asset is the native asset of the chain, set it as total native token balance
    // This assumes the account is always on the same chain (excludes testnets)
    if (assetId === nativeAssetId) {
      totalNativeTokenBalance = balance;
    }

    // Always add to total fiat balance
    if (totalBalanceFiat) {
      totalBalanceFiat = totalBalanceFiat.plus(balanceInFiat);
    } else {
      // If the rate is undefined, we don't want to set the total balance fiat to 0
      totalBalanceFiat = rate !== undefined ? balanceInFiat : undefined;
    }
  }

  return {
    totalNativeTokenBalance,
    totalBalanceFiat: totalBalanceFiat
      ? totalBalanceFiat.toNumber()
      : undefined,
    tokenBalances: balances,
    fiatBalances,
  };
};

export const selectSelectedAccountMultichainNetworkAggregatedBalance =
  createDeepEqualSelector(
    selectSelectedInternalAccount,
    selectMultichainBalances,
    selectMultichainAssets,
    selectMultichainAssetsRates,
    (
      selectedAccount,
      multichainBalances,
      assets,
      assetsRates,
    ): MultichainNetworkAggregatedBalance => {
      if (!selectedAccount) {
        return {
          totalNativeTokenBalance: undefined,
          totalBalanceFiat: undefined,
          tokenBalances: {},
          fiatBalances: {},
        };
      }
      return getMultichainNetworkAggregatedBalance(
        selectedAccount,
        multichainBalances,
        assets,
        assetsRates,
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
    (
      internalAccounts,
      multichainBalances,
      assets,
      assetsRates,
    ): MultichainNetworkAggregatedBalanceForAllAccounts => {
      return internalAccounts.reduce(
        (acc, account) => ({
          ...acc,
          [account.id]: getMultichainNetworkAggregatedBalance(
            account,
            multichainBalances,
            assets,
            assetsRates,
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

export const selectNonEvmTransactions = createDeepEqualSelector(
  selectMultichainTransactions,
  selectSelectedInternalAccount,
  selectSelectedNonEvmNetworkChainId,
  (nonEvmTransactions, selectedAccount, selectedNonEvmNetworkChainId) => {
    if (!selectedAccount) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    const accountTransactions = nonEvmTransactions[selectedAccount.id];
    if (!accountTransactions) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    return (
      accountTransactions[selectedNonEvmNetworkChainId] ??
      DEFAULT_TRANSACTION_STATE_ENTRY
    );
  },
);

export const makeSelectNonEvmAssetById = () =>
  createSelector(
    [
      selectIsEvmNetworkSelected,
      selectMultichainBalances,
      selectMultichainAssetsMetadata,
      selectMultichainAssetsRates,
      (_: RootState, params: { accountId?: string; assetId: string }) =>
        params.accountId,
      (_: RootState, params: { accountId?: string; assetId: string }) =>
        params.assetId as CaipAssetId,
    ],
    (
      isEvmNetworkSelected,
      multichainBalances,
      assetsMetadata,
      assetsRates,
      accountId,
      assetId,
    ): TokenI | undefined => {
      if (isEvmNetworkSelected) {
        return undefined;
      }
      if (!accountId) {
        throw new Error('Account ID is required to fetch asset.');
      }

      const balance = multichainBalances?.[accountId]?.[assetId] || {
        amount: undefined,
        unit: '',
      };

      const { chainId, assetNamespace } = parseCaipAssetType(assetId);
      const isNative = assetNamespace === 'slip44';
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

      const metadata = assetsMetadata?.[assetId] || assetMetadataFallback;
      const decimals = metadata.units[0]?.decimals || 0;

      return {
        name: metadata.name ?? '',
        address: assetId,
        symbol: metadata.symbol ?? '',
        image: metadata.iconUrl,
        logo: metadata.iconUrl,
        decimals,
        chainId,
        isNative,
        balance: balance.amount,
        balanceFiat: balanceInFiat ? balanceInFiat.toString() : undefined,
        isStaked: false,
        aggregators: [],
        isETH: false,
        ticker: metadata.symbol,
      };
    },
  );

export const selectAccountsWithNativeBalanceByChainId = createDeepEqualSelector(
  selectInternalAccounts,
  selectMultichainBalances,
  (_: RootState, params: { chainId: string }) => params.chainId,
  (
    internalAccounts,
    multichainBalances,
    chainId,
  ): Record<string, Balance & { assetId: string }> => {
    return internalAccounts.reduce((list, account) => {
      const accountBalances = multichainBalances?.[account.id];

      if (!accountBalances) {
        return list;
      }

      const nativeBalanceAssetId = Object.keys(accountBalances).find(
        (assetId) => {
          const { chainId: assetChainId, assetNamespace } = parseCaipAssetType(
            assetId as CaipAssetId,
          );
          return assetChainId === chainId && assetNamespace === 'slip44';
        },
      );

      if (nativeBalanceAssetId) {
        const accountNativeBalance = accountBalances[nativeBalanceAssetId];

        return {
          ...list,
          [account.id]: {
            assetId: nativeBalanceAssetId,
            ...accountNativeBalance,
          },
        };
      }

      return list;
    }, {});
  },
);

///: END:ONLY_INCLUDE_IF
