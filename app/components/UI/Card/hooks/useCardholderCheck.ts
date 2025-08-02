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
import Logger from '../../../../util/Logger';
import { isEthAccount } from '../../../../core/Multichain/utils';

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
    const caipAccountIds = accounts
      ?.filter((account) => isEthAccount(account))
      .map((account) => account.caipAccountId);

    if (!caipAccountIds?.length) {
      return;
    }

    dispatch(
      loadCardholderAccounts({
        caipAccountIds,
        cardFeatureFlag,
      }),
    );
  }, [cardFeatureFlag, dispatch, accounts]);

  useEffect(() => {
    if (
      userLoggedIn &&
      appServicesReady &&
      cardFeatureFlag &&
      accounts?.length
    ) {
      try {
        checkCardholderAccounts();
      } catch (error) {
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'useCardholderCheck::Error checking cardholder accounts',
        );
      }
    }
  }, [
    userLoggedIn,
    appServicesReady,
    cardFeatureFlag,
    checkCardholderAccounts,
    accounts,
  ]);
};
