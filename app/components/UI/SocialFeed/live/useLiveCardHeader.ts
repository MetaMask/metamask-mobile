import type { View } from 'react-native';
import type { PositionCardHeaderLiveState } from '../components/PositionCardHeader';
import { formatLiveFigures } from './formatLiveFigures';
import type { SocialLivePriceSource } from './types';
import { useSocialLivePrice } from './useSocialLivePrice';

export interface LiveCardHeaderLabels {
  priceLabel?: string;
  marketCapLabel?: string;
  pnlLabel: string;
  pnlValueLabel?: string;
  isPnlPositive: boolean;
}

export interface UseLiveCardHeaderResult extends LiveCardHeaderLabels {
  trackRef: React.RefObject<View | null>;
  /**
   * Pass to `PositionCardHeader`. `undefined` until the first tick, and while
   * the card is off screen or the list is scrolling, so those cards render
   * plain text instead of digit reels.
   */
  live?: PositionCardHeaderLiveState;
}

/**
 * Open card header labels, following the live price once one arrives and the
 * API snapshot until then. A figure the live math cannot produce keeps its
 * snapshot label.
 */
export function useLiveCardHeader(
  id: string,
  source: SocialLivePriceSource | undefined,
  snapshot: LiveCardHeaderLabels,
): UseLiveCardHeaderResult {
  const { trackRef, figures, animated, reduceMotion } = useSocialLivePrice(
    id,
    source,
  );

  if (!figures || !source) {
    return { ...snapshot, trackRef };
  }

  const labels = formatLiveFigures(figures);
  return {
    trackRef,
    priceLabel: labels.priceLabel,
    marketCapLabel: labels.marketCapLabel ?? snapshot.marketCapLabel,
    pnlLabel: labels.pnlLabel ?? snapshot.pnlLabel,
    pnlValueLabel: labels.pnlValueLabel ?? snapshot.pnlValueLabel,
    isPnlPositive: labels.isPnlPositive ?? snapshot.isPnlPositive,
    live: animated ? { reduceMotion } : undefined,
  };
}
