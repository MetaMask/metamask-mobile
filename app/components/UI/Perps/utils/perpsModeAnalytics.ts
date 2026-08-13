/**
 * Lite/Pro Perps mode as a MetaMetrics property.
 *
 * Deliberately a leaf module: it imports only the Redux store and the mode
 * selector, never `app/core/Engine`. `app/util/analytics/analytics.ts` loads
 * this at module scope, and it keeps Engine out of that module graph on
 * purpose — Engine is lazily required there to avoid circular imports.
 */

import {
  DEFAULT_PERPS_MODE,
  type PerpsAnalyticsProperties,
} from '@metamask/perps-controller';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { store } from '../../../../store';
import { selectPerpsMode } from '../selectors/perpsController';

/**
 * Analytics property for Lite/Pro Perps interface mode.
 *
 * Kept separate from `PERPS_EVENT_PROPERTY.MODE` (`"mode"`), which search
 * already uses for query intent (`discovery` / `intent` / `browse`).
 */
export const PERPS_MODE_ANALYTICS_PROPERTY = 'perps_mode' as const;

/**
 * Snapshot the current Lite/Pro interface mode as an analytics property.
 *
 * Injected onto every Perps MetaMetrics event so funnels can segment by
 * `perps_mode: 'lite' | 'pro'`. Callers that already set `perps_mode`
 * (e.g. mode-toggle emitting the *next* mode) win over this snapshot.
 *
 * Best-effort: enrichment must never take down event emission. On failure we
 * fall back to `DEFAULT_PERPS_MODE` rather than omit the property, so dashboards
 * always see a defined mode.
 */
export function getPerpsModeAnalyticsProperties(): PerpsAnalyticsProperties {
  try {
    return {
      [PERPS_MODE_ANALYTICS_PROPERTY]: selectPerpsMode(store.getState()),
    };
  } catch (error) {
    DevLogger.log(
      '[perpsModeAnalytics] Perps mode lookup failed; falling back to default mode',
      error,
    );
    return {
      [PERPS_MODE_ANALYTICS_PROPERTY]: DEFAULT_PERPS_MODE,
    };
  }
}
