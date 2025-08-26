import { createSelector } from 'reselect';
import { selectTokenSortConfig } from './preferencesController';
import { selectIsEvmNetworkSelected } from './multichainNetworkController';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectSelectedInternalAccount } from './accountsController';
///: END:ONLY_INCLUDE_IF

import {
  selectEvmTokens,
  selectEvmTokenFiatBalances,
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  selectMultichainTokenListForAccountId,
  ///: END:ONLY_INCLUDE_IF
} from './multichain';
import { RootState } from '../reducers';
import { TokenI } from '../components/UI/Tokens/types';
import { sortAssets } from '../components/UI/Tokens/util';
import { TraceName, endTrace, trace } from '../util/trace';
import { getTraceTags } from '../util/sentry/tags';
import { store } from '../store';
import { createDeepEqualSelector } from './util';
import {
  Asset,
  selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup,
} from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { selectEnabledNetworksByNamespace } from './networkEnablementController';
import { formatWithThreshold } from '../util/assets';
import I18n from '../../locales/i18n';

const _selectSortedTokenKeys = createSelector(
  [
    selectEvmTokens,
    selectEvmTokenFiatBalances,
    selectIsEvmNetworkSelected,
    selectTokenSortConfig,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    (state: RootState) => {
      const selectedAccount = selectSelectedInternalAccount(state);
      return selectMultichainTokenListForAccountId(state, selectedAccount?.id);
    },
    ///: END:ONLY_INCLUDE_IF
  ],
  (
    evmTokens,
    tokenFiatBalances,
    isEvmSelected,
    tokenSortConfig,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmTokens,
    ///: END:ONLY_INCLUDE_IF
  ) => {
    trace({
      name: TraceName.Tokens,
      tags: getTraceTags(store.getState()),
    });

    const tokenListData = isEvmSelected ? evmTokens : nonEvmTokens;

    const tokensWithBalances: TokenI[] = tokenListData.map((token, i) => ({
      ...token,
      tokenFiatAmount: isEvmSelected ? tokenFiatBalances[i] : token.balanceFiat,
    }));

    const tokensSorted = sortAssets(tokensWithBalances, tokenSortConfig);

    endTrace({ name: TraceName.Tokens });

    return tokensSorted.map(({ address, chainId, isStaked }) => ({
      address,
      chainId,
      isStaked,
    }));
  },
);

// Deep equal selector is necessary, because prices can change little bit but order of tokens stays the same.
// So if the previous keys are still valid (deep eq the current list), then we can use the memoized result
export const selectSortedTokenKeys = createDeepEqualSelector(
  _selectSortedTokenKeys,
  (keys) => keys.filter(({ address, chainId }) => address && chainId),
);

export const selectAssetsBySelectedAccountGroup = createDeepEqualSelector(
  (state: RootState) => {
    const {
      AccountTreeController,
      AccountsController,
      TokensController,
      TokenBalancesController,
      TokenRatesController,
      MultichainAssetsController,
      MultichainBalancesController,
      MultichainAssetsRatesController,
      CurrencyRateController,
      NetworkController,
      AccountTrackerController,
    } = state.engine.backgroundState;

    return {
      ...AccountTreeController,
      ...AccountsController,
      ...TokensController,
      ...TokenBalancesController,
      ...TokenRatesController,
      ...MultichainAssetsController,
      ...MultichainBalancesController,
      ...MultichainAssetsRatesController,
      ...CurrencyRateController,
      ...NetworkController,
      ...(AccountTrackerController as {
        accountsByChainId: Record<
          Hex,
          Record<
            Hex,
            {
              balance: Hex | null;
            }
          >
        >;
      }),
    };
  },
  (filteredState) => _selectAssetsBySelectedAccountGroup(filteredState),
);

export const selectSortedAssetsBySelectedAccountGroup = createDeepEqualSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectEnabledNetworksByNamespace,
    selectTokenSortConfig,
  ],
  (bip44Assets, enabledNetworksByNamespace, tokenSortConfig) => {
    const enabledNetworks = Object.values(enabledNetworksByNamespace).flatMap(
      (network) =>
        Object.entries(network)
          .filter(([_, enabled]) => enabled)
          .map(([networkId]) => networkId),
    );

    const assets = Object.entries(bip44Assets)
      .filter(
        ([networkId, _]) =>
          enabledNetworks.includes(networkId) || networkId.startsWith('0x'),
      )
      .flatMap(([_, assets]) => assets);

    const tokensSorted = sortAssets(assets.map(assetToToken), tokenSortConfig);

    return tokensSorted.map(({ address, chainId, isStaked }) => ({
      address,
      chainId,
      isStaked,
    }));
  },
);

export const selectAsset = createDeepEqualSelector(
  [
    selectAssetsBySelectedAccountGroup,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params,
  ],
  (assets, { address, chainId }) => {
    const asset = assets[chainId]?.find((asset) => asset.assetId === address);

    return asset ? assetToToken(asset) : undefined;
  },
);

function assetToToken(asset: Asset): TokenI {
  const minimumDisplayThreshold = 0.00001;
  return {
    address: asset.assetId,
    aggregators: [],
    decimals: asset.decimals,
    image: asset.image,
    name: asset.name,
    symbol: asset.symbol,
    balance: formatWithThreshold(
      parseFloat(asset.balance),
      minimumDisplayThreshold,
      I18n.locale,
      { minimumFractionDigits: 0, maximumFractionDigits: 5 },
    ),
    balanceFiat: asset.fiat?.balance
      ? `${asset.fiat.balance.toString()}` // TODO: Fix this
      : undefined,
    // This is an undocumented field, but it's used to sort the token list
    tokenFiatAmount: asset.fiat?.balance
      ? `${asset.fiat.balance.toString()}`
      : asset.balance,
    logo:
      asset.type.startsWith('eip155') && asset.isNative
        ? '../images/eth-logo-new.png'
        : asset.image,
    isETH:
      asset.type.startsWith('eip155') &&
      asset.isNative &&
      asset.symbol === 'ETH',
    isStaked: false,
    nativeAsset: undefined,
    chainId: asset.chainId,
    isNative: asset.isNative,
    ticker: asset.symbol,
  } as TokenI;
}
