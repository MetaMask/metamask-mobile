import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  formatAddressToCaipReference,
  type GenericQuoteRequest,
  type QuoteMetadata,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
  selectDestAddress,
  selectDestToken,
  selectQuoteStreamComplete,
  selectSelectedDestChainId,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../selectors/bridge';
import { useUnifiedSwapBridgeContext } from '../../../Bridge/hooks/useUnifiedSwapBridgeContext';
import { getDecimalChainId } from '../../../../../util/networks';
import { calcTokenValue } from '../../../../../util/transactions';

const REFETCH_TIMEOUT_MS = 15_000;

type FreshQuote = QuoteResponse & QuoteMetadata;

interface PendingRefetch {
  startTime: number;
  resolve: (quote: FreshQuote | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Triggers a fresh bridge quote fetch with the current Redux quote-request
 * params and resolves with the new best quote once the stream completes.
 * Resolves with null on timeout or if no quote is available.
 */
export function useFreshQuoteForRetry() {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destChainId = useSelector(selectSelectedDestChainId);
  const slippage = useSelector(selectSlippage);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );
  const context = useUnifiedSwapBridgeContext();

  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const quotes = useSelector(selectBridgeQuotes);
  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);

  const pendingRef = useRef<PendingRefetch | null>(null);

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    const lastFetched = bridgeControllerState?.quotesLastFetched;
    if (!lastFetched || lastFetched < pending.startTime) return;
    if (!quoteStreamComplete) return;

    const best = quotes?.recommendedQuote ?? null;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    pending.resolve(best);
  }, [
    bridgeControllerState?.quotesLastFetched,
    quoteStreamComplete,
    quotes,
  ]);

  useEffect(
    () => () => {
      const pending = pendingRef.current;
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current = null;
        pending.resolve(null);
      }
    },
    [],
  );

  const fetchFreshQuote = useCallback(async (): Promise<FreshQuote | null> => {
    if (
      !sourceToken ||
      !destToken ||
      sourceAmount === undefined ||
      !destChainId ||
      !walletAddress
    ) {
      return null;
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
      srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
      destChainId: getDecimalChainId(destChainId),
      destTokenAddress: formatAddressToCaipReference(destToken.address),
      srcTokenAmount: normalizedSourceAmount,
      slippage: slippage ? Number(slippage) : undefined,
      walletAddress,
      destWalletAddress: destAddress ?? walletAddress,
      gasIncluded,
      gasIncluded7702,
      insufficientBal: false,
    };

    const startTime = Date.now();

    // Cancel any prior in-flight refetch.
    const prior = pendingRef.current;
    if (prior) {
      clearTimeout(prior.timer);
      pendingRef.current = null;
      prior.resolve(null);
    }

    const promise = new Promise<FreshQuote | null>((resolve) => {
      const timer = setTimeout(() => {
        if (pendingRef.current?.startTime === startTime) {
          pendingRef.current = null;
          resolve(null);
        }
      }, REFETCH_TIMEOUT_MS);
      pendingRef.current = { startTime, resolve, timer };
    });

    try {
      await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
        params,
        context,
        0,
        1,
      );
    } catch {
      const pending = pendingRef.current;
      if (pending?.startTime === startTime) {
        clearTimeout(pending.timer);
        pendingRef.current = null;
        pending.resolve(null);
      }
      return null;
    }

    return promise;
  }, [
    sourceToken,
    destToken,
    sourceAmount,
    destChainId,
    slippage,
    walletAddress,
    destAddress,
    gasIncluded,
    gasIncluded7702,
    context,
  ]);

  return { fetchFreshQuote };
}
