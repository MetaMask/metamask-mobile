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
  MUSD_LEGACY_RATE_CHAIN_ID,
  MUSD_UNIFIED_RATE_CHAIN_ID,
} from '../../Earn/constants/musd';

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
      const monadAssetId =
        MUSD_TOKEN_ASSET_ID_BY_CHAIN[MUSD_UNIFIED_RATE_CHAIN_ID];
      const price = monadAssetId ? assetsPrice[monadAssetId]?.price : undefined;
      return typeof price === 'number' ? price : undefined;
    }

    const musdAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[MUSD_LEGACY_RATE_CHAIN_ID];
    if (!musdAddress) {
      return undefined;
    }

    // Legacy pricing fallback uses TokenRatesController market data.
    const checksumAddress = toChecksumAddress(musdAddress);
    const nativeCurrency =
      networkConfigurations?.[MUSD_LEGACY_RATE_CHAIN_ID]?.nativeCurrency;
    const conversionRate = nativeCurrency
      ? currencyRates?.[nativeCurrency]?.conversionRate
      : undefined;
    const priceInNativeCurrency =
      marketData?.[MUSD_LEGACY_RATE_CHAIN_ID]?.[checksumAddress]?.price ??
      marketData?.[MUSD_LEGACY_RATE_CHAIN_ID]?.[musdAddress]?.price;

    if (!conversionRate || priceInNativeCurrency === undefined) {
      return undefined;
    }

    return new BigNumber(priceInNativeCurrency)
      .times(conversionRate)
      .toNumber();
  },
);
