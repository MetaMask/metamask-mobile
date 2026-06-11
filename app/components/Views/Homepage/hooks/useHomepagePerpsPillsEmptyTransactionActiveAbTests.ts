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
 * **pills empty** surface (TMCU-725 treatment content is configured and shown).
 */
export function useHomepagePerpsPillsEmptyTransactionActiveAbTests(
  isHomepagePerpsPillsEmptySurface: boolean,
): TransactionActiveAbTestEntry[] | undefined {
  const { variantName, isActive } = useABTest(
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_TEST_EXPOSURE_OPTIONS,
  );

  return useMemo(
    () =>
      getHomepagePerpsPillsEmptyTransactionActiveAbTests(
        isActive && isHomepagePerpsPillsEmptySurface,
        variantName,
      ),
    [isActive, isHomepagePerpsPillsEmptySurface, variantName],
  );
}
