import { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { CaipChainId, Hex } from '@metamask/utils';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { getSentinelNetworkFlags } from '../../../../../util/transactions/sentinel-api';
import { setIsNativeGasIncludedSupported } from '../../../../../core/redux/slices/bridge';

/**
 * Updates Bridge state with whether Sentinel supports including fees when
 * simulating a native asset transaction on the given EVM chain.
 * Should be used at the page level to avoid repeated requests.
 *
 * @param chainId - Chain ID to check.
 */
export const useIsNativeGasIncludedSupported = (
  chainId?: Hex | CaipChainId | string,
) => {
  const dispatch = useDispatch();
  const evmChainId = useMemo(() => {
    if (!chainId || isNonEvmChainId(chainId)) {
      return undefined;
    }

    return formatChainIdToHex(chainId);
  }, [chainId]);

  const { value } = useAsyncResult(
    async () =>
      evmChainId
        ? Boolean(
            (await getSentinelNetworkFlags(evmChainId))?.simulationIncludeFees,
          )
        : false,
    [evmChainId],
  );
  const isSupported = Boolean(value);

  useEffect(() => {
    dispatch(setIsNativeGasIncludedSupported(isSupported));
  }, [dispatch, isSupported]);
};
