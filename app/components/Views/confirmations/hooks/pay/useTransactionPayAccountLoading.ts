import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AccountGroupId } from '@metamask/account-api';
import EngineService from '../../../../../core/EngineService';
import {
  isAccountGroupAssetLoadPending,
  subscribeToAccountGroupAssetLoads,
} from '../../../../../core/Assets/accountGroupAssetLoader';
import { isTransactionPayWithdraw } from '../../utils/transaction';
import { useAccountOverrideGroupId } from '../send/useAccountOverrideGroupId';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';

/**
 * Whether the pay token list is still resolving after the user picked a pay
 * account (`accountOverride`) whose assets have not reached the store yet.
 *
 * An override account that was never selected globally has no assets until
 * its on-demand load completes, and an empty list is otherwise
 * indistinguishable from a genuinely unfunded account. This stays true from
 * the render that switches account until the load has settled and its results
 * are in Redux, so "No funds available" is only shown for a real empty result.
 *
 * @returns True while the override account's tokens are still being resolved.
 */
export function useTransactionPayAccountLoading(): boolean {
  const transactionMeta = useTransactionMetadataRequest();
  const isPostQuote = isTransactionPayWithdraw(transactionMeta);

  // Must run before the effect below: it starts the override account's load,
  // so the effect can tell whether a fetch is in flight.
  const { availableTokens } = useTransactionPayAvailableTokens();
  const accountGroupId = useAccountOverrideGroupId();

  const isPending = useSyncExternalStore(
    subscribeToAccountGroupAssetLoads,
    () => isAccountGroupAssetLoadPending(accountGroupId),
  );

  const [settledGroupId, setSettledGroupId] = useState<AccountGroupId>();
  const pendingGroupIdRef = useRef<AccountGroupId>();

  useEffect(() => {
    if (!accountGroupId) {
      return;
    }

    // Read the loader directly: the load is started by an effect in this same
    // commit, after `isPending` was captured for this render.
    if (isAccountGroupAssetLoadPending(accountGroupId)) {
      pendingGroupIdRef.current = accountGroupId;
      return;
    }

    // Controller updates reach Redux through a delayed batch, so the fetched
    // assets may not be selectable yet. Flush them before leaving the loading
    // state, otherwise the empty list briefly reads as "no funds".
    if (pendingGroupIdRef.current === accountGroupId) {
      pendingGroupIdRef.current = undefined;
      EngineService.flushState();
    }

    setSettledGroupId(accountGroupId);
  }, [accountGroupId, isPending]);

  return (
    !isPostQuote &&
    Boolean(accountGroupId) &&
    availableTokens.length === 0 &&
    settledGroupId !== accountGroupId
  );
}
