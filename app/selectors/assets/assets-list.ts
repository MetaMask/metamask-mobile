import {
  Asset,
  selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup,
  getNativeTokenAddress,
  TokenListState,
} from '@metamask/assets-controllers';
import {
  MULTICHAIN_NETWORK_DECIMAL_PLACES,
  toEvmCaipChainId,
} from '@metamask/multichain-network-controller';
import { CaipChainId, Hex, hexToBigInt, isCaipChainId } from '@metamask/utils';
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
import { selectAllTokens } from '../tokensController';
import { selectSelectedInternalAccountAddress } from '../accountsController';
import { selectSelectedInternalAccountByScope } from '../multichainAccounts/accounts';

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

export const selectAssetsBySelectedAccountGroup = createDeepEqualSelector(
  getStateForAssetSelector,
  (assetsState) => _selectAssetsBySelectedAccountGroup(assetsState),
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
    (state: RootState) =>
      state.engine.backgroundState.TokenListController.tokensChainsCache,
    selectAllTokens,
    selectSelectedInternalAccountAddress,
    selectSelectedInternalAccountByScope,
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
  (
    assets,
    stakedAssets,
    tokensChainsCache,
    allTokens,
    selectedAddress,
    getAccountByScope,
    address,
    chainId,
    isStaked,
  ) => {
    const chainIdInCaip = isCaipChainId(chainId)
      ? chainId
      : toEvmCaipChainId(chainId as Hex);

    // Get the account for this chain from the selected account group
    const scopedAccountId = getAccountByScope(chainIdInCaip)?.id;

    const asset = isStaked
      ? stakedAssets.find(
          (item) =>
            item.chainId === chainId &&
            (!scopedAccountId || item.accountId === scopedAccountId) &&
            item.stakedAsset.assetId === address,
        )?.stakedAsset
      : assets[chainId]?.find((item: Asset & { isStaked?: boolean }) => {
          const itemIsStaked = Boolean(item.isStaked);
          const targetIsStaked = Boolean(isStaked);
          return (
            item.assetId === address &&
            (!scopedAccountId || item.accountId === scopedAccountId) &&
            itemIsStaked === targetIsStaked
          );
        });

    // Look up rwaData from the original token in allTokens
    const originalToken = selectedAddress
      ? allTokens?.[chainId as Hex]?.[selectedAddress]?.find(
          (token) => token.address.toLowerCase() === address.toLowerCase(),
        )
      : undefined;

    const rwaData = (originalToken as TokenI | undefined)?.rwaData;

    return asset ? assetToToken(asset, tokensChainsCache, rwaData) : undefined;
  },
);

const oneHundredThousandths = 0.00001;
const oneHundredths = 0.01;

// BIP44 MAINTENANCE: Review what fields are really needed
function assetToToken(
  asset: Asset & { isStaked?: boolean },
  tokensChainsCache: TokenListState['tokensChainsCache'],
  rwaData?: TokenI['rwaData'],
): TokenI {
  return {
    address: asset.assetId,
    aggregators:
      ('address' in asset &&
        tokensChainsCache[asset.chainId]?.data[asset.address]?.aggregators) ||
      [],
    decimals: asset.decimals,
    image: asset.image,
    name: asset.name,
    symbol: asset.symbol,
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
    ticker: asset.symbol,
    accountType: asset.accountType,
    rwaData,
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
