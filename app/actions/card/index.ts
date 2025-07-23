/* eslint-disable @typescript-eslint/no-explicit-any */
import { Action } from 'redux';
import { ThunkAction } from 'redux-thunk';
import { RootState } from '../../reducers';
import { CardSDK } from '../../components/UI/Card/sdk/CardSDK';
import Logger from '../../util/Logger';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { CardFeatureFlag } from '../../selectors/featureFlagController/card';

/**
 * Card feature action types
 */
export enum CardActionType {
  LOAD_CARDHOLDER_ACCOUNTS_REQUEST = 'CARD/LOAD_CARDHOLDER_ACCOUNTS_REQUEST',
  LOAD_CARDHOLDER_ACCOUNTS_SUCCESS = 'CARD/LOAD_CARDHOLDER_ACCOUNTS_SUCCESS',
  LOAD_CARDHOLDER_ACCOUNTS_FAILURE = 'CARD/LOAD_CARDHOLDER_ACCOUNTS_FAILURE',
}

/**
 * Card action interfaces
 */
export interface LoadCardholderAccountsRequestAction extends Action {
  type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_REQUEST;
}

export interface LoadCardholderAccountsSuccessAction extends Action {
  type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS;
  payload: {
    cardholderAccounts: string[];
  };
}

export interface LoadCardholderAccountsFailureAction extends Action {
  type: CardActionType.LOAD_CARDHOLDER_ACCOUNTS_FAILURE;
  payload: {
    error: string;
  };
}

/**
 * Union type for all card actions
 */
export type CardActions =
  | LoadCardholderAccountsRequestAction
  | LoadCardholderAccountsSuccessAction
  | LoadCardholderAccountsFailureAction;

/**
 * Action creators
 */
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

/**
 * Get accounts from the engine state
 */
const getAccountsFromEngine = (
  state: RootState,
): `eip155:${string}:0x${string}`[] => {
  const accounts =
    state.engine?.backgroundState?.AccountsController?.internalAccounts
      ?.accounts;

  if (!accounts) {
    return [];
  }

  const supportedAccounts = Object.values(accounts).filter(
    (account: any) => account?.type === 'eip155:eoa',
  );

  // Extract account addresses and format them as required by CardSDK
  return Object.values(supportedAccounts).map(
    (account: any) =>
      `eip155:0:${account.address}` as `eip155:${string}:0x${string}`,
  );
};

/**
 * Thunk action to check cardholder accounts
 */
export const checkCardholderAccounts =
  (
    cardFeatureFlag: CardFeatureFlag | null,
  ): ThunkAction<Promise<void>, RootState, unknown, CardActions> =>
  async (dispatch, getState) => {
    try {
      // Early return if card feature is not enabled
      if (!cardFeatureFlag) {
        return;
      }

      dispatch(loadCardholderAccountsRequest());

      const state = getState();
      const accounts = getAccountsFromEngine(state);

      if (!accounts.length) {
        dispatch(loadCardholderAccountsSuccess([]));
        return;
      }

      const cardSDK = new CardSDK({
        cardFeatureFlag,
        rawChainId: LINEA_CHAIN_ID,
      });

      // Call isCardHolder method
      const result = await cardSDK.isCardHolder(accounts);

      // Extract just the addresses for storage
      const cardholderAddresses = result.cardholderAccounts.map(
        (account) => account.split(':')[2],
      );

      dispatch(loadCardholderAccountsSuccess(cardholderAddresses));
    } catch (error) {
      const errorInstance =
        error instanceof Error ? error : new Error(String(error));
      Logger.error(errorInstance, 'Card: Error loading cardholder accounts');
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch(loadCardholderAccountsFailure(errorMessage));
    }
  };
