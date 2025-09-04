import { useCallback, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import { type GenericQuoteRequest } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectSourceToken,
  selectDestToken,
  selectSelectedDestChainId,
  selectSlippage,
  selectDestAddress,
} from '../../../../../core/redux/slices/bridge';
import { getDecimalChainId } from '../../../../../util/networks';
import { calcTokenValue } from '../../../../../util/transactions';
import { debounce } from 'lodash';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';

export const DEBOUNCE_WAIT = 700;

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
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const context = useUnifiedSwapBridgeContext();
  const shouldUseSmartTransaction = useSelector(
    selectShouldUseSmartTransaction,
  );
  /**
   * Updates quote parameters in the bridge controller
   */
  const updateQuoteParams = useCallback(async () => {
    if (
      !sourceToken ||
      !destToken ||
      sourceAmount === undefined ||
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
      slippage: slippage ? Number(slippage) : undefined,
      walletAddress,
      destWalletAddress: destAddress ?? walletAddress,
      gasIncluded: shouldUseSmartTransaction,
      gasless7702: false, // TODO research how to handle this
    };

    await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
      params,
      context,
    );
  }, [
    sourceToken,
    destToken,
    sourceAmount,
    destChainId,
    slippage,
    walletAddress,
    destAddress,
    context,
    shouldUseSmartTransaction,
  ]);

  // Create a stable debounced function that persists across renders
  return useMemo(
    () => debounce(updateQuoteParams, DEBOUNCE_WAIT),
    [updateQuoteParams],
  );
};
