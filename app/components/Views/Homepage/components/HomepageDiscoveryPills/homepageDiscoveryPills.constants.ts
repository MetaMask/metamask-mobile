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

/** Segment `section_name` values for `Home Viewed` (`interaction_type: pill_tapped`). */
export const HOMEPAGE_DISCOVERY_PILL_SECTION_NAMES = {
  perpetuals: 'perps',
  predictions: 'predict',
  stocks: 'stocks',
  crypto: 'crypto',
} as const satisfies Record<HomepageDiscoveryPillId, string>;

export type HomepageDiscoveryPillSectionName =
  (typeof HOMEPAGE_DISCOVERY_PILL_SECTION_NAMES)[HomepageDiscoveryPillId];

export const HOMEPAGE_DISCOVERY_PILL_GRAY_ICONS: Record<
  HomepageDiscoveryPillId,
  IconName
> = {
  perpetuals: IconName.Candlestick,
  predictions: IconName.Predictions,
  stocks: IconName.Coin,
  crypto: IconName.Ethereum,
} as const;

export const HOMEPAGE_DISCOVERY_PILL_COLOR_ICON_SOURCES = {
  perpetuals: discoveryPillPerps,
  predictions: discoveryPillPredictions,
  stocks: discoveryPillStocks,
  crypto: discoveryPillCrypto,
} as const;
