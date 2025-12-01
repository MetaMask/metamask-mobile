import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { isSendBundleSupported } from '../../../../../util/transactions/sentinel-api';
import { Hex } from '@metamask/utils';

/**
 * Hook that checks if sendBundle is supported for the given chain
 * @param chainId - The chain ID to check sendBundle support for
 * @returns Whether sendBundle is supported for the chain, or undefined while loading
 */
export const useIsSendBundleSupported = (
  chainId?: Hex,
): boolean | undefined => {
  const { value: isSendBundleSupportedForChain } = useAsyncResult(
    async () => (chainId ? isSendBundleSupported(chainId) : false),
    [chainId],
  );

  return isSendBundleSupportedForChain;
};
