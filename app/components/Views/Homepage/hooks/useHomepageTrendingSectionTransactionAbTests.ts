import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { setTransactionActiveAbTests } from '../../../../core/redux/slices/bridge';
import { useHomepageTrendingAbTest } from '../context/HomepageTrendingAbTestContext';
import { HOMEPAGE_TRENDING_SECTIONS_AB_KEY } from '../abTestConfig';

/**
 * Tag or clear `transactionActiveAbTests` when entering Perps / Predict from the homepage
 * so Transaction Added can include `active_ab_tests` for the homepage trending-sections A/B.
 */
export function useHomepageTrendingSectionTransactionAbTests() {
  const dispatch = useDispatch();
  const { variantName, isActive } = useHomepageTrendingAbTest();

  const applyTagForDedicatedTrendingSection = useCallback(() => {
    dispatch(
      setTransactionActiveAbTests(
        isActive
          ? [{ key: HOMEPAGE_TRENDING_SECTIONS_AB_KEY, value: variantName }]
          : undefined,
      ),
    );
  }, [dispatch, isActive, variantName]);

  /** Idempotent: Redux/Immer no-ops when `transactionActiveAbTests` is already undefined. */
  const clearTransactionAbTests = useCallback(() => {
    dispatch(setTransactionActiveAbTests(undefined));
  }, [dispatch]);

  return {
    applyTagForDedicatedTrendingSection,
    clearTransactionAbTests,
  };
}
