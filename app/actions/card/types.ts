import { type Action } from 'redux';

// Action type enum
export enum CardActionType {
  LOAD_CARDHOLDER_ACCOUNTS_REQUEST = 'LOAD_CARDHOLDER_ACCOUNTS_REQUEST',
  LOAD_CARDHOLDER_ACCOUNTS_SUCCESS = 'LOAD_CARDHOLDER_ACCOUNTS_SUCCESS',
  LOAD_CARDHOLDER_ACCOUNTS_FAILURE = 'LOAD_CARDHOLDER_ACCOUNTS_FAILURE',
}

// Card actions
export type LoadCardholderAccountsRequestAction =
  Action<CardActionType.LOAD_CARDHOLDER_ACCOUNTS_REQUEST>;
export type LoadCardholderAccountsSuccessAction =
  Action<CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS> & {
    payload: { cardholderAccounts: string[] };
  };
export type LoadCardholderAccountsFailureAction =
  Action<CardActionType.LOAD_CARDHOLDER_ACCOUNTS_FAILURE> & {
    payload: { error: string };
  };

// Card actions union type
export type CardAction =
  | LoadCardholderAccountsRequestAction
  | LoadCardholderAccountsSuccessAction
  | LoadCardholderAccountsFailureAction;
