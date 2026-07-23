import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

/**
 * TAT-1937: Long/Short Button Color Test
 *
 * Tests the impact of button colors on trading behavior:
 * - Control (default/fallback): White buttons for both, reduces risk anxiety and promotes balanced participation
 * - Colors: Traditional green (long) / red (short), familiar and intuitive
 *
 * `control` is the required fallback key for `useABTest` (see `app/hooks/useABTest.ts`),
 * so it is always what's shown when the flag is absent, invalid, or the test is inactive —
 * white is therefore the default experience, and `colors` is the active-experiment variant.
 *
 * Migrated to the canonical A/B testing standard (see `docs/ab-testing.md`) under TAT-3308.
 *
 * LaunchDarkly flag setup: version-gated to app version 8.3.0+ using the
 * `versions` + `thresholdVersion: 2` composition (resolved entirely by
 * RemoteFeatureFlagController — no app-side version check needed). See
 * `docs/perps/perps-feature-flags.md` for the exact flag JSON.
 */
export const PERPS_BUTTON_COLOR_AB_TEST_KEY = 'perpsTAT1937AbtestButtonColor';

export enum ButtonColorVariant {
  Control = 'control',
  Colors = 'colors',
}

export interface ButtonColorVariantConfig {
  long: string;
  short: string;
}

export const BUTTON_COLOR_VARIANTS: Record<
  ButtonColorVariant,
  ButtonColorVariantConfig
> = {
  [ButtonColorVariant.Control]: { long: 'white', short: 'white' },
  [ButtonColorVariant.Colors]: { long: 'green', short: 'red' },
};

export const BUTTON_COLOR_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping = {
  flagKey: PERPS_BUTTON_COLOR_AB_TEST_KEY,
  validVariants: Object.values(ButtonColorVariant),
  eventNames: [EVENT_NAME.PERPS_SCREEN_VIEWED, EVENT_NAME.PERPS_UI_INTERACTION],
};
