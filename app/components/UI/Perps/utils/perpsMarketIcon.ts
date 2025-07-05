import { HYPERLIQUID_ICONS } from '../constants/marketIcons';

export const getPerpsMarketIcon = (symbol: string): string =>
  HYPERLIQUID_ICONS?.[symbol]?.iconUrl;
