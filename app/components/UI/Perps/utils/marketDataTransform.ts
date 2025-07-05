import type {
  PerpsUniverse,
  PerpsAssetCtx,
  AllMids,
} from '@deeeed/hyperliquid-node20';
import {
  PerpsMarketData,
  HyperLiquidMarketData,
} from '../Views/PerpsMarketListView/PerpsMarketListView.types';

/**
 * Formats a number as a price string with appropriate decimal places
 */
const formatPrice = (price: string): string => {
  const num = parseFloat(price);
  if (num >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
      .format(num)
      .replace('$', '$');
  } else if (num >= 1) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
      .format(num)
      .replace('$', '$');
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    })
      .format(num)
      .replace('$', '$');
  }
};

/**
 * Formats a large number (volume) with appropriate suffixes
 */
const formatVolume = (volume: string): string => {
  const num = parseFloat(volume);
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

/**
 * Calculates 24h price change and percentage
 */
const calculatePriceChange = (currentPrice: string, prevDayPrice: string) => {
  const current = parseFloat(currentPrice);
  const previous = parseFloat(prevDayPrice);
  const change = current - previous;
  const changePercent = (change / previous) * 100;

  const formattedChange =
    change >= 0
      ? `+$${Math.abs(change).toFixed(2)}`
      : `-$${Math.abs(change).toFixed(2)}`;
  const formattedPercent =
    change >= 0
      ? `+${changePercent.toFixed(2)}%`
      : `${changePercent.toFixed(2)}%`;

  return {
    change24h: formattedChange,
    change24hPercent: formattedPercent,
  };
};

/**
 * Transforms HyperLiquid SDK data into UI-friendly market data
 */
export const transformMarketData = (
  data: HyperLiquidMarketData,
): PerpsMarketData[] => {
  const { universe, assetCtxs, allMids } = data;

  return universe
    .filter((asset) => !asset.isDelisted) // Filter out delisted assets
    .map((asset, index) => {
      const assetCtx = assetCtxs[index];
      const currentPrice = allMids[asset.name] || assetCtx?.markPx || '0';
      const prevDayPrice = assetCtx?.prevDayPx || '0';
      const volume = assetCtx?.dayNtlVlm || '0';

      const { change24h, change24hPercent } = calculatePriceChange(
        currentPrice,
        prevDayPrice,
      );

      return {
        symbol: asset.name,
        name: asset.name,
        maxLeverage: `${asset.maxLeverage}x`,
        price: formatPrice(currentPrice),
        change24h,
        change24hPercent,
        volume: formatVolume(volume),
      };
    })
    .sort((a, b) => {
      // Sort by 24h trading volume (descending) - largest to smallest
      const getVolumeNumber = (volumeStr: string): number => {
        const cleanStr = volumeStr.replace(/[$,]/g, '');
        if (cleanStr.includes('B')) {
          return parseFloat(cleanStr.replace('B', '')) * 1e9;
        } else if (cleanStr.includes('M')) {
          return parseFloat(cleanStr.replace('M', '')) * 1e6;
        } else if (cleanStr.includes('K')) {
          return parseFloat(cleanStr.replace('K', '')) * 1e3;
        }
        return parseFloat(cleanStr);
      };

      const volumeA = getVolumeNumber(a.volume);
      const volumeB = getVolumeNumber(b.volume);
      return volumeB - volumeA;
    });
};

/**
 * Creates mock market data for testing purposes
 */
export const createMockMarketData = (): PerpsMarketData[] => [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    maxLeverage: '40x',
    price: '$108,844',
    change24h: '-$777',
    change24hPercent: '-0.71%',
    volume: '$2,796,497,269',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    maxLeverage: '25x',
    price: '$2,552.4',
    change24h: '-$46.1',
    change24hPercent: '-1.77%',
    volume: '$1,644,450,691',
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    maxLeverage: '20x',
    price: '$150.34',
    change24h: '-$5.55',
    change24hPercent: '-3.56%',
    volume: '$598,874,983',
  },
  {
    symbol: 'HYPE',
    name: 'Hyperliquid',
    maxLeverage: '10x',
    price: '$38.8',
    change24h: '-$1.90',
    change24hPercent: '-4.67%',
    volume: '$482,432,565',
  },
  {
    symbol: 'FARTCOIN',
    name: 'Fartcoin',
    maxLeverage: '10x',
    price: '$1.18',
    change24h: '-$0.06',
    change24hPercent: '-5.21%',
    volume: '$165,505,993',
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    maxLeverage: '20x',
    price: '$2.23',
    change24h: '-$1.92',
    change24hPercent: '-4.67%',
    volume: '$160,190,261',
  },
  {
    symbol: 'SUI',
    name: 'Sui',
    maxLeverage: '10x',
    price: '$2.93',
    change24h: '-$0.11',
    change24hPercent: '-3.93%',
    volume: '$71,968,105',
  },
  {
    symbol: 'kPEPE',
    name: 'kPepe',
    maxLeverage: '10x',
    price: '$0.009812',
    change24h: '-$0.000877',
    change24hPercent: '-8.21%',
    volume: '$68,805,011',
  },
];
