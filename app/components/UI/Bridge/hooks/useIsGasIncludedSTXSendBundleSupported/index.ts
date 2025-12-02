import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setIsGasIncludedSTXSendBundleSupported } from '../../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { useIsSendBundleSupported } from '../useIsSendBundleSupported';
import { RootState } from '../../../../../reducers';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

/**
 * Hook that calculates and updates isGasIncludedSTXSendBundleSupported state for bridge and swap transactions.
 * Should be used at the page level (e.g., BridgeView) to avoid repeated calculations.
 *
 * Returns true only when BOTH smart transactions are enabled AND sendBundle is supported.
 * Only applies to EVM chains - non-EVM chains will always have isGasIncludedSTXSendBundleSupported set to false.
 *
 * @param chainId - The chain ID to check isGasIncludedSTXSendBundleSupported for (can be Hex, CAIP, or other format)
 */
export const useIsGasIncludedSTXSendBundleSupported = (
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

  const isSendBundleSupportedForChain = useIsSendBundleSupported(evmChainId);

  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, evmChainId),
  );

  // isGasIncludedSupported is true only when BOTH smart transactions are enabled AND sendBundle is supported
  const isGasIncludedSupported =
    shouldUseSmartTransaction && Boolean(isSendBundleSupportedForChain);

  useEffect(() => {
    dispatch(setIsGasIncludedSTXSendBundleSupported(isGasIncludedSupported));
  }, [isGasIncludedSupported, dispatch]);
};
