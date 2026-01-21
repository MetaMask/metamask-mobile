import { useEffect, useRef } from 'react';
import { TransactionType } from '@metamask/transaction-controller';
import { v4 as uuidv4 } from 'uuid';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import {
  useIsTransactionPayQuoteLoading,
  useTransactionPayQuotes,
  useTransactionPaySourceAmounts,
} from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';

function getStrategyName(strategy: TransactionPayStrategy | undefined): string {
  if (strategy === TransactionPayStrategy.Bridge) return 'bridge';
  if (strategy === TransactionPayStrategy.Relay) return 'relay';
  return 'unknown';
}

/**
 * Hook to trace mUSD conversion quote fetching time.
 *
 * Automatically detects when the user clicks Done by watching for `sourceAmounts`
 * to appear (indicating quote request started). Ends trace when quotes arrive
 * (success) or loading finishes with no quotes (error).
 *
 * Only traces for mUSD conversion transactions.
 */
export function useMusdConversionQuoteTrace() {
  const isLoading = useIsTransactionPayQuoteLoading();
  const quotes = useTransactionPayQuotes();
  const sourceAmounts = useTransactionPaySourceAmounts();
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();

  const traceIdRef = useRef<string | null>(null);
  const traceStartedRef = useRef(false);
  const prevSourceAmountsLengthRef = useRef(sourceAmounts?.length ?? 0);

  const isMusdConversion =
    transactionMeta?.type === TransactionType.musdConversion;
  const transactionId = transactionMeta?.id;

  // Watch for sourceAmounts to appear (indicates Done was pressed and quote request started)
  // Also watch for quotes to arrive (success) or loading to finish with no quotes (error)
  useEffect(() => {
    if (!isMusdConversion) {
      return;
    }

    const prevSourceAmountsLength = prevSourceAmountsLengthRef.current;
    const currentSourceAmountsLength = sourceAmounts?.length ?? 0;
    const hasQuotes = (quotes?.length ?? 0) > 0;

    // START: sourceAmounts just appeared (0 -> >0) and no quotes yet
    if (
      !traceStartedRef.current &&
      prevSourceAmountsLength === 0 &&
      currentSourceAmountsLength > 0 &&
      !hasQuotes
    ) {
      traceIdRef.current = uuidv4();
      traceStartedRef.current = true;

      trace({
        name: TraceName.MusdConversionQuote,
        op: TraceOperation.MusdConversionDataFetch,
        id: traceIdRef.current,
        tags: {
          transactionId: transactionId ?? 'unknown',
          payTokenAddress: payToken?.address ?? 'unknown',
          payTokenChainId: payToken?.chainId ?? 'unknown',
        },
      });
    }

    // END conditions (only if trace was started)
    if (traceStartedRef.current && traceIdRef.current) {
      // Success: quotes arrived
      if (hasQuotes) {
        const strategyName = getStrategyName(quotes?.[0]?.strategy);

        endTrace({
          name: TraceName.MusdConversionQuote,
          id: traceIdRef.current,
          data: {
            success: true,
            quoteCount: quotes?.length ?? 0,
            strategy: strategyName,
          },
        });
        traceIdRef.current = null;
        traceStartedRef.current = false;
      }
      // Error: loading finished, had source amounts, but no quotes
      else if (!isLoading && currentSourceAmountsLength > 0 && !hasQuotes) {
        endTrace({
          name: TraceName.MusdConversionQuote,
          id: traceIdRef.current,
          data: {
            success: false,
            reason: 'no_quotes',
          },
        });
        traceIdRef.current = null;
        traceStartedRef.current = false;
      }
    }

    prevSourceAmountsLengthRef.current = currentSourceAmountsLength;
  }, [
    sourceAmounts,
    quotes,
    isLoading,
    isMusdConversion,
    transactionId,
    payToken?.address,
    payToken?.chainId,
  ]);

  // Cleanup: end trace if component unmounts while tracing
  useEffect(
    () => () => {
      if (traceIdRef.current) {
        endTrace({
          name: TraceName.MusdConversionQuote,
          id: traceIdRef.current,
          data: {
            success: false,
            reason: 'unmount',
          },
        });
        traceIdRef.current = null;
        traceStartedRef.current = false;
      }
    },
    [],
  );
}
