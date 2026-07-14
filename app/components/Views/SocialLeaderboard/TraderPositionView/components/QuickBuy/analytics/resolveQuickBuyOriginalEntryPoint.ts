import type { TraderProfileScreenViewedSource } from '../../../../analytics';
import type { QuickBuyOriginalEntryPoint } from './quickBuyEvents';

const PROFILE_SOURCE_TO_ENTRY_POINT: Record<
  TraderProfileScreenViewedSource,
  QuickBuyOriginalEntryPoint
> = {
  leaderboard: 'leaderboard',
  home_carousel: 'home_carousel',
  notification: 'notification',
  deep_link: 'trader_profile',
};

const POSITION_SOURCE_TO_ENTRY_POINT: Partial<
  Record<string, QuickBuyOriginalEntryPoint>
> = {
  leaderboard: 'leaderboard',
  notification: 'notification',
  deep_link: 'deep_link',
  home_carousel: 'home_carousel',
  profile_position: 'trader_profile',
};

/**
 * Maps the trader-profile upstream `source` route param into the Quick Buy
 * `original_entry_point` for flows that reach the trade screen via profile.
 */
export function resolveQuickBuyOriginalEntryPointFromProfile(
  profileSource: TraderProfileScreenViewedSource,
): QuickBuyOriginalEntryPoint {
  return PROFILE_SOURCE_TO_ENTRY_POINT[profileSource];
}

/**
 * Fallback when `originalEntryPoint` was not forwarded on the position route
 * (e.g. legacy navigations). Prefer an explicit route param when available.
 */
export function resolveQuickBuyOriginalEntryPointFromPositionSource(
  positionSource?: string,
): QuickBuyOriginalEntryPoint | undefined {
  return positionSource
    ? POSITION_SOURCE_TO_ENTRY_POINT[positionSource]
    : undefined;
}

const QUICK_BUY_ORIGINAL_ENTRY_POINTS: readonly QuickBuyOriginalEntryPoint[] = [
  'leaderboard',
  'trader_profile',
  'notification',
  'deep_link',
  'home_carousel',
];

/** Validates a route param into the Quick Buy `original_entry_point` enum. */
export function narrowQuickBuyOriginalEntryPoint(
  value?: string,
): QuickBuyOriginalEntryPoint | undefined {
  if (!value) {
    return undefined;
  }
  return QUICK_BUY_ORIGINAL_ENTRY_POINTS.includes(
    value as QuickBuyOriginalEntryPoint,
  )
    ? (value as QuickBuyOriginalEntryPoint)
    : undefined;
}
