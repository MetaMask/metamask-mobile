import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { selectCardActiveProviderId } from '../../../../../../selectors/cardController';
import { withCardProvider } from '../../../util/metrics';
import type { RedeemableWalletMode } from '../../../hooks/useRedeemableWallet';
import { REDEEM_CONFIG } from '../RedeemWallet.config';

type RedeemDestination = 'money_account' | 'wallet' | 'unresolved';

interface UseRedeemWalletAnalyticsParams {
  mode: RedeemableWalletMode;
  isWalletLoading: boolean;
  isFundingStatusLoading: boolean;
  hasLoadingError: boolean;
  hasEstimation: boolean;
  hasEstimationError: boolean;
  isDestinationResolved: boolean;
  isMoneyAccountDestination: boolean;
  isWithdrawable: boolean;
  needsSetup: boolean;
  hasInsufficientBalance: boolean;
}

/**
 * Redeem funnel instrumentation for both cashback and credit: the screen view
 * plus the button clicks leading up to a withdrawal. The withdrawal outcome
 * itself is emitted by `CardController`, which outlives this screen.
 */
export function useRedeemWalletAnalytics({
  mode,
  isWalletLoading,
  isFundingStatusLoading,
  hasLoadingError,
  hasEstimation,
  hasEstimationError,
  isDestinationResolved,
  isMoneyAccountDestination,
  isWithdrawable,
  needsSetup,
  hasInsufficientBalance,
}: UseRedeemWalletAnalyticsParams) {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const activeProviderId = useSelector(selectCardActiveProviderId);
  const config = REDEEM_CONFIG[mode];
  const hasTrackedView = useRef(false);

  const trackRedeemButton = useCallback(
    (type: string) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(activeProviderId, {
              action: config.analyticsAction,
              type,
            }),
          )
          .build(),
      );
    },
    [trackEvent, createEventBuilder, activeProviderId, config],
  );

  // Waits on the estimation because it resolves the destination chain, but
  // settles on its failure too: an estimation that never succeeds leaves the
  // withdraw button permanently disabled, which is a drop-off worth counting
  // rather than a reason to stay silent.
  const isSettled =
    hasLoadingError ||
    (!isWalletLoading &&
      !isFundingStatusLoading &&
      (hasEstimation || hasEstimationError));

  useEffect(() => {
    if (hasTrackedView.current || !isSettled) return;
    hasTrackedView.current = true;

    let destination: RedeemDestination = 'unresolved';
    if (isDestinationResolved) {
      destination = isMoneyAccountDestination ? 'money_account' : 'wallet';
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(activeProviderId, {
            screen: config.analyticsScreen,
            destination,
            is_withdrawable: isWithdrawable,
            needs_setup: needsSetup,
            has_insufficient_balance: hasInsufficientBalance,
            has_loading_error: hasLoadingError,
          }),
        )
        .build(),
    );
  }, [
    isSettled,
    isDestinationResolved,
    isMoneyAccountDestination,
    isWithdrawable,
    needsSetup,
    hasInsufficientBalance,
    hasLoadingError,
    trackEvent,
    createEventBuilder,
    activeProviderId,
    config,
  ]);

  return { trackRedeemButton };
}
