import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_HOME_EXPLORE_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_HOME_EXPLORE_AB_TEST_KEY,
  PERPS_HOME_EXPLORE_VARIANTS,
} from '../abTestConfig';

export interface UsePerpsHomeExploreAbTestResult {
  /**
   * True only for the treatment assignment. Control, and any missing or
   * invalid flag, keep the stacked Perps home sections.
   */
  readonly showExploreTable: boolean;
  readonly variantName: string;
  readonly isActive: boolean;
}

/**
 * Resolves the Perps home Explore table experiment.
 *
 * `useABTest` emits Experiment Viewed once per session per assignment.
 * Do not read the raw flag or emit exposure from the call site.
 */
export function usePerpsHomeExploreAbTest(): UsePerpsHomeExploreAbTestResult {
  const { variant, variantName, isActive } = useABTest(
    PERPS_HOME_EXPLORE_AB_TEST_KEY,
    PERPS_HOME_EXPLORE_VARIANTS,
    PERPS_HOME_EXPLORE_AB_TEST_EXPOSURE_OPTIONS,
  );

  return {
    showExploreTable: variant?.showExploreTable ?? false,
    variantName,
    isActive,
  };
}
