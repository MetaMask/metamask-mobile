import type { Json } from '@metamask/utils';
import Engine from '../../core/Engine';
import { PERPS_ADVANCED_CHART_ENABLED_FLAG_KEY } from '../../components/UI/Perps/selectors/featureFlags';
import { markPerpsChartPinFailed } from './deferredRenderTtc';

/**
 * `perpsAdvancedChartEnabledV2` productionDefault from
 * tests/feature-flags/feature-flag-registry.ts.
 * `validatedVersionGatedFeatureFlag` resolves this to enabled on app versions
 * that meet 8.3.0 (this checkout is 8.18.0), so market details use AdvancedChart.
 */
export const PERPS_ADVANCED_CHART_PRODUCTION_DEFAULT = {
  enabled: true,
  minimumVersion: '8.3.0',
} as const;

let pinned = false;

/**
 * True only in performance-test bundles, where Babel inlines
 * `IS_PERFORMANCE_TEST`. Smoke e2e and release builds stay false.
 */
export const isDeferredRenderPerformanceBuild =
  process.env.IS_PERFORMANCE_TEST === 'true';

/**
 * Pins the perps advanced-chart flag for a performance run.
 * Uses RemoteFeatureFlagController.setFlagOverride, which wins over a later
 * client-config fetch. No-ops outside performance-test builds.
 */
export function pinPerpsAdvancedChartProductionDefault(
  enabled: boolean = isDeferredRenderPerformanceBuild,
): void {
  if (!enabled || pinned) {
    return;
  }
  const controller = Engine.context?.RemoteFeatureFlagController;
  if (!controller) {
    markPerpsChartPinFailed();
    return;
  }
  pinned = true;
  controller.setFlagOverride(
    PERPS_ADVANCED_CHART_ENABLED_FLAG_KEY,
    PERPS_ADVANCED_CHART_PRODUCTION_DEFAULT as Json,
  );
}

/** Test-only reset. */
export function _resetDeferredRenderFlagPinForTesting(): void {
  pinned = false;
}
