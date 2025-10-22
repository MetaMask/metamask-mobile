import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setGasIncluded } from '../../../../../core/redux/slices/bridge';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { useIsSendBundleSupported } from '../useIsSendBundleSupported';
import { RootState } from '../../../../../reducers';
import { Hex } from '@metamask/utils';

/**
 * Hook that calculates and updates gasIncluded state for bridge and swap transactions.
 * Should be used at the page level (e.g., BridgeView) to avoid repeated calculations.
 *
 * Returns true only when BOTH smart transactions are enabled AND sendBundle is supported.
 *
 * @param chainId - The chain ID to check gasIncluded support for
 */
export const useGasIncluded = (chainId?: Hex) => {
  const dispatch = useDispatch();
  const isSendBundleSupportedForChain = useIsSendBundleSupported(chainId);
  
  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, chainId),
  );

  // gasIncluded is true only when BOTH smart transactions are enabled AND sendBundle is supported
  const gasIncluded =
    shouldUseSmartTransaction && Boolean(isSendBundleSupportedForChain);

  useEffect(() => {
    dispatch(setGasIncluded(gasIncluded));
  }, [gasIncluded, dispatch]);
};
