import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
import { loadCardholderAccounts } from '../../../../core/redux/slices/card';
import {
  selectAppServicesReady,
  selectUserLoggedIn,
} from '../../../../reducers/user';
import { selectInternalAccountsByScope } from '../../../../selectors/accountsController';
import Logger from '../../../../util/Logger';
import { isEthAccount } from '../../../../core/Multichain/utils';
import { RootState } from '../../../../reducers';

/**
 * Hook that automatically checks for cardholder accounts when conditions are met
 */
export const useCardholderCheck = () => {
  const lineaScope = 'eip155:59144';
  const dispatch = useThunkDispatch();
  const userLoggedIn = useSelector(selectUserLoggedIn);
  const appServicesReady = useSelector(selectAppServicesReady);
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const internalAccounts = useSelector((state: RootState) =>
    selectInternalAccountsByScope(state, lineaScope),
  );

  const checkCardholderAccounts = useCallback(() => {
    const caipAccountIds = internalAccounts
      ?.filter((account) => isEthAccount(account))
      .map(
        (account) =>
          `eip155:0:${account.address}` as `${string}:${string}:${string}`,
      );

    if (!caipAccountIds?.length) {
      return;
    }

    dispatch(
      loadCardholderAccounts({
        caipAccountIds,
        cardFeatureFlag,
      }),
    );
  }, [cardFeatureFlag, dispatch, internalAccounts]);

  useEffect(() => {
    if (
      userLoggedIn &&
      appServicesReady &&
      cardFeatureFlag &&
      internalAccounts?.length
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
    internalAccounts,
  ]);
};
