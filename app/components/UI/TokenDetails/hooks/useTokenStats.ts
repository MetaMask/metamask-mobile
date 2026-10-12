import { useMemo } from 'react';
import type {
  TokenSecurityData,
  TokenSecurityFeature,
  TokenSecurityFinancialStats,
  TokenSecurityMarket,
} from '@metamask/assets-controllers';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import i18n, { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import { TokenStatKey, type TokenStatValues } from '../constants/tokenStats';
import {
  getLiquidityToMarketCapRatio,
  isLowLiquidityToMarketCapRatio,
} from '../utils/liquidityToMarketCap';
import { sumTopTenPercentage } from '../utils/securityFacts';
import {
  formatCompactFiat,
  formatCompactNumber,
  formatPercent,
  formatPriceRange,
  formatTaxPair,
} from '../utils/statBarFormat';

/** The one currency the security data's USD figures need no conversion for. */
const USD_CURRENCY_CODE = 'usd';

/**
 * Widened past `string` on purpose: the currency selector resolves to nothing
 * until the controller has state, and a stat bar must not crash the screen
 * over a missing display currency.
 */
const isUsdCurrency = (currencyCode: string | undefined): boolean =>
  currencyCode?.toLowerCase() === USD_CURRENCY_CODE;

/**
 * Decimal places on the plain percentages.
 *
 * Top 10 and LP burned/locked read as headline figures, where one decimal is
 * enough and a second would imply precision the source does not have.
 */
const PERCENT_DECIMALS = 1;
/** Liq/MC sits in single-digit percentages, where the second decimal carries. */
const LIQUIDITY_TO_MARKET_CAP_DECIMALS = 2;

/** Volume manipulation Blockaid names explicitly. */
const VOLUME_FLAG_FEATURE_IDS = [
  'INORGANIC_VOLUME',
  'WASH_TRADING',
  'FAKE_VOLUME',
  'FAKE_TRADE_MAKER_COUNT',
];

const LISTED_ON_EXCHANGE_FEATURE_ID = 'LISTED_ON_CENTRALIZED_EXCHANGE';

export interface UseTokenStatsParams {
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
 * The deepest pool, named as `marketName · pairName`.
 *
 * `markets[]` carries no primary-pool flag, so "primary" is defined here as
 * the largest reserve. That is a choice rather than a reading.
 */
const resolvePrimaryPool = (
  markets: readonly TokenSecurityMarket[],
): string | null => {
  const deepest = markets.reduce<TokenSecurityMarket | null>(
    (best, market) =>
      best === null || (market.reserveUSD ?? 0) > (best.reserveUSD ?? 0)
        ? market
        : best,
    null,
  );
  return deepest?.marketName && deepest?.pairName
    ? `${deepest.marketName} \u00b7 ${deepest.pairName}`
    : null;
};

/**
 * The creation date, in the user's selected language.
 *
 * Formatted in UTC rather than device time. Blockaid timestamps land on
 * midnight UTC, so rendering them locally moves a token's birthday a day
 * earlier for every user west of Greenwich.
 */
const formatCreated = (created: string | null | undefined): string | null => {
  if (!created) {
    return null;
  }
  const date = new Date(created);
  return Number.isNaN(date.getTime())
    ? null
    : getIntlDateTimeFormatter(i18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
};

/**
 * How many volume-manipulation flags fired, worded rather than counted.
 *
 * Always a string: "none detected" is a real reading here, because these four
 * featureIds are ones Blockaid states explicitly rather than ones we infer
 * from silence.
 */
const resolveVolumeFlags = (
  features: readonly TokenSecurityFeature[],
): string => {
  const flagged = features.filter((feature) =>
    VOLUME_FLAG_FEATURE_IDS.includes(feature.featureId),
  );
  return flagged.length === 0
    ? strings('token_details_v1.security_tab.values.none_detected')
    : strings('token_details_v1.security_tab.values.detected', {
        count: flagged.length,
      });
};

/**
 * Every statistic Token Details V1 renders, formatted and keyed by stat.
 *
 * Draws on two sources. Market cap, 24h volume, the 24h high/low range and
 * circulating supply come from the price API via `useTokenMarketData`.
 * Holders, top 10 share, tax, LP locked, the primary pool, volume flags,
 * exchange listing and the creation date come from the Blockaid security data.
 * Liq/MC spans both and is therefore absent whenever either side is.
 *
 * Liquidity reads from the security data but needs the price API too: Blockaid
 * reports it in USD while the rest of the figures follow the selected
 * currency, so for anyone not already on USD it cannot be labelled until the
 * rate arrives. It therefore loads and falls back on the market-data schedule.
 *
 * Every field on both sources is optional, so each stat falls back to the gray
 * dash on its own rather than a surface emptying as a unit.
 *
 * Liq/MC is computed entirely in USD — summed `reserveUSD` over
 * `circulatingSupply * usdPrice` — rather than dividing by `marketCap`, which
 * follows the selected currency and would scale the ratio by the exchange rate
 * without ever looking wrong.
 *
 * Both the stat bar and the Security tab read this one record, each picking
 * the keys it shows. That is the point: ten of these appear on both surfaces,
 * and while each derived its own the two disagreed — Liq/MC was computed here
 * and hardcoded `null` there, and liquidity was labelled in two currencies.
 */
export const useTokenStats = ({
  marketData,
  isMarketDataLoading,
  securityData,
  currentCurrency,
}: UseTokenStatsParams): TokenStatValues =>
  useMemo(() => {
    const { locale } = i18n;
    const financialStats = securityData?.financialStats;
    const features = securityData?.features ?? [];
    const markets = financialStats?.markets ?? [];

    const liquidityUsd = getLiquidityUsd(financialStats);
    // A rate of 1 is only correct for a user already on USD. For anyone else
    // an underivable rate means the figure cannot be labelled, so liquidity
    // waits on the market data rather than showing dollars wearing a euro sign.
    const usdToSelected =
      getUsdToSelectedCurrencyRate(marketData) ??
      (isUsdCurrency(currentCurrency) ? 1 : null);
    const liquidityInSelectedCurrency =
      liquidityUsd == null || usdToSelected == null
        ? null
        : liquidityUsd * usdToSelected;

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
      // Security-sourced, but its conversion rate is not, so it waits on the
      // market data the same way the cells above it do.
      [TokenStatKey.Liquidity]: {
        value: formatCompactFiat(liquidityInSelectedCurrency, currentCurrency),
        isLoading: isMarketDataLoading,
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
          sumTopTenPercentage(financialStats),
          PERCENT_DECIMALS,
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
      /**
       * TODO(ASSETS-4022): labelled "LP burned/locked" but
       * `lockedLiquidityPct` measures locking alone. Either the label narrows
       * or the payload needs a burn figure.
       */
      [TokenStatKey.LpBurnedLocked]: {
        value: formatPercent(
          financialStats?.lockedLiquidityPct,
          PERCENT_DECIMALS,
        ),
      },
      [TokenStatKey.PrimaryPool]: { value: resolvePrimaryPool(markets) },
      [TokenStatKey.VolumeFlags]: { value: resolveVolumeFlags(features) },
      [TokenStatKey.ListedOnExchange]: {
        value: strings(
          features.some(
            (feature) => feature.featureId === LISTED_ON_EXCHANGE_FEATURE_ID,
          )
            ? 'token_details_v1.security_tab.values.yes'
            : 'token_details_v1.security_tab.values.no',
        ),
      },
      [TokenStatKey.Created]: { value: formatCreated(securityData?.created) },
    };
  }, [marketData, isMarketDataLoading, securityData, currentCurrency]);

export default useTokenStats;
