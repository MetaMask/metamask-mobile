import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getFormattedAddressFromInternalAccount } from '../../../../core/Multichain/utils';
import { formatAccountToCaipAccountId } from '../utils/rewardsUtils';
import { InternalAccount } from '@metamask/keyring-internal-api';

export interface UseRewardsAccountOptedInParams {
  /**
   * Optional trigger to re-check opt-in status when changed.
   * Useful for Perps when estimated points change and you want to revalidate.
   */
  trigger?: unknown;
  /**
   * Whether to additionally check for an active season after verifying rewards are enabled.
   * Always checks isRewardsFeatureEnabled first, then also checks hasActiveSeason if true.
   * @default false
   */
  requireActiveSeason?: boolean;
}

export interface UseRewardsAccountOptedInResult {
  /** Whether the account has opted in to rewards */
  accountOptedIn: boolean | null;
  /** The account that is currently in scope */
  account: InternalAccount | null | undefined;
}

/**
 * Generic hook for checking if the current account has opted in to rewards.
 * Can be used across different features (mUSD, Perps, Predict, etc.).
 *
 * Opt-in status is always checked against mainnet (eip155:1) as the canonical
 * identifier, but rewards are earned across all supported EVM chains.
 *
 * @param params - Optional configuration
 * @returns Object containing accountOptedIn status and account info
 */
export const useRewardsAccountOptedIn = (
  params?: UseRewardsAccountOptedInParams,
): UseRewardsAccountOptedInResult => {
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
      // Always check if rewards feature is enabled first
      const isRewardsEnabled = await Engine.controllerMessenger.call(
        'RewardsController:isRewardsFeatureEnabled',
      );

      if (!isRewardsEnabled) {
        setAccountOptedIn(null);
        return;
      }

      // Optionally also check for active season (Perps requires this)
      if (params?.requireActiveSeason) {
        const hasActiveSeason = await Engine.controllerMessenger.call(
          'RewardsController:hasActiveSeason',
        );

        if (!hasActiveSeason) {
          setAccountOptedIn(null);
          return;
        }
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
  }, [selectedAddress, selectedAccount, params?.requireActiveSeason]);

  useEffect(() => {
    checkOptInStatus();
  }, [checkOptInStatus, params?.trigger]);

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
