import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
} from '../../../../../core/redux/slices/bridge';
import { useEffect, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import {
  formatProviderLabel,
  QuoteWarning,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';

/**
 * Hook for publishing the QuotesReceived event
 */
export const useBridgeQuoteEvents = ({
  hasInsufficientBalance,
  hasNoQuotesAvailable,
  hasInsufficientGas,
  hasTxAlert,
  isSubmitDisabled,
  isPriceImpactWarningVisible,
}: {
  hasInsufficientBalance: boolean;
  hasNoQuotesAvailable: boolean;
  hasInsufficientGas: boolean;
  hasTxAlert: boolean;
  isSubmitDisabled: boolean;
  isPriceImpactWarningVisible: boolean;
}) => {
  const { quoteFetchError, quotesRefreshCount } = useSelector(
    selectBridgeControllerState,
  );
  const { activeQuote, recommendedQuote, isLoading } =
    useSelector(selectBridgeQuotes);

  const warnings = useMemo(() => {
    const latestWarnings: QuoteWarning[] = [];

    hasNoQuotesAvailable && latestWarnings.push('no_quotes');
    hasInsufficientGas &&
      latestWarnings.push('insufficient_gas_for_selected_quote');
    hasInsufficientBalance && latestWarnings.push('insufficient_balance');
    hasTxAlert && latestWarnings.push('tx_alert');
    isPriceImpactWarningVisible && latestWarnings.push('price_impact');

    return latestWarnings;
  }, [
    hasNoQuotesAvailable,
    hasInsufficientGas,
    hasInsufficientBalance,
    hasTxAlert,
    isPriceImpactWarningVisible,
  ]);

  // Emit QuotesReceived event each time quotes are fetched successfully
  useEffect(() => {
    if (!isLoading && quotesRefreshCount > 0 && !quoteFetchError) {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.QuotesReceived,
        {
          can_submit: !isSubmitDisabled,
          gas_included: Boolean(activeQuote?.quote?.gasIncluded),
          gas_included_7702: Boolean(activeQuote?.quote?.gasIncluded7702),
          quoted_time_minutes: activeQuote?.estimatedProcessingTimeInSeconds
            ? activeQuote.estimatedProcessingTimeInSeconds / 60
            : 0,
          usd_quoted_gas: Number(activeQuote?.gasFee?.effective?.usd ?? 0),
          usd_quoted_return: Number(activeQuote?.toTokenAmount?.usd ?? 0),
          best_quote_provider: recommendedQuote
            ? formatProviderLabel(recommendedQuote.quote)
            : undefined,
          provider: activeQuote ? formatProviderLabel(activeQuote.quote) : '_',
          warnings,
          price_impact: Number(activeQuote?.quote.priceData?.priceImpact ?? 0),
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesRefreshCount]);
};
