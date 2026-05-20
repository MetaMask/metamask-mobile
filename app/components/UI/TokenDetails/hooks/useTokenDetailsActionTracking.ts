import { useCallback } from 'react';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  TokenDetailsAction,
  TokenDetailsSource,
  type TokenDetailsRouteParams,
} from '../constants/constants';

interface UseTokenDetailsActionTrackingParams {
  token: TokenDetailsRouteParams;
  hasBalance: boolean;
  severity: string | undefined;
}

export function useTokenDetailsActionTracking({
  token,
  hasBalance,
  severity,
}: UseTokenDetailsActionTrackingParams) {
  const { trackEvent, createEventBuilder } = useAnalytics();

  return useCallback(
    (action: TokenDetailsAction) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_DETAILS_ACTION_CLICKED)
          .addProperties({
            action,
            token_symbol: token.symbol,
            token_address: token.address,
            chain_id: token.chainId,
            has_balance: hasBalance,
            severity,
            source: token.source ?? TokenDetailsSource.Unknown,
          })
          .build(),
      );
    },
    [
      createEventBuilder,
      trackEvent,
      token.symbol,
      token.address,
      token.chainId,
      token.source,
      hasBalance,
      severity,
    ],
  );
}
