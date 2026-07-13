import type { TraderProfileScreenViewedSource } from '../../../../analytics';
import type { QuickBuyOriginalEntryPoint } from './quickBuyEvents';

/**
 * Maps the trader-profile upstream `source` route param into the Quick Buy
 * `original_entry_point` for flows that reach the trade screen via profile.
 */
export function resolveQuickBuyOriginalEntryPointFromProfile(
  profileSource: TraderProfileScreenViewedSource,
): QuickBuyOriginalEntryPoint {
  switch (profileSource) {
    case 'leaderboard':
      return 'leaderboard';
    case 'home_carousel':
      return 'home_carousel';
    case 'notification':
      return 'notification';
    case 'deep_link':
    default:
      return 'trader_profile';
  }
}

/**
 * Fallback when `originalEntryPoint` was not forwarded on the position route
 * (e.g. legacy navigations). Prefer an explicit route param when available.
 */
export function resolveQuickBuyOriginalEntryPointFromPositionSource(
  positionSource?: string,
): QuickBuyOriginalEntryPoint | undefined {
  switch (positionSource) {
    case 'leaderboard':
      return 'leaderboard';
    case 'notification':
      return 'notification';
    case 'deep_link':
      return 'deep_link';
    case 'home_carousel':
      return 'home_carousel';
    case 'profile_position':
      return 'trader_profile';
    default:
      return undefined;
  }
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
