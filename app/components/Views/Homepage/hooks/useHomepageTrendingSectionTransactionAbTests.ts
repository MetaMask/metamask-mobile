import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectTransactionActiveAbTests,
  setTransactionActiveAbTests,
} from '../../../../core/redux/slices/bridge';
import { useHomepageTrendingAbTest } from '../context/HomepageTrendingAbTestContext';
import { HOMEPAGE_TRENDING_SECTIONS_AB_KEY } from '../abTestConfig';

/**
 * Tag or clear `transactionActiveAbTests` when entering Perps / Predict from the homepage
 * so Transaction Added can include `active_ab_tests` for the homepage trending-sections A/B.
 */
export function useHomepageTrendingSectionTransactionAbTests() {
  const dispatch = useDispatch();
  const currentAbTests = useSelector(selectTransactionActiveAbTests);
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

  const clearTransactionAbTests = useCallback(() => {
    if (currentAbTests !== undefined) {
      dispatch(setTransactionActiveAbTests(undefined));
    }
  }, [dispatch, currentAbTests]);

  return {
    applyTagForDedicatedTrendingSection,
    clearTransactionAbTests,
  };
}
