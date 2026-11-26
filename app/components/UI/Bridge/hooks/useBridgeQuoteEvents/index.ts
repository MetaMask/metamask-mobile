import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
  selectQuoteStreamComplete,
  selectSlippage,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { useEffect, useMemo, useRef } from 'react';
import Engine from '../../../../../core/Engine';
import {
  AdvancedOrderMetricsEventName,
  getQuotesReceivedProperties,
  QuoteWarning,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { useTokenBalanceInUsd } from '../useTokenBalanceInUsd';
import { useHasSufficientGasEvenIfGasIncludedOrSponsored } from '../useHasSufficientGasEvenIfGasIncludedOrSponsored';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import { swapQuoteFetchTrace } from '../../utils/swapQuoteFetchTrace';

/**
 * Hook for publishing the QuotesReceived event.
 * Location is automatically injected by the bridge controller via setLocation().
 */
export const useBridgeQuoteEvents = ({
  enabled,
  eventName,
  hasInsufficientBalance,
  hasInsufficientNativeReserveError,
  hasNoQuotesAvailable,
  hasInsufficientGas,
  isNetworkFeeUnavailable,
  hasTxAlert,
  isSubmitDisabled,
  isPriceImpactWarningVisible,
  hasDestAssetRequireActivate,
  hasUsableQuote,
}: {
  enabled: boolean;
  eventName:
    | UnifiedSwapBridgeEventName.QuotesReceived
    | AdvancedOrderMetricsEventName.QuotesReceived;
  hasInsufficientBalance: boolean;
  hasInsufficientNativeReserveError: boolean;
  hasNoQuotesAvailable: boolean;
  hasInsufficientGas: boolean;
  isNetworkFeeUnavailable: boolean;
  hasTxAlert: boolean;
  isSubmitDisabled: boolean;
  isPriceImpactWarningVisible: boolean;
  hasDestAssetRequireActivate: boolean;
  hasUsableQuote?: boolean;
}) => {
  const { quoteFetchError, quotesRefreshCount } = useSelector(
    selectBridgeControllerState,
  );
  const lastObservedRefreshCountRef = useRef(0);
  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);
  const { activeQuote, recommendedQuote, isLoading } =
    useSelector(selectBridgeQuotes);
  const isFirstQuoteUsable =
    hasUsableQuote ?? Boolean(activeQuote && recommendedQuote?.quote.requestId);
  const firstUsableQuoteRequestId = isFirstQuoteUsable
    ? (activeQuote?.quote.requestId ?? recommendedQuote?.quote.requestId)
    : undefined;

  const sourceToken = useSelector(selectSourceToken);
  const slippage = useSelector(selectSlippage);
  const unifiedSwapBridgeContext = useUnifiedSwapBridgeContext();
  const fromTokenBalanceInUsd = useTokenBalanceInUsd(sourceToken ?? undefined);
  // NB: this is for gasless counter metrics purposes. It intentionally calculates balance insufficiency irrespective of gasless or sponsored quotes.
  const hasSufficientGasForQuote =
    useHasSufficientGasEvenIfGasIncludedOrSponsored({ quote: activeQuote });

  const warnings = useMemo(() => {
    const latestWarnings: QuoteWarning[] = [];

    hasNoQuotesAvailable && latestWarnings.push('no_quotes');
    if (isNetworkFeeUnavailable) {
      latestWarnings.push('network_fee_unavailable' as QuoteWarning);
    } else if (hasInsufficientGas) {
      latestWarnings.push('insufficient_gas_for_selected_quote');
    }
    hasInsufficientBalance && latestWarnings.push('insufficient_balance');
    hasInsufficientNativeReserveError &&
      // @ts-expect-error - 'insufficient_native_reserve' is a valid QuoteWarning
      latestWarnings.push('insufficient_native_reserve');
    hasTxAlert && latestWarnings.push('tx_alert');
    isPriceImpactWarningVisible && latestWarnings.push('price_impact');
    hasDestAssetRequireActivate &&
      latestWarnings.push('dest_asset_require_activate' as QuoteWarning);

    return latestWarnings;
  }, [
    hasNoQuotesAvailable,
    hasInsufficientGas,
    isNetworkFeeUnavailable,
    hasInsufficientBalance,
    hasInsufficientNativeReserveError,
    hasTxAlert,
    isPriceImpactWarningVisible,
    hasDestAssetRequireActivate,
  ]);

  // Emit QuotesReceived event each time quotes are fetched successfully
  useEffect(() => {
    const hasNewQuoteRefresh =
      quotesRefreshCount > lastObservedRefreshCountRef.current;
    lastObservedRefreshCountRef.current = quotesRefreshCount;

    if (enabled && hasNewQuoteRefresh && !isLoading && !quoteFetchError) {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        eventName,
        getQuotesReceivedProperties(
          activeQuote,
          warnings,
          !isSubmitDisabled,
          recommendedQuote,
          fromTokenBalanceInUsd,
          hasSufficientGasForQuote,
          {
            custom_slippage: unifiedSwapBridgeContext.custom_slippage,
            slippage_limit:
              slippage === undefined ? undefined : Number(slippage),
            usd_amount_source:
              unifiedSwapBridgeContext.usd_amount_source || undefined,
            token_symbol_source:
              unifiedSwapBridgeContext.token_symbol_source || undefined,
            token_symbol_destination:
              unifiedSwapBridgeContext.token_symbol_destination || undefined,
            operation: unifiedSwapBridgeContext.operation,
          },
        ),
      );
    }
  }, [
    activeQuote,
    enabled,
    eventName,
    fromTokenBalanceInUsd,
    hasSufficientGasForQuote,
    isLoading,
    isSubmitDisabled,
    quoteFetchError,
    quotesRefreshCount,
    recommendedQuote,
    slippage,
    unifiedSwapBridgeContext.custom_slippage,
    unifiedSwapBridgeContext.operation,
    unifiedSwapBridgeContext.token_symbol_destination,
    unifiedSwapBridgeContext.token_symbol_source,
    unifiedSwapBridgeContext.usd_amount_source,
    warnings,
  ]);

  // End the trace as soon as the first usable quote becomes available,
  // including while the controller is still streaming additional quotes.
  useEffect(() => {
    if (enabled && firstUsableQuoteRequestId) {
      swapQuoteFetchTrace.finish('success');
    }
  }, [enabled, firstUsableQuoteRequestId]);

  // The stream's complete event drives the empty-state UI before close updates
  // loading status and refresh count. Finish on that same explicit signal.
  useEffect(() => {
    if (
      enabled &&
      !quoteFetchError &&
      quoteStreamComplete?.hasQuotes === false
    ) {
      swapQuoteFetchTrace.finish(
        'no_quotes',
        undefined,
        quoteStreamComplete?.reason,
      );
    }
  }, [
    enabled,
    quoteFetchError,
    quoteStreamComplete?.hasQuotes,
    quoteStreamComplete?.reason,
  ]);

  useEffect(() => {
    if (enabled && quoteFetchError) {
      swapQuoteFetchTrace.finish('error');
    }
  }, [enabled, quoteFetchError]);
};
