import type {
  TokenSecurityData,
  TokenSecurityFeature,
  TokenSecurityMarket,
} from '@metamask/assets-controllers';

import I18n, { strings } from '../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../util/intl';
import type { SecurityVerdict } from '../components/V1/SecurityPill/SecurityPill';
import type { SecurityTabFacts } from '../components/V1/SecurityTab/SecurityTab.types';
import { resolveSecurityChecks } from './securityChecks';
import { countSecurityFlags, resolveSecurityReasons } from './securityReasons';

/**
 * Blockaid's verdict word, mapped to the pill's.
 *
 * The API has no `Screened`, `Unscreened` or `Pending`; those three are ours.
 * An unrecognised or omitted `resultType` lands on `unscreened` rather than
 * the nearest neighbour, because the API offers no guarantee that the five
 * documented values are the only ones it will ever send, and the safe reading
 * of a word we do not know is that the token was not screened.
 */
const VERDICT_BY_RESULT_TYPE: Readonly<Record<string, SecurityVerdict>> = {
  Verified: 'screened',
  Benign: 'screened',
  Warning: 'medium_risk',
  Spam: 'medium_risk',
  Malicious: 'high_risk',
};

/** Volume manipulation Blockaid names explicitly, for the Trading row. */
const VOLUME_FLAG_FEATURE_IDS = [
  'INORGANIC_VOLUME',
  'WASH_TRADING',
  'FAKE_VOLUME',
  'FAKE_TRADE_MAKER_COUNT',
];

/**
 * Compact figures, matching the stat bar's shape so ASSETS-4056 has one format
 * to unify rather than two.
 */
const formatCompact = (value: number): string => {
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [threshold, suffix] of units) {
    if (Math.abs(value) >= threshold) {
      return `${(value / threshold).toFixed(1)}${suffix}`;
    }
  }
  return value.toLocaleString();
};

const formatUsd = (value: number): string => `$${formatCompact(value)}`;

const formatPercentage = (value: number): string => `${value.toFixed(1)}%`;

/**
 * A fee as a percentage.
 *
 * `0` is a real reading and has to survive, so every null test here is an
 * explicit `== null` rather than a falsy check.
 */
const formatFee = (value: number | null | undefined): string | null =>
  value == null ? null : `${value}%`;

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
    : getIntlDateTimeFormatter(I18n.locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }).format(date);
};

/** Sum of the top ten holders' share, capped because the API can overshoot. */
const sumTopTenPercentage = (
  securityData: TokenSecurityData,
): number | null => {
  const holders = securityData.financialStats?.topHolders;
  if (!holders?.length) {
    return null;
  }
  const total = holders.reduce(
    (sum, holder) => sum + (holder.holdingPercentage ?? 0),
    0,
  );
  return Math.min(total, 100);
};

/**
 * The deepest pool, named as `marketName · pairName`.
 *
 * `markets[]` carries no primary-pool flag, so "primary" is defined here as
 * the largest reserve. That is a choice rather than a reading.
 */
const resolvePrimaryPool = (markets: TokenSecurityMarket[]): string | null => {
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
 * Facts for a token the API has nothing on, or could not be asked.
 *
 * Every field dashes out rather than reading zero: no holders is a real
 * reading and "we did not find out" is not, so the two must not share a
 * rendering.
 */
export const emptySecurityFacts = (
  verdict: SecurityVerdict,
): SecurityTabFacts => ({
  verdict,
  flagCount: 0,
  reasons: [],
  checks: {},
  holders: {
    count: null,
    topTenPercentage: null,
    remainingPercentage: null,
    topTenFillPercentage: null,
  },
  liquidity: {
    total: null,
    liquidityToMarketCap: null,
    lpBurnedLocked: null,
    primaryPool: null,
  },
  trading: {
    buySellTax: null,
    volumeFlags: null,
    listedOnExchange: null,
  },
  origin: { created: null },
  checkedMinutesAgo: null,
});

/**
 * Everything the Security surfaces render, derived from one Blockaid payload.
 *
 * Pure, and the only place the payload is read. The tab, the Contract security
 * screen and the hero pill all consume its output, which is what stops the
 * three showing different readings for the same token.
 */
export const deriveSecurityFacts = (
  securityData: TokenSecurityData,
): SecurityTabFacts => {
  const features = securityData.features ?? [];
  const verdict =
    VERDICT_BY_RESULT_TYPE[securityData.resultType] ?? 'unscreened';
  const financialStats = securityData.financialStats;
  const markets = financialStats?.markets ?? [];

  const topTenPercentage = sumTopTenPercentage(securityData);
  const totalLiquidity = markets.length
    ? markets.reduce((sum, market) => sum + (market.reserveUSD ?? 0), 0)
    : null;
  const lockedLiquidityPct = financialStats?.lockedLiquidityPct;
  const buyFee = formatFee(securityData.fees?.buy);
  const sellFee = formatFee(securityData.fees?.sell);

  return {
    verdict,
    flagCount: countSecurityFlags(features),
    reasons: resolveSecurityReasons(features, verdict),
    checks: resolveSecurityChecks(features),
    holders: {
      count:
        financialStats?.holdersCount == null
          ? null
          : formatCompact(financialStats.holdersCount),
      topTenPercentage:
        topTenPercentage == null ? null : formatPercentage(topTenPercentage),
      remainingPercentage:
        topTenPercentage == null
          ? null
          : formatPercentage(100 - topTenPercentage),
      topTenFillPercentage: topTenPercentage,
    },
    liquidity: {
      total: totalLiquidity == null ? null : formatUsd(totalLiquidity),
      /**
       * TODO(ASSETS-4056): needs a market cap, which this payload does not
       * carry. Build the denominator as `circulatingSupply * usdPrice` rather
       * than reading `marketCap`, which follows the user's selected currency
       * while `reserveUSD` is always USD.
       */
      liquidityToMarketCap: null,
      /**
       * TODO(ASSETS-4022): the row is labelled "LP burned/locked" but
       * `lockedLiquidityPct` measures locking alone. Either the label narrows
       * or the payload needs a burn figure.
       */
      lpBurnedLocked:
        lockedLiquidityPct == null
          ? null
          : formatPercentage(lockedLiquidityPct),
      primaryPool: resolvePrimaryPool(markets),
    },
    trading: {
      /** Both halves have to be present for the pair to mean anything. */
      buySellTax:
        buyFee == null || sellFee == null ? null : `${buyFee} / ${sellFee}`,
      volumeFlags: resolveVolumeFlags(features),
      listedOnExchange: strings(
        features.some(
          (feature) => feature.featureId === 'LISTED_ON_CENTRALIZED_EXCHANGE',
        )
          ? 'token_details_v1.security_tab.values.yes'
          : 'token_details_v1.security_tab.values.no',
      ),
    },
    origin: { created: formatCreated(securityData.created) },
    /**
     * TODO(ASSETS-4022): Blockaid returns no scan timestamp, so the "checked N
     * min ago" clause has nothing behind it and the line shows attribution
     * only.
     */
    checkedMinutesAgo: null,
  };
};
