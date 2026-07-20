import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';
import { resetBridgeState } from '../../../../../../../core/redux/slices/bridge';
import Engine from '../../../../../../../core/Engine';
import { useSocialLeaderboardAnalytics } from '../../../../analytics';
import {
  buildQuickBuySharedAnalyticsProperties,
  QuickBuyEventProperties,
  QuickBuyEventValues,
} from '../analytics';
import type { QuickBuyAnalyticsContext, QuickBuyTradeMode } from '../types';

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
  tradeMode?: QuickBuyTradeMode,
): {
  refs: QuickBuyAnalyticsRefs;
  trackAmountSelected: (
    amountUsd: number,
    method: AmountSelectionMethod,
    payWithToken?: string,
    sliderPercent?: number,
    receiveToken?: string,
    presetValue?: number,
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

  const {
    source: analyticsSource,
    originalEntryPoint,
    marketCap,
  } = analyticsContext ?? {};

  const sharedAnalyticsProps = useMemo(
    () =>
      buildQuickBuySharedAnalyticsProperties({
        source: analyticsSource,
        originalEntryPoint,
        marketCap,
      }),
    [analyticsSource, originalEntryPoint, marketCap],
  );

  // Dismiss cleanup must run only on unmount. `sharedAnalyticsProps` updates when
  // live chart data changes (e.g. marketCap) while the sheet stays open — keep the
  // latest props in a ref so cleanup does not reset bridge state mid-session.
  const sharedAnalyticsPropsRef = useRef(sharedAnalyticsProps);
  sharedAnalyticsPropsRef.current = sharedAnalyticsProps;

  useEffect(
    () => () => {
      dispatch(resetBridgeState());
      if (Engine.context.BridgeController?.resetState) {
        Engine.context.BridgeController.resetState();
      }
      if (!tradeSubmittedRef.current && resolvedTraderAddress && caip19) {
        const numeric = Number(lastTrackedAmountRef.current);
        track(MetaMetricsEvents.SOCIAL_QUICK_BUY_DISMISSED, {
          ...sharedAnalyticsPropsRef.current,
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
      presetValue?: number,
    ) => {
      if (!resolvedTraderAddress || !caip19) return;
      lastTrackedAmountRef.current = String(amountUsd);
      lastInputMethodRef.current = method;
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_AMOUNT_SELECTED, {
        ...sharedAnalyticsProps,
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
        ...(sliderPercent != null
          ? { [QuickBuyEventProperties.SLIDER_PERCENT]: sliderPercent }
          : {}),
        ...(presetValue != null
          ? { [QuickBuyEventProperties.PRESET_VALUE]: presetValue }
          : {}),
      });
      dismissStageRef.current =
        QuickBuyEventValues.DISMISS_STAGE.AMOUNT_SELECTION;
    },
    [resolvedTraderAddress, caip19, track, sharedAnalyticsProps],
  );

  const trackTradeModeToggled = useCallback(
    (tradeType: 'buy' | 'sell') => {
      if (!resolvedTraderAddress || !caip19) return;
      track(MetaMetricsEvents.SOCIAL_QUICK_TRADE_MODE_TOGGLED, {
        ...sharedAnalyticsProps,
        [QuickBuyEventProperties.TRADER_ADDRESS]: resolvedTraderAddress,
        [QuickBuyEventProperties.CAIP19]: caip19,
        [QuickBuyEventProperties.TRADE_TYPE]: tradeType,
      });
    },
    [resolvedTraderAddress, caip19, track, sharedAnalyticsProps],
  );

  const trackQuickBuyInteracted = useCallback(
    (interactionType: string, props: Record<string, unknown>) => {
      if (!resolvedTraderAddress || !caip19) return;
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_INTERACTED, {
        ...sharedAnalyticsProps,
        [QuickBuyEventProperties.TRADER_ADDRESS]: resolvedTraderAddress,
        [QuickBuyEventProperties.CAIP19]: caip19,
        [QuickBuyEventProperties.INTERACTION_TYPE]: interactionType,
        ...(tradeMode !== undefined
          ? { [QuickBuyEventProperties.TRADE_TYPE]: tradeMode }
          : {}),
        ...props,
      });
    },
    [resolvedTraderAddress, caip19, track, sharedAnalyticsProps, tradeMode],
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
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_SUBMITTED, {
        ...sharedAnalyticsProps,
        ...props,
      });
    },
    [track, sharedAnalyticsProps],
  );

  const trackTradeCompleted = useCallback(
    (props: Record<string, unknown>) => {
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_TRADE_COMPLETED, {
        ...sharedAnalyticsProps,
        ...props,
      });
    },
    [track, sharedAnalyticsProps],
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
