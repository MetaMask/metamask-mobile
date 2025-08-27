import {
  Asset,
  selectAssetsBySelectedAccountGroup as _selectAssetsBySelectedAccountGroup,
} from '@metamask/assets-controllers';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import { CaipChainId, Hex } from '@metamask/utils';

import I18n from '../../../locales/i18n';
import { TokenI } from '../../components/UI/Tokens/types';
import { sortAssets } from '../../components/UI/Tokens/util';
import { RootState } from '../../reducers';
import { formatWithThreshold } from '../../util/assets';
import { selectIsAllNetworks, selectChainId } from '../networkController';
import { selectEnabledNetworksByNamespace } from '../networkEnablementController';
import { selectTokenSortConfig } from '../preferencesController';
import { createDeepEqualSelector } from '../util';

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

export const selectSortedAssetsBySelectedAccountGroup = createDeepEqualSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectEnabledNetworksByNamespace,
    selectTokenSortConfig,
    selectIsAllNetworks,
    selectChainId,
  ],
  (
    bip44Assets,
    enabledNetworksByNamespace,
    tokenSortConfig,
    isAllNetworks,
    currentChainId,
  ) => {
    const enabledNetworks = isAllNetworks
      ? Object.values(enabledNetworksByNamespace).flatMap((network) =>
          Object.entries(network)
            .filter(([_, enabled]) => enabled)
            .map(([networkId]) => networkId),
        )
      : [currentChainId];

    const assets = Object.entries(bip44Assets)
      .filter(([networkId, _]) => enabledNetworks.includes(networkId))
      .flatMap(([_, chainAssets]) => chainAssets);

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

    return tokensSorted.map(({ assetId, chainId }) => ({
      address: assetId,
      chainId,
      isStaked: false, // TODO: Resolve this when we support staked balances
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
    const asset = assets[chainId]?.find((item) => item.assetId === address);

    return asset ? assetToToken(asset) : undefined;
  },
);

const oneHundredThousandths = 0.00001;
const oneHundredths = 0.01;

function assetToToken(asset: Asset): TokenI {
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
    isStaked: false,
    nativeAsset: undefined,
    chainId: asset.chainId,
    isNative: asset.isNative,
    ticker: asset.symbol,
  };
}
