import {
  type LoadCardholderAccountsRequestAction,
  type LoadCardholderAccountsSuccessAction,
  type LoadCardholderAccountsFailureAction,
  CardActionType,
} from './types';

export const loadCardholderAccountsRequest =
  (): LoadCardholderAccountsRequestAction => ({
    type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_REQUEST,
  });

export const loadCardholderAccountsSuccess = (
  cardholderAccounts: string[],
): LoadCardholderAccountsSuccessAction => ({
  type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS,
  payload: { cardholderAccounts },
});

export const loadCardholderAccountsFailure = (
  error: string,
): LoadCardholderAccountsFailureAction => ({
  type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_FAILURE,
  payload: { error },
});
