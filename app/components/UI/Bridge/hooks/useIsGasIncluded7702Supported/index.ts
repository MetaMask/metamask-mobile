import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Hex, CaipChainId } from '@metamask/utils';
import { setIsGasIncluded7702Supported } from '../../../../../core/redux/slices/bridge';
import { selectSmartAccountOptIn } from '../../../../../selectors/preferencesController';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import { isAtomicBatchSupported as checkAtomicBatchSupport } from '../../../../../util/transaction-controller';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

/**
 * Hook that determines if 7702 gasless support is available for bridge/swap.
 * Should be used at the page level (e.g., BridgeView) to avoid repeated calculations.
 *
 * Requirements for 7702:
 * - Smart account opt-in must be enabled
 * - Relay must be supported (for 7702 delegation)
 * - The current account must be upgraded to a smart account
 *
 * @param chainId - The chain ID to check (can be Hex, CAIP, or other format)
 * @param selectedAddress - The selected account address
 */
export const useIsGasIncluded7702Supported = (
  chainId?: Hex | CaipChainId | string,
  selectedAddress?: string,
) => {
  const dispatch = useDispatch();

  const smartAccountOptIn = useSelector(selectSmartAccountOptIn);

  // Only check gasIncluded for EVM chains
  const evmChainId = useMemo(() => {
    if (!chainId || isNonEvmChainId(chainId)) {
      return undefined;
    }
    return formatChainIdToHex(chainId);
  }, [chainId]);

  // Fetch both relay support and atomic batch support in parallel
  const { value: support7702Data } = useAsyncResult(async () => {
    if (!evmChainId || !selectedAddress) {
      return {
        isRelaySupported: false,
        atomicBatchChainSupport: undefined,
      };
    }

    // Execute both API calls in parallel. NB: this will trigger more Relay support checks than necessary.
    // But this will only be the case when selectedAddress changes. As it does not change frequently and
    // does not happen in the bridge view, it is not a problem.
    const [isRelaySupportedForChain, atomicBatchSupportResult] =
      await Promise.all([
        isRelaySupported(evmChainId as Hex),
        checkAtomicBatchSupport({
          address: selectedAddress as Hex,
          chainIds: [evmChainId as Hex],
        }),
      ]);

    const atomicBatchChainSupport = atomicBatchSupportResult?.find(
      (result) => result.chainId.toLowerCase() === evmChainId?.toLowerCase(),
    );

    return {
      isRelaySupported: isRelaySupportedForChain,
      atomicBatchChainSupport,
    };
  }, [evmChainId, selectedAddress]);

  // 7702 is available when ALL conditions are met
  const isGasIncluded7702Supported = Boolean(
    evmChainId &&
      smartAccountOptIn &&
      !!support7702Data?.isRelaySupported &&
      !!support7702Data?.atomicBatchChainSupport?.isSupported,
  );

  useEffect(() => {
    dispatch(setIsGasIncluded7702Supported(isGasIncluded7702Supported));
  }, [isGasIncluded7702Supported, dispatch]);
};
