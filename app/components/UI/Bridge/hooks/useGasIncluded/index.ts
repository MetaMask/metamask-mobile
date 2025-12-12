import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setGasIncluded } from '../../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { useIsSendBundleSupported } from '../useIsSendBundleSupported';
import { RootState } from '../../../../../reducers';
import { CaipChainId, Hex } from '@metamask/utils';
import {
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

/**
 * Hook that calculates and updates gasIncluded state for bridge and swap transactions.
 * Should be used at the page level (e.g., BridgeView) to avoid repeated calculations.
 *
 * Returns true only when BOTH smart transactions are enabled AND sendBundle is supported.
 * Only applies to EVM chains - non-EVM chains will always have gasIncluded set to false.
 *
 * @param chainId - The chain ID to check gasIncluded support for (can be Hex, CAIP, or other format)
 */
export const useGasIncluded = (chainId?: Hex | CaipChainId | string) => {
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

  // gasIncluded is true only when BOTH smart transactions are enabled AND sendBundle is supported
  const gasIncluded =
    shouldUseSmartTransaction && Boolean(isSendBundleSupportedForChain);

  useEffect(() => {
    dispatch(setGasIncluded(gasIncluded));
  }, [gasIncluded, dispatch]);
};
