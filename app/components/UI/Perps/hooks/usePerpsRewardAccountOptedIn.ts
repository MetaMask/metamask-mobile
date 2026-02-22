import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';
import { InternalAccount } from '@metamask/keyring-internal-api';

interface UsePerpsRewardAccountOptedInResult {
  /** Whether the account has opted in to rewards */
  accountOptedIn: boolean | null;
  /** The account that is currently in scope */
  account: InternalAccount | null | undefined;
}

/**
 * Hook for checking if the current account has opted in to rewards.
 * Handles all opt-in status checking logic and subscribes to account linked events.
 */
export const usePerpsRewardAccountOptedIn = (
  /** Optional trigger to re-check opt-in status when changed */
  trigger?: unknown,
): UsePerpsRewardAccountOptedInResult => {
  const [accountOptedIn, setAccountOptedIn] = useState<boolean | null>(null);
  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  );
  const selectedAddress = selectedAccount
    ? getFormattedAddressFromInternalAccount(selectedAccount)
    : undefined;

  /**
   * Check opt-in status and determine if rewards row should be shown
   */
  const checkOptInStatus = useCallback(async () => {
    // Skip if missing required data
    if (!selectedAddress || !selectedAccount) {
      setAccountOptedIn(null);
      return;
    }

    try {
      // Check if there is an active season
      const hasActiveSeason = await Engine.controllerMessenger.call(
        'RewardsController:hasActiveSeason',
      );

      if (!hasActiveSeason) {
        setAccountOptedIn(null);
        return;
      }

      // Check if there's a subscription first
      const firstSubscriptionId = await Engine.controllerMessenger.call(
        'RewardsController:getCandidateSubscriptionId',
      );

      if (!firstSubscriptionId) {
        setAccountOptedIn(null);
        return;
      }

      // Format account to CAIP-10 for Ethereum mainnet (chainId: '1')
      const caipAccount = formatAccountToCaipAccountId(selectedAddress, '1');
      if (!caipAccount) {
        setAccountOptedIn(null);
        return;
      }

      // Check if account has opted in
      const hasOptedIn = await Engine.controllerMessenger.call(
        'RewardsController:getHasAccountOptedIn',
        caipAccount,
      );

      // Determine if we should show the rewards row
      // Show row if: opted in OR (not opted in AND opt-in is supported)
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
      // On error, default to not showing rewards row
      setAccountOptedIn(null);
    }
  }, [selectedAddress, selectedAccount]);

  // Check opt-in status when dependencies change
  useEffect(() => {
    checkOptInStatus();
  }, [checkOptInStatus, trigger]);

  // Subscribe to account linked event to retrigger opt-in check
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
    account: selectedAccount,
  };
};
