import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useAsyncResult } from '../../../../hooks/useAsyncResult';
import { BridgeQuoteRequest, getBridgeQuotes } from '../../utils/bridge';
import { useEffect, useRef, useState } from 'react';
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
import {
  getQuoteRefreshRate,
  isQuoteExpired,
} from '../../../../UI/Bridge/utils/quoteUtils';
import { selectBridgeFeatureFlags } from '../../../../../core/redux/slices/bridge';

const EXCLUDED_ALERTS = [
  AlertKeys.NoPayTokenQuotes,
  AlertKeys.InsufficientPayTokenNative,
];

const log = createProjectLogger('transaction-pay');

export function useTransactionBridgeQuotes() {
  const dispatch = useDispatch();
  const transactionMeta = useTransactionMetadataOrThrow();
  const { alerts } = useAlerts();
  const { payToken } = useTransactionPayToken() ?? {};
  const { amounts: sourceAmounts } = useTransactionPayTokenAmounts({
    log: true,
  });
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags);
  const [lastFetched, setLastFetched] = useState(0);
  const interval = useRef<NodeJS.Timer>();
  const isExpired = useRef(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (interval.current) {
      clearInterval(interval.current as unknown as number);
    }

    interval.current = setInterval(() => {
      if (
        !isExpired.current &&
        lastFetched &&
        isQuoteExpired(false, refreshRate, lastFetched)
      ) {
        log('Quote expired', { refreshRate, lastFetched });
        isExpired.current = true;
        setRefreshIndex((index) => index + 1);
      }
    }, 1000);

    return () => {
      if (interval.current) {
        clearInterval(interval.current as unknown as number);
      }
    };
  }, [isExpired, lastFetched, refreshRate]);

  const { attemptsMax, bufferInitial, bufferStep, bufferSubsequent, slippage } =
    useSelector(selectMetaMaskPayFlags);

  const hasBlockingAlert = alerts.some(
    (a) => a.isBlocking && !EXCLUDED_ALERTS.includes(a.key as AlertKeys),
  );

  const {
    chainId: targetChainId,
    id: transactionId,
    txParams: { from },
  } = transactionMeta;

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
        allowUnderMinimum,
        amountRaw: sourceTokenAmount,
        targetAmountRaw,
      } = sourceAmount;

      const targetAmountMinimum = allowUnderMinimum ? '0' : targetAmountRaw;

      return {
        attemptsMax,
        bufferInitial,
        bufferStep,
        bufferSubsequent,
        from: from as Hex,
        slippage,
        sourceBalanceRaw,
        sourceChainId,
        sourceTokenAddress,
        sourceTokenAmount,
        targetAmountMinimum,
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
    slippage,
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
  }, [requests, refreshIndex]);

  useEffect(() => {
    dispatch(
      setTransactionBridgeQuotesLoading({ transactionId, isLoading: loading }),
    );
  }, [dispatch, transactionId, loading]);

  useEffect(() => {
    dispatch(setTransactionBridgeQuotes({ transactionId, quotes }));

    if (quotes?.length) {
      isExpired.current = false;
      setLastFetched(Date.now());
    }

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
