import { useMemo } from 'react';

import { getHomepageTrendingSectionsTransactionActiveAbTests } from '../abTestConfig';
import { useHomepageTrendingAbTest } from '../context/HomepageTrendingAbTestContext';
import type { TransactionActiveAbTestEntry } from '../../../../util/transactions/transaction-active-ab-test-attribution-registry';

/**
 * `active_ab_tests` payload to pass through navigation when the user is in the
 * homepage trending-sections experiment, for attribution on transactions they
 * later submit (bound at tx creation — see transaction-active-ab-test-attribution-registry).
 */
export function useHomepageTrendingTransactionActiveAbTests():
  | TransactionActiveAbTestEntry[]
  | undefined {
  const { variantName, isActive } = useHomepageTrendingAbTest();

  return useMemo(
    () =>
      getHomepageTrendingSectionsTransactionActiveAbTests(
        isActive,
        variantName,
      ),
    [isActive, variantName],
  );
}
