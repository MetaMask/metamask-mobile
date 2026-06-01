import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { resetBridgeState } from '../../../../../../../core/redux/slices/bridge';
import Engine from '../../../../../../../core/Engine';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
} from '../../../../analytics';
import type { QuickBuyAnalyticsContext } from '../types';

type QuickBuyDismissStage =
  (typeof SocialLeaderboardEventValues.DISMISS_STAGE)[keyof typeof SocialLeaderboardEventValues.DISMISS_STAGE];

type AmountSelectionMethod =
  (typeof SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD)[keyof typeof SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD];

export interface QuickBuyAnalyticsRefs {
  dismissStageRef: React.MutableRefObject<QuickBuyDismissStage>;
  tradeSubmittedRef: React.MutableRefObject<boolean>;
  lastTrackedAmountRef: React.MutableRefObject<string>;
  lastInputMethodRef: React.MutableRefObject<AmountSelectionMethod>;
  submitStartedAtRef: React.MutableRefObject<number | null>;
}

export function useQuickBuyAnalytics(
  traderAddress: string,
  caip19: string,
  analyticsContext?: QuickBuyAnalyticsContext,
): {
  refs: QuickBuyAnalyticsRefs;
  trackAmountSelected: (
    amountUsd: number,
    method: AmountSelectionMethod,
    payWithToken?: string,
    sliderPercent?: number,
  ) => void;
  trackTradeSubmitted: (props: Record<string, unknown>) => void;
  trackTradeCompleted: (props: Record<string, unknown>) => void;
  markTradeSubmitted: () => void;
} {
  const dispatch = useDispatch();
  const { track } = useSocialLeaderboardAnalytics();

  const dismissStageRef = useRef<QuickBuyDismissStage>(
    SocialLeaderboardEventValues.DISMISS_STAGE.TOKEN_DETAIL,
  );
  const tradeSubmittedRef = useRef(false);
  const lastTrackedAmountRef = useRef('');
  const lastInputMethodRef = useRef<AmountSelectionMethod>(
    SocialLeaderboardEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
  );
  const submitStartedAtRef = useRef<number | null>(null);

  const resolvedTraderAddress =
    analyticsContext?.traderAddress ?? traderAddress;

  useEffect(
    () => () => {
      dispatch(resetBridgeState());
      if (Engine.context.BridgeController?.resetState) {
        Engine.context.BridgeController.resetState();
      }
      if (!tradeSubmittedRef.current && resolvedTraderAddress && caip19) {
        const numeric = Number(lastTrackedAmountRef.current);
        track(MetaMetricsEvents.SOCIAL_QUICK_BUY_DISMISSED, {
          [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
            resolvedTraderAddress,
          [SocialLeaderboardEventProperties.CAIP19]: caip19,
          [SocialLeaderboardEventProperties.DISMISS_STAGE]:
            dismissStageRef.current,
          [SocialLeaderboardEventProperties.AMOUNT_USD]:
            Number.isFinite(numeric) && numeric > 0 ? numeric : undefined,
        });
      }
    },
    [dispatch, resolvedTraderAddress, caip19, track],
  );

  const trackAmountSelected = useCallback(
    (
      amountUsd: number,
      method: AmountSelectionMethod,
      payWithToken?: string,
      sliderPercent?: number,
    ) => {
      if (!resolvedTraderAddress || !caip19) return;
      lastTrackedAmountRef.current = String(amountUsd);
      lastInputMethodRef.current = method;
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED, {
        [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
          resolvedTraderAddress,
        [SocialLeaderboardEventProperties.CAIP19]: caip19,
        [SocialLeaderboardEventProperties.AMOUNT_USD]: amountUsd,
        [SocialLeaderboardEventProperties.AMOUNT_SELECTION_METHOD]: method,
        [SocialLeaderboardEventProperties.PAY_WITH_TOKEN]: payWithToken,
        ...(sliderPercent != null ? { slider_percent: sliderPercent } : {}),
      });
      dismissStageRef.current =
        SocialLeaderboardEventValues.DISMISS_STAGE.AMOUNT_SELECTION;
    },
    [resolvedTraderAddress, caip19, track],
  );

  const trackTradeSubmitted = useCallback(
    (props: Record<string, unknown>) => {
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_SUBMITTED, props);
    },
    [track],
  );

  const trackTradeCompleted = useCallback(
    (props: Record<string, unknown>) => {
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_COMPLETED, props);
    },
    [track],
  );

  const markTradeSubmitted = useCallback(() => {
    tradeSubmittedRef.current = true;
    dismissStageRef.current =
      SocialLeaderboardEventValues.DISMISS_STAGE.CONFIRMATION;
  }, []);

  return {
    refs: {
      dismissStageRef,
      tradeSubmittedRef,
      lastTrackedAmountRef,
      lastInputMethodRef,
      submitStartedAtRef,
    },
    trackAmountSelected,
    trackTradeSubmitted,
    trackTradeCompleted,
    markTradeSubmitted,
  };
}
