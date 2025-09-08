import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { BridgeQuoteRequest, getBridgeQuotes } from '../../utils/bridge';
import { useEffect } from 'react';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useDispatch, useSelector } from 'react-redux';
import {
  setTransactionBridgeQuotes,
  setTransactionBridgeQuotesLoading,
} from '../../../../../core/redux/slices/confirmationMetrics';
import { useTransactionMetadataOrThrow } from '../transactions/useTransactionMetadataRequest';
import { Hex, createProjectLogger } from '@metamask/utils';
import { useDeepMemo } from '../useDeepMemo';
import { useAlerts } from '../../context/alert-system-context';
import { AlertKeys } from '../../constants/alerts';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';

const EXCLUDED_ALERTS = [
  AlertKeys.NoPayTokenQuotes,
  AlertKeys.InsufficientPayTokenNative,
];

const log = createProjectLogger('transaction-pay');

export function useTransactionBridgeQuotes() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataOrThrow();
  const { alerts } = useAlerts();

  const {
    attemptsMax,
    bufferInitial,
    bufferStep,
    slippageInitial,
    slippageSubsequent,
  } = useSelector(selectMetaMaskPayFlags);

  const hasBlockingAlert = alerts.some(
    (a) => a.isBlocking && !EXCLUDED_ALERTS.includes(a.key as AlertKeys),
  );

  const {
    chainId: targetChainId,
    id: transactionId,
    txParams: { from },
  } = transactionMeta;

  const { payToken } = useTransactionPayToken() ?? {};
  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts();

  const {
    address: sourceTokenAddress,
    balanceRaw,
    chainId: sourceChainId,
  } = payToken ?? {};

  const sourceBalanceRaw = balanceRaw ?? '0';

  const requests: BridgeQuoteRequest[] = useDeepMemo(() => {
    if (
      !sourceTokenAddress ||
      !sourceChainId ||
      !sourceAmounts ||
      hasBlockingAlert
    ) {
      return [];
    }

    return sourceAmounts.map((sourceAmount) => {
      const {
        address: targetTokenAddress,
        amountRaw: sourceTokenAmount,
        targetAmountRaw,
      } = sourceAmount;

      return {
        attemptsMax,
        bufferInitial,
        bufferStep,
        from: from as Hex,
        slippageInitial,
        slippageSubsequent,
        sourceBalanceRaw,
        sourceChainId,
        sourceTokenAddress,
        sourceTokenAmount,
        targetAmountMinimum: targetAmountRaw,
        targetChainId,
        targetTokenAddress,
      };
    });
  }, [
    attemptsMax,
    bufferInitial,
    bufferStep,
    from,
    hasBlockingAlert,
    slippageInitial,
    slippageSubsequent,
    sourceAmounts,
    sourceBalanceRaw,
    sourceChainId,
    sourceTokenAddress,
    targetChainId,
  ]);

  const { pending: loading, value: quotes } = useAsyncResult(async () => {
    if (!requests.length || requests.some((request) => !request)) {
      return [];
    }

    return getBridgeQuotes(requests);
  }, [requests]);

  useEffect(() => {
    dispatch(
      setTransactionBridgeQuotesLoading({ transactionId, isLoading: loading }),
    );
  }, [dispatch, transactionId, loading]);

  useEffect(() => {
    dispatch(setTransactionBridgeQuotes({ transactionId, quotes }));

    log(
      'Bridge quotes',
      quotes?.map((quote) => ({
        approval: quote.approval,
        bridgeId: quote.quote?.bridgeId,
        networkFee: quote.totalMaxNetworkFee?.valueInCurrency,
        sourceAmount: quote.sentAmount?.valueInCurrency,
        to: quote.toTokenAmount?.valueInCurrency,
        trade: quote.trade,
      })),
    );
  }, [dispatch, quotes, transactionId]);

  return { loading, quotes };
}
