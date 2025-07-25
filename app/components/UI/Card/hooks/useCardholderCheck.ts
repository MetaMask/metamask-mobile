/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { ThunkAction } from 'redux-thunk';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { RootState } from '../../../../reducers';
import { loadCardholderAccountsSuccess } from '../../../../actions/card';
import { CardAction } from '../../../../actions/card/types';
import { CardSDK } from '../sdk/CardSDK';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import Logger from '../../../../util/Logger';

/**
 * Hook that automatically checks for cardholder accounts when conditions are met
 * This should be used once in the App component to trigger the check
 */
export const useCardholderCheck = () => {
  const dispatchThunk = useThunkDispatch();

  // Get app readiness states
  const userLoggedIn = useSelector((state: any) => state.user.userLoggedIn);
  const appServicesReady = useSelector(
    (state: any) => state.user.appServicesReady,
  );
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);

  /**
   * Get accounts from the engine state
   */
  const getAccountsFromEngine = (
    state: RootState,
  ): `eip155:${string}:0x${string}`[] => {
    const accounts =
      state.engine.backgroundState.AccountsController.internalAccounts.accounts;

    if (!accounts) {
      return [];
    }

    const supportedAccounts = Object.values(accounts).filter(
      (account) => account.type === 'eip155:eoa',
    );

    // Extract account addresses and format them as required by CardSDK
    return Object.values(supportedAccounts).map(
      (account) =>
        `eip155:0:${account.address}` as `eip155:${string}:0x${string}`,
    );
  };

  const checkCardholderAccounts = useCallback(
    (): ThunkAction<Promise<void>, RootState, unknown, CardAction> =>
      async (dispatch, getState) => {
        try {
          // Early return if card feature is not enabled
          if (!cardFeatureFlag) {
            return;
          }

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

          const result = await cardSDK.isCardHolder(accounts);

          const cardholderAddresses = result.cardholderAccounts.map(
            (account) => account.split(':')[2],
          );

          dispatch(loadCardholderAccountsSuccess(cardholderAddresses));
        } catch (error) {
          const errorInstance =
            error instanceof Error ? error : new Error(String(error));
          Logger.error(
            errorInstance,
            'Card: Error loading cardholder accounts',
          );
        }
      },
    [cardFeatureFlag],
  );

  useEffect(() => {
    // Only check if user is logged in, services are ready, and data hasn't been loaded yet
    if (userLoggedIn && appServicesReady && !isDataLoaded) {
      dispatchThunk(checkCardholderAccounts());
    }
  }, [
    userLoggedIn,
    appServicesReady,
    cardFeatureFlag,
    isDataLoaded,
    dispatchThunk,
    checkCardholderAccounts,
  ]);
};
