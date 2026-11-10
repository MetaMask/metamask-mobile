import { useABTest } from '../../../../hooks/useABTest';
import {
  PERPS_LIVE_TRADES_AB_TEST_EXPOSURE_OPTIONS,
  PERPS_LIVE_TRADES_AB_TEST_KEY,
  PERPS_LIVE_TRADES_VARIANTS,
} from '../abTestConfig';

export interface UsePerpsLiveTradesAbTestResult {
  /**
   * True only for the treatment assignment. Control, and any missing or
   * invalid flag, keep the Social section without Live trades.
   */
  readonly showLiveTrades: boolean;
  readonly variantName: string;
  readonly isActive: boolean;
}

/**
 * Resolves the Perps home Live trades experiment.
 *
 * `useABTest` emits Experiment Viewed once per session per assignment.
 * Do not read the raw flag or emit exposure from the call site.
 */
export function usePerpsLiveTradesAbTest(): UsePerpsLiveTradesAbTestResult {
  const { variant, variantName, isActive } = useABTest(
    PERPS_LIVE_TRADES_AB_TEST_KEY,
    PERPS_LIVE_TRADES_VARIANTS,
    PERPS_LIVE_TRADES_AB_TEST_EXPOSURE_OPTIONS,
  );

  return {
    showLiveTrades: variant?.showLiveTrades ?? false,
    variantName,
    isActive,
  };
}
