import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import {
  selectEVMEnabledNetworks,
  selectNonEVMEnabledNetworks,
} from '../../../../../../../selectors/networkEnablementController';

/**
 * Returns a predicate that reports whether a given chain ID belongs to a
 * network the user has enabled. EVM chains are matched as hex IDs against
 * `selectEVMEnabledNetworks`; non-EVM chains as CAIP IDs against
 * `selectNonEVMEnabledNetworks`.
 *
 * Designed for use inside `Array.prototype.filter` (the per-chain
 * `useIsNetworkEnabled` hook can only test a single chain), so QuickBuy can
 * keep its token/pill lists scoped to enabled networks only.
 */
export const useNetworkEnabledPredicate = (): ((
  chainId: string | undefined,
) => boolean) => {
  const evmEnabled = useSelector(selectEVMEnabledNetworks);
  const nonEvmEnabled = useSelector(selectNonEVMEnabledNetworks);

  return useMemo(() => {
    const evmSet = new Set(evmEnabled.map((chainId) => chainId.toLowerCase()));
    const nonEvmSet = new Set(nonEvmEnabled);

    return (chainId: string | undefined) => {
      if (!chainId) {
        return false;
      }
      return isNonEvmChainId(chainId)
        ? nonEvmSet.has(chainId)
        : evmSet.has((chainId as Hex).toLowerCase());
    };
  }, [evmEnabled, nonEvmEnabled]);
};
