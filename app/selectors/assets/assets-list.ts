import {
  Asset,
  selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup,
  getNativeTokenAddress,
} from '@metamask/assets-controllers';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import { CaipChainId, Hex, hexToBigInt } from '@metamask/utils';

import I18n from '../../../locales/i18n';
import { TokenI } from '../../components/UI/Tokens/types';
import { sortAssets } from '../../components/UI/Tokens/util';
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

export const selectAssetsBySelectedAccountGroup = createDeepEqualSelector(
  (state: RootState) => {
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
  },
  (filteredState) => _selectAssetsBySelectedAccountGroup(filteredState),
);

// TODO: Add these items at controller level, but have them being optional on selectAssetsBySelectedAccountGroup to avoid breaking changes
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
    const stakedAssets = Object.entries(accountsByChainId).flatMap(
      ([chainId, chainAccounts]) =>
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
              image: '../images/eth-logo-new.png',
            };

            const conversionRate =
              currencyRates[nativeCurrency]?.conversionRate;

            const fiatBalance = conversionRate
              ? weiToFiatNumber(hexToBN(stakedBalance), conversionRate)
              : undefined;

            const account = Object.values(internalAccounts).find(
              (account) => account.address === address.toLowerCase(),
            );

            const stakedAsset = {
              type: account?.type,
              assetId: nativeToken.address,
              isNative: true,
              isStaked: true,
              address: nativeToken.address,
              image: nativeToken.image,
              name: 'Staked Ethereum',
              symbol: nativeToken.symbol,
              accountId: account?.id,
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
              accountId: account?.id as string,
              stakedAsset,
            };
          }),
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
    const tokensSorted = sortAssets(
      assets.map((asset) => ({
        ...asset,
        tokenFiatAmount: asset.fiat?.balance.toString(),
      })),
      tokenSortConfig,
    );

    return tokensSorted.map(
      ({ assetId, chainId, isStaked }: Asset & { isStaked?: boolean }) => ({
        address: assetId,
        chainId,
        isStaked,
      }),
    );
  },
);

export const selectAsset = createDeepEqualSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectStakedAssets,
    (
      _state: RootState,
      params: { address: string; chainId: string; isStaked?: boolean },
    ) => params,
  ],
  (assets, stakedAssets, { address, chainId, isStaked }) => {
    const asset = isStaked
      ? stakedAssets.find(
          (item) =>
            item.chainId === chainId && item.stakedAsset.assetId === address,
        )?.stakedAsset
      : assets[chainId]?.find(
          (item: Asset & { isStaked?: boolean }) =>
            item.assetId === address && item.isStaked === isStaked,
        );

    return asset ? assetToToken(asset) : undefined;
  },
);

const oneHundredThousandths = 0.00001;
const oneHundredths = 0.01;

function assetToToken(asset: Asset & { isStaked?: boolean }): TokenI {
  return {
    address: asset.assetId,
    aggregators: [],
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
      asset.type.startsWith('eip155') && asset.isNative
        ? '../images/eth-logo-new.png'
        : asset.image,
    isETH:
      asset.type.startsWith('eip155') &&
      asset.isNative &&
      asset.symbol === 'ETH',
    isStaked: asset.isStaked,
    chainId: asset.chainId,
    isNative: asset.isNative,
    ticker: asset.symbol,
  };
}
