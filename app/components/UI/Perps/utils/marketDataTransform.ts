import type {
  PerpsMarketData,
  HyperLiquidMarketData,
} from '../components/PerpsMarketListView/PerpsMarketListView.types';

/**
 * Transform raw HyperLiquid market data to UI-friendly format
 * @param hyperLiquidData - Raw data from HyperLiquid API
 * @returns Transformed market data ready for UI consumption
 */
export function transformMarketData(
  hyperLiquidData: HyperLiquidMarketData,
): PerpsMarketData[] {
  const { universe, assetCtxs, allMids } = hyperLiquidData;

  return universe.map((asset) => {
    const symbol = asset.name;
    const currentPrice = parseFloat(allMids[symbol] || '0');

    // Find matching asset context for additional data
    // Note: assetCtxs array from metaAndAssetCtxs might have different structure
    // The array index should correspond to the universe array index
    const assetCtx = assetCtxs[universe.indexOf(asset)];

    // Calculate 24h change
    const prevDayPrice = assetCtx ? parseFloat(assetCtx.prevDayPx || '0') : 0;
    const change24h = currentPrice - prevDayPrice;
    const change24hPercent =
      prevDayPrice > 0 ? (change24h / prevDayPrice) * 100 : 0;

    // Format volume (dayNtlVlm is daily notional volume)
    const volume = assetCtx ? parseFloat(assetCtx.dayNtlVlm || '0') : 0;

    return {
      symbol,
      name: symbol, // HyperLiquid uses symbol as name
      maxLeverage: `${asset.maxLeverage}x`,
      price: formatPrice(currentPrice),
      change24h: formatChange(change24h),
      change24hPercent: formatPercentage(change24hPercent),
      volume: formatVolume(volume),
    };
  });
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';

  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  }
  return `$${price.toFixed(6)}`;
}

/**
 * Format 24h change with sign
 */
export function formatChange(change: number): string {
  if (change === 0) return '$0.00';

  const sign = change > 0 ? '+' : '';
  const absChange = Math.abs(change);

  if (absChange >= 1000) {
    return `${sign}$${change.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (absChange >= 1) {
    return `${sign}$${change.toFixed(2)}`;
  }
  if (absChange >= 0.01) {
    return `${sign}$${change.toFixed(4)}`;
  }
  return `${sign}$${change.toFixed(6)}`;
}

/**
 * Format percentage change with sign
 */
export function formatPercentage(percent: number): string {
  if (percent === 0) return '0.00%';

  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Format volume with appropriate units
 */
export function formatVolume(volume: number): string {
  if (volume === 0) return '$0';

  if (volume >= 1e9) {
    return `$${(volume / 1e9).toFixed(2)}B`;
  }
  if (volume >= 1e6) {
    return `$${(volume / 1e6).toFixed(2)}M`;
  }
  if (volume >= 1e3) {
    return `$${(volume / 1e3).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
}
