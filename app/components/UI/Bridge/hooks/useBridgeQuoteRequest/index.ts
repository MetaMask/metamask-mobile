import { useCallback, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import {
  isSolanaChainId,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectSourceToken,
  selectDestToken,
  selectSelectedDestChainId,
  selectSlippage,
  selectDestAddress,
} from '../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { getDecimalChainId } from '../../../../../util/networks';
import { calcTokenValue } from '../../../../../util/transactions';
import { debounce } from 'lodash';

/**
 * Hook for handling bridge quote request updates
 * @returns {Function} A debounced function to update quote parameters
 */
export const useBridgeQuoteRequest = () => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destChainId = useSelector(selectSelectedDestChainId);
  const slippage = useSelector(selectSlippage);
  const walletAddress = useSelector(selectSelectedInternalAccountAddress);
  const destAddress = useSelector(selectDestAddress);

  /**
   * Updates quote parameters in the bridge controller
   */
  const updateQuoteParams = useCallback(async () => {
    if (
      !sourceToken ||
      !destToken ||
      !sourceAmount ||
      !destChainId ||
      !walletAddress
    ) {
      return;
    }

    const normalizedSourceAmount =
      sourceAmount && sourceToken?.decimals
        ? calcTokenValue(
            sourceAmount === '.' ? '0' : sourceAmount || '0',
            sourceToken.decimals,
          ).toFixed(0)
        : '0';

    const params: GenericQuoteRequest = {
      srcChainId: getDecimalChainId(sourceToken.chainId),
      srcTokenAddress: sourceToken.address,
      destChainId: getDecimalChainId(destChainId),
      destTokenAddress: destToken.address,
      srcTokenAmount: normalizedSourceAmount,
      slippage: Number(slippage),
      walletAddress,
      destWalletAddress: isSolanaChainId(destChainId)
        ? destAddress
        : walletAddress,
    };

    try {
      await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
        params,
      );
    } catch (error) {
      console.error('Error updating quote params:', error);
      throw error;
    }
  }, [
    sourceToken,
    destToken,
    sourceAmount,
    destChainId,
    slippage,
    walletAddress,
    destAddress,
  ]);

  // Create a stable debounced function that persists across renders
  return useMemo(() => debounce(updateQuoteParams, 300), [updateQuoteParams]);
};
