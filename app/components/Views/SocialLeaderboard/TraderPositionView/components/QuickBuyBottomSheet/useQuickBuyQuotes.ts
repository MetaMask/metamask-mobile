import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatAddressToCaipReference,
  isNonEvmChainId,
  type GenericQuoteRequest,
  type L1GasFees,
  type NonEvmFees,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../../../../core/Engine';
import { getDecimalChainId } from '../../../../../../util/networks';
import { calcTokenValue } from '../../../../../../util/transactions';
import { fromTokenMinimalUnit } from '../../../../../../util/number';
import { areAddressesEqual } from '../../../../../../util/address';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import {
  QUICKBUY_FEATURE_ID,
  QUICKBUY_QUOTE_DEBOUNCE_MS,
  QUICKBUY_QUOTE_STALE_TIMEOUT_MS,
} from './constants';

export type QuickBuyQuote = QuoteResponse & L1GasFees & NonEvmFees;

interface UseQuickBuyQuotesParams {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  /** Readable decimal amount of the source token (e.g. "12.5"). */
  sourceTokenAmount: string | undefined;
  /** Slippage percent as a string, e.g. "0.5". */
  slippage: string;
  walletAddress: string | undefined;
  /** Destination account address for cross-ecosystem flows; falls back to walletAddress. */
  destAddress: string | undefined;
  insufficientBal: boolean;
  gasIncluded: boolean;
  gasIncluded7702: boolean;
  /** When false, the hook stays idle and does not fetch. */
  enabled: boolean;
}

export interface UseQuickBuyQuotesResult {
  activeQuote: QuickBuyQuote | undefined;
  destTokenAmount: string | undefined;
  isQuoteLoading: boolean;
  quoteFetchError: string | null;
  isNoQuotesAvailable: boolean;
  blockaidError: string | null;
  isActiveQuoteForCurrentTokenPair: boolean;
}

/**
 * Drop-in replacement for `useBridgeQuoteRequest` + `useBridgeQuoteData` for the
 * QuickBuy flow. Calls `BridgeController.fetchQuotes` directly (one-shot, no
 * Redux writes) with a debounce and an `AbortController`, and manages the quote
 * state locally so the shared bridge slice never gets polluted.
 */
export const useQuickBuyQuotes = ({
  sourceToken,
  destToken,
  sourceTokenAmount,
  slippage,
  walletAddress,
  destAddress,
  insufficientBal,
  gasIncluded,
  gasIncluded7702,
  enabled,
}: UseQuickBuyQuotesParams): UseQuickBuyQuotesResult => {
  const [quotes, setQuotes] = useState<QuickBuyQuote[]>([]);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteFetchError, setQuoteFetchError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const hasRequiredInputs = Boolean(
    enabled &&
      sourceToken &&
      destToken &&
      sourceTokenAmount &&
      Number(sourceTokenAmount) > 0 &&
      walletAddress,
  );

  useEffect(() => {
    if (!hasRequiredInputs || !sourceToken || !destToken || !walletAddress) {
      setQuotes([]);
      setQuoteFetchError(null);
      setIsQuoteLoading(false);
      setHasFetched(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timeoutId = setTimeout(async () => {
      try {
        setIsQuoteLoading(true);
        setQuoteFetchError(null);

        const normalizedSourceAmount = calcTokenValue(
          sourceTokenAmount === '.' ? '0' : sourceTokenAmount || '0',
          sourceToken.decimals,
        ).toFixed(0);

        const params: GenericQuoteRequest = {
          srcChainId: getDecimalChainId(sourceToken.chainId),
          srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
          destChainId: getDecimalChainId(destToken.chainId),
          destTokenAddress: formatAddressToCaipReference(destToken.address),
          srcTokenAmount: normalizedSourceAmount,
          slippage: slippage ? Number(slippage) : undefined,
          walletAddress,
          destWalletAddress: destAddress ?? walletAddress,
          gasIncluded,
          gasIncluded7702,
          insufficientBal,
        };

        // TODO: add Blockaid validation for Solana quotes (see
        // useBridgeQuoteData for reference implementation). Intentionally
        // skipped for the initial QuickBuy migration.
        const result = await Engine.context.BridgeController.fetchQuotes(
          params,
          controller.signal,
          QUICKBUY_FEATURE_ID,
        );

        if (controller.signal.aborted) return;

        setQuotes(result);
        setHasFetched(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Error fetching QuickBuy quotes', error);
        setQuoteFetchError(
          error instanceof Error ? error.message : 'Failed to fetch quotes',
        );
        setQuotes([]);
        setHasFetched(true);
      } finally {
        if (!controller.signal.aborted) {
          setIsQuoteLoading(false);
        }
      }
    }, QUICKBUY_QUOTE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    hasRequiredInputs,
    sourceToken,
    destToken,
    sourceTokenAmount,
    slippage,
    walletAddress,
    destAddress,
    gasIncluded,
    gasIncluded7702,
    insufficientBal,
    refreshTick,
  ]);

  // Stale-quote timer: re-fetch after a period of idle so the confirm button
  // never submits an expired quote.
  useEffect(() => {
    if (!hasFetched || !hasRequiredInputs) return undefined;
    const timer = setTimeout(() => {
      setRefreshTick((tick) => tick + 1);
    }, QUICKBUY_QUOTE_STALE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [hasFetched, hasRequiredInputs, quotes]);

  // `fetchQuotes` already returns quotes sorted via BridgeController.sortQuotes,
  // so the first entry is the recommended one.
  const activeQuote = quotes[0];

  const isQuoteSourceTokenMatch = useMemo(() => {
    if (!activeQuote || !sourceToken) return false;
    const { srcAsset } = activeQuote.quote;
    const quoteSourceAddress = isNonEvmChainId(sourceToken.chainId)
      ? (srcAsset.assetId ?? srcAsset.address)
      : srcAsset.address;
    return areAddressesEqual(quoteSourceAddress, sourceToken.address);
  }, [activeQuote, sourceToken]);

  const isQuoteDestTokenMatch = useMemo(() => {
    if (!activeQuote || !destToken) return false;
    const { destAsset } = activeQuote.quote;
    const quoteDestAddress = isNonEvmChainId(destToken.chainId)
      ? (destAsset.assetId ?? destAsset.address)
      : destAsset.address;
    return areAddressesEqual(quoteDestAddress, destToken.address);
  }, [activeQuote, destToken]);

  const destTokenAmount =
    activeQuote && destToken && isQuoteSourceTokenMatch && isQuoteDestTokenMatch
      ? fromTokenMinimalUnit(
          activeQuote.quote.destTokenAmount,
          destToken.decimals,
        )
      : undefined;

  const isNoQuotesAvailable =
    hasFetched && !isQuoteLoading && !quoteFetchError && quotes.length === 0;

  return {
    activeQuote,
    destTokenAmount,
    isQuoteLoading,
    quoteFetchError,
    isNoQuotesAvailable,
    blockaidError: null,
    isActiveQuoteForCurrentTokenPair:
      isQuoteSourceTokenMatch && isQuoteDestTokenMatch,
  };
};
