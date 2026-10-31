import { useABTest } from '../../../../hooks/useABTest';
import {
  FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS,
  FEE_DISPLAY_AB_TEST_KEY,
  FEE_DISPLAY_VARIANTS,
} from '../abTestConfig';

export interface UsePerpsFeeDisplayAbTestResult {
  /**
   * `'dollar'` for control, and for any missing, invalid, or inactive
   * assignment. `'percentage'` only for an active treatment assignment.
   */
  readonly feeDisplayMode: 'dollar' | 'percentage';
  readonly variantName: string;
  readonly isActive: boolean;
}

/**
 * Resolves the Perps fee display format experiment: $ amount vs.
 * Taker/Maker percentage rates on the order entry/review fee row.
 *
 * Every order-entry/review surface must use this hook instead of calling
 * `useABTest` with this flag directly. `useABTest` emits Experiment Viewed
 * once per session per assignment.
 */
export function usePerpsFeeDisplayAbTest(): UsePerpsFeeDisplayAbTestResult {
  const { variant, variantName, isActive } = useABTest(
    FEE_DISPLAY_AB_TEST_KEY,
    FEE_DISPLAY_VARIANTS,
    FEE_DISPLAY_AB_TEST_EXPOSURE_OPTIONS,
  );

  return {
    feeDisplayMode: variant?.feeDisplayMode ?? 'dollar',
    variantName,
    isActive,
  };
}
