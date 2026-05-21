import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { debounce } from 'lodash';
import {
  formatAddressToCaipReference,
  isNonEvmChainId,
  selectBridgeQuotes as selectBridgeQuotesBase,
  SortOrder,
  type BridgeAppState,
  type GenericQuoteRequest,
  type L1GasFees,
  type NonEvmFees,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import type { RootState } from '../../../../../../../reducers';
import Engine from '../../../../../../../core/Engine';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import { fromTokenMinimalUnit } from '../../../../../../../util/number/bigint';
import { areAddressesEqual } from '../../../../../../../util/address';
import { calcTokenValue } from '../../../../../../../util/transactions';
import { analytics } from '../../../../../../../util/analytics/analytics';
import { selectRemoteFeatureFlags } from '../../../../../../../selectors/featureFlagController';
import {
  selectDestAddress,
  selectSlippage,
} from '../../../../../../../core/redux/slices/bridge';
import {
  selectGasIncludedQuoteParams,
  selectSourceWalletAddress,
} from '../../../../../../../selectors/bridge';
import { getDecimalChainId } from '../../../../../../../util/networks';
import {
  SocialLeaderboardEventProperties,
  useSocialLeaderboardAnalytics,
} from '../../../../analytics';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';

export type QuickBuyQuote = QuoteResponse & L1GasFees & NonEvmFees;

export interface QuickBuyQuotesAnalyticsContext {
  /** Wallet address of the trader being copied. */
  traderAddress?: string;
  /** CAIP-19 of the destination token. */
  caip19?: string;
  /** USD amount the user has selected; used as `amount_usd`. */
  amountUsd?: number;
}

export type EnrichedQuickBuyQuote = ReturnType<
  typeof selectBridgeQuotesBase
>['sortedQuotes'][number];

export const QUICK_BUY_QUOTE_DEBOUNCE_MS = 300;

interface UseQuickBuyQuotesParams {
  sourceToken: BridgeToken | undefined;
  destToken: BridgeToken | undefined;
  sourceTokenAmount: string | undefined;
  analyticsContext?: QuickBuyQuotesAnalyticsContext;
}

export interface UseQuickBuyQuotesResult {
  activeQuote: EnrichedQuickBuyQuote | undefined;
  destTokenAmount: string | undefined;
  isQuoteLoading: boolean;
  quoteFetchError: string | null;
  isNoQuotesAvailable: boolean;
  isActiveQuoteForCurrentTokenPair: boolean;
  /** Number of quotes returned by the most recent successful request. */
  quoteCount: number;
}

const buildQuoteRequest = ({
  sourceToken,
  destToken,
  sourceTokenAmount,
  slippage,
  walletAddress,
  destAddress,
  gasIncluded,
  gasIncluded7702,
}: {
  sourceToken: BridgeToken;
  destToken: BridgeToken;
  sourceTokenAmount: string;
  slippage: string | undefined;
  walletAddress: string;
  destAddress: string | undefined;
  gasIncluded: boolean;
  gasIncluded7702: boolean;
}): GenericQuoteRequest | null => {
  let normalizedSourceAmount: string;
  try {
    normalizedSourceAmount = calcTokenValue(
      sourceTokenAmount === '.' ? '0' : sourceTokenAmount,
      sourceToken.decimals,
    ).toFixed(0);
  } catch {
    return null;
  }

  if (normalizedSourceAmount === '0') {
    return null;
  }

  return {
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
  };
};

// Read the app-wide controller dependencies once. selectBridgeQuotesBase needs
// the background controller state so it can derive quote metadata (gas fees,
// exchange-rate-denominated amounts, …) from raw fetchQuotes results. We inject
// our locally-held quotes into this shape instead of going through Redux so the
// BridgeController background state stays untouched.
const selectQuoteMetadataDeps = (state: RootState) => ({
  bridgeController: state.engine.backgroundState.BridgeController,
  gasFeeEstimatesByChainId:
    state.engine.backgroundState.GasFeeController.gasFeeEstimatesByChainId ??
    {},
  multichainAssetsRates:
    state.engine.backgroundState.MultichainAssetsRatesController,
  tokenRates: state.engine.backgroundState.TokenRatesController,
  currencyRate: state.engine.backgroundState.CurrencyRateController,
  bridgeConfig: selectRemoteFeatureFlags(state).bridgeConfig,
});

export function useQuickBuyQuotes({
  sourceToken,
  destToken,
  sourceTokenAmount,
  analyticsContext,
}: UseQuickBuyQuotesParams): UseQuickBuyQuotesResult {
  const slippage = useSelector(selectSlippage);
  const destAddress = useSelector(selectDestAddress);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );
  const { track } = useSocialLeaderboardAnalytics();

  const [rawQuotes, setRawQuotes] = useState<QuickBuyQuote[]>([]);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [quoteFetchError, setQuoteFetchError] = useState<string | null>(null);
  const [isNoQuotesAvailable, setIsNoQuotesAvailable] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  // Tracks request timing so the received-event can report latency.
  const requestStartedAtRef = useRef<number | null>(null);

  const resetQuotesIdle = useCallback(() => {
    setRawQuotes([]);
    setIsQuoteLoading(false);
    setIsNoQuotesAvailable(false);
    setQuoteFetchError(null);
  }, []);

  const fetchQuotes = useCallback(async () => {
    abortControllerRef.current?.abort();

    if (
      !sourceToken ||
      !destToken ||
      !walletAddress ||
      !sourceTokenAmount ||
      sourceToken.decimals === undefined
    ) {
      resetQuotesIdle();
      return;
    }

    const params = buildQuoteRequest({
      sourceToken,
      destToken,
      sourceTokenAmount,
      slippage,
      walletAddress,
      destAddress: destAddress ?? undefined,
      gasIncluded,
      gasIncluded7702,
    });

    if (!params) {
      resetQuotesIdle();
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsQuoteLoading(true);
    setQuoteFetchError(null);

    const requestedAt = Date.now();
    requestStartedAtRef.current = requestedAt;

    // Shared by REQUESTED + RECEIVED. Null when analytics context is incomplete
    // — both events guard on this single value instead of duplicating the check.
    const quotesBaseProps =
      analyticsContext?.traderAddress && analyticsContext?.caip19
        ? {
            [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
              analyticsContext.traderAddress,
            [SocialLeaderboardEventProperties.CAIP19]: analyticsContext.caip19,
            [SocialLeaderboardEventProperties.AMOUNT_USD]:
              analyticsContext.amountUsd ?? 0,
            [SocialLeaderboardEventProperties.PAY_WITH_TOKEN]:
              sourceToken.symbol,
          }
        : null;

    if (quotesBaseProps) {
      track(
        MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_REQUESTED,
        quotesBaseProps,
      );
    }

    const fireReceived = (quoteCount: number) => {
      if (quotesBaseProps) {
        track(MetaMetricsEvents.SOCIAL_QUICK_BUY_QUOTES_RECEIVED, {
          ...quotesBaseProps,
          [SocialLeaderboardEventProperties.QUOTE_COUNT]: quoteCount,
          [SocialLeaderboardEventProperties.LATENCY_MS]:
            Date.now() - requestedAt,
        });
      }
    };

    try {
      const result = await Engine.context.BridgeController.fetchQuotes(
        params,
        controller.signal,
        // @ts-expect-error quickBuy has not been added as a FeatureId yet
        'quickBuy',
      );

      if (controller.signal.aborted) {
        return;
      }

      setRawQuotes(result);
      setIsNoQuotesAvailable(result.length === 0);
      setIsQuoteLoading(false);
      fireReceived(result.length);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      setQuoteFetchError(message);
      setRawQuotes([]);
      setIsNoQuotesAvailable(false);
      setIsQuoteLoading(false);
      fireReceived(0);
    }
  }, [
    sourceToken,
    destToken,
    sourceTokenAmount,
    slippage,
    walletAddress,
    destAddress,
    gasIncluded,
    gasIncluded7702,
    resetQuotesIdle,
    analyticsContext,
    track,
  ]);

  const debouncedFetchQuotes = useMemo(
    () => debounce(fetchQuotes, QUICK_BUY_QUOTE_DEBOUNCE_MS),
    [fetchQuotes],
  );

  useEffect(() => {
    debouncedFetchQuotes();
    return () => {
      debouncedFetchQuotes.cancel();
    };
  }, [debouncedFetchQuotes]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    },
    [],
  );

  const metadataDeps = useSelector(selectQuoteMetadataDeps, shallowEqual);

  const enrichedResult = useMemo(() => {
    // BridgeController.fetchQuotes called directly (not via internal polling)
    // does not update state.quoteRequest. The selector uses quoteRequest to look
    // up exchange rates for fee valueInCurrency computation, so we inject it
    // from the current source/dest tokens.
    const quoteRequestPatch =
      sourceToken && destToken
        ? {
            srcChainId: getDecimalChainId(sourceToken.chainId),
            srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
            destChainId: getDecimalChainId(destToken.chainId),
            destTokenAddress: formatAddressToCaipReference(destToken.address),
          }
        : {};

    const existingQuoteRequest = metadataDeps.bridgeController.quoteRequest;
    const quoteRequestBase = Array.isArray(existingQuoteRequest)
      ? (existingQuoteRequest[0] ?? {})
      : (existingQuoteRequest ?? {});

    const controllerFields: BridgeAppState = {
      ...metadataDeps.bridgeController,
      quotes: rawQuotes,
      // selectBridgeQuotes destructures quoteRequest as an array at runtime.
      quoteRequest: [{ ...quoteRequestBase, ...quoteRequestPatch }],
      gasFeeEstimatesByChainId: metadataDeps.gasFeeEstimatesByChainId,
      ...metadataDeps.multichainAssetsRates,
      ...metadataDeps.tokenRates,
      ...metadataDeps.currencyRate,
      participateInMetaMetrics: analytics.isEnabled(),
      remoteFeatureFlags: {
        bridgeConfig: metadataDeps.bridgeConfig,
      },
    };

    return selectBridgeQuotesBase(controllerFields, {
      sortOrder: SortOrder.COST_ASC,
      selectedQuote: null,
    });
  }, [rawQuotes, metadataDeps, sourceToken, destToken]);

  const activeQuote = enrichedResult.recommendedQuote ?? undefined;

  const isActiveQuoteForCurrentTokenPair = useMemo(() => {
    if (!activeQuote || !sourceToken || !destToken) {
      return false;
    }

    const { srcAsset, destAsset } = activeQuote.quote;

    const quoteSourceAddress = isNonEvmChainId(sourceToken.chainId)
      ? (srcAsset.assetId ?? srcAsset.address)
      : srcAsset.address;
    const quoteDestAddress = isNonEvmChainId(destToken.chainId)
      ? (destAsset.assetId ?? destAsset.address)
      : destAsset.address;

    return (
      areAddressesEqual(quoteSourceAddress, sourceToken.address) &&
      areAddressesEqual(quoteDestAddress, destToken.address)
    );
  }, [activeQuote, sourceToken, destToken]);

  const destTokenAmount =
    activeQuote && destToken && isActiveQuoteForCurrentTokenPair
      ? fromTokenMinimalUnit(
          activeQuote.quote.destTokenAmount,
          destToken.decimals,
        )
      : undefined;

  return {
    activeQuote,
    destTokenAmount,
    isQuoteLoading,
    quoteFetchError,
    isNoQuotesAvailable,
    isActiveQuoteForCurrentTokenPair,
    quoteCount: enrichedResult.sortedQuotes?.length ?? rawQuotes.length,
  };
}
