import { EVENT_NAME } from '../../../core/Analytics/MetaMetrics.events';
import type { ABTestAnalyticsMapping } from '../../../util/analytics/abTestAnalytics.types';

/**
 * Shared Perps screen vs bottom-sheet experiment.
 *
 * Assignment is independent of Lite/Pro mode: bottom-sheet users get that
 * mode's new sheets, while screen users keep full-page flows in both modes.
 *
 * LaunchDarkly: JSON threshold array, default 0% bottom sheets (`control`
 * served to 100%) until product signs off. See
 * `docs/perps/perps-ab-testing.md`.
 *
 * Consume via `usePerpsScreenVsBottomSheetAbTest()` — do not call `useABTest`
 * with this flag from conversion tickets.
 *
 * Flag key follows `{team}{TICKET}Abtest{TestName}` using TAT-3938 (the
 * experiment-setup ticket). Later conversion tickets reuse this same key.
 */
export const PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY =
  'perpsTAT3938AbtestScreenVsBottomSheet';

export enum ScreenVsBottomSheetVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface ScreenVsBottomSheetVariantConfig {
  useBottomSheet: boolean;
}

export const SCREEN_VS_BOTTOM_SHEET_VARIANTS: Record<
  ScreenVsBottomSheetVariant,
  ScreenVsBottomSheetVariantConfig
> = {
  [ScreenVsBottomSheetVariant.Control]: { useBottomSheet: false },
  [ScreenVsBottomSheetVariant.Treatment]: { useBottomSheet: true },
};

export const SCREEN_VS_BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Perps Screen vs Bottom Sheet',
  variationNames: {
    control: 'Screen',
    treatment: 'Bottom sheet',
  },
} as const;

export const SCREEN_VS_BOTTOM_SHEET_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
    validVariants: Object.values(ScreenVsBottomSheetVariant),
    eventNames: [
      EVENT_NAME.PERPS_POSITION_CLOSE_TRANSACTION,
      EVENT_NAME.PERPS_MARGIN_ADJUSTMENT_TRANSACTION,
      EVENT_NAME.PERPS_TRANSACTION_CONSIDERED,
      EVENT_NAME.PERPS_TRADE_QUOTE_RECEIVED,
      EVENT_NAME.PERPS_TRADE_TRANSACTION,
    ],
  };

/**
 * TAT-3793: Perps home Explore table.
 *
 * Control keeps the stacked Watchlist, Products, and category sections.
 * Treatment replaces those six sections with one tabbed Explore table.
 *
 * Dark-launch the LaunchDarkly JSON flag at 100% control (control threshold
 * `1`, treatment threshold `0`), then move to 50/50. Missing, invalid, or
 * unresolved assignments fall back to `control` inside `useABTest`.
 *
 * Consume via `usePerpsHomeExploreAbTest()` — do not read the raw flag.
 */
export const PERPS_HOME_EXPLORE_AB_TEST_KEY =
  'perpsTAT3793AbtestPerpsHomeExplore';

export enum PerpsHomeExploreVariant {
  Control = 'control',
  Treatment = 'treatment',
}

export interface PerpsHomeExploreVariantConfig {
  showExploreTable: boolean;
}

export const PERPS_HOME_EXPLORE_VARIANTS: Record<
  PerpsHomeExploreVariant,
  PerpsHomeExploreVariantConfig
> = {
  [PerpsHomeExploreVariant.Control]: { showExploreTable: false },
  [PerpsHomeExploreVariant.Treatment]: { showExploreTable: true },
};

export const PERPS_HOME_EXPLORE_AB_TEST_EXPOSURE_OPTIONS = {
  experimentName: 'Perps Home Explore Table',
  variationNames: {
    control: 'Stacked sections',
    treatment: 'Explore table',
  },
} as const;

export const PERPS_HOME_EXPLORE_AB_TEST_ANALYTICS_MAPPING: ABTestAnalyticsMapping =
  {
    flagKey: PERPS_HOME_EXPLORE_AB_TEST_KEY,
    validVariants: Object.values(PerpsHomeExploreVariant),
    eventNames: [
      EVENT_NAME.PERPS_SCREEN_VIEWED,
      EVENT_NAME.PERPS_UI_INTERACTION,
      EVENT_NAME.PERPS_TRANSACTION_CONSIDERED,
      EVENT_NAME.PERPS_TRADE_TRANSACTION,
      EVENT_NAME.PERPS_ERROR,
    ],
  };
