import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { formatAccountToCaipAccountId } from '../../Perps/utils/rewardsUtils';

/**
 * Generic hook for checking if the current account has opted in to rewards.
 * Can be used across different features (mUSD, Perps, Predict, etc.).
 *
 * @returns Object containing accountOptedIn status (boolean | null)
 */
export const useRewardsAccountOptedIn = (): {
  accountOptedIn: boolean | null;
} => {
  const [accountOptedIn, setAccountOptedIn] = useState<boolean | null>(null);
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  );
  const selectedAddress = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : undefined;

  const checkOptInStatus = useCallback(async () => {
    if (!selectedAddress || !selectedAccount) {
      setAccountOptedIn(null);
      return;
    }

    try {
      const isRewardsEnabled = await Engine.controllerMessenger.call(
        'RewardsController:isRewardsFeatureEnabled',
      );

      if (!isRewardsEnabled) {
        setAccountOptedIn(null);
        return;
      }

      const firstSubscriptionId = await Engine.controllerMessenger.call(
        'RewardsController:getCandidateSubscriptionId',
      );

      if (!firstSubscriptionId) {
        setAccountOptedIn(null);
        return;
      }

      const caipAccount = formatAccountToCaipAccountId(selectedAddress, '1');
      if (!caipAccount) {
        setAccountOptedIn(null);
        return;
      }

      const hasOptedIn = await Engine.controllerMessenger.call(
        'RewardsController:getHasAccountOptedIn',
        caipAccount,
      );

      let coercedHasOptedIn: boolean | null = hasOptedIn;

      if (!hasOptedIn && selectedAccount) {
        const isOptInSupported = await Engine.controllerMessenger.call(
          'RewardsController:isOptInSupported',
          selectedAccount,
        );
        coercedHasOptedIn = isOptInSupported ? hasOptedIn : null;
      }

      setAccountOptedIn(coercedHasOptedIn);
    } catch (error) {
      setAccountOptedIn(null);
    }
  }, [selectedAddress, selectedAccount]);

  useEffect(() => {
    checkOptInStatus();
  }, [checkOptInStatus]);

  useEffect(() => {
    const handleAccountLinked = () => {
      checkOptInStatus();
    };

    Engine.controllerMessenger.subscribe(
      'RewardsController:accountLinked',
      handleAccountLinked,
    );

    return () => {
      Engine.controllerMessenger.unsubscribe(
        'RewardsController:accountLinked',
        handleAccountLinked,
      );
    };
  }, [checkOptInStatus]);

  return {
    accountOptedIn,
  };
};
