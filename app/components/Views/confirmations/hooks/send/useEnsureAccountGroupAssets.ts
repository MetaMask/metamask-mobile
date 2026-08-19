import { useEffect, useSyncExternalStore } from 'react';
import type { AccountGroupId } from '@metamask/account-api';
import {
  isAccountGroupAssetLoadPending,
  subscribeToAccountGroupAssetLoads,
} from '../../../../../core/Assets/accountGroupAssetLoader';
import { useLoadAccountGroupAssets } from '../../../../hooks/useAccountGroupAssets/useLoadAccountGroupAssets';

/**
 * Ensures assets are loaded for an account group that is not the globally
 * selected one, and reports whether that load is still in flight.
 *
 * Automatic asset loading is scoped to the selected account group, so reading
 * assets for an override account (MM Pay "Pay with" while a different account
 * is selected) yields an empty list until the group has been activated at least
 * once. This hook closes that gap by requesting the data on demand.
 *
 * @param accountGroupId - Account group to load, or undefined to no-op.
 * @returns Whether an asset load for that group is currently in flight.
 */
export function useEnsureAccountGroupAssets(
  accountGroupId?: AccountGroupId,
): boolean {
  const loadAccountGroupAssets = useLoadAccountGroupAssets();

  const isPending = useSyncExternalStore(
    subscribeToAccountGroupAssetLoads,
    () => isAccountGroupAssetLoadPending(accountGroupId),
  );

  useEffect(() => {
    if (!accountGroupId) {
      return;
    }

    loadAccountGroupAssets([accountGroupId]);
  }, [accountGroupId, loadAccountGroupAssets]);

  return isPending;
}
