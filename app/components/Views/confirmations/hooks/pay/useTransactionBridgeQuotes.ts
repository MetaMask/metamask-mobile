import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { BridgeQuoteRequest, getBridgeQuotes } from '../../utils/bridge';
import { useEffect } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useDispatch } from 'react-redux';
import {
  setTransactionBridgeQuotes,
  setTransactionBridgeQuotesLoading,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { Hex, createProjectLogger } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';
import { useAlerts } from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';

const log = createProjectLogger('transaction-pay');

export function useTransactionBridgeQuotes() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataOrThrow();
  const { alerts } = useAlerts();

  const hasBlockingAlert = alerts.some(
    (a) => a.isBlocking && a.key !== AlertKeys.NoPayTokenQuotes,
  );

  const {
    chainId: targetChainId,
    id: transactionId,
    txParams: { from },
  } = transactionMeta;

  const { payToken } = useTransactionPayToken() ?? {};

  const { address: sourceTokenAddress, chainId: sourceChainId } =
    payToken ?? {};

  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts();

  const requests: BridgeQuoteRequest[] = useDeepMemo(() => {
    if (
      !sourceTokenAddress ||
      !sourceChainId ||
      !sourceAmounts ||
      hasBlockingAlert
    ) {
      return [];
    }

    return sourceAmounts.map((sourceAmount, index) => {
      const { address: targetTokenAddress } = sourceAmounts[index] || {};
      const { amountRaw: sourceTokenAmount } = sourceAmount;

      return {
        from: from as Hex,
        sourceChainId,
        sourceTokenAddress,
        sourceTokenAmount,
        targetChainId,
        targetTokenAddress,
      };
    });
  }, [
    from,
    hasBlockingAlert,
    sourceAmounts,
    sourceChainId,
    sourceTokenAddress,
    targetChainId,
  ]);

  const { pending: loading, value: quotes } = useAsyncResult(async () => {
    if (!requests.length || requests.some((request) => !request)) {
      return [];
    }

    return getBridgeQuotes(requests as BridgeQuoteRequest[]);
  }, [requests]);

  useEffect(() => {
    dispatch(
      setTransactionBridgeQuotesLoading({ transactionId, isLoading: loading }),
    );
  }, [dispatch, transactionId, loading]);

  useEffect(() => {
    dispatch(setTransactionBridgeQuotes({ transactionId, quotes }));

    log('Bridge quotes', { transactionId, quotes });
  }, [dispatch, quotes, transactionId]);

  return { loading, quotes };
}
