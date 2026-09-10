import {
  useABTest,
  type ABTestExposureMetadata,
} from '../../../../hooks/useABTest';
import {
  BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
  BOTTOM_SHEET_VARIANTS,
  PERPS_BOTTOM_SHEET_AB_TEST_KEY,
  type BottomSheetVariantConfig,
} from '../abTestConfig';

export interface UsePerpsBottomSheetAbTestResult {
  variant: BottomSheetVariantConfig;
  variantName: string;
  isActive: boolean;
  /**
   * True when the user is assigned treatment. Conversion routers should
   * present the bottom-sheet UI; otherwise keep the full-page flow.
   * Independent of Lite/Pro mode.
   */
  useBottomSheet: boolean;
}

/**
 * Shared assignment for the Perps bottom-sheet rollout (TAT-3938).
 *
 * Every full-page → bottom-sheet conversion (starting with Close Position,
 * TAT-3552) must read this hook instead of defining its own experiment.
 * `useABTest` emits Experiment Viewed once per session per assignment.
 */
export function usePerpsBottomSheetAbTest(
  exposureMetadata?: Pick<
    ABTestExposureMetadata<typeof BOTTOM_SHEET_VARIANTS>,
    'trackExposure'
  >,
): UsePerpsBottomSheetAbTestResult {
  const { variant, variantName, isActive } = useABTest(
    PERPS_BOTTOM_SHEET_AB_TEST_KEY,
    BOTTOM_SHEET_VARIANTS,
    {
      ...BOTTOM_SHEET_AB_TEST_EXPOSURE_OPTIONS,
      ...exposureMetadata,
    },
  );

  return {
    variant,
    variantName,
    isActive,
    useBottomSheet: variant.presentation === 'bottomSheet',
  };
}
