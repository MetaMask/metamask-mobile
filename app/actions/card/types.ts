import { type Action } from 'redux';

// Action type enum
export enum CardActionType {
  LOAD_CARDHOLDER_ACCOUNTS_SUCCESS = 'LOAD_CARDHOLDER_ACCOUNTS_SUCCESS',
}

// Card actions
export type LoadCardholderAccountsSuccessAction =
  Action<CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS> & {
    payload: { cardholderAccounts: string[] };
  };

// Card actions union type
export type CardAction = LoadCardholderAccountsSuccessAction;
