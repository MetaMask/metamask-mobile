import { createSelector } from 'reselect';
import BigNumber from 'bignumber.js';
import type { AssetsControllerState } from '@metamask/assets-controller';
import type { RootState } from '../../../../reducers';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import {
  getCurrencyRateControllerCurrencyRates,
  getTokenRatesControllerMarketData,
} from '../../../../selectors/assets/assets-migration';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { toChecksumAddress } from '../../../../util/address';
import {
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../Earn/constants/musd';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const selectAssetsPrice = (
  state: RootState,
): AssetsControllerState['assetsPrice'] =>
  state.engine?.backgroundState?.AssetsController?.assetsPrice ?? {};

export const selectMusdFiatRate = createSelector(
  [
    selectIsAssetsUnifyStateEnabled,
    selectAssetsPrice,
    getTokenRatesControllerMarketData,
    getCurrencyRateControllerCurrencyRates,
    selectNetworkConfigurations,
  ],
  (
    isAssetsUnifyStateEnabled,
    assetsPrice,
    marketData,
    currencyRates,
    networkConfigurations,
  ): number | undefined => {
    // Unified assets state uses AssetsController assetsPrice.
    if (isAssetsUnifyStateEnabled) {
      const monadMusdAssetId = MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.MONAD];
      const price = monadMusdAssetId
        ? assetsPrice[monadMusdAssetId]?.price
        : undefined;
      return typeof price === 'number' ? price : undefined;
    }

    const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MONAD];
    if (!musdAddress) {
      return undefined;
    }

    // Legacy pricing fallback uses TokenRatesController market data.
    const checksumAddress = toChecksumAddress(musdAddress);
    const nativeCurrency =
      networkConfigurations?.[CHAIN_IDS.MONAD]?.nativeCurrency;
    const conversionRate = nativeCurrency
      ? currencyRates?.[nativeCurrency]?.conversionRate
      : undefined;
    const priceInNativeCurrency =
      marketData?.[CHAIN_IDS.MONAD]?.[checksumAddress]?.price ??
      marketData?.[CHAIN_IDS.MONAD]?.[musdAddress]?.price;

    if (!conversionRate || priceInNativeCurrency === undefined) {
      return undefined;
    }

    return new BigNumber(priceInNativeCurrency)
      .times(conversionRate)
      .toNumber();
  },
);
