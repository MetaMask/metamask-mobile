import {
  Asset,
  selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup,
  getNativeTokenAddress,
  TokenListState,
} from '@metamask/assets-controllers';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import { CaipChainId, Hex, hexToBigInt } from '@metamask/utils';
import { createSelector } from 'reselect';

import I18n from '../../../locales/i18n';
import { TokenI } from '../../components/UI/Tokens/types';
import { RootState } from '../../reducers';
import { formatWithThreshold } from '../../util/assets';
import { selectEvmNetworkConfigurationsByChainId } from '../networkController';
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import { selectTokenSortConfig } from '../preferencesController';
import { createDeepEqualSelector } from '../util';
import { fromWei, hexToBN, weiToFiatNumber } from '../../util/number';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../currencyRateController';
import { selectAccountsByChainId } from '../accountTrackerController';
import {
  TRON_RESOURCE_SYMBOLS_SET,
  TronResourceSymbol,
} from '../../core/Multichain/constants';
import { sortAssetsWithPriority } from '../../components/UI/Tokens/util/sortAssetsWithPriority';
import { selectTokenMarketData } from '../tokenRatesController';
import { selectERC20TokensByChain } from '../tokenListController';
import {
  ATOKEN_METADATA_FALLBACK,
  isAddressLikeOrMissing,
} from '../../constants/tokens';

const getStateForAssetSelector = (state: RootState) => {
  const {
    AccountTreeController,
    AccountsController,
    TokensController,
    TokenBalancesController,
    TokenRatesController,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    MultichainAssetsController,
    MultichainBalancesController,
    MultichainAssetsRatesController,
    ///: END:ONLY_INCLUDE_IF
    CurrencyRateController,
    NetworkController,
    AccountTrackerController,
  } = state.engine.backgroundState;

  let multichainState = {
    accountsAssets: {},
    assetsMetadata: {},
    allIgnoredAssets: {},
    balances: {},
    conversionRates: {},
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  multichainState = {
    ...MultichainAssetsController,
    ...MultichainBalancesController,
    ...MultichainAssetsRatesController,
  };
  ///: END:ONLY_INCLUDE_IF

  return {
    ...AccountTreeController,
    ...AccountsController,
    ...TokensController,
    ...TokenBalancesController,
    ...TokenRatesController,
    // Override marketData with enriched version that includes aToken price fallbacks
    marketData: selectTokenMarketData(state),
    ...multichainState,
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
};

const selectAssetsBySelectedAccountGroupRaw = createDeepEqualSelector(
  getStateForAssetSelector,
  (assetsState) => _selectAssetsBySelectedAccountGroup(assetsState),
);

/**
 * Enriched assets selector that adds fallback metadata for aTokens.
 * Patches name/symbol for aTokens not yet in the tokens API.
 */
export const selectAssetsBySelectedAccountGroup = createDeepEqualSelector(
  selectAssetsBySelectedAccountGroupRaw,
  (assets): Record<string, Asset[]> => {
    const enriched: Record<string, Asset[]> = {};

    for (const [chainId, chainAssets] of Object.entries(assets)) {
      const fallbacksForChain = ATOKEN_METADATA_FALLBACK[chainId as Hex];

      if (!fallbacksForChain) {
        enriched[chainId] = chainAssets;
        continue;
      }

      enriched[chainId] = chainAssets.map((asset) => {
        const addressKey =
          'address' in asset ? asset.address?.toLowerCase() : undefined;
        const fallback = addressKey ? fallbacksForChain[addressKey] : undefined;

        if (fallback) {
          return {
            ...asset,
            name: fallback.name,
            symbol: fallback.symbol,
            decimals: asset.decimals ?? fallback.decimals,
          };
        }
        return asset;
      });
    }

    return enriched;
  },
);

// BIP44 MAINTENANCE: Add these items at controller level, but have them being optional on selectAssetsBySelectedAccountGroup to avoid breaking changes
const selectStakedAssets = createDeepEqualSelector(
  [
    (state: RootState) =>
      state.engine.backgroundState.AccountsController.internalAccounts.accounts,
    selectAccountsByChainId,
    selectEvmNetworkConfigurationsByChainId,
    selectCurrencyRates,
    selectCurrentCurrency,
  ],
  (
    internalAccounts,
    accountsByChainId,
    networkConfigurationsByChainId,
    currencyRates,
    currentCurrency,
  ) => {
    const stakedAssets = Object.entries(accountsByChainId)
      // Only include mainnet and hoodi
      .filter(([chainId, _]) => chainId === '0x1' || chainId === '0x88bb0')
      .flatMap(([chainId, chainAccounts]) =>
        Object.entries(chainAccounts)
          .filter(
            ([_, accountInformation]) =>
              accountInformation.stakedBalance &&
              hexToBigInt(accountInformation.stakedBalance) > 0,
          )
          .map(([address, accountInformation]) => {
            const stakedBalance = accountInformation.stakedBalance as Hex;

            const nativeCurrency =
              networkConfigurationsByChainId[chainId as Hex]?.nativeCurrency ||
              'NATIVE';

            const nativeToken = {
              address: getNativeTokenAddress(chainId as Hex),
              decimals: 18,
              name: nativeCurrency === 'ETH' ? 'Ethereum' : nativeCurrency,
              symbol: nativeCurrency,
            };

            const conversionRate =
              currencyRates[nativeCurrency]?.conversionRate;

            const fiatBalance = conversionRate
              ? weiToFiatNumber(hexToBN(stakedBalance), conversionRate)
              : undefined;

            const account = Object.values(internalAccounts).find(
              (internalAccount) =>
                internalAccount.address === address.toLowerCase(),
            );

            if (!account) {
              return undefined;
            }

            const stakedAsset = {
              accountType: account.type,
              assetId: nativeToken.address,
              isNative: true,
              isStaked: true,
              address: nativeToken.address,
              image: '',
              name: 'Staked Ethereum',
              symbol: nativeToken.symbol,
              accountId: account.id,
              decimals: nativeToken.decimals,
              rawBalance: stakedBalance,
              balance: fromWei(stakedBalance),
              fiat: fiatBalance
                ? {
                    balance: Number(fiatBalance),
                    currency: currentCurrency,
                    conversionRate,
                  }
                : undefined,
              chainId,
            } as Asset;

            return {
              chainId,
              accountId: account.id,
              stakedAsset,
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      );

    return stakedAssets;
  },
);

const selectEnabledNetworks = createDeepEqualSelector(
  [selectEnabledNetworksByNamespace],
  (enabledNetworksByNamespace) =>
    Object.values(enabledNetworksByNamespace).flatMap((network) =>
      Object.entries(network)
        .filter(([_, enabled]) => enabled)
        .map(([networkId]) => networkId),
    ),
);

export const selectSortedAssetsBySelectedAccountGroup = createDeepEqualSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectEnabledNetworks,
    selectTokenSortConfig,
    selectStakedAssets,
  ],
  (bip44Assets, enabledNetworks, tokenSortConfig, stakedAssets) => {
    const assets = Object.entries(bip44Assets)
      .filter(([networkId, _]) => enabledNetworks.includes(networkId))
      .flatMap(([_, chainAssets]) => chainAssets);

    const stakedAssetsArray = [];
    for (const asset of assets) {
      if (asset.isNative) {
        const stakedAsset = stakedAssets.find(
          (item) =>
            item.chainId === asset.chainId &&
            item.accountId === asset.accountId,
        );
        if (stakedAsset) {
          stakedAssetsArray.push({
            ...stakedAsset.stakedAsset,
          } as Asset);
        }
      }
    }

    assets.push(...stakedAssetsArray);

    // Current sorting options
    // {"key": "name", "order": "asc", "sortCallback": "alphaNumeric"}
    // {"key": "tokenFiatAmount", "order": "dsc", "sortCallback": "stringNumeric"}
    const tokensSorted = sortAssetsWithPriority(
      assets.map((asset) => ({
        ...asset,
        tokenFiatAmount: asset.fiat?.balance.toString(),
      })),
      tokenSortConfig,
    );

    // Remove duplicates by creating a unique key for deduplication
    const uniqueTokensMap = new Map();

    tokensSorted.forEach(
      ({ assetId, chainId, isStaked }: Asset & { isStaked?: boolean }) => {
        const uniqueKey = `${assetId}-${chainId}-${Boolean(isStaked)}`;
        if (!uniqueTokensMap.has(uniqueKey)) {
          uniqueTokensMap.set(uniqueKey, {
            address: assetId || '',
            chainId: chainId?.toString() || '',
            isStaked: Boolean(isStaked),
          });
        }
      },
    );

    return Array.from(uniqueTokensMap.values());
  },
);

// TODO BIP44 - Remove this selector and instead pass down the asset from the token list to the list item to avoid unnecessary re-renders
export const selectAsset = createSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectStakedAssets,
    // Use enriched selector for aToken metadata fallback
    selectERC20TokensByChain,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params.address,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params.chainId,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params.isStaked,
  ],
  (assets, stakedAssets, tokensChainsCache, address, chainId, isStaked) => {
    const asset = isStaked
      ? stakedAssets.find(
          (item) =>
            item.chainId === chainId && item.stakedAsset.assetId === address,
        )?.stakedAsset
      : assets[chainId]?.find((item: Asset & { isStaked?: boolean }) => {
          // Normalize isStaked values: treat undefined as false
          const itemIsStaked = Boolean(item.isStaked);
          const targetIsStaked = Boolean(isStaked);
          return item.assetId === address && itemIsStaked === targetIsStaked;
        });

    return asset ? assetToToken(asset, tokensChainsCache) : undefined;
  },
);

const oneHundredThousandths = 0.00001;
const oneHundredths = 0.01;

// BIP44 MAINTENANCE: Review what fields are really needed
function assetToToken(
  asset: Asset & { isStaked?: boolean },
  tokensChainsCache: TokenListState['tokensChainsCache'],
): TokenI {
  // Get fallback metadata from token list cache as additional safety net
  const cachedTokenData =
    'address' in asset
      ? tokensChainsCache[asset.chainId]?.data[asset.address.toLowerCase()]
      : undefined;

  // Asset should already be enriched via selectAssetsBySelectedAccountGroup,
  // but fall back to cache if still missing
  const finalName = !isAddressLikeOrMissing(asset.name)
    ? asset.name
    : cachedTokenData?.name || '';
  const finalSymbol = !isAddressLikeOrMissing(asset.symbol)
    ? asset.symbol
    : cachedTokenData?.symbol || '';

  return {
    address: asset.assetId,
    aggregators: cachedTokenData?.aggregators || [],
    decimals: asset.decimals ?? cachedTokenData?.decimals ?? 18,
    image: asset.image,
    name: finalName,
    symbol: finalSymbol,
    balance: formatWithThreshold(
      parseFloat(asset.balance),
      oneHundredThousandths,
      I18n.locale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits:
          MULTICHAIN_NETWORK_DECIMAL_PLACES[asset.chainId as CaipChainId] || 5,
      },
    ),
    balanceFiat: asset.fiat
      ? formatWithThreshold(asset.fiat.balance, oneHundredths, I18n.locale, {
          style: 'currency',
          currency: asset.fiat.currency,
        })
      : undefined,
    logo:
      asset.accountType.startsWith('eip155') && asset.isNative
        ? '../images/eth-logo-new.png'
        : asset.image,
    isETH:
      asset.accountType.startsWith('eip155') &&
      asset.isNative &&
      asset.symbol === 'ETH',
    isStaked: asset.isStaked || false,
    chainId: asset.chainId,
    isNative: asset.isNative,
    ticker: finalSymbol,
    accountType: asset.accountType,
  };
}

// This is used to select Tron resources (Energy & Bandwidth)
export const selectTronResourcesBySelectedAccountGroup =
  createDeepEqualSelector(
    [getStateForAssetSelector, selectEnabledNetworks],
    (assetsState, enabledNetworks) => {
      const allAssets = _selectAssetsBySelectedAccountGroup(assetsState, {
        filterTronStakedTokens: false,
      });
      const tronResources = Object.entries(allAssets)
        .filter(([networkId, _]) => enabledNetworks.includes(networkId))
        .flatMap(([_, chainAssets]) => chainAssets)
        .filter(
          (asset) =>
            asset.chainId?.includes('tron:') &&
            TRON_RESOURCE_SYMBOLS_SET.has(
              asset.symbol?.toLowerCase() as TronResourceSymbol,
            ),
        );

      return tronResources;
    },
  );
