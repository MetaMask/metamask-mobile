import { useSyncExternalStore } from 'react';
import {
  isAccountGroupAssetLoadPending,
  subscribeToAccountGroupAssetLoads,
} from '../../../core/Assets/accountGroupAssetLoader';

/**
 * Whether a first-time asset load is in flight for the given account group.
 *
 * Lets a surface distinguish "this account holds nothing" from "we have not
 * fetched this account's assets yet" — otherwise identical, since an unfetched
 * group reports empty assets and a zero balance.
 *
 * Backed by a module-level store rather than Redux, so subscribing from many
 * rows is cheap and does not run any selector.
 *
 * @param accountGroupId - Account group to check, if any.
 * @returns True while that group's asset load is in flight.
 */
export function useIsAccountGroupAssetLoadPending(
  accountGroupId?: string,
): boolean {
  return useSyncExternalStore(subscribeToAccountGroupAssetLoads, () =>
    isAccountGroupAssetLoadPending(accountGroupId),
  );
}
