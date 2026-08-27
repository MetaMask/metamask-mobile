import { createSelector } from 'reselect';
import { selectMoneyEnableMoneyAccountFlag } from './featureFlags';
import { selectIsMoneyAccountGeoEligible } from './eligibility';

export const selectIsMoneyAccountVisible = createSelector(
  selectMoneyEnableMoneyAccountFlag,
  selectIsMoneyAccountGeoEligible,
  (isMoneyAccountEnabled, isMoneyAccountGeoEligible) =>
    isMoneyAccountEnabled && isMoneyAccountGeoEligible,
);
