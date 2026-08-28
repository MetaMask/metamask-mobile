import { useEffect, useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import type { AccountGroupId } from '@metamask/account-api';
import { selectInternalAccountsByGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import {
  isAccountGroupAssetLoadPending,
  loadAccountGroupAssets,
  selectEnabledCaipChainIds,
  subscribeToAccountGroupAssetLoads,
} from '../../../../../core/Assets/accountGroupAssetLoader';

/**
 * Ensures assets are loaded for an account group that is not the globally
 * selected one, and reports whether that load is still in flight.
 *
 * Automatic asset loading is scoped to the selected account group, so reading
 * assets for an override account (MM Pay "Pay with" while a different account
 * is selected) yields an empty list until the group has been activated at least
 * once. This hook closes that gap by requesting the data on demand.
 *
 * Loading is deliberately limited to the single overridden account rather than
 * every account on screen: fanning asset fetches out across a large wallet is a
 * known performance cost, so only the account actually being paid from is
 * fetched.
 *
 * @param accountGroupId - Account group to load, or undefined to no-op.
 * @returns Whether an asset load for that group is currently in flight.
 */
export function useEnsureAccountGroupAssets(
  accountGroupId?: AccountGroupId,
): boolean {
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);
  const caipChainIds = useSelector(selectEnabledCaipChainIds);

  const isPending = useSyncExternalStore(
    subscribeToAccountGroupAssetLoads,
    () => isAccountGroupAssetLoadPending(accountGroupId),
  );

  useEffect(() => {
    if (!accountGroupId) {
      return;
    }

    const accounts = getAccountsByGroupId(accountGroupId);

    if (accounts.length === 0) {
      return;
    }

    // Groups already requested this session are deduped inside the loader, so
    // re-running this effect after an unrelated selector change costs nothing.
    loadAccountGroupAssets({
      groups: [{ accountGroupId, accounts }],
      caipChainIds,
    });
  }, [accountGroupId, getAccountsByGroupId, caipChainIds]);

  return isPending;
}
