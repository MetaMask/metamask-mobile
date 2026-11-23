import { createSelector } from 'reselect';
import { selectMoneyEnableMoneyAccountFlag } from './featureFlags';
import { selectIsMoneyAccountGeoEligible } from './eligibility';
import { getMoneyAccountAccessBlockReason } from '../utils/moneyAccountAccess';

export const selectMoneyAccountAccessBlockReason = createSelector(
  selectMoneyEnableMoneyAccountFlag,
  selectIsMoneyAccountGeoEligible,
  (isMoneyAccountEnabled, isMoneyAccountGeoEligible) =>
    getMoneyAccountAccessBlockReason({
      isMoneyAccountEnabled,
      isMoneyAccountGeoEligible,
    }),
);

export const selectIsMoneyAccountVisible = createSelector(
  selectMoneyAccountAccessBlockReason,
  (accessBlockReason) => accessBlockReason === undefined,
);
