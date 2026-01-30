import { useCallback, useEffect, useRef } from 'react';
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
} from '../../../Views/confirmations/hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';

/**
 * Hook to trace mUSD conversion quote fetching time.
 *
 * Call `startQuoteTrace` when the user submits an amount (Done button).
 * Trace ends when quotes arrive (success) or loading completes without quotes (failure).
 */
export function useMusdConversionQuoteTrace() {
  const isLoading = useIsTransactionPayQuoteLoading();
  const quotes = useTransactionPayQuotes();
  const transactionMeta = useTransactionMetadataRequest();
  const { payToken } = useTransactionPayToken();

  const traceIdRef = useRef<string | null>(null);
  const wasLoadingRef = useRef(false);

  const isMusdConversion =
    transactionMeta?.type === TransactionType.musdConversion;

  const startQuoteTrace = useCallback(() => {
    if (!isMusdConversion || traceIdRef.current) return;

    traceIdRef.current = uuidv4();
    wasLoadingRef.current = false;

    trace({
      name: TraceName.MusdConversionQuote,
      op: TraceOperation.MusdConversionDataFetch,
      id: traceIdRef.current,
      tags: {
        transactionId: transactionMeta?.id ?? 'unknown',
        payTokenAddress: payToken?.address ?? 'unknown',
        payTokenChainId: payToken?.chainId ?? 'unknown',
      },
    });
  }, [
    isMusdConversion,
    transactionMeta?.id,
    payToken?.address,
    payToken?.chainId,
  ]);

  // End trace when loading finishes (with or without quotes)
  useEffect(() => {
    if (!traceIdRef.current) return;

    // Track when loading starts
    if (isLoading) {
      wasLoadingRef.current = true;
      return; // Don't check end conditions while loading
    }

    // Wait until we've seen loading start
    if (!wasLoadingRef.current) return;

    // Loading finished - check result
    const hasQuotes = (quotes?.length ?? 0) > 0;

    if (hasQuotes) {
      endTrace({
        name: TraceName.MusdConversionQuote,
        id: traceIdRef.current,
        data: {
          success: true,
          quoteCount: quotes?.length ?? 0,
          strategy: quotes?.[0]?.strategy ?? 'unknown',
        },
      });
    } else {
      endTrace({
        name: TraceName.MusdConversionQuote,
        id: traceIdRef.current,
        data: {
          success: false,
          reason: 'no_quotes',
        },
      });
    }

    traceIdRef.current = null;
    wasLoadingRef.current = false;
  }, [isLoading, quotes]);

  return { startQuoteTrace };
}
