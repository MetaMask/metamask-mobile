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
