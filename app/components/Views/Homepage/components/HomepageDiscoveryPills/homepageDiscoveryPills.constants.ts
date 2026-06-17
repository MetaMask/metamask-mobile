import { IconName } from '@metamask/design-system-react-native';
import discoveryPillCrypto from '../../../../../images/discovery_pill_crypto.png';
import discoveryPillPerps from '../../../../../images/discovery_pill_perps.png';
import discoveryPillPredictions from '../../../../../images/discovery_pill_predictions.png';
import discoveryPillStocks from '../../../../../images/discovery_pill_stocks.png';

export const HOMEPAGE_DISCOVERY_PILL_IDS = [
  'perpetuals',
  'predictions',
  'stocks',
  'crypto',
] as const;

export type HomepageDiscoveryPillId =
  (typeof HOMEPAGE_DISCOVERY_PILL_IDS)[number];

export const HOMEPAGE_DISCOVERY_PILL_GRAY_ICONS: Record<
  HomepageDiscoveryPillId,
  IconName
> = {
  perpetuals: IconName.Candlestick,
  predictions: IconName.Predictions,
  stocks: IconName.Chart,
  crypto: IconName.Coin,
} as const;

export const HOMEPAGE_DISCOVERY_PILL_COLOR_ICON_SOURCES = {
  perpetuals: discoveryPillPerps,
  predictions: discoveryPillPredictions,
  stocks: discoveryPillStocks,
  crypto: discoveryPillCrypto,
} as const;
