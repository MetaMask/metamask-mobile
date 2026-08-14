import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { PerpsMarketData, PerpsMode } from '@metamask/perps-controller';

/** Fixed header height, in px. */
export const PERPS_MARKET_HEADER_HEIGHT = 64;

export interface PerpsMarketHeaderTestIDs {
  container: string;
  backButton: string;
  assetIcon: string;
  assetName: string;
  subtitle: string;
  marketListButton: string;
  headerPrice: string;
  headerPriceChange: string;
  walletButton?: string;
  favoriteButton?: string;
}

export interface PerpsMarketHeaderProps {
  market: Partial<PerpsMarketData> & { symbol: string };
  testIDs: PerpsMarketHeaderTestIDs;
  onBackPress?: () => void;
  /**
   * When provided, the asset identity (icon + name + leverage) becomes a tap
   * target that opens the market list, and a trailing caret is shown.
   */
  onIdentityPress?: () => void;
  /** Whether to render the market identity content in the header. */
  showMarketIdentity?: boolean;
  /** When set, replaces the default right-side action row entirely. */
  endAccessory?: ReactNode;
  /** Default action row — ignored when `endAccessory` is provided. */
  onWalletPress?: () => void;
  onFavoritePress?: () => void;
  isFavorite?: boolean;
  mode?: PerpsMode;
  onModeChange?: (mode: PerpsMode) => void;
  /**
   * Scroll offset from the parent's `Animated.ScrollView`, shared via
   * `useHeaderStandardAnimated()`. Drives the subtitle/price crossfade.
   */
  scrollY?: SharedValue<number>;
  /**
   * Height of the scrollable price section above the header's threshold
   * (e.g. `PRICE_SECTION_HEIGHT` from `PerpsMarketSummary`).
   */
  priceSectionHeight?: SharedValue<number>;
}
