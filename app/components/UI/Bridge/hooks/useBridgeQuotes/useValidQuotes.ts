import { useDispatch, useSelector } from 'react-redux';

import {
  RequestStatus,
  isNonEvmChainId,
  formatAddressToCaipReference,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useIsInsufficientBalance from '../useInsufficientBalance';
import { BigNumber as EthersBigNumber } from 'ethers';

import type { BridgeToken } from '../../types';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
  selectIsSubmittingTx,
  selectBridgeFeatureFlags,
  selectSelectedQuoteRequestId,
  selectQuoteStreamComplete,
  setSelectedQuoteRequestId,
} from '../../../../../core/redux/slices/bridge';
import {
  getQuoteRefreshRate,
  isQuoteExpired,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';
import { areAddressesEqual } from '../../../../../util/address';
import { parseCaipAssetType } from '@metamask/utils';

interface UseValidQuotesParams {
  latestSourceAtomicBalance?: EthersBigNumber;
  quoteParams: {
    srcAmount?: string;
    srcToken?: BridgeToken;
    destToken?: BridgeToken;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
  };
}
export const useValidQuotes = ({
  latestSourceAtomicBalance,
  quoteParams,
}: UseValidQuotesParams) => {
  const { recommendedQuote, sortedQuotes } = useSelector(selectBridgeQuotes);
  const { quotesLoadingStatus, quotesLastFetched, quotesRefreshCount } =
    useSelector(selectBridgeControllerState);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const selectedQuoteRequestId = useSelector(selectSelectedQuoteRequestId);

  // Check if new quotes will be fetched
  const refreshRate = getQuoteRefreshRate(
    bridgeFeatureFlags,
    quoteParams.srcToken,
  );
  const maxRefreshCount = bridgeFeatureFlags?.maxRefreshCount ?? 5; // Default to 5 refresh attempts
  const insufficientBalForQuote = useIsInsufficientBalance({
    amount: quoteParams.srcAmount,
    token: quoteParams.srcToken,
    latestAtomicBalance: latestSourceAtomicBalance,
  });

  const willRefresh = shouldRefreshQuote(
    insufficientBalForQuote ?? false,
    quotesRefreshCount,
    maxRefreshCount,
    isSubmittingTx,
  );

  const isExpired = isQuoteExpired(willRefresh, refreshRate, quotesLastFetched);

  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);
  const isNoQuotesAvailable = quoteStreamComplete?.hasQuotes === false;

  const allQuotes = useMemo(() => sortedQuotes ?? [], [sortedQuotes]);

  // Determine the active quote:
  // 1. If user manually selected a quote, use that
  // 2. Otherwise, use the best quote
  // 3. If expired and not refreshing, use undefined
  const manuallySelectedQuote = selectedQuoteRequestId
    ? allQuotes.find(
        (quote) => quote.quote.requestId === selectedQuoteRequestId,
      )
    : undefined;

  const rawActiveQuote =
    isExpired && !willRefresh && !isSubmittingTx
      ? undefined
      : (manuallySelectedQuote ?? recommendedQuote);

  // When quotes are expired but the user hasn't yet triggered a new fetch,
  // keep showing the last quotes that are still present in Redux. They are NOT
  // cleared from the store on expiry — only BridgeController.resetState()
  // (called on "Get new quote") removes them. Reading from Redux directly means
  // every consumer of this hook (BridgeView, QuoteSelectorView, …) sees the
  // same cached data without needing per-instance refs.
  const isShowingCachedQuote =
    isExpired &&
    !willRefresh &&
    !isSubmittingTx &&
    quotesLoadingStatus !== RequestStatus.LOADING &&
    !!(manuallySelectedQuote ?? recommendedQuote);

  const activeQuote = isShowingCachedQuote
    ? (manuallySelectedQuote ?? recommendedQuote)
    : rawActiveQuote;

  const isLoading = quotesLoadingStatus === RequestStatus.LOADING;
  // Show "Get new quote" only when an expired quote needs refresh.
  const needsNewQuote =
    isExpired && !isSubmittingTx && (!isLoading || !activeQuote);

  // TODO use assetIdsMatch
  // Validate that the quote's source asset matches the selected source token
  // This prevents showing stale quote data when user changes source token on the same chain
  const isQuoteSourceTokenMatch = useMemo(() => {
    if (!activeQuote || !quoteParams.srcToken) return false;

    const {
      src: { asset: srcAsset },
    } = activeQuote.quote;

    const srcChainId = activeQuote.chainId;

    const quoteSourceAddress = isNonEvmChainId(quoteParams.srcToken.chainId)
      ? srcAsset.assetId
      : formatAddressToCaipReference(srcAsset.assetId);

    const selectedSourceAddress = quoteParams.srcToken.address;
    return (
      srcChainId === formatChainIdToCaip(quoteParams.srcToken.chainId) &&
      areAddressesEqual(quoteSourceAddress, selectedSourceAddress)
    );
  }, [activeQuote, quoteParams.srcToken]);
  // Helper to validate that a quote's destination asset matches the selected destination token
  // This prevents showing stale quote data (with wrong decimals) when user changes destination token
  const isQuoteDestTokenMatchForQuote = useCallback(
    (quote: (typeof allQuotes)[number] | undefined | null): boolean => {
      if (!quote || !quoteParams.destToken) return false;

      const {
        dest: { asset: destAsset },
      } = quote.quote;
      const destChainId = parseCaipAssetType(destAsset.assetId).chainId;

      // For non-EVM chains (e.g., Solana), destAsset.address is in raw format (e.g., "EPj...")
      // or zero address for native tokens, while destToken.address uses CAIP format
      // (e.g., "solana:.../token:EPj...").
      // Use destAsset.assetId (CAIP format) for comparison.
      // For EVM chains, use the original address comparison.
      const quoteDestAddress = isNonEvmChainId(quoteParams.destToken.chainId)
        ? destAsset.assetId
        : formatAddressToCaipReference(destAsset.assetId);

      const selectedDestAddress = quoteParams.destToken.address;
      return (
        destChainId === formatChainIdToCaip(quoteParams.destToken.chainId) &&
        areAddressesEqual(quoteDestAddress, selectedDestAddress)
      );
    },
    [quoteParams.destToken],
  );

  const isQuoteDestTokenMatch = isQuoteDestTokenMatchForQuote(activeQuote);
  const isActiveQuoteForCurrentTokenPair =
    isQuoteSourceTokenMatch && isQuoteDestTokenMatch;

  // Filter all quotes to only include valid ones (not expired and matching dest token).
  // When showing cached data the expiry guard is bypassed so the Redux quotes
  // that are still in the store remain visible until the user requests new ones.
  const validQuotes = useMemo(
    () =>
      isExpired && !willRefresh && !isSubmittingTx && !isShowingCachedQuote
        ? []
        : allQuotes.filter((quote) => isQuoteDestTokenMatchForQuote(quote)),
    [
      isExpired,
      willRefresh,
      isSubmittingTx,
      isShowingCachedQuote,
      allQuotes,
      isQuoteDestTokenMatchForQuote,
    ],
  );

  // Unset manually selected quote when no quote is selected
  const dispatch = useDispatch();
  useEffect(() => {
    if (!manuallySelectedQuote) {
      dispatch(setSelectedQuoteRequestId(undefined));
    }
  }, [manuallySelectedQuote, dispatch]);

  return useMemo(
    () => ({
      activeQuote,
      bestQuote: recommendedQuote,
      isActiveQuoteForCurrentTokenPair,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      validQuotes,
      willRefresh,
    }),
    [
      activeQuote,
      isActiveQuoteForCurrentTokenPair,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      recommendedQuote,
      validQuotes,
      willRefresh,
    ],
  );
};
