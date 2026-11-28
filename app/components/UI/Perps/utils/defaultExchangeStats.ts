import type {
  PerpsMarketData,
  PerpsProviderType,
} from '@metamask/perps-controller';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

/** Shown when a venue omits a stat. */
export const PERPS_EXCHANGE_STAT_MISSING = '—';

/** Symbol used to quote maker and taker fees for a venue. */
export const PERPS_EXCHANGE_FEE_SYMBOL = 'BTC';

export interface PerpsExchangeStats {
  marketCount: number;
  maxLeverage: string;
  openInterest: string;
  volume24h: string;
}

const compactUsd = getIntlNumberFormatter('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});

/**
 * Formats a fee rate decimal (`0.00045`) as a percent. Missing rates stay blank
 * so the sheet never substitutes a design placeholder.
 *
 * @param rate - Provider fee rate, or undefined when the quote omitted it.
 * @returns Percent text, or an em dash.
 */
export function formatExchangeFeeRate(rate: number | undefined): string {
  if (rate === undefined || !Number.isFinite(rate)) {
    return PERPS_EXCHANGE_STAT_MISSING;
  }
  const trimmed = (rate * 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return `${trimmed === '' ? '0' : trimmed}%`;
}

function parseLeverage(value: string): number | undefined {
  const match = /(\d+(?:\.\d+)?)/.exec(value);
  if (!match) {
    return undefined;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sumReported(
  markets: PerpsMarketData[],
  read: (market: PerpsMarketData) => number | undefined,
): string {
  let total = 0;
  let reported = false;
  markets.forEach((market) => {
    const value = read(market);
    if (value === undefined || !Number.isFinite(value)) {
      return;
    }
    reported = true;
    total += value;
  });
  return reported ? compactUsd.format(total) : PERPS_EXCHANGE_STAT_MISSING;
}

/**
 * Exchange-level stats from that venue's market rows. Counts, leverage, open
 * interest and volume are taken from the rows the provider already published.
 *
 * @param markets - Full catalog, one row per venue listing.
 * @param providerId - Venue to summarize.
 * @returns Display strings for the default-exchange sheet.
 */
export function summarizeExchangeMarkets(
  markets: readonly PerpsMarketData[],
  providerId: PerpsProviderType,
): PerpsExchangeStats {
  const rows = markets.filter(
    (market) =>
      (market.providerId ?? PROVIDER_CONFIG.DefaultProvider) === providerId,
  );
  const leverages = rows
    .map((market) => parseLeverage(market.maxLeverage))
    .filter((value): value is number => value !== undefined);
  const maxLeverage =
    leverages.length > 0
      ? `${Math.max(...leverages)}x`
      : PERPS_EXCHANGE_STAT_MISSING;

  return {
    marketCount: rows.length,
    maxLeverage,
    openInterest: sumReported(
      rows,
      (market) => market.numericValues?.openInterest,
    ),
    volume24h: sumReported(rows, (market) => market.numericValues?.volume),
  };
}
