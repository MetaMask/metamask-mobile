import { createSelector } from 'reselect';
import { selectMinimumBalanceForRentExemptionInSOL } from '@metamask/bridge-controller';
import { selectControllerFields } from '../../core/redux/slices/bridge';

// Use the official bridge controller selector
export const selectMinSolBalance = createSelector(
  selectControllerFields,
  (bridgeAppState) => selectMinimumBalanceForRentExemptionInSOL(bridgeAppState),
);
