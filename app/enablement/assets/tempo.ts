import { type CurrencyRateState } from '@metamask/assets-controllers';
import {
  type AssetsControllerState,
  type FungibleAssetPrice,
} from '@metamask/assets-controller';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { type CaipAssetType, parseCaipAssetType } from '@metamask/utils';
import {
  CHAINLIST_CURRENCY_SYMBOLS_MAP,
  NETWORKS_CHAIN_ID,
} from '../../constants/network';

/**
 * Adds the Tempo fiat rate to the derived currency rates when it is missing.
 * The rate comes from the most recently updated valid Tempo token price.
 *
 * @param currencyRates - Currency rates derived from native asset prices.
 * @param assetsPrice - AssetsController price slice.
 * @returns Currency rates including the Tempo rate when one can be derived.
 */
export function augmentTempoCurrencyRates(
  currencyRates: CurrencyRateState['currencyRates'],
  assetsPrice: AssetsControllerState['assetsPrice'],
): CurrencyRateState['currencyRates'] {
  const tempoCurrencySymbol = CHAINLIST_CURRENCY_SYMBOLS_MAP.TEMPO_MAINNET;

  if (currencyRates[tempoCurrencySymbol]) {
    return currencyRates;
  }

  /**
   * CAIP-2 chain ids of the Tempo networks. Tempo has no native asset, so
   * CoinGecko exposes no native coin for it. The wallet derives the USD fiat
   * rate from Tempo token prices instead. Only these chains are used, so a
   * token on any other chain never sets the rate.
   */
  const tempoCaipChainIds = new Set<string>([
    formatChainIdToCaip(NETWORKS_CHAIN_ID.TEMPO_MAINNET),
    formatChainIdToCaip(NETWORKS_CHAIN_ID.TEMPO_TESTNET_MODERATO),
  ]);

  let latest: FungibleAssetPrice | undefined;

  for (const [assetId, price] of Object.entries(assetsPrice)) {
    if (
      !tempoCaipChainIds.has(
        parseCaipAssetType(assetId as CaipAssetType).chainId,
      )
    ) {
      continue;
    }

    if (
      price.assetPriceType === 'fungible' &&
      Number.isFinite(price.price) &&
      price.price > 0 &&
      Number.isFinite(price.usdPrice) &&
      price.usdPrice > 0 &&
      (!latest || price.lastUpdated > latest.lastUpdated)
    ) {
      latest = price;
    }
  }

  if (!latest) {
    return currencyRates;
  }

  return {
    ...currencyRates,
    [tempoCurrencySymbol]: {
      conversionDate: latest.lastUpdated / 1000,
      conversionRate: latest.price / latest.usdPrice,
      usdConversionRate: 1,
    },
  };
}
