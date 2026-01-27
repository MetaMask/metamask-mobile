///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/* eslint-disable arrow-body-style */
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
import {
  Balance,
  SolScope,
  Transaction as NonEvmTransaction,
  TrxScope,
} from '@metamask/keyring-api';
import { isMainNet } from '../../util/networks';
import { selectAccountBalanceByChainId } from '../accountTrackerController';
import { selectShowFiatInTestnets } from '../settings';
import { selectIsSolanaTestnetEnabled } from '../featureFlagController/solanaTestnet';
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
import { selectSelectedAccountGroupInternalAccounts } from '../multichainAccounts/accountTreeController';
import { selectAccountTokensAcrossChains } from '../multichain';
import {
  MULTICHAIN_ACCOUNT_TYPE_TO_MAINNET,
  TRON_RESOURCE_SYMBOLS_SET,
  TronResourceSymbol,
} from '../../core/Multichain/constants';

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

// TODO Unified Assets Controller State Access (1)
// MultichainBalancesController: balances
// References
// app/selectors/multichain/multichain.ts (1)
/**
 *
 * @param state - Root redux state
 * @returns - MultichainBalancesController state
 */
const selectMultichainBalancesControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainBalancesController;

// TODO Unified Assets Controller State Access (1)
// MultichainBalancesController: balances
// References
// app/selectors/multichain/multichain.ts (5)
// app/selectors/assets/balances.ts (1)
// app/components/UI/Ramp/Aggregator/hooks/useBalance.ts (1)
// app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.ts (1)
// app/component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage.tsx (1)
// app/components/UI/Ramp/Deposit/hooks/useChainIdsWithBalance.ts (1)
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

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances
// References
// app/selectors/multichain/multichain.ts (1)
// Note: selectNonEvmCachedBalance is used internally in this file
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
        ? (accountBalanceByChainId?.balance ?? '0x0')
        : nonEvmCachedBalance,
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

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsController: accountsAssets, assetsMetadata, allIgnoredAssets
// References
// app/selectors/multichain/multichain.ts (3)
const selectMultichainAssetsControllerState = (state: RootState) =>
  state.engine.backgroundState.MultichainAssetsController;

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsController: accountsAssets
// References
// app/selectors/multichain/multichain.ts (4)
// app/selectors/assets/balances.ts (1)
// app/components/UI/SearchTokenAutocomplete/index.tsx (1)
// app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.ts (1)
// app/component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage.tsx (1)
export const selectMultichainAssets = createDeepEqualSelector(
  selectMultichainAssetsControllerState,
  (multichainAssetsControllerState) =>
    multichainAssetsControllerState.accountsAssets,
);

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsController: assetsMetadata
// References
// app/selectors/multichain/multichain.ts (2)
// app/selectors/assets/balances.ts (1)
export const selectMultichainAssetsMetadata = createDeepEqualSelector(
  selectMultichainAssetsControllerState,
  (multichainAssetsControllerState) =>
    multichainAssetsControllerState.assetsMetadata,
);

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsController: allIgnoredAssets
// References
// app/selectors/assets/balances.ts (1)
export const selectMultichainAssetsAllIgnoredAssets = createDeepEqualSelector(
  selectMultichainAssetsControllerState,
  (multichainAssetsControllerState) =>
    multichainAssetsControllerState.allIgnoredAssets ?? {},
);

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsRatesController: conversionRates
// References
// app/selectors/multichain/multichain.ts (1)
function selectMultichainAssetsRatesState(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsRatesController
    .conversionRates;
}

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsRatesController: conversionRates
// References
// app/selectors/multichain/multichain.ts (4)
// app/selectors/assets/balances.ts (1)
// app/components/UI/Tokens/hooks/useTokenPricePercentageChange.ts (1)
// app/components/UI/Bridge/utils/exchange-rates.ts (1)
// app/components/UI/Bridge/hooks/useUnifiedSwapBridgeContext/index.ts (1)
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/UI/Earn/hooks/useMultichainInputHandlers.ts (1)
// app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.ts (1)
// app/components/UI/Bridge/components/TokenInputArea/index.tsx (1)
// app/components/UI/AssetOverview/TokenDetails/TokenDetails.tsx (1)
// app/components/UI/AssetOverview/Balance/Balance.tsx (1)
// app/component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage.tsx (1)
export const selectMultichainAssetsRates = createDeepEqualSelector(
  selectMultichainAssetsRatesState,
  (conversionRates) => conversionRates,
  { devModeChecks: { identityFunctionCheck: 'never' } },
);

// TODO Unified Assets Controller State Access (1)
// MultichainAssetsRatesController: historicalPrices
// References
// app/components/hooks/useTokenHistoricalPrices.ts (1)
export function selectMultichainHistoricalPrices(state: RootState) {
  return state.engine.backgroundState.MultichainAssetsRatesController
    .historicalPrices;
}

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances, selectMultichainAssets, selectMultichainAssetsMetadata, selectMultichainAssetsRates
// References
// app/components/Snaps/SnapUIAssetSelector/useSnapAssetDisplay.tsx (1)
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

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances, selectMultichainAssets, selectMultichainAssetsMetadata, selectMultichainAssetsRates
// References
// app/selectors/multichain/multichain.ts (1)
// app/components/UI/Bridge/hooks/useNonEvmTokensWithBalance/useNonEvmTokensWithBalance.ts (1)
export const selectMultichainTokenListForAccountsAnyChain =
  createDeepEqualSelector(
    selectMultichainBalances,
    selectMultichainAssets,
    selectMultichainAssetsMetadata,
    selectMultichainAssetsRates,
    (_: RootState, accounts: InternalAccount[] | undefined) => accounts,
    (multichainBalances, assets, assetsMetadata, assetsRates, accounts) => {
      if (!accounts || accounts.length === 0) {
        return [];
      }

      const tokens = [];

      for (const account of accounts) {
        const accountId = account.id;

        const assetIds = assets?.[accountId] || [];
        const balances = multichainBalances?.[accountId];

        for (const assetId of assetIds) {
          const { chainId, assetNamespace } = parseCaipAssetType(assetId);

          // Remove the chain filter - include tokens from all chains
          const isNative = assetNamespace === 'slip44';
          const balance = balances?.[assetId] || {
            amount: undefined,
            unit: '',
          };
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
            accountType: account.type,
          });
        }
      }
      return tokens;
    },
  );

/**
 * Unified selector: EVM tokens (native + ERC20) for the selected EVM address
 * plus non-EVM tokens (e.g., TRX) across all accounts in the selected account group.
 * Returns a map keyed by chainId (hex for EVM, CAIP-2 for non-EVM) to TokenI[].
 */
export const selectAccountTokensAcrossChainsUnified = createDeepEqualSelector(
  selectAccountTokensAcrossChains,
  selectSelectedAccountGroupInternalAccounts,
  (state: RootState) => state,
  (evmTokensByChain, selectedGroupAccounts, state) => {
    const merged: Record<string, TokenI[]> = {
      ...((evmTokensByChain as unknown as Record<string, TokenI[]>) || {}),
    };
    if (!selectedGroupAccounts || selectedGroupAccounts.length === 0) {
      return merged;
    }

    const seenNonEvm = new Set<string>();
    for (const account of selectedGroupAccounts) {
      const nonEvmTokensForAccount =
        selectMultichainTokenListForAccountsAnyChain(state, [account]) || [];

      for (const token of nonEvmTokensForAccount) {
        if (
          String(token.chainId).includes('tron:') &&
          TRON_RESOURCE_SYMBOLS_SET.has(
            (token.symbol || '').toLowerCase() as TronResourceSymbol,
          )
        ) {
          continue;
        }
        // We just need tron mainnet, at least for now
        if (
          String(token.chainId).startsWith('tron:') &&
          token.chainId !== TrxScope.Mainnet
        ) {
          continue;
        }

        const uniqueKey = `${token.chainId}:${token.address}`.toLowerCase();
        if (seenNonEvm.has(uniqueKey)) {
          continue;
        }
        seenNonEvm.add(uniqueKey);

        const key = token.chainId as string;
        if (!merged[key]) {
          merged[key] = [];
        }

        // This is the shape we want to return for the Earn list
        merged[key].push({
          address: token.address,
          aggregators: token.aggregators || [],
          decimals: token.decimals,
          image: token.image as string,
          name: token.name,
          symbol: token.symbol,
          balance: token.balance ?? '0',
          balanceFiat: token.balanceFiat,
          logo: token.logo as string | undefined,
          isETH: false,
          isStaked: false,
          nativeAsset: undefined,
          chainId: token.chainId as string,
          isNative: Boolean(token.isNative),
          ticker: token.ticker || token.symbol,
          accountType: account.type,
        });
      }
    }

    return merged;
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

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances, selectMultichainAssets, selectMultichainAssetsRates
// References
// None found
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

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances, selectMultichainAssets, selectMultichainAssetsRates
// References
// None found
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

interface NonEvmTransactionStateEntry {
  transactions: NonEvmTransaction[];
  next: null;
  lastUpdated: number | undefined;
}

/**
 * @deprecated
 * This selector is deprecated and broken. It should not be used in new code.
 */
export const selectNonEvmTransactions = createDeepEqualSelector(
  selectMultichainTransactions,
  selectSelectedInternalAccount,
  selectSelectedNonEvmNetworkChainId,
  selectIsSolanaTestnetEnabled,
  (
    nonEvmTransactions,
    selectedAccount,
    selectedNonEvmNetworkChainId,
    isSolanaTestnetEnabled,
  ) => {
    if (!selectedAccount) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    const accountTransactions = nonEvmTransactions[selectedAccount.id];
    if (!accountTransactions) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    // If trying to access devnet transactions but feature flag is disabled, return the default transaction state entry
    if (
      selectedNonEvmNetworkChainId === SolScope.Devnet &&
      !isSolanaTestnetEnabled
    ) {
      return DEFAULT_TRANSACTION_STATE_ENTRY;
    }

    // For all other cases, return transactions for the selected chain
    return (
      accountTransactions[selectedNonEvmNetworkChainId] ??
      DEFAULT_TRANSACTION_STATE_ENTRY
    );
  },
);

/**
 * Returns non-EVM transactions for all internal accounts in the selected account group.
 * Flattens transactions across all supported non-EVM chains within the group.
 */
export const selectNonEvmTransactionsForSelectedAccountGroup =
  createDeepEqualSelector(
    selectMultichainTransactions,
    selectSelectedAccountGroupInternalAccounts,
    (nonEvmTransactions, selectedGroupAccounts) => {
      if (!selectedGroupAccounts || selectedGroupAccounts.length === 0) {
        return DEFAULT_TRANSACTION_STATE_ENTRY;
      }

      const aggregated = {
        transactions: [],
        next: null,
        lastUpdated: 0,
      } as NonEvmTransactionStateEntry;

      for (const account of selectedGroupAccounts) {
        const accountTx = nonEvmTransactions?.[
          account.id as keyof typeof nonEvmTransactions
        ] as
          | NonEvmTransactionStateEntry
          | Record<string, NonEvmTransactionStateEntry>
          | undefined;
        if (!accountTx) {
          continue;
        }

        // Support both single-level and chain-scoped structures
        const isSingleLevel = (
          tx:
            | NonEvmTransactionStateEntry
            | Record<string, NonEvmTransactionStateEntry>,
        ): tx is NonEvmTransactionStateEntry =>
          Array.isArray((tx as NonEvmTransactionStateEntry).transactions);

        const entries = isSingleLevel(accountTx)
          ? [accountTx]
          : Object.values(
              accountTx as Record<string, NonEvmTransactionStateEntry>,
            );

        for (const entry of entries) {
          const txs = entry?.transactions ?? [];
          aggregated.transactions.push(...txs);

          const lu = entry?.lastUpdated;
          if (typeof lu === 'number') {
            aggregated.lastUpdated =
              aggregated.lastUpdated !== undefined
                ? Math.max(aggregated.lastUpdated, lu)
                : lu;
          }
        }
      }

      // Sort by timestamp (non-EVM tx use seconds)
      aggregated.transactions.sort(
        (a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0),
      );

      return aggregated;
    },
  );

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances, selectMultichainAssetsMetadata, selectMultichainAssetsRates
// References
// None found
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

// TODO Unified Assets Controller State Access (2)
// Uses: selectMultichainBalances
// References
// app/core/DeeplinkManager/handlers/legacy/handleCreateAccountUrl.ts (1)
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
