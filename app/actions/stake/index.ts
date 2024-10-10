import type { Action as ReduxAction } from 'redux';

export type Action =
    | UpdateAmount
    | UpdateCurrency;

export interface UpdateAmount
    extends ReduxAction<ActionType.SET_STAKE_AMOUNT> {
    amount: string;
}

export interface UpdateCurrency
    extends ReduxAction<ActionType.SET_STAKE_CURRENCY> {
    currency: string;
}


/**
 * Constants
 */
export enum ActionType {
    SET_STAKE_AMOUNT = 'SET_STAKE_AMOUNT',
    SET_STAKE_CURRENCY = 'SET_STAKE_CURRENCY',
}

/**
* Action Creators
*/
export const setAmount = (amount: string): UpdateAmount => ({
    type: ActionType.SET_STAKE_AMOUNT,
    amount,
});

export const setCurrency = (currency: string): UpdateCurrency => ({
    type: ActionType.SET_STAKE_CURRENCY,
    currency,
});
