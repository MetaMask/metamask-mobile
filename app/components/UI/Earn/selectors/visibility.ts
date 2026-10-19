import { createSelector } from 'reselect';
import { selectIsEarnSectionEligible } from './eligibility';
import {
  selectEarnHomeSectionEnabledFlag,
  selectExploreEarnSectionEnabledFlag,
} from './featureFlags';

export const selectIsExploreEarnSectionVisible = createSelector(
  selectExploreEarnSectionEnabledFlag,
  selectIsEarnSectionEligible,
  (isExploreEarnSectionEnabled, isEarnSectionEligible) =>
    isExploreEarnSectionEnabled && isEarnSectionEligible,
);

export const selectIsHomepageEarnSectionVisible = createSelector(
  selectEarnHomeSectionEnabledFlag,
  selectIsEarnSectionEligible,
  (isHomepageEarnSectionEnabled, isEarnSectionEligible) =>
    isHomepageEarnSectionEnabled && isEarnSectionEligible,
);
