import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import type { RouteRestoreDecision } from '../navigation/routeRestoration';
import { MINUTE, SECOND } from '../../constants/time';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';

/**
 * Coarse buckets rather than a raw duration: the question this answers is
 * whether the restore window is set to the right length, which needs a
 * distribution rather than a timestamp.
 */
const bucketTimeAway = (ms: number | null): string => {
  if (ms === null) {
    return 'unknown';
  }
  if (ms < 30 * SECOND) {
    return 'under_30s';
  }
  if (ms < MINUTE) {
    return '30s_1m';
  }
  if (ms < 5 * MINUTE) {
    return '1m_5m';
  }
  if (ms < 15 * MINUTE) {
    return '5m_15m';
  }
  return 'over_15m';
};

/**
 * Records what the unlock decided, on both branches. The rejected ones carry
 * the weight: during rollout they are the only way to tell a feature that is
 * working from one that never fires, and the routes they name are evidence for
 * what the allow-list is missing.
 *
 * Route names only — never params, which is where amounts and addresses live.
 *
 * @param decision - The outcome of the restore rule.
 * @param timeAwayMs - How long the app was backgrounded, or null if unknown.
 */
export const trackRouteRestoreEvaluated = (
  decision: RouteRestoreDecision,
  timeAwayMs: number | null,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.ROUTE_RESTORE_EVALUATED,
      )
        .addProperties({
          restored: decision.restore,
          rejection_reason: decision.restore ? null : decision.reason,
          route: decision.route ?? null,
          // False means the user was deeper and was trimmed back to their
          // section's home, which is worth separating when reading adoption.
          restored_exact: decision.restore ? decision.exact : null,
          time_away: bucketTimeAway(timeAwayMs),
        })
        .build(),
    );
  } catch (error) {
    // Never throw from analytics tracking - log and continue
    Logger.error(
      error as Error,
      'Error tracking Route Restore Evaluated - analytics tracking failed',
    );
  }
};
