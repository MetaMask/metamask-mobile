import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import {
  CardFeatureFlag,
  selectCardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { loadCardholderAccounts } from '../../../../core/redux/slices/card';
import {
  selectAppServicesReady,
  selectUserLoggedIn,
} from '../../../../reducers/user';
import { selectInternalAccountsWithCaipAccountId } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';

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
    const formattedAccounts = Object.values(accounts)
      .filter((account) => account.type === 'eip155:eoa')
      .map((account) => account.caipAccountId);

    if (!formattedAccounts.length) {
      return;
    }

    dispatch(
      loadCardholderAccounts({
        formattedAccounts:
          formattedAccounts as `eip155:${string}:0x${string}`[],
        cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
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
          'useCardholderCheck::Error loading cardholder accounts',
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
