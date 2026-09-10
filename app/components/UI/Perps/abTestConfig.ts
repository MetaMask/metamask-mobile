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

/**
 * TAT-3938: Perps bottom-sheet rollout
 *
 * One experiment for every full-page → bottom-sheet conversion (Close Position
 * TAT-3552 and later tickets). Assignment is independent of Lite/Pro mode:
 * treatment users get that mode's new sheets; control users keep full-page
 * flows in both modes.
 *
 * LaunchDarkly: JSON threshold array, default 0% treatment (`control` served
 * to 100%) until product signs off. See `docs/perps/perps-ab-testing.md`.
 *
 * Consume via `usePerpsBottomSheetAbTest()` — do not call `useABTest` with
 * this flag from conversion tickets.
 */
export const PERPS_BOTTOM_SHEET_AB_TEST_KEY = 'perpsTAT3938AbtestBottomSheets';

export enum BottomSheetVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export type PerpsFlowPresentation = 'fullPage' | 'bottomSheet';

export interface BottomSheetVariantConfig {
  presentation: PerpsFlowPresentation;
}

export const BOTTOM_SHEET_VARIANTS: Record<
  BottomSheetVariant,
  BottomSheetVariantConfig
> = {
  [BottomSheetVariant.Control]: { presentation: 'fullPage' },
  [BottomSheetVariant.Treatment]: { presentation: 'bottomSheet' },
};

export const BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Perps Bottom Sheet Rollout',
  variationNames: {
    control: 'Full-page flows',
    treatment: 'Bottom-sheet flows',
  },
} as const;

export const BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping = {
  flagKey: PERPS_BOTTOM_SHEET_AB_TEST_KEY,
  validVariants: Object.values(BottomSheetVariant),
  eventNames: [
    EVENT_NAME.PERPS_SCREEN_VIEWED,
    EVENT_NAME.PERPS_UI_INTERACTION,
    EVENT_NAME.PERPS_POSITION_CLOSE_TRANSACTION,
    EVENT_NAME.PERPS_TRADE_TRANSACTION,
  ],
};
