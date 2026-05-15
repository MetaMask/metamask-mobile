import { useMemo } from 'react';

import { useABTest } from '../../../../hooks';
import {
  getHomepagePerpsPillsEmptyTransactionActiveAbTests,
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS,
  HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
} from '../abTestConfig';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/**
 * `active_ab_tests` payload for perps flows entered from the homepage perps
 * **empty** surface (no open positions/orders), mirroring
 * `useHomepageTrendingTransactionActiveAbTests`.
 */
export function useHomepagePerpsPillsEmptyTransactionActiveAbTests(
  isHomepagePerpsEmptySurface: boolean,
): TransactionActiveAbTestEntry[] | undefined {
  const { variantName, isActive } = useABTest(
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS,
  );

  return useMemo(
    () =>
      getHomepagePerpsPillsEmptyTransactionActiveAbTests(
        isActive && isHomepagePerpsEmptySurface,
        variantName,
      ),
    [isActive, isHomepagePerpsEmptySurface, variantName],
  );
}
