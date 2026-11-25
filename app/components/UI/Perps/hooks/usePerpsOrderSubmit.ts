import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { CommonActions } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Engine from '../../../../core/Engine';
import ToastService from '../../../../core/ToastService';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { ImpactMoment, type useHaptics } from '../../../../util/haptics';
import { MetaMetricsEvents } from '../../../../core/Analytics/MetaMetrics.events';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PERPS_CONSTANTS,
  type InputMethod,
  type OrderFormState,
  type OrderParams,
  type PerpsActiveProviderMode,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { PERPS_ANALYTICS_SIZE_UNIT } from '../constants/perpsAnalytics';
import { bpsToPercent } from '../constants/slippageConfig';
import {
  buildPerpsOrderParams,
  buildPerpsOrderTrackingData,
} from '../utils/orderParams';
import { translatePerpsError } from '../utils/translatePerpsError';
import { willFlipPosition } from '../utils/orderUtils';
import { getStandardOrderManagementToastKey as getOrderManagementToastKey } from '../utils/orderToasts';
import {
  beginPerpsPostTradeShare,
  failPerpsPostTradeShare,
  isPerpsPostTradeShareEligible,
  openPerpsPostTradeShareSession,
  canPromptPerpsPostTrade,
} from '../utils/perpsPostTradeShare';
import type usePerpsToasts from './usePerpsToasts';
import type { usePerpsEventTracking } from './usePerpsEventTracking';
import type { usePerpsTrading } from './usePerpsTrading';
import type { usePerpsOrderFees } from './usePerpsOrderFees';
import type { useHasExistingPosition } from './useHasExistingPosition';
import type {
  usePerpsLiteOrderSubmitGate,
  SubmitOrigin,
} from './usePerpsOrderSubmitGate';
import type { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import type { useTransactionConfirm } from '../../../Views/confirmations/hooks/transactions/useTransactionConfirm';
import type { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import type { usePostTradePromptResolver } from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/usePostTradePromptResolver';
import type { usePerpsOrderDepositTracking } from './usePerpsOrderDepositTracking';
import type { deriveOrderSizing } from '../utils/orderSizing';
import type { PerpsMarketDataWithVolumeNumber } from './usePerpsMarkets';
import type { MaxSlippageSource } from '../constants/slippageConfig';
import type { SocialEventSource } from '../../../Views/SocialLeaderboard/analytics/socialEvents';
import type { useVipTier } from '../../Rewards/hooks/useVipTier';
import type { PostTradePrompt } from '../../../Views/SocialLeaderboard/PostTradeShareBottomSheet/resolvePostTradePrompt';
import type { CopyTradeOrigin } from '../../../../util/social/copyTradeIntent';

/** Submit entry point shared by the Place Order button and the Trade sheet. */
export type PlaceOrderHandler = (
  origin: SubmitOrigin,
) => Promise<'accountUnsupported' | 'abort' | undefined>;


/** Reports a rejected fire-and-forget promise from this hook's view. */
const logRejection = (operation: string) => (error: unknown) => {
  const name = `PerpsOrderView.${operation}`;
  Logger.error(ensureError(error, name), {
    tags: { feature: PERPS_CONSTANTS.FeatureName },
    context: { name, data: {} },
  });
};

export interface UsePerpsOrderSubmitOptions {
  navigation: AppNavigationProp;
  /** Live market row for the asset, or undefined before markets resolve. */
  navigationMarketData: PerpsMarketDataWithVolumeNumber | undefined;
  fromTokenDetails: boolean;
  stayOnCurrentScreen: boolean;
  orderForm: OrderFormState;
  updateOrderForm: (updates: Partial<OrderFormState>) => void;
  setLimitPrice: (price?: string) => void;
  sizing: ReturnType<typeof deriveOrderSizing>;
  maxSlippageBps: number;
  maxSlippageSource: MaxSlippageSource | undefined;
  estimatedSlippageBps: number | null;
  exceedsMaxSlippage: boolean;
  liquidityError: string | undefined;
  useBottomSheet: boolean;
  showToast: ReturnType<typeof usePerpsToasts>['showToast'];
  PerpsToastOptions: ReturnType<typeof usePerpsToasts>['PerpsToastOptions'];
  orderValidation: { isValid: boolean; isValidating: boolean; errors: string[] };
  validateOrderNow: () => Promise<{ isValid: boolean; errors: string[] }>;
  isDraggingSlider: boolean;
  liveDragAmount: string;
  commitAmount: (amount: string) => void;
  fireImpact: ReturnType<typeof useHaptics>['fireImpact'];
  track: ReturnType<typeof usePerpsEventTracking>['track'];
  readShownSizeUnit: () => string;
  activeTransactionMeta: ReturnType<typeof useTransactionMetadataRequest>;
  depositAmount: string | undefined;
  hasCustomTokenSelected: boolean;
  isTradeWithAnyTokenEnabled: boolean;
  isCrossMarginEnabled: boolean;
  currentMarketPosition: ReturnType<typeof useHasExistingPosition>['existingPosition'];
  activePerpsProvider: PerpsActiveProviderMode | undefined;
  isPerpsProModeActive: boolean;
  canShareCopyTrade: () => boolean;
  copyTradeOrigin: CopyTradeOrigin | undefined;
  resolvePostTradePrompt: ReturnType<typeof usePostTradePromptResolver>;
  shareAnalyticsSource: SocialEventSource | undefined;
  source: string | undefined;
  sourceSection: string | undefined;
  chartLibrary: string;
  vipTier: ReturnType<typeof useVipTier>;
  payToken: ReturnType<typeof useTransactionPayToken>['payToken'];
  payTokenChainId: string | undefined;
  feeResults: ReturnType<typeof usePerpsOrderFees>;
  /** Market data used for tracking; only the mark price is read here. */
  assetData: { price: number };
  orderProviderId: PerpsProviderType | undefined;
  executeOrder: (params: OrderParams) => Promise<{ success?: boolean } | undefined>;
  updatePositionTPSL: ReturnType<typeof usePerpsTrading>['updatePositionTPSL'];
  checkBeforeSubmit: ReturnType<typeof usePerpsLiteOrderSubmitGate>['checkBeforeSubmit'];
  navigateToMarketAfterOrder: () => void;
  handleDepositConfirm: ReturnType<typeof usePerpsOrderDepositTracking>['handleDepositConfirm'];
  onDepositConfirm: ReturnType<typeof useTransactionConfirm>['onConfirm'];
  /** Shared with the view: the abandon tracker reads the placed flag. */
  hasPlacedOrderRef: RefObject<boolean>;
  /** Set by the Trade sheet close handler after it navigates away. */
  isClosedByUserRef: RefObject<boolean>;
  /** Guard against a second dismissal after a stay-on-screen submit. */
  hasDismissedAfterSubmitRef: RefObject<boolean>;
  perpsShareSessionIdRef: RefObject<string | undefined>;
  perpsPostTradePromptRef: RefObject<PostTradePrompt | undefined>;
  inputMethodRef: RefObject<InputMethod>;
}

/**
 * Submit orchestration for the order view: validation, the pay-with-token
 * deposit branch, direct placement, and the post-deposit re-entry. Lives
 * beside `usePerpsLiteOrderSubmitGate`, which supplies `checkBeforeSubmit`.
 *
 * The callbacks intentionally read shared refs passed by the view so that
 * abandon tracking and the Trade sheet close handler observe the same flags.
 */
export const usePerpsOrderSubmit = (
  options: UsePerpsOrderSubmitOptions,
): { submitUserOrder: () => Promise<'accountUnsupported' | undefined> } => {
  const {
    navigation,
    navigationMarketData,
    fromTokenDetails,
    stayOnCurrentScreen,
    orderForm,
    updateOrderForm,
    setLimitPrice,
    sizing,
    maxSlippageBps,
    maxSlippageSource,
    estimatedSlippageBps,
    exceedsMaxSlippage,
    liquidityError,
    useBottomSheet,
    showToast,
    PerpsToastOptions,
    orderValidation,
    validateOrderNow,
    isDraggingSlider,
    liveDragAmount,
    commitAmount,
    fireImpact,
    track,
    readShownSizeUnit,
    activeTransactionMeta,
    depositAmount,
    hasCustomTokenSelected,
    isTradeWithAnyTokenEnabled,
    isCrossMarginEnabled,
    currentMarketPosition,
    activePerpsProvider,
    isPerpsProModeActive,
    canShareCopyTrade,
    copyTradeOrigin,
    resolvePostTradePrompt,
    shareAnalyticsSource,
    source,
    sourceSection,
    chartLibrary,
    vipTier,
    payToken,
    payTokenChainId,
    feeResults,
    assetData,
    orderProviderId,
    executeOrder,
    updatePositionTPSL,
    checkBeforeSubmit,
    navigateToMarketAfterOrder,
    handleDepositConfirm,
    onDepositConfirm,
    hasPlacedOrderRef,
    isClosedByUserRef,
    hasDismissedAfterSubmitRef,
    perpsShareSessionIdRef,
    perpsPostTradePromptRef,
    inputMethodRef,
  } = options;
  const { effectivePrice, positionSize, marginRequired } = sizing;

  // Submission locks owned here: no other surface reads or writes them.
  const isSubmittingRef = useRef(false);
  // Held only while the pay-with-token deposit confirmation is awaited, so a
  // second tap cannot start a parallel confirmation. It is separate from
  // `isSubmittingRef` because the deposit tracker re-enters
  // `handlePlaceOrder({ origin: 'postDeposit' })` from the transaction-confirmed event, which can
  // fire while that await is still pending (`waitForResult` confirmations);
  // that programmatic re-entry must place the order, not be treated as a
  // double tap.
  const isConfirmingDepositRef = useRef(false);
  // Set by that forced re-entry once it has placed the order and navigated
  // away, so the deposit branch does not navigate a second time when its own
  // await settles.
  const hasPlacedOrderAfterDepositRef = useRef(false);
  // Set by the deposit branch once it has committed to leaving this screen
  // with the order deferred to the deposit tracker. The tracker's later
  // re-entry (`handlePlaceOrder({ origin: 'postDeposit' })`) then fires long after this screen is
  // gone, while the user is on some other screen, so it must still place the
  // order but not navigate back to this order's market.
  const hasLeftAfterDepositRef = useRef(false);

  // The post-deposit re-entry calls handlePlaceOrder again; a callback cannot
  // reference itself under React Compiler, so it goes through this ref.
  const handlePlaceOrderRef = useRef<PlaceOrderHandler | null>(null);

  // Track the Place Order button press for ALL users on the real tap —
  // emitted BEFORE the deposit/direct branching so deposit-path taps are
  // captured too. The active A/B assignment (e.g. button color) is
  // auto-injected onto this PERPS_UI_INTERACTION event via enrichWithABTests().
  const trackPlaceOrderTap = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.TAP,
      [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
        PERPS_EVENT_VALUE.BUTTON_CLICKED.PLACE_ORDER,
      [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
      [PERPS_EVENT_PROPERTY.DIRECTION]:
        orderForm.direction === 'long'
          ? PERPS_EVENT_VALUE.DIRECTION.LONG
          : PERPS_EVENT_VALUE.DIRECTION.SHORT,
      [PERPS_ANALYTICS_SIZE_UNIT]: readShownSizeUnit(),
    });
  }, [track, orderForm.asset, orderForm.direction, readShownSizeUnit]);

  /** Shows a toast and returns true when liquidity or slippage blocks the order. */
  const showPreSubmitBlocker = useCallback((): boolean => {
    if (liquidityError) {
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(
          liquidityError,
        ),
      );
      return true;
    }

    // Bail out before the pay-with-any-token deposit branch so an
    // excessive-slippage order never starts a deposit/signature flow.
    if (!exceedsMaxSlippage || typeof estimatedSlippageBps !== 'number') {
      return false;
    }
    const estPct = bpsToPercent(estimatedSlippageBps);
    const maxPct = bpsToPercent(maxSlippageBps);
    // The Trade sheet deliberately has no slippage control, so its copy
    // must not tell the user to raise a cap they cannot reach; reducing
    // the order size is the only remedy there.
    showToast(
      PerpsToastOptions.formValidation.orderForm.validationError(
        strings(
          useBottomSheet
            ? 'perps.slippage.exceeds_max_reduce_size'
            : 'perps.slippage.exceeds_max',
          {
            est: estPct.toFixed(2),
            max: maxPct.toFixed(2),
          },
        ),
      ),
    );
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.SLIPPAGE_LIMIT_BLOCKED_ORDER,
      [PERPS_EVENT_PROPERTY.ASSET]: orderForm.asset,
      [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_PCT]: maxPct,
      [PERPS_EVENT_PROPERTY.ESTIMATED_SLIPPAGE_PCT]: estPct,
      [PERPS_EVENT_PROPERTY.MAX_SLIPPAGE_SOURCE]: maxSlippageSource,
    });
    return true;
  }, [
    liquidityError,
    exceedsMaxSlippage,
    estimatedSlippageBps,
    maxSlippageBps,
    maxSlippageSource,
    useBottomSheet,
    orderForm.asset,
    showToast,
    PerpsToastOptions.formValidation.orderForm,
    track,
  ]);

  const resolveSubmissionValidation = useCallback(async (): Promise<
    { isValid: boolean; errors: string[] }
  > => {
    if (!orderValidation.isValidating) {
      return {
        isValid: orderValidation.isValid,
        errors: orderValidation.errors,
      };
    }
    isSubmittingRef.current = true;
    return validateOrderNow().finally(() => {
      isSubmittingRef.current = false;
    });
  }, [
    orderValidation.isValidating,
    orderValidation.isValid,
    orderValidation.errors,
    validateOrderNow,
  ]);

  const reportValidationFailure = useCallback(
    (errors: string[]) => {
      const firstError = errors[0] || strings('perps.order.validation.error');
      showToast(
        PerpsToastOptions.formValidation.orderForm.validationError(firstError),
      );
      track(MetaMetricsEvents.PERPS_ERROR, {
        [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
          PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
        [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: firstError,
        [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
          PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
        [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
          PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
      });
    },
    [showToast, PerpsToastOptions.formValidation.orderForm, track],
  );

  const navigateAfterDepositConfirmed = useCallback(() => {
    if (fromTokenDetails) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: Routes.PERPS.MARKET_DETAILS,
              params: {
                market: navigationMarketData ?? {
                  symbol: orderForm.asset,
                  name: orderForm.asset,
                },
                monitoringIntent: {
                  asset: orderForm.asset,
                  monitorOrders: true,
                  monitorPositions: true,
                },
              },
            },
          ],
        }),
      );
      return;
    }
    if (stayOnCurrentScreen) {
      hasDismissedAfterSubmitRef.current = true;
    }
    navigation.goBack();
  }, [
    fromTokenDetails,
    navigation,
    navigationMarketData,
    orderForm.asset,
    stayOnCurrentScreen,
    hasDismissedAfterSubmitRef,
  ]);

  // Deposit first; `placeOrderAfterDeposit` places the order once funds arrive.
  const confirmDepositBeforeOrder = useCallback(
    async (placeOrderAfterDeposit: () => void) => {
      if (marginRequired === undefined || marginRequired === null) {
        return;
      }

      if (!activeTransactionMeta) {
        DevLogger.log('No active transaction to confirm');
        return;
      }

      // Show deposit toast and set up tracking before confirming
      handleDepositConfirm(
        activeTransactionMeta,
        placeOrderAfterDeposit,
        marginRequired,
      );
      // useTransactionConfirm swallows confirm errors and reports them via
      // onError, so capture failure explicitly instead of assuming success.
      // Hold the deposit lock across the await so a second tap cannot start
      // a parallel deposit confirmation.
      isConfirmingDepositRef.current = true;
      let depositConfirmError: unknown;
      await onDepositConfirm({
        onError: (error) => {
          depositConfirmError = error;
        },
      }).finally(() => {
        isConfirmingDepositRef.current = false;
      });
      if (depositConfirmError) {
        // A cancelled/failed deposit confirmation is not a commitment: keep
        // abandon tracking armed and stay on the screen so the user can retry
        // (leaving later then correctly counts as an abandon).
        return;
      }
      if (hasPlacedOrderAfterDepositRef.current) {
        // The deposit confirmed while this await was still pending and the
        // tracker already re-entered `handlePlaceOrder({ origin: 'postDeposit' })`, which placed
        // the order and navigated away; a second navigation here would pop
        // the market screen it just landed on.
        return;
      }
      // Deposit confirmed: the order is placed once funds arrive, so leaving
      // now is a real commitment, not an abandoned order.
      hasPlacedOrderRef.current = true;
      // The credit can take up to 90 s to arrive, so the re-entry that
      // places the order runs long after this screen is gone; record the
      // departure here so that re-entry skips its navigation (see
      // `placeOrderDirectly`).
      hasLeftAfterDepositRef.current = true;
      if (isClosedByUserRef.current) {
        // The user closed the sheet (before or during the confirmation), so
        // `handleTradeSheetClose` has navigated; a second `goBack` here
        // would pop whatever screen is now on top. `isDismissedRef` is not
        // used here because the unmount caused by this confirm deleting the
        // approval also sets it, and that user still needs to leave.
        return;
      }
      navigateAfterDepositConfirmed();
    },
    [
      marginRequired,
      activeTransactionMeta,
      handleDepositConfirm,
      onDepositConfirm,
      navigateAfterDepositConfirmed,
      hasPlacedOrderRef,
      isClosedByUserRef,
    ],
  );

  /** Returns true when an existing cross-margin position blocks the order. */
  const blockCrossMarginOrder = useCallback((): boolean => {
    // While cross margin is off, an existing cross position cannot be traded.
    if (
      isCrossMarginEnabled ||
      currentMarketPosition?.leverage?.type !== 'cross'
    ) {
      return false;
    }
    navigation.navigate(Routes.PERPS.MODALS.ROOT, {
      screen: Routes.PERPS.MODALS.CROSS_MARGIN_WARNING,
    });

    track(MetaMetricsEvents.PERPS_ERROR, {
      [PERPS_EVENT_PROPERTY.ERROR_TYPE]:
        PERPS_EVENT_VALUE.ERROR_TYPE.VALIDATION,
      [PERPS_EVENT_PROPERTY.ERROR_MESSAGE]: 'Cross margin position detected',
      [PERPS_EVENT_PROPERTY.SCREEN_NAME]:
        PERPS_EVENT_VALUE.SCREEN_NAME.PERPS_ORDER,
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]: PERPS_EVENT_VALUE.SCREEN_TYPE.TRADING,
    });
    return true;
  }, [isCrossMarginEnabled, currentMarketPosition, navigation, track]);

  // A Social V1 copy-trade that can return an order id shows the share sheet
  // instead of the submitted toast.
  const preparePostTradePrompt = useCallback(() => {
    perpsShareSessionIdRef.current = beginPerpsPostTradeShare({
      canShare: canShareCopyTrade(),
      copyTradeOrigin,
      orderType: orderForm.type,
      activeProvider: activePerpsProvider,
      asset: orderForm.asset,
      direction: orderForm.direction,
      leverage: orderForm.leverage,
      amountUsd: orderForm.amount,
      analyticsSource: shareAnalyticsSource,
    });
    const resolvedPerpsPostTradePrompt =
      !perpsShareSessionIdRef.current &&
      !isPerpsProModeActive &&
      canPromptPerpsPostTrade({
        orderType: orderForm.type,
        activeProvider: activePerpsProvider,
      })
        ? resolvePostTradePrompt('perps')
        : undefined;
    perpsPostTradePromptRef.current = isPerpsPostTradeShareEligible({
      amountUsd: orderForm.amount,
    })
      ? resolvedPerpsPostTradePrompt
      : undefined;
    const promptKind = perpsPostTradePromptRef.current?.kind;
    if (promptKind === 'share_sheet' || promptKind === 'claim_sheet') {
      perpsShareSessionIdRef.current = openPerpsPostTradeShareSession({
        asset: orderForm.asset,
        direction: orderForm.direction,
        leverage: orderForm.leverage,
        amountUsd: orderForm.amount,
        variant: promptKind === 'claim_sheet' ? 'create_profile' : 'share',
        analyticsSource: shareAnalyticsSource,
      });
    }
  }, [
    canShareCopyTrade,
    copyTradeOrigin,
    perpsPostTradePromptRef,
    perpsShareSessionIdRef,
    orderForm.type,
    orderForm.asset,
    orderForm.direction,
    orderForm.leverage,
    orderForm.amount,
    activePerpsProvider,
    shareAnalyticsSource,
    isPerpsProModeActive,
    resolvePostTradePrompt,
  ]);

  // Only include TP/SL if they have valid, non-empty values.
  //
  // HYBRID APPROACH: Pass both USD amount (source of truth) and size (for backward compatibility)
  // The provider will:
  // 1. Validate price hasn't moved beyond maxSlippageBps
  // 2. Recalculate size with fresh price from usdAmount
  // 3. Use the recalculated size for order execution
  const buildOrderParams = useCallback(
    (): OrderParams =>
      buildPerpsOrderParams({
        asset: orderForm.asset,
        isBuy: orderForm.direction === 'long',
        size: positionSize,
        orderType: orderForm.type,
        effectivePrice,
        leverage: orderForm.leverage,
        usdAmount: orderForm.amount,
        maxSlippageBps,
        limitPrice: orderForm.limitPrice,
        takeProfitPrice: orderForm.takeProfitPrice,
        stopLossPrice: orderForm.stopLossPrice,
        providerId: orderProviderId,
        trackingData: buildPerpsOrderTrackingData({
          marginRequired,
          feeResults,
          marketPrice: assetData.price,
          inputMethod: inputMethodRef.current,
          orderType: orderForm.type,
          source,
          sourceSection,
          currentMarketPosition,
          direction: orderForm.direction,
          chartLibrary,
          vipTier,
          hasCustomTokenSelected,
          payToken: payToken && {
            symbol: payToken.symbol,
            chainId: payTokenChainId,
          },
          maxSlippageBps,
          maxSlippageSource,
          estimatedSlippageBps:
            typeof estimatedSlippageBps === 'number'
              ? estimatedSlippageBps
              : undefined,
        }),
      }),
    [
      orderForm.asset,
      orderForm.direction,
      orderForm.type,
      orderForm.leverage,
      orderForm.amount,
      orderForm.limitPrice,
      orderForm.takeProfitPrice,
      orderForm.stopLossPrice,
      orderProviderId,
      inputMethodRef,
      positionSize,
      effectivePrice,
      maxSlippageBps,
      marginRequired,
      feeResults,
      assetData.price,
      source,
      sourceSection,
      currentMarketPosition,
      chartLibrary,
      vipTier,
      hasCustomTokenSelected,
      payToken,
      payTokenChainId,
      maxSlippageSource,
      estimatedSlippageBps,
    ],
  );

  /** Resolves to whether the order itself succeeded; a TP/SL failure only toasts. */
  const executeOrderWithTPSL = useCallback(
    async (orderParams: OrderParams): Promise<boolean> => {
      // New positions and position flips set TP/SL separately after the order.
      const shouldHandleTPSLSeparately =
        (orderForm.takeProfitPrice || orderForm.stopLossPrice) &&
        ((!currentMarketPosition && orderForm.type === 'market') ||
          (currentMarketPosition &&
            willFlipPosition(currentMarketPosition, orderParams)));

      if (!shouldHandleTPSLSeparately) {
        const orderResult = await executeOrder(orderParams);
        return Boolean(orderResult?.success);
      }

      const orderWithoutTPSL = { ...orderParams };
      delete orderWithoutTPSL.takeProfitPrice;
      delete orderWithoutTPSL.stopLossPrice;

      const orderResult = await executeOrder(orderWithoutTPSL);
      if (!orderResult?.success) {
        return false;
      }

      const tpslResult = await updatePositionTPSL({
        symbol: orderForm.asset,
        takeProfitPrice: orderForm.takeProfitPrice,
        stopLossPrice: orderForm.stopLossPrice,
      });

      if (!tpslResult.success) {
        const errorMessage = translatePerpsError(tpslResult);
        showToast(
          PerpsToastOptions.positionManagement.tpsl.updateTPSLError(
            errorMessage,
          ),
        );
      }
      return true;
    },
    [
      orderForm.takeProfitPrice,
      orderForm.stopLossPrice,
      orderForm.type,
      orderForm.asset,
      currentMarketPosition,
      executeOrder,
      updatePositionTPSL,
      showToast,
      PerpsToastOptions.positionManagement.tpsl,
    ],
  );

  // Clear pending trade config after successful submission to prevent
  // stale TP/SL values from being restored on the next order form visit.
  // Size, TP/SL, and limit price reset; leverage and order type persist.
  const resetOrderFormAfterSubmit = useCallback(() => {
    Engine.context.PerpsController?.clearPendingTradeConfiguration(
      orderForm.asset,
    );
    updateOrderForm({
      amount: '',
      takeProfitPrice: undefined,
      stopLossPrice: undefined,
      limitPrice: undefined,
    });
    setLimitPrice(undefined);
  }, [orderForm.asset, updateOrderForm, setLimitPrice]);

  // Note: order_execution_latency_ms is intentionally not emitted
  // here — the terminal Perp transaction event is owned by the perps
  // controller, and the latency field lands with the @metamask/perps-controller
  // 9.2.2 bump (TrackingData.orderExecutionLatencyMs) in a follow-up PR.
  const placeOrderDirectly = useCallback(
    async (forceTrade: boolean) => {
      isSubmittingRef.current = true;
      // Promise `finally` instead of a `finally` block: React Compiler does
      // not handle try/finally, which kept this whole view uncompiled.
      const placeOrder = async () => {
        if (blockCrossMarginOrder()) {
          return;
        }

        // Navigate immediately BEFORE order execution (enhanced with monitoring parameters for data-driven tab selection)
        // Always monitor both orders and positions because:
        // - Market orders: Usually create positions immediately
        // - Limit orders: Usually stay pending BUT can fill immediately in volatile markets
        // Monitoring both ensures we route to the correct tab regardless of execution speed
        // Real placement is underway; leaving now is not an abandon.
        hasPlacedOrderRef.current = true;
        if (forceTrade) {
          hasPlacedOrderAfterDepositRef.current = true;
        }

        // Both the full-screen form and the Trade sheet leave as soon as the
        // order is submitted. Default is market details; `stayOnCurrentScreen`
        // dismisses back to the presenting screen.
        preparePostTradePrompt();
        if (perpsShareSessionIdRef.current && forceTrade) {
          // On the pay-with-token path the share sheet replaces the deposit
          // confirmation toast that is still visible, so it must go — the
          // share sheet is the submission feedback now. Outside a deposit
          // there is no toast to close, and the submitted-toast skip below
          // is the only change in feedback.
          ToastService.toastRef?.current?.closeToast();
        }
        // A deposit-path re-entry (`forceTrade`) that fires after the deposit
        // branch already left this screen (`hasLeftAfterDepositRef`) — or
        // after the user closed the Trade sheet mid-confirmation
        // (`isClosedByUserRef`, set only by `handleTradeSheetClose`, which
        // has already navigated away) — runs while the user is elsewhere, so
        // it must not pull them back to this order's market. Funds arriving
        // while the user is still here (neither has happened yet) keep the
        // usual navigation. `isDismissedRef` is deliberately not used here:
        // the unmount that a deposit confirmation itself triggers also sets
        // it while the user is still looking at the sheet.
        if (
          !(
            forceTrade &&
            (hasLeftAfterDepositRef.current || isClosedByUserRef.current)
          )
        ) {
          navigateToMarketAfterOrder();
        }

        const orderParams = buildOrderParams();

        if (!perpsShareSessionIdRef.current) {
          showToast(
            PerpsToastOptions.orderManagement[
              getOrderManagementToastKey(orderForm.type)
            ].submitted(orderForm.direction, positionSize, orderForm.asset),
          );
        }

        const orderSucceeded = await executeOrderWithTPSL(orderParams);
        if (!orderSucceeded) {
          failPerpsPostTradeShare(perpsShareSessionIdRef.current);
          return;
        }

        resetOrderFormAfterSubmit();
      };
      await placeOrder().finally(() => {
        isSubmittingRef.current = false;
      });
    },
    [
      blockCrossMarginOrder,
      preparePostTradePrompt,
      navigateToMarketAfterOrder,
      hasPlacedOrderRef,
      isClosedByUserRef,
      perpsShareSessionIdRef,
      buildOrderParams,
      showToast,
      PerpsToastOptions.orderManagement,
      orderForm.type,
      orderForm.direction,
      orderForm.asset,
      positionSize,
      executeOrderWithTPSL,
      resetOrderFormAfterSubmit,
    ],
  );

  // The tracker may re-enter after the sheet is gone. Give its progress
  // toast a terminal outcome even when there is no screen left to notify.
  const placeOrderAfterDeposit = useCallback(() => {
    const notPlaced = () =>
      showToast(PerpsToastOptions.accountManagement.deposit.orderNotPlaced);
    handlePlaceOrderRef
      .current?.({ origin: 'postDeposit' })
      .then((result) => {
        if (result) notPlaced();
      })
      .catch((error: unknown) => {
        logRejection('placeOrderAfterDeposit')(error);
        notPlaced();
      });
  }, [showToast, PerpsToastOptions]);

  const submitCheckedOrder = useCallback(
    async (
      origin: SubmitOrigin,
      isAttemptRetired: () => boolean,
    ): Promise<'abort' | undefined> => {
      const forceTrade = origin.origin === 'postDeposit';
      if (isAttemptRetired()) return 'abort';
      if (isDraggingSlider) {
        commitAmount(liveDragAmount);
        return 'abort';
      }
      if (showPreSubmitBlocker()) {
        return;
      }

      if (useBottomSheet && !forceTrade) {
        fireImpact(ImpactMoment.PrimaryCTA);
      }

      const validation = await resolveSubmissionValidation();
      // Even cached validation yields to the event loop. Check ownership
      // here, before starting either the deposit or direct placement.
      if (isAttemptRetired()) return 'abort';
      if (!validation.isValid) {
        reportValidationFailure(validation.errors);
        return;
      }

      const needsDeposit =
        isTradeWithAnyTokenEnabled &&
        depositAmount &&
        depositAmount.trim() !== '' &&
        activeTransactionMeta &&
        hasCustomTokenSelected;

      if (needsDeposit && !forceTrade) {
        await confirmDepositBeforeOrder(placeOrderAfterDeposit);
        return;
      }

      await placeOrderDirectly(forceTrade);
      return undefined;
    },
    [
      isDraggingSlider,
      commitAmount,
      liveDragAmount,
      placeOrderAfterDeposit,
      showPreSubmitBlocker,
      useBottomSheet,
      fireImpact,
      resolveSubmissionValidation,
      reportValidationFailure,
      isTradeWithAnyTokenEnabled,
      depositAmount,
      activeTransactionMeta,
      hasCustomTokenSelected,
      confirmDepositBeforeOrder,
      placeOrderDirectly,
    ],
  );

  // Resume on the latest committed form after an async support read. The
  // deposit callback can intentionally outlive this view.
  const submitCurrentOrderRef = useRef(submitCheckedOrder);
  const handlePlaceOrder = useCallback<PlaceOrderHandler>(
    async (origin) => {
      const postDeposit = origin.origin === 'postDeposit';
      if (
        isSubmittingRef.current ||
        (!postDeposit && isConfirmingDepositRef.current)
      ) {
        return 'abort';
      }
      if (isDraggingSlider) {
        commitAmount(liveDragAmount);
        return 'abort';
      }
      if (!postDeposit) trackPlaceOrderTap();
      isSubmittingRef.current = true;
      const decision = await checkBeforeSubmit(orderProviderId, origin).finally(
        () => {
          isSubmittingRef.current = false;
        },
      );
      if (decision.status !== 'continue') return decision.status;
      return submitCurrentOrderRef.current(origin, decision.isRetired);
    },
    [
      checkBeforeSubmit,
      orderProviderId,
      trackPlaceOrderTap,
      isDraggingSlider,
      commitAmount,
      liveDragAmount,
    ],
  );
  useLayoutEffect(() => {
    handlePlaceOrderRef.current = handlePlaceOrder;
    submitCurrentOrderRef.current = submitCheckedOrder;
  }, [handlePlaceOrder, submitCheckedOrder]);
  const submitUserOrder = useCallback(
    async () =>
      (await handlePlaceOrder({ origin: 'userTap' })) === 'accountUnsupported'
        ? ('accountUnsupported' as const)
        : undefined,
    [handlePlaceOrder],
  );
  return { submitUserOrder };
};
