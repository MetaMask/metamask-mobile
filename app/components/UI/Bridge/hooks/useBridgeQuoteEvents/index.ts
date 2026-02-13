import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
} from '../../../../../core/redux/slices/bridge';
import { useEffect, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import {
  getQuotesReceivedProperties,
  MetaMetricsSwapsEventSource,
  QuoteWarning,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';

/**
 * Hook for publishing the QuotesReceived event
 *
 * @param params.location - The entry point location for analytics (e.g. Main View, Token View, trending_explore)
 */
export const useBridgeQuoteEvents = ({
  hasInsufficientBalance,
  hasNoQuotesAvailable,
  hasInsufficientGas,
  hasTxAlert,
  isSubmitDisabled,
  isPriceImpactWarningVisible,
  location,
}: {
  hasInsufficientBalance: boolean;
  hasNoQuotesAvailable: boolean;
  hasInsufficientGas: boolean;
  hasTxAlert: boolean;
  isSubmitDisabled: boolean;
  isPriceImpactWarningVisible: boolean;
  location?: MetaMetricsSwapsEventSource;
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
          ...getQuotesReceivedProperties(
            activeQuote,
            warnings,
            !isSubmitDisabled,
            recommendedQuote,
          ),
          location: location ?? MetaMetricsSwapsEventSource.MainView,
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesRefreshCount]);
};
