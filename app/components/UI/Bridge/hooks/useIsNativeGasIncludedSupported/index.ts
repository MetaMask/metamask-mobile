import type { Hex } from '@metamask/utils';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { getSentinelNetworkFlags } from '../../../../../util/transactions/sentinel-api';

/**
 * Checks whether Sentinel supports including fees when simulating a native
 * asset transaction on the given EVM chain.
 *
 * @param chainId - Hexadecimal EVM chain ID to check.
 * @returns Whether native fees can be included, or `undefined` while loading.
 */
export const useIsNativeGasIncludedSupported = (
  chainId?: Hex,
): boolean | undefined => {
  const { value } = useAsyncResult(
    async () =>
      chainId
        ? Boolean(
            (await getSentinelNetworkFlags(chainId))?.simulationIncludeFees,
          )
        : false,
    [chainId],
  );

  return value;
};
