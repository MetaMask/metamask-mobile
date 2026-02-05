import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectRewardsSubscriptionId,
  selectRecentDropAddressCommitByDropId,
} from '../../../../selectors/rewards';
import { RECENT_COMMIT_VALIDITY_WINDOW_MS } from '../../../../reducers/rewards';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import { selectAccountGroupWithInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import type { InternalAccount } from '@metamask/keyring-internal-api';

interface AccountGroupInfo {
  /** Account group display name */
  name: string;
  /** EVM address for avatar display (first EVM account in group) */
  evmAddress: string;
}

interface UseDropCommittedAddressReturn {
  /** The raw committed address */
  committedAddress: string | null;
  /** Resolved account group info (name + avatar address) if found */
  accountGroupInfo: AccountGroupInfo | null;
  /** Whether data is still loading */
  isLoading: boolean;
}

/**
 * Hook that fetches the committed receiving address for a drop and resolves
 * it to an account group name + avatar address when possible.
 *
 * @param dropId - The drop ID to get the committed address for
 */
export const useDropCommittedAddress = (
  dropId?: string,
): UseDropCommittedAddressReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const recentAddressCommitSelector = useMemo(
    () => selectRecentDropAddressCommitByDropId(dropId ?? ''),
    [dropId],
  );
  const recentAddressCommit = useSelector(recentAddressCommitSelector);
  const accountGroupsWithAccounts = useSelector(
    selectAccountGroupWithInternalAccounts,
  );

  const [fetchedAddress, setFetchedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(dropId && subscriptionId));
  const isLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchCommittedAddress = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !dropId) {
      if (mountedRef.current) {
        setFetchedAddress(null);
        setIsLoading(false);
      }
      return;
    }

    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    if (mountedRef.current) {
      setIsLoading(true);
    }

    try {
      const response = await Engine.controllerMessenger.call(
        'RewardsController:getDropCommittedAddress',
        dropId,
        subscriptionId,
      );
      if (mountedRef.current) {
        setFetchedAddress(response);
      }
    } catch (error) {
      console.warn(
        'useDropCommittedAddress: Failed to fetch committed address',
        error,
      );
      if (mountedRef.current) {
        setFetchedAddress(null);
      }
    } finally {
      isLoadingRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [dropId, subscriptionId]);

  useEffect(() => {
    fetchCommittedAddress();
  }, [fetchCommittedAddress]);

  // Track mounted state to prevent state updates after unmount
  useEffect(() => () => {
      mountedRef.current = false;
    }, []);

  // Invalidate when drop address is committed (commit or address change)
  useInvalidateByRewardEvents(
    ['RewardsController:dropAddressCommitted'],
    fetchCommittedAddress,
  );

  // Compute effective address: prefer recent address commit data within validity window
  const committedAddress = useMemo((): string | null => {
    if (recentAddressCommit?.address) {
      const now = Date.now();
      const timeElapsed = now - recentAddressCommit.committedAt;
      if (timeElapsed < RECENT_COMMIT_VALIDITY_WINDOW_MS) {
        return recentAddressCommit.address;
      }
    }
    return fetchedAddress;
  }, [recentAddressCommit, fetchedAddress]);

  // Resolve the address to an account group
  const accountGroupInfo = useMemo((): AccountGroupInfo | null => {
    if (!committedAddress) return null;

    const normalizedAddress = committedAddress.toLowerCase();

    for (const group of accountGroupsWithAccounts) {
      const matchingAccount = group.accounts.find(
        (account: InternalAccount) =>
          account.address.toLowerCase() === normalizedAddress,
      );

      if (matchingAccount) {
        // Find EVM address for avatar (first non-solana/btc account, or fallback to first)
        const evmAccount = group.accounts.find((account: InternalAccount) =>
          account.address.startsWith('0x'),
        );
        return {
          name: group.metadata.name,
          evmAddress:
            evmAccount?.address ??
            group.accounts[0]?.address ??
            '0x0000000000000000000000000000000000000000',
        };
      }
    }

    return null;
  }, [committedAddress, accountGroupsWithAccounts]);

  return {
    committedAddress,
    accountGroupInfo,
    isLoading,
  };
};

export default useDropCommittedAddress;
