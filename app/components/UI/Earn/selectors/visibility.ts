import { createSelector } from 'reselect';
import { selectIsEarnSectionEligible } from './eligibility';
import { selectExploreEarnSectionEnabledFlag } from './featureFlags';

export const selectIsExploreEarnSectionVisible = createSelector(
  selectExploreEarnSectionEnabledFlag,
  selectIsEarnSectionEligible,
  (isExploreEarnSectionEnabled, isEarnSectionEligible) =>
    isExploreEarnSectionEnabled && isEarnSectionEligible,
);
