import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';
import { selectPerpsSelectedAccountAddress } from '../selectedAccountAddress';

const selectSettings = (state: RootState) => state.settings;

/**
 * Whether the selected account already confirmed the first-time cross margin
 * risks. Confirmation is stored per account, so it covers every market.
 */
export const selectHasConfirmedCrossMargin = createSelector(
  selectSettings,
  selectPerpsSelectedAccountAddress,
  (settingsState: Record<string, unknown>, address): boolean => {
    if (!address) {
      return false;
    }
    const confirmedAccounts =
      settingsState.perpsCrossMarginConfirmedAccounts as
        | Record<string, unknown>
        | undefined;
    return confirmedAccounts?.[address] === true;
  },
);
