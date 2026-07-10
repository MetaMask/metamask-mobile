import { useCallback, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { resetBridgeState } from '../../../../../../../core/redux/slices/bridge';
import Engine from '../../../../../../../core/Engine';
import { useSocialLeaderboardAnalytics } from '../../../../analytics';
import { QuickBuyEventProperties, QuickBuyEventValues } from '../analytics';
import type { QuickBuyAnalyticsContext } from '../types';

type QuickBuyDismissStage =
  (typeof QuickBuyEventValues.DISMISS_STAGE)[keyof typeof QuickBuyEventValues.DISMISS_STAGE];

type AmountSelectionMethod =
  (typeof QuickBuyEventValues.AMOUNT_SELECTION_METHOD)[keyof typeof QuickBuyEventValues.AMOUNT_SELECTION_METHOD];

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
    receiveToken?: string,
  ) => void;
  trackTradeModeToggled: (tradeType: 'buy' | 'sell') => void;
  trackQuoteSelected: (quoteIndex: number, quoteCount: number) => void;
  trackPayWithSelected: (token: string, previousToken: string) => void;
  trackReceiveTokenSelected: (token: string, previousToken: string) => void;
  trackSlippageChanged: (slippage: string, previousSlippage: string) => void;
  trackTradeSubmitted: (props: Record<string, unknown>) => void;
  trackTradeCompleted: (props: Record<string, unknown>) => void;
  markTradeSubmitted: () => void;
} {
  const dispatch = useDispatch();
  const { track } = useSocialLeaderboardAnalytics();

  const dismissStageRef = useRef<QuickBuyDismissStage>(
    QuickBuyEventValues.DISMISS_STAGE.TOKEN_DETAIL,
  );
  const tradeSubmittedRef = useRef(false);
  const lastTrackedAmountRef = useRef('');
  const lastInputMethodRef = useRef<AmountSelectionMethod>(
    QuickBuyEventValues.AMOUNT_SELECTION_METHOD.CUSTOM_INPUT,
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
          [QuickBuyEventProperties.TRADER_ADDRESS]: resolvedTraderAddress,
          [QuickBuyEventProperties.CAIP19]: caip19,
          [QuickBuyEventProperties.DISMISS_STAGE]: dismissStageRef.current,
          [QuickBuyEventProperties.AMOUNT_USD]:
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
      receiveToken?: string,
    ) => {
      if (!resolvedTraderAddress || !caip19) return;
      lastTrackedAmountRef.current = String(amountUsd);
      lastInputMethodRef.current = method;
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED, {
        [QuickBuyEventProperties.TRADER_ADDRESS]: resolvedTraderAddress,
        [QuickBuyEventProperties.CAIP19]: caip19,
        [QuickBuyEventProperties.AMOUNT_USD]: amountUsd,
        [QuickBuyEventProperties.AMOUNT_SELECTION_METHOD]: method,
        ...(payWithToken
          ? { [QuickBuyEventProperties.PAY_WITH_TOKEN]: payWithToken }
          : {}),
        ...(receiveToken
          ? { [QuickBuyEventProperties.RECEIVE_TOKEN]: receiveToken }
          : {}),
        ...(sliderPercent != null ? { slider_percent: sliderPercent } : {}),
      });
      dismissStageRef.current =
        QuickBuyEventValues.DISMISS_STAGE.AMOUNT_SELECTION;
    },
    [resolvedTraderAddress, caip19, track],
  );

  const trackTradeModeToggled = useCallback(
    (tradeType: 'buy' | 'sell') => {
      if (!resolvedTraderAddress || !caip19) return;
      track(MetaMetricsEvents.SOCIAL_QUICK_TRADE_MODE_TOGGLED, {
        [QuickBuyEventProperties.TRADER_ADDRESS]: resolvedTraderAddress,
        [QuickBuyEventProperties.CAIP19]: caip19,
        [QuickBuyEventProperties.TRADE_TYPE]: tradeType,
      });
    },
    [resolvedTraderAddress, caip19, track],
  );

  const trackQuickBuyInteracted = useCallback(
    (interactionType: string, props: Record<string, unknown>) => {
      if (!resolvedTraderAddress || !caip19) return;
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_INTERACTED, {
        [QuickBuyEventProperties.TRADER_ADDRESS]: resolvedTraderAddress,
        [QuickBuyEventProperties.CAIP19]: caip19,
        [QuickBuyEventProperties.INTERACTION_TYPE]: interactionType,
        ...props,
      });
    },
    [resolvedTraderAddress, caip19, track],
  );

  const trackQuoteSelected = useCallback(
    (quoteIndex: number, quoteCount: number) => {
      trackQuickBuyInteracted(
        QuickBuyEventValues.INTERACTION_TYPE.QUOTE_SELECTED,
        {
          [QuickBuyEventProperties.QUOTE_INDEX]: quoteIndex,
          [QuickBuyEventProperties.QUOTE_COUNT]: quoteCount,
        },
      );
    },
    [trackQuickBuyInteracted],
  );

  const trackPayWithSelected = useCallback(
    (token: string, previousToken: string) => {
      trackQuickBuyInteracted(
        QuickBuyEventValues.INTERACTION_TYPE.PAY_WITH_SELECTED,
        {
          [QuickBuyEventProperties.PAY_WITH_TOKEN]: token,
          [QuickBuyEventProperties.PREVIOUS_PAY_WITH_TOKEN]: previousToken,
        },
      );
    },
    [trackQuickBuyInteracted],
  );

  const trackReceiveTokenSelected = useCallback(
    (token: string, previousToken: string) => {
      trackQuickBuyInteracted(
        QuickBuyEventValues.INTERACTION_TYPE.RECEIVE_TOKEN_SELECTED,
        {
          [QuickBuyEventProperties.RECEIVE_TOKEN]: token,
          [QuickBuyEventProperties.PREVIOUS_RECEIVE_TOKEN]: previousToken,
        },
      );
    },
    [trackQuickBuyInteracted],
  );

  const trackSlippageChanged = useCallback(
    (slippageValue: string, previousSlippageValue: string) => {
      trackQuickBuyInteracted(
        QuickBuyEventValues.INTERACTION_TYPE.SLIPPAGE_CHANGED,
        {
          [QuickBuyEventProperties.SLIPPAGE]: slippageValue,
          [QuickBuyEventProperties.PREVIOUS_SLIPPAGE]: previousSlippageValue,
        },
      );
    },
    [trackQuickBuyInteracted],
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
    dismissStageRef.current = QuickBuyEventValues.DISMISS_STAGE.CONFIRMATION;
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
    trackTradeModeToggled,
    trackQuoteSelected,
    trackPayWithSelected,
    trackReceiveTokenSelected,
    trackSlippageChanged,
    trackTradeSubmitted,
    trackTradeCompleted,
    markTradeSubmitted,
  };
}
