import { createSelector } from 'reselect';
import { selectHighestBalanceAaveOutputToken } from '../../../../selectors/earnController/earn';
import { selectMoneyDepositMinBalance } from './featureFlags';

export const selectHighestBalanceAaveTokenMeetingDepositMinimum =
  createSelector(
    [selectHighestBalanceAaveOutputToken, selectMoneyDepositMinBalance],
    (highestBalanceAaveOutputToken, minimumBalance) =>
      highestBalanceAaveOutputToken?.balanceFiatNumber !== undefined &&
      highestBalanceAaveOutputToken.balanceFiatNumber >= minimumBalance
        ? highestBalanceAaveOutputToken
        : undefined,
  );

export const selectHasAaveTokenMeetingDepositMinimum = createSelector(
  selectHighestBalanceAaveTokenMeetingDepositMinimum,
  (highestBalanceAaveTokenMeetingDepositMinimum) =>
    highestBalanceAaveTokenMeetingDepositMinimum !== undefined,
);
