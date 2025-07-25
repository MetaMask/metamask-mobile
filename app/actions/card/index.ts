import {
  type LoadCardholderAccountsSuccessAction,
  CardActionType,
} from './types';

export const loadCardholderAccountsSuccess = (
  cardholderAccounts: string[],
): LoadCardholderAccountsSuccessAction => ({
  type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS,
  payload: { cardholderAccounts },
});
