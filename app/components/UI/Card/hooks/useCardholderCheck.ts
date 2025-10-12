import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectCardFeatureFlag } from '../../../../selectors/featureFlagController/card';
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
  const userLoggedIn = useSelector(selectUserLoggedIn);
  const appServicesReady = useSelector(selectAppServicesReady);
  const cardFeatureFlag = useSelector(selectCardFeatureFlag);
  const internalAccounts = useSelector((state: RootState) =>
    selectInternalAccountsByScope(state, 'eip155:0'),
  );

  const checkCardholderAccounts = useCallback(async () => {
    const caipAccountIds = internalAccounts
      ?.filter((account) => isEthAccount(account))
      .map(
        (account) =>
          `eip155:0:${account.address}` as `${string}:${string}:${string}`,
      );

    if (!caipAccountIds?.length) {
      Logger.log('useCardholderCheck: No accounts to check');
      return;
    }

    try {
      Logger.log(
        'useCardholderCheck: Checking cardholder status for accounts',
        {
          accountCount: caipAccountIds.length,
          accounts: caipAccountIds,
        },
      );

      await Engine.controllerMessenger.call('CardController:checkCardholder', {
        accounts: caipAccountIds,
        forceRefresh: false,
      });

      Logger.log('useCardholderCheck: Cardholder check completed successfully');
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'useCardholderCheck: Error checking cardholder accounts via CardController',
      );
    }
  }, [internalAccounts]);

  useEffect(() => {
    const runCardholderCheck = async () => {
      if (
        userLoggedIn &&
        appServicesReady &&
        cardFeatureFlag &&
        internalAccounts?.length
      ) {
        Logger.log(
          'useCardholderCheck: Conditions met, starting cardholder check',
          {
            userLoggedIn,
            appServicesReady,
            hasCardFeatureFlag: !!cardFeatureFlag,
            accountCount: internalAccounts?.length,
          },
        );

        await checkCardholderAccounts();
      } else {
        Logger.log('useCardholderCheck: Conditions not met, skipping check', {
          userLoggedIn,
          appServicesReady,
          hasCardFeatureFlag: !!cardFeatureFlag,
          accountCount: internalAccounts?.length,
        });
      }
    };

    runCardholderCheck();
  }, [
    userLoggedIn,
    appServicesReady,
    cardFeatureFlag,
    checkCardholderAccounts,
    internalAccounts,
  ]);
};
