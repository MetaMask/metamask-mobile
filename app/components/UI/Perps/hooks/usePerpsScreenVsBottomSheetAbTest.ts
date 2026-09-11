import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
  SCREEN_VS_BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
  SCREEN_VS_BOTTOM_SHEET_VARIANTS,
} from '../abTestConfig';

export interface UsePerpsScreenVsBottomSheetAbTestResult {
  /**
   * True when the user is assigned the bottom-sheet experience. Conversion
   * routers otherwise retain the full-screen flow, independently of Lite/Pro.
   */
  readonly useBottomSheet: boolean;
}

/**
 * Resolves the shared Perps screen vs bottom-sheet experiment.
 *
 * Every screen-to-bottom-sheet conversion must use this hook instead of
 * defining its own experiment. `useABTest` emits Experiment Viewed once per
 * session per assignment.
 */
export function usePerpsScreenVsBottomSheetAbTest(): UsePerpsScreenVsBottomSheetAbTestResult {
  const { variant } = useABTest(
    PERPS_SCREEN_VS_BOTTOM_SHEET_AB_TEST_KEY,
    SCREEN_VS_BOTTOM_SHEET_VARIANTS,
    SCREEN_VS_BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
  );

  return { useBottomSheet: variant.useBottomSheet };
}
