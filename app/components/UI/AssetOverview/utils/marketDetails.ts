import { formatWithThreshold } from '../../../../util/assets';
import { localizeLargeNumber } from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';

export interface MarketData {
  marketCap?: number;
  totalVolume?: number;
  circulatingSupply?: number;
  allTimeHigh?: number;
  allTimeLow?: number;
  dilutedMarketCap?: number;
}

export interface MarketDetails {
  marketCap: string | null;
  totalVolume: string | null;
  volumeToMarketCap: string | null;
  circulatingSupply: string | null;
  allTimeHigh: string | null;
  allTimeLow: string | null;
  fullyDiluted: string | null;
}

interface FormatMarketDetailsOptions {
  locale: string;
  currentCurrency: string;
  /**
   * Whether the data needs conversion from native units to fiat.
   * - Cached EVM data (from TokenRatesController) is in native units and needs conversion
   * - API-fetched data (with vsCurrency param) is already in fiat and doesn't need conversion
   */
  needsConversion?: boolean;
  conversionRate?: number;
}

/**
 * Formats market details with consistent formatting options.
 * Applies conversion rate only when data is in native units (cached native asset data).
 */
export const formatMarketDetails = (
  marketData: MarketData,
  options: FormatMarketDetailsOptions,
): MarketDetails => {
  const { locale, currentCurrency, needsConversion, conversionRate } = options;
  const multiplier = needsConversion && conversionRate ? conversionRate : 1;

  // Helper to format currency value using localizeLargeNumber
  const formatCurrency = (value: number): string => {
    const absValue = Math.abs(value);
    if (absValue < 1_000) {
      return getIntlNumberFormatter(locale, {
        style: 'currency',
        currency: currentCurrency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }

    const i18n = { t: (key: string) => strings(key) };
    let formatted = localizeLargeNumber(i18n, absValue, { includeK: true });
    const decimalSeparator =
      getIntlNumberFormatter(locale, { style: 'decimal' })
        .format(1.1)
        .replace(/\d/g, '')
        .charAt(0) || '.';
    formatted = formatted.replace('.', decimalSeparator);

    // Handle French: lowercase 'k' and non-breaking spaces
    const isFrench = locale.split(/[-_]/)[0]?.toLowerCase() === 'fr';
    const nbSp = isFrench ? '\xa0' : ' ';

    if (isFrench && formatted.match(/[KMBT]$/)) {
      let suffix = formatted.slice(-1);
      const numberPart = formatted.slice(0, -1);
      if (suffix === 'K') suffix = 'k';
      formatted = `${numberPart}${nbSp}${suffix}`;
    }

    const currencyFormatter = getIntlNumberFormatter(locale, {
      style: 'currency',
      currency: currentCurrency,
      currencyDisplay: 'narrowSymbol',
    });
    const currencySymbol = currencyFormatter
      .format(1)
      .replace(/[\d.,\s]/g, '')
      .trim();
    const isCurrencyAfter = currencyFormatter
      .format(1)
      .endsWith(currencySymbol);

    return isCurrencyAfter
      ? `${value < 0 ? '-' : ''}${formatted}${nbSp}${currencySymbol}`
      : `${value < 0 ? '-' : ''}${currencySymbol}${formatted}`;
  };

  // Format market cap with M/B suffixes and 2 decimal places
  const marketCap =
    marketData.marketCap && marketData.marketCap > 0
      ? formatCurrency(marketData.marketCap * multiplier)
      : null;

  // Format total volume with M/B suffixes and 2 decimal places
  const totalVolume =
    marketData.totalVolume && marketData.totalVolume > 0
      ? formatCurrency(marketData.totalVolume * multiplier)
      : null;

  const volumeToMarketCap =
    marketData.marketCap && marketData.totalVolume && marketData.marketCap > 0
      ? formatWithThreshold(
          marketData.totalVolume / marketData.marketCap,
          0.0001,
          locale,
          {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )
      : null;

  // Format circulating supply with K/M/B suffixes and 2 decimal places
  const circulatingSupply =
    marketData.circulatingSupply && marketData.circulatingSupply > 0
      ? (() => {
          const absValue = Math.abs(marketData.circulatingSupply);
          const isNegative = marketData.circulatingSupply < 0;

          // For values < 1K, use standard decimal formatting
          if (absValue < 1_000) {
            const formatter = getIntlNumberFormatter(locale, {
              style: 'decimal',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return formatter.format(marketData.circulatingSupply);
          }

          // Use localizeLargeNumber for values >= 1K
          const i18n = { t: (key: string) => strings(key) };
          let formatted = localizeLargeNumber(i18n, absValue, {
            includeK: true,
          });

          // Get locale-specific decimal separator and replace if needed
          const sampleFormatter = getIntlNumberFormatter(locale, {
            style: 'decimal',
          });
          const decimalSeparator =
            sampleFormatter.format(1.1).replace(/\d/g, '').charAt(0) || '.';
          formatted = formatted.replace('.', decimalSeparator);

          // Handle French: lowercase 'k' and non-breaking space
          const isFrench = locale.split(/[-_]/)[0]?.toLowerCase() === 'fr';
          if (isFrench && formatted.match(/[KMBT]$/)) {
            const suffix = formatted.slice(-1);
            const numberPart = formatted.slice(0, -1);
            const finalSuffix = suffix === 'K' ? 'k' : suffix;
            return `${isNegative ? '-' : ''}${numberPart}\xa0${finalSuffix}`;
          }

          return `${isNegative ? '-' : ''}${formatted}`;
        })()
      : null;

  const allTimeHigh =
    marketData.allTimeHigh && marketData.allTimeHigh > 0
      ? formatWithThreshold(marketData.allTimeHigh * multiplier, 0.01, locale, {
          style: 'currency',
          currency: currentCurrency,
        })
      : null;

  const allTimeLow =
    marketData.allTimeLow && marketData.allTimeLow > 0
      ? formatWithThreshold(marketData.allTimeLow * multiplier, 0.01, locale, {
          style: 'currency',
          currency: currentCurrency,
        })
      : null;

  // Format fully diluted with M/B suffixes and 2 decimal places
  const fullyDiluted =
    marketData.dilutedMarketCap && marketData.dilutedMarketCap > 0
      ? formatCurrency(marketData.dilutedMarketCap * multiplier)
      : null;

  return {
    marketCap,
    totalVolume,
    volumeToMarketCap,
    circulatingSupply,
    allTimeHigh,
    allTimeLow,
    fullyDiluted,
  };
};
