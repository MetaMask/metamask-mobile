import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectIsCardAuthenticated } from '../../../../../../selectors/cardController';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../../../Tokens/constants';
import type { CardHomeData } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface UseCardHomeAnalyticsParams {
  data: CardHomeData | null | undefined;
  isLoading: boolean;
  balanceFormatted: string | undefined;
  rawTokenBalance: number | undefined;
  rawFiatNumber: number | undefined;
}

export function useCardHomeAnalytics({
  data,
  isLoading,
  balanceFormatted,
  rawTokenBalance,
  rawFiatNumber,
}: UseCardHomeAnalyticsParams) {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTracked = useRef(false);

  const hasSetupActions = (data?.actions ?? []).some(
    (a) => a.type === 'enable_card',
  );

  useEffect(() => {
    if (hasTracked.current || isLoading) return;

    const hasValidBalance =
      balanceFormatted !== undefined &&
      balanceFormatted !== TOKEN_BALANCE_LOADING &&
      balanceFormatted !== TOKEN_BALANCE_LOADING_UPPERCASE;

    const hasPrimaryAsset = !!data?.primaryAsset;
    const isLoaded = hasPrimaryAsset ? hasValidBalance : !isLoading;

    if (isLoaded) {
      hasTracked.current = true;

      let cardHomeState = 'VERIFIED';
      if (!isAuthenticated) {
        cardHomeState = 'UNAUTHENTICATED';
      } else if (data?.alerts?.some((a) => a.type === 'kyc_pending')) {
        cardHomeState = 'PENDING';
      } else if (data?.alerts?.some((a) => a.type === 'card_provisioning')) {
        cardHomeState = 'PROVISIONING_CARD';
      } else if (hasSetupActions) {
        cardHomeState = 'ENABLE_CARD';
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_HOME_VIEWED)
          .addProperties({
            state: cardHomeState,
            token_symbol_priority: data?.primaryAsset?.symbol,
            token_raw_balance_priority: hasPrimaryAsset
              ? rawTokenBalance !== undefined && isNaN(rawTokenBalance)
                ? 0
                : rawTokenBalance
              : undefined,
            token_fiat_balance_priority: hasPrimaryAsset
              ? rawFiatNumber !== undefined && isNaN(rawFiatNumber)
                ? 0
                : rawFiatNumber
              : undefined,
            token_chain_id_priority: data?.primaryAsset?.chainId,
          })
          .build(),
      );
    }
  }, [
    data,
    balanceFormatted,
    rawTokenBalance,
    rawFiatNumber,
    trackEvent,
    createEventBuilder,
    isLoading,
    isAuthenticated,
    hasSetupActions,
  ]);
}
