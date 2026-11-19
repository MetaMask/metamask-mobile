import {
  PERPS_CONSTANTS,
  type PerpsMarketData,
  type PriceUpdate,
} from '@metamask/perps-controller';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../../../util/deviceCapability/types';
import {
  formatPercentage,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../../../../../UI/Perps/utils/formatUtils';

export const PERPS_TILE_LIVE_PRICE_THROTTLE_MS = 3000;
export const PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS = 10000;

export interface PerpsTileDeviceTiers {
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
}

export type PerpsTileChangeDirection = 'up' | 'down' | 'unknown';

export interface PerpsTileDisplayValues {
  price: string;
  changePercent: string;
  changeDirection: PerpsTileChangeDirection;
}

export const getPerpsTileLivePriceThrottleMs = (
  tiers?: PerpsTileDeviceTiers,
): number | null => {
  const networkTier = tiers?.networkTier ?? null;

  if (networkTier === 'NONE') {
    return null;
  }
  if (networkTier === 'SLOW_CELLULAR') {
    return PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS;
  }
  if (networkTier !== null && tiers?.hardwareTier === 'LOW') {
    return PERPS_TILE_CONSTRAINED_LIVE_PRICE_THROTTLE_MS;
  }
  return PERPS_TILE_LIVE_PRICE_THROTTLE_MS;
};

const parseDisplayedPercent = (value: string): number =>
  parseFloat(value.replace(/[+,%]/g, ''));

const getChangeDirection = (
  changePercent: string,
): PerpsTileChangeDirection => {
  if (!Number.isFinite(parseDisplayedPercent(changePercent))) {
    return 'unknown';
  }
  return changePercent.startsWith('-') ? 'down' : 'up';
};

export const getPerpsTileDisplayValues = (
  market: Pick<PerpsMarketData, 'price' | 'change24hPercent'>,
  livePrice?: PriceUpdate,
): PerpsTileDisplayValues => {
  const livePriceValue = livePrice ? parseFloat(livePrice.price) : NaN;
  const livePercentValue =
    livePrice?.percentChange24h === undefined
      ? NaN
      : parseFloat(livePrice.percentChange24h);

  const price =
    Number.isFinite(livePriceValue) && livePriceValue > 0
      ? formatPerpsFiat(livePriceValue, { ranges: PRICE_RANGES_UNIVERSAL })
      : market.price || PERPS_CONSTANTS.FallbackPriceDisplay;

  const changePercent = Number.isFinite(livePercentValue)
    ? formatPercentage(livePercentValue)
    : market.change24hPercent || PERPS_CONSTANTS.FallbackPercentageDisplay;

  return {
    price,
    changePercent,
    changeDirection: getChangeDirection(changePercent),
  };
};
