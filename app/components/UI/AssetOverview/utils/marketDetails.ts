import { formatWithThreshold } from '../../../../util/assets';

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
  isEvmNetworkSelected: boolean;
  conversionRate: number;
}

/**
 * Formats market details with consistent formatting options
 */
export const formatMarketDetails = (
  marketData: MarketData,
  options: FormatMarketDetailsOptions,
): MarketDetails => {
  const { locale, currentCurrency, isEvmNetworkSelected, conversionRate } =
    options;

  const marketCap =
    marketData.marketCap && marketData.marketCap > 0
      ? formatWithThreshold(
          isEvmNetworkSelected
            ? marketData.marketCap * conversionRate
            : marketData.marketCap,
          0.01,
          locale,
          {
            style: 'currency',
            notation: 'compact',
            currency: currentCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )
      : null;

  const totalVolume =
    marketData.totalVolume && marketData.totalVolume > 0
      ? formatWithThreshold(
          isEvmNetworkSelected
            ? marketData.totalVolume * conversionRate
            : marketData.totalVolume,
          0.01,
          locale,
          {
            style: 'currency',
            notation: 'compact',
            currency: currentCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )
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

  const circulatingSupply =
    marketData.circulatingSupply && marketData.circulatingSupply > 0
      ? formatWithThreshold(marketData.circulatingSupply, 0.01, locale, {
          style: 'decimal',
          notation: 'compact',
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })
      : null;

  const allTimeHigh =
    marketData.allTimeHigh && marketData.allTimeHigh > 0
      ? formatWithThreshold(
          isEvmNetworkSelected
            ? marketData.allTimeHigh * conversionRate
            : marketData.allTimeHigh,
          0.01,
          locale,
          {
            style: 'currency',
            currency: currentCurrency,
          },
        )
      : null;

  const allTimeLow =
    marketData.allTimeLow && marketData.allTimeLow > 0
      ? formatWithThreshold(
          isEvmNetworkSelected
            ? marketData.allTimeLow * conversionRate
            : marketData.allTimeLow,
          0.01,
          locale,
          {
            style: 'currency',
            currency: currentCurrency,
          },
        )
      : null;

  const fullyDiluted =
    marketData.dilutedMarketCap && marketData.dilutedMarketCap > 0
      ? formatWithThreshold(
          isEvmNetworkSelected
            ? marketData.dilutedMarketCap * conversionRate
            : marketData.dilutedMarketCap,
          0.01,
          locale,
          {
            style: 'currency',
            notation: 'compact',
            currency: currentCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )
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
