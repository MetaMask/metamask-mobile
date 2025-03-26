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
  selectSolanaAccount,
} from '../accountsController';
import { createDeepEqualSelector } from '../util';
import { BtcScope, SolScope } from '@metamask/keyring-api';
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
    return balanceOfAsset?.amount ?? undefined;
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

export const selectMultichainTokenList = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsMetadata,
  selectMultichainAssetsRates,
  selectSelectedNonEvmNetworkChainId,
  (
    selectedAccountAddress,
    multichainBalances,
    assets,
    assetsMetadata,
    assetsRates,
    nonEvmNetworkChainId,
  ) => {
    if (!selectedAccountAddress) {
      return [];
    }

    const assetIds = assets?.[selectedAccountAddress.id] || [];
    const balances = multichainBalances?.[selectedAccountAddress.id];

    return assetIds
      .filter((assetId) => {
        const { chainId } = parseCaipAssetType(assetId);
        return chainId === nonEvmNetworkChainId;
      })
      .map((assetId) => {
        const { chainId, assetNamespace } = parseCaipAssetType(assetId);
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

        return {
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
        };
      });
  },
);

export const selectMultichainNetworkAggregatedBalance = createDeepEqualSelector(
  selectSelectedInternalAccount,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
  selectSelectedNonEvmNetworkChainId,
  (
    selectedAccountAddress,
    multichainBalances,
    assets,
    assetsRates,
    nonEvmNetworkChainId,
  ) => {
    if (!selectedAccountAddress) {
      return { totalBalance: '0', totalBalanceFiat: '0' };
    }

    const assetIds = assets?.[selectedAccountAddress.id] || [];
    const balances = multichainBalances?.[selectedAccountAddress.id];

    return assetIds
      .filter((assetId) => {
        const { chainId } = parseCaipAssetType(assetId);
        return chainId === nonEvmNetworkChainId;
      })
      .reduce(
        (acc, assetId) => {
          const balance = balances?.[assetId] || { amount: '0', unit: '' };
          const rate = assetsRates?.[assetId]?.rate || '0';
          const balanceInFiat = new BigNumber(balance.amount).times(rate);

          acc.totalBalance = new BigNumber(acc.totalBalance)
            .plus(balance.amount)
            .toString();
          acc.totalBalanceFiat = new BigNumber(acc.totalBalanceFiat)
            .plus(balanceInFiat)
            .toString();

          return acc;
        },
        { totalBalance: '0', totalBalanceFiat: '0' },
      );
  },
);

export const selectSolanaAccountTransactions = createDeepEqualSelector(
  selectMultichainTransactions,
  selectSolanaAccount,
  (nonEvmTransactions, selectedAccount) => {
    if (!selectedAccount) {
      return [];
    }

    return nonEvmTransactions[selectedAccount.id] || [];
  },
);

///: END:ONLY_INCLUDE_IF
