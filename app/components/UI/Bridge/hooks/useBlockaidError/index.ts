import { useSelector } from 'react-redux';
import {
  selectIsSolanaSwap,
  selectIsSolanaToNonSolana,
} from '../../../../../core/redux/slices/bridge';
import { type QuoteResponse } from '@metamask/bridge-controller';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import useValidateBridgeTx from '../../../../../util/bridge/hooks/useValidateBridgeTx';

interface UseBlockaidErrorParams {
  activeQuote?: QuoteResponse | null;
}

/**
 * Hook for resolving the blockaid error for the active quote
 *
 * @param params - The parameters for the hook
 * @param params.activeQuote - The active quote
 * @returns The blockaid error
 */
export const useBlockaidError = ({
  activeQuote,
}: UseBlockaidErrorParams = {}) => {
  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isSolanaToNonSolana = useSelector(selectIsSolanaToNonSolana);
  const { validateBridgeTx } = useValidateBridgeTx();

  const [blockaidError, setBlockaidError] = useState<string | null>(null);
  // Ref to track the current validation ID to prevent race conditions
  const currentValidationIdRef = useRef<number>(0);
  const lastValidatedQuoteRef = useRef<{
    requestId: string;
    validateBridgeTx: typeof validateBridgeTx;
  } | null>(null);

  const abortController = useRef<AbortController | null>(new AbortController());
  useEffect(
    () => () => {
      abortController.current?.abort();
      abortController.current = null;
    },
    [],
  );

  const validateQuote = useCallback(async () => {
    if (
      !activeQuote ||
      (!isSolanaSwap && !isSolanaToNonSolana) ||
      // Skip validation for gas-included quotes on Solana
      activeQuote?.quote?.gasIncluded === true
    ) {
      lastValidatedQuoteRef.current = null;
      setBlockaidError(null);
      return;
    }

    const activeQuoteRequestId = activeQuote.quote.requestId;
    const hasValidatedCurrentQuote =
      lastValidatedQuoteRef.current?.requestId === activeQuoteRequestId &&
      lastValidatedQuoteRef.current?.validateBridgeTx === validateBridgeTx;

    if (hasValidatedCurrentQuote) {
      return;
    }

    lastValidatedQuoteRef.current = {
      requestId: activeQuoteRequestId,
      validateBridgeTx,
    };

    // Increment validation ID for this request
    const validationId = ++currentValidationIdRef.current;
    // Cancel any ongoing request
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      const validationResult = await validateBridgeTx({
        quoteResponse: activeQuote,
        signal: abortController.current?.signal,
      });

      // Check if this is still the current validation after async operation
      if (validationId !== currentValidationIdRef.current) {
        // This validation is outdated, ignore the result
        return;
      }

      if (validationResult.status === 'ERROR') {
        const isValidationError = !!validationResult.result.validation.reason;
        const { error_details } = validationResult;
        const fallbackErrorMessage = isValidationError
          ? validationResult.result.validation.reason
          : validationResult.error;
        const error = error_details?.message
          ? `The ${error_details.message}.`
          : fallbackErrorMessage;
        setBlockaidError(error);
      } else {
        setBlockaidError(null);
      }
    } catch (error) {
      // Check if this is still the current validation after async operation
      if (validationId !== currentValidationIdRef.current) {
        // This validation is outdated, ignore the result
        return;
      }

      console.error('Swaps Quote Data Validation error:', error);
      if (
        lastValidatedQuoteRef.current?.requestId === activeQuoteRequestId &&
        lastValidatedQuoteRef.current?.validateBridgeTx === validateBridgeTx
      ) {
        lastValidatedQuoteRef.current = null;
      }
      setBlockaidError(null);
    }
  }, [activeQuote, isSolanaSwap, isSolanaToNonSolana, validateBridgeTx]);

  useEffect(() => {
    validateQuote();
  }, [validateQuote]);

  return useMemo(() => blockaidError, [blockaidError]);
};
