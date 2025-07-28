import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { loadCardholderAccounts } from '../../../../core/redux/slices/card';
import {
  selectAppServicesReady,
  selectUserLoggedIn,
} from '../../../../reducers/user';
import { selectInternalAccountsWithCaipAccountId } from '../../../../selectors/accountsController';

/**
 * Hook that automatically checks for cardholder accounts when conditions are met
 */
export const useCardholderCheck = () => {
  const dispatch = useThunkDispatch();
  const userLoggedIn = useSelector(selectUserLoggedIn);
  const appServicesReady = useSelector(selectAppServicesReady);
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const accounts = useSelector(selectInternalAccountsWithCaipAccountId);

  const checkCardholderAccounts = useCallback(() => {
    if (!cardFeatureFlag || !userLoggedIn || !appServicesReady || !accounts) {
      return;
    }

    const filteredAccounts = Object.values(accounts).filter(
      (account) => account.type === 'eip155:eoa',
    );
    const formattedAccounts = filteredAccounts.map(
      (account) => account.caipAccountId,
    );

    if (!formattedAccounts.length) {
      // For empty accounts, we could dispatch with empty array, but RTK will handle this
      return;
    }

    // Dispatch the async thunk
    dispatch(
      loadCardholderAccounts({
        formattedAccounts:
          formattedAccounts as `eip155:${string}:0x${string}`[],
        cardFeatureFlag,
      }),
    );
  }, [cardFeatureFlag, userLoggedIn, appServicesReady, dispatch, accounts]);

  useEffect(() => {
    if (userLoggedIn && appServicesReady) {
      checkCardholderAccounts();
    }
  }, [
    userLoggedIn,
    appServicesReady,
    cardFeatureFlag,
    checkCardholderAccounts,
    accounts,
  ]);
};
