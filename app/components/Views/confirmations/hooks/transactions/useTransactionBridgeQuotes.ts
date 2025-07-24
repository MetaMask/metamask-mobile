import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from './useTransactionMetadataRequest';
import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { BridgeQuoteRequest, getBridgeQuotes } from '../../utils/bridge';
import { useEffect, useMemo } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { useDispatch } from 'react-redux';
import { setTransactionBridgeQuotes } from '../../../../../core/redux/slices/confirmationMetrics';
import { throttle } from 'lodash';

const throttledGetBridgeQuotes = throttle(
  (requests: BridgeQuoteRequest[]) => getBridgeQuotes(requests),
  10000,
);

export function useTransactionBridgeQuotes() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataRequest();
  const from = transactionMeta?.txParams.from as Hex;

  const {
    payToken: { address: sourceTokenAddress, chainId: sourceChainId },
  } = useTransactionPayToken();

  const transactionId = transactionMeta?.id as string;
  const targetChainId = transactionMeta?.chainId as Hex;
  const sourceAmounts = useTransactionPayTokenAmounts();
  const requiredTokens = useTransactionRequiredTokens();

  const requests: (BridgeQuoteRequest | undefined)[] = useMemo(
    () =>
      sourceAmounts?.map((sourceTokenAmount, index) => {
        const { address: targetTokenAddress } = requiredTokens[index] || {};

        if (!sourceTokenAmount) {
          return undefined;
        }

        return {
          from,
          sourceChainId,
          sourceTokenAddress,
          sourceTokenAmount,
          targetChainId,
          targetTokenAddress,
        };
      }) ?? [],
    [
      from,
      requiredTokens,
      sourceAmounts,
      sourceChainId,
      sourceTokenAddress,
      targetChainId,
    ],
  );

  const { pending: loading, value: quotes } = useAsyncResult(async () => {
    if (requests.some((request) => !request)) {
      return [];
    }

    return throttledGetBridgeQuotes(requests as BridgeQuoteRequest[]);
  }, [requests]);

  useEffect(() => {
    dispatch(setTransactionBridgeQuotes({ transactionId, quotes }));
  }, [dispatch, quotes, transactionId]);

  return { loading, quotes };
}
