import { useMemo } from 'react';
import type {
  TokenSecurityData,
  TokenSecurityFinancialStats,
} from '@metamask/assets-controllers';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import i18n from '../../../../../locales/i18n';
import { getTop10HoldingPct } from '../../SecurityTrust/utils/securityUtils';
import {
  TokenStatKey,
  type TokenStatValues,
} from '../components/V1/StatBar/StatBar.types';
import {
  getLiquidityToMarketCapRatio,
  isLowLiquidityToMarketCapRatio,
} from '../utils/liquidityToMarketCap';
import {
  formatCompactFiat,
  formatCompactNumber,
  formatPercent,
  formatPriceRange,
  formatTaxPair,
} from '../utils/statBarFormat';

/** Top 10 share reads as a headline figure, so one decimal is enough. */
const TOP_10_DECIMALS = 1;
/** Liq/MC sits in single-digit percentages, where the second decimal carries. */
const LIQUIDITY_TO_MARKET_CAP_DECIMALS = 2;

export interface UseTokenStatBarStatsParams {
  /** Resolved by `useTokenMarketData`, in the user's selected currency. */
  marketData: FungibleAssetPrice | null;
  /** True while the market-data fetch is in flight. */
  isMarketDataLoading: boolean;
  securityData?: TokenSecurityData | null;
  currentCurrency: string;
}

/**
 * Total value locked across the token's pools, in USD.
 *
 * `reserveUSD` counts both sides of each pool, which is the convention the
 * Liq/MC bands in `liquidityToMarketCap` are stated in.
 */
const getLiquidityUsd = (
  financialStats: TokenSecurityFinancialStats | null | undefined,
): number | null => {
  const markets = financialStats?.markets;
  if (!markets?.length) {
    return null;
  }

  return markets.reduce((total, market) => total + (market.reserveUSD ?? 0), 0);
};

/**
 * Units of the selected currency per US dollar, derived from the two prices
 * the API returns for the same token.
 *
 * The security data reports liquidity in USD while everything from the price
 * API follows the user's selected currency, so the two cannot sit side by side
 * untouched. Rather than pulling in a currency-rate selector, this reads the
 * rate out of `price` over `usdPrice`, which describes the same asset at the
 * same moment. Returns null when the rate cannot be derived, so the caller
 * decides whether to show an unconverted figure or nothing.
 */
const getUsdToSelectedCurrencyRate = (
  marketData: FungibleAssetPrice | null,
): number | null => {
  const { price, usdPrice } = marketData ?? {};

  if (
    price == null ||
    usdPrice == null ||
    !Number.isFinite(price) ||
    !Number.isFinite(usdPrice) ||
    usdPrice <= 0
  ) {
    return null;
  }

  return price / usdPrice;
};

/**
 * Formatted statistics for the Token Details V1 stat bar.
 *
 * Draws on two sources. Market cap, 24h volume, the 24h high/low range and
 * circulating supply come from the price API via `useTokenMarketData`.
 * Liquidity, holders, top 10 share and tax come from the Blockaid security
 * data. Liq/MC spans both and is therefore absent whenever either side is.
 *
 * Every field on both sources is optional, so each stat falls back to the gray
 * dash on its own rather than the bar emptying as a unit.
 *
 * Liq/MC is computed entirely in USD — summed `reserveUSD` over
 * `circulatingSupply * usdPrice` — rather than dividing by `marketCap`, which
 * follows the selected currency and would scale the ratio by the exchange rate
 * without ever looking wrong.
 *
 * Liq/MC, Top 10 and Holders also render on the Security tab, so ASSETS-4056
 * requires both places to read the same computed value. Keeping the
 * computation here gives that work one place to land.
 */
export const useTokenStatBarStats = ({
  marketData,
  isMarketDataLoading,
  securityData,
  currentCurrency,
}: UseTokenStatBarStatsParams): TokenStatValues =>
  useMemo(() => {
    const { locale } = i18n;
    const financialStats = securityData?.financialStats;

    const liquidityUsd = getLiquidityUsd(financialStats);
    const usdToSelected = getUsdToSelectedCurrencyRate(marketData);
    const liquidityInSelectedCurrency =
      liquidityUsd == null ? null : liquidityUsd * (usdToSelected ?? 1);

    const { circulatingSupply, usdPrice } = marketData ?? {};
    const marketCapUsd =
      circulatingSupply != null && usdPrice != null
        ? circulatingSupply * usdPrice
        : null;

    const liquidityToMarketCapRatio = getLiquidityToMarketCapRatio(
      liquidityUsd,
      marketCapUsd,
    );

    return {
      [TokenStatKey.MarketCap]: {
        value: formatCompactFiat(marketData?.marketCap, currentCurrency),
        isLoading: isMarketDataLoading,
      },
      [TokenStatKey.Liquidity]: {
        value: formatCompactFiat(liquidityInSelectedCurrency, currentCurrency),
      },
      [TokenStatKey.Volume24h]: {
        value: formatCompactFiat(marketData?.totalVolume, currentCurrency),
        isLoading: isMarketDataLoading,
      },
      [TokenStatKey.Holders]: {
        value: formatCompactNumber(financialStats?.holdersCount),
      },
      [TokenStatKey.Top10]: {
        value: formatPercent(
          getTop10HoldingPct(financialStats),
          TOP_10_DECIMALS,
        ),
      },
      [TokenStatKey.LiquidityToMarketCap]: {
        value: formatPercent(
          liquidityToMarketCapRatio == null
            ? null
            : liquidityToMarketCapRatio * 100,
          LIQUIDITY_TO_MARKET_CAP_DECIMALS,
        ),
        isWarning: isLowLiquidityToMarketCapRatio(liquidityToMarketCapRatio),
        isLoading: isMarketDataLoading,
      },
      [TokenStatKey.Tax]: {
        value: formatTaxPair(securityData?.fees?.buy, securityData?.fees?.sell),
      },
      [TokenStatKey.HighLow24h]: {
        value: formatPriceRange(
          marketData?.high1d,
          marketData?.low1d,
          currentCurrency,
          locale,
        ),
        isLoading: isMarketDataLoading,
      },
      [TokenStatKey.CirculatingSupply]: {
        value: formatCompactNumber(marketData?.circulatingSupply),
        isLoading: isMarketDataLoading,
      },
    };
  }, [marketData, isMarketDataLoading, securityData, currentCurrency]);

export default useTokenStatBarStats;
