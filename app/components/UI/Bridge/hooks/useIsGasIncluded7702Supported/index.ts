import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Hex, CaipChainId } from '@metamask/utils';
import { setIsGasIncluded7702Supported } from '../../../../../core/redux/slices/bridge';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isRelaySupported } from '../../../../../util/transactions/transaction-relay';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

/**
 * Hook that determines if 7702 gasless support is available for bridge/swap.
 * Should be used at the page level (e.g., BridgeView) to avoid repeated calculations.
 *
 * Requirement for 7702:
 * - Relay must be supported (for 7702 delegation)
 *
 * @param chainId - The chain ID to check (can be Hex, CAIP, or other format) - only EVM chains are supported
 */
export const useIsGasIncluded7702Supported = (
  chainId?: Hex | CaipChainId | string,
) => {
  const dispatch = useDispatch();

  // Only check gasIncluded for EVM chains
  const evmChainId = useMemo(() => {
    if (!chainId || isNonEvmChainId(chainId)) {
      return undefined;
    }
    return formatChainIdToHex(chainId);
  }, [chainId]);

  // Fetch relay support
  const { value: isRelaySupportedForChain } = useAsyncResult(async () => {
    if (!evmChainId) {
      return false;
    }

    return isRelaySupported(evmChainId as Hex);
  }, [evmChainId]);

  // 7702 is available when ALL conditions are met
  const isGasIncluded7702Supported = Boolean(
    evmChainId && !!isRelaySupportedForChain,
  );

  useEffect(() => {
    dispatch(setIsGasIncluded7702Supported(isGasIncluded7702Supported));
  }, [isGasIncluded7702Supported, dispatch]);
};
