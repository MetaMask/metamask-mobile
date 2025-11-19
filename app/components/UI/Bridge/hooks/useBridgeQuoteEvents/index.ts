import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
} from '../../../../../core/redux/slices/bridge';
import { useEffect } from 'react';
import Engine from '../../../../../core/Engine';
import {
  getQuotesReceivedProperties,
  type QuoteWarning,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';

/**
 * Hook for publishing the QuotesReceived event
 */
export const useBridgeQuoteEvents = ({
  isSubmitDisabled,
  warnings,
}: {
  isSubmitDisabled: boolean;
  warnings: QuoteWarning[];
}) => {
  const { quoteFetchError, quotesRefreshCount } = useSelector(
    selectBridgeControllerState,
  );
  const { activeQuote, recommendedQuote, isLoading } =
    useSelector(selectBridgeQuotes);

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
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesRefreshCount]);
};
