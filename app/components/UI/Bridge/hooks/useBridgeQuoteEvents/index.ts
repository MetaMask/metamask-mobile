import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
  selectSlippage,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { useEffect, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import {
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
    if (!isLoading && quotesRefreshCount > 0 && !quoteFetchError) {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.QuotesReceived,
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
          },
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesRefreshCount]);

  // End the trace as soon as the first usable quote becomes available,
  // including while the controller is still streaming additional quotes.
  useEffect(() => {
    if (firstUsableQuoteRequestId) {
      swapQuoteFetchTrace.finish('success');
    }
  }, [firstUsableQuoteRequestId]);

  useEffect(() => {
    if (
      !isLoading &&
      quotesRefreshCount > 0 &&
      !quoteFetchError &&
      hasNoQuotesAvailable
    ) {
      swapQuoteFetchTrace.finish('no_quotes');
    }
  }, [hasNoQuotesAvailable, isLoading, quoteFetchError, quotesRefreshCount]);

  useEffect(() => {
    if (quoteFetchError) {
      swapQuoteFetchTrace.finish('error');
    }
  }, [quoteFetchError]);
};
