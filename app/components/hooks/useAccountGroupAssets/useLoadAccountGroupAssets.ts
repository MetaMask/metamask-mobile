import { useCallback, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId, Hex } from '@metamask/utils';
import { selectIsAssetsUnifyStateEnabled } from '../../../selectors/featureFlagController/assetsUnifyState';
import {
  selectEvmEnabledCaipNetworks,
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from '../../../selectors/networkEnablementController';
import type { AccountGroupId } from '@metamask/account-api';
import { selectInternalAccountsByGroupId } from '../../../selectors/multichainAccounts/accounts';
import { loadAccountGroupAssets } from '../../../core/Assets/accountGroupAssetLoader';

/**
 * Returns a callback that loads assets for the given account groups.
 *
 * Resolves each group id to its internal accounts and the currently enabled
 * chains, then delegates to the loader, which dedupes already-requested groups
 * and batches the rest into a single controller call.
 *
 * The returned callback is referentially stable, so it is safe to use from
 * scroll/viewability handlers without re-subscribing.
 *
 * @returns Callback taking the account group ids to load.
 */
export function useLoadAccountGroupAssets(): (
  accountGroupIds: string[],
) => void {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const getAccountsByGroupId = useSelector(selectInternalAccountsByGroupId);
  const evmCaipChainIds = useSelector(selectEvmEnabledCaipNetworks);
  const evmChainIds = useSelector(selectEVMEnabledNetworks);
  const nonEvmChainIds = useSelector(selectNonEVMEnabledNetworks);

  const caipChainIds = useMemo(
    () => [...evmCaipChainIds, ...nonEvmChainIds] as CaipChainId[],
    [evmCaipChainIds, nonEvmChainIds],
  );

  // Read through a ref so the returned callback stays stable across the
  // frequent selector churn these inputs are subject to.
  const latest = useRef({
    getAccountsByGroupId,
    caipChainIds,
    evmChainIds,
    isAssetsUnifyStateEnabled,
  });
  latest.current = {
    getAccountsByGroupId,
    caipChainIds,
    evmChainIds,
    isAssetsUnifyStateEnabled,
  };

  return useCallback((accountGroupIds: string[]) => {
    if (accountGroupIds.length === 0) {
      return;
    }

    const current = latest.current;

    const groups = accountGroupIds
      .map((accountGroupId) => ({
        accountGroupId,
        accounts: current.getAccountsByGroupId(
          accountGroupId as AccountGroupId,
        ),
      }))
      .filter(({ accounts }) => accounts.length > 0);

    if (groups.length === 0) {
      return;
    }

    loadAccountGroupAssets({
      groups,
      caipChainIds: current.caipChainIds,
      evmChainIds: current.evmChainIds as Hex[],
      isAssetsUnifyStateEnabled: current.isAssetsUnifyStateEnabled,
    });
  }, []);
}
