import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { TraceName } from '../../../../../util/trace';
import { PredictBuyPreviewSelectorsIDs } from '../../Predict.testIds';
import PredictBuyActionButton from './components/PredictBuyActionButton';
import PredictBuyAmountSection from './components/PredictBuyAmountSection';
import PredictBuyBottomContent from './components/PredictBuyBottomContent';
import PredictBuyError from './components/PredictBuyError';
import PredictBuyErrorBanner from './components/PredictBuyErrorBanner';
import PredictBuyPreviewHeader from './components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictFeeSummary from './components/PredictFeeSummary/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import PredictOrderRetrySheet from '../../components/PredictOrderRetrySheet';
import PredictPayWithAnyTokenInfo from './components/PredictPayWithAnyTokenInfo';
import { PredictPayWithRow } from './components/PredictPayWithRow';
import PredictQuickAmounts from './components/PredictQuickAmounts';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMoneyAccountDepositAndOrder } from '../../../../Views/confirmations/hooks/pay/useMoneyAccountDepositAndOrder';
import { useIsMoneyAccountPaymentOverride } from '../../../../Views/confirmations/hooks/pay/useIsMoneyAccountPaymentOverride';
import { POLYGON_PUSD } from '../../../../Views/confirmations/constants/predict';
import { useAddToken } from '../../../../Views/confirmations/hooks/tokens/useAddToken';
import { usePredictBuyAvailableBalance } from './hooks/usePredictBuyAvailableBalance';
import { usePredictBuyConditions } from './hooks/usePredictBuyConditions';
import { usePredictBuyInfo } from './hooks/usePredictBuyInfo';
import { usePredictBuyInputState } from './hooks/usePredictBuyInputState';
import { usePredictBuyActions } from './hooks/usePredictBuyActions';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictOrderRetry } from '../../hooks/usePredictOrderRetry';
import { usePredictMaxBetAmount } from '../../hooks/usePredictMaxBetAmount';

import {
  selectPredictFakOrdersEnabledFlag,
  selectPredictWithAnyTokenEnabledFlag,
} from '../../selectors/featureFlags';
import { ActiveOrderState, Side } from '../../types';
import { MINIMUM_BET } from '../../constants/transactions';
import {
  PredictBuyPreviewProps,
  PredictNavigationParamList,
} from '../../types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictTradeStatus } from '../../constants/eventNames';
import { parseAnalyticsProperties } from '../../utils/analytics';
import { formatPrice } from '../../utils/format';
import { buildPredictFeeBreakdowns } from '../../utils/orders';
import { getDisplayBuyPrice } from '../../utils/prices';
import { usePredictBuyError } from './hooks/usePredictBuyError';
import { usePredictActiveOrder } from '../../hooks/usePredictActiveOrder';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import {
  predictBuyPreviewDismissedViaBackRef,
  predictBuyPreviewSessionRef,
} from '../PredictBuyPreview/PredictBuyPreview';

interface BuyActionButtonStateParams {
  isPaymentSelectorNavigationLocked: boolean;
  isBannerActive: boolean;
  isChangePaymentMode: boolean;
  isAddFundsMode: boolean;
  isRetrying: boolean;
  hasPreview: boolean;
  canPlaceBet: boolean;
}

const getBuyActionButtonState = ({
  isPaymentSelectorNavigationLocked,
  isBannerActive,
  isChangePaymentMode,
  isAddFundsMode,
  isRetrying,
  hasPreview,
  canPlaceBet,
}: BuyActionButtonStateParams) => {
  if (isPaymentSelectorNavigationLocked) {
    return {
      disabled: true,
      reducedOpacity: true,
    };
  }

  if (!isBannerActive && (isChangePaymentMode || isAddFundsMode)) {
    return {
      disabled: false,
      reducedOpacity: false,
    };
  }

  if (isBannerActive) {
    return {
      disabled: isRetrying || !hasPreview,
      reducedOpacity: !hasPreview,
    };
  }

  return {
    disabled: !canPlaceBet,
    reducedOpacity: !canPlaceBet,
  };
};

const PredictBuyWithAnyToken = (props: PredictBuyPreviewProps) => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const isSheetMode = props.mode === 'sheet';
  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    predictFeedTab,
    predictScreen,
    transactionActiveAbTests,
  } = isSheetMode ? props : route.params;
  const onClose = isSheetMode ? props.onClose : undefined;

  const { isPlacingOrder, activeOrder } = usePredictActiveOrder();
  const { deposit } = usePredictDeposit();

  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const fakOrdersEnabled = useSelector(selectPredictFakOrdersEnabledFlag);

  const analyticsProperties = useMemo(
    () =>
      parseAnalyticsProperties(
        market,
        outcomeToken,
        entryPoint,
        predictFeedTab,
        predictScreen,
        outcome,
      ),
    [market, outcomeToken, entryPoint, predictFeedTab, predictScreen, outcome],
  );

  const { availableBalance, isBalanceLoading, isPredictBalanceSelected } =
    usePredictBuyAvailableBalance();
  const { data: predictBalance, isLoading: isPredictBalanceLoading } =
    usePredictBalance();
  const isMoneyAccountSelected = useIsMoneyAccountPaymentOverride();

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_PUSD.decimals,
    name: POLYGON_PUSD.name,
    symbol: POLYGON_PUSD.symbol,
    tokenAddress: POLYGON_PUSD.address,
  });

  const {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isKeypadOpen,
    setIsKeypadOpen,
    isUserInputChange,
    setIsUserInputChange,
    isConfirming,
    setIsConfirming,
  } = usePredictBuyInputState({ initialKeypadOpen: !isSheetMode });

  const handleQuickAmount = useCallback(
    (amount: number) => {
      setCurrentValue(amount);
      setCurrentValueUSDString(amount.toString());
      setIsKeypadOpen(false);
    },
    [setCurrentValue, setCurrentValueUSDString, setIsKeypadOpen],
  );

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  const {
    preview,
    error: previewError,
    isCalculating: isPreviewCalculating,
    refetchPreview,
  } = usePredictOrderPreview({
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 1000,
  });

  const { maxBetAmount, isLoading: isMaxBetAmountLoading } =
    usePredictMaxBetAmount({
      availableBalance,
      marketId: market.id,
      outcomeId: outcome.id,
      outcomeTokenId: outcomeToken.id,
      preview,
      enabled: isPredictBalanceSelected,
    });
  const availableBalanceDisplay = useMemo(
    () =>
      formatPrice(maxBetAmount, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      }),
    [maxBetAmount],
  );
  const isAvailableBalanceLoading = isBalanceLoading || isMaxBetAmountLoading;

  const {
    toWin,
    metamaskFee,
    total,
    depositFee,
    rewardsFeeAmount,
    totalPayForPredictBalance,
    hasBlockingPayAlerts,
    blockingPayAlertMessage,
  } = usePredictBuyInfo({
    preview,
    previewError,
    isConfirming,
    isPlacingOrder,
  });

  const requiredPredictBalance = Math.max(
    MINIMUM_BET,
    currentValue,
    totalPayForPredictBalance,
  );
  const isPredictBalanceCoveringOrder =
    !isPredictBalanceLoading &&
    predictBalance !== undefined &&
    predictBalance >= requiredPredictBalance;

  // Money Account is not reachable through this view's own pay-token
  // defaulting, so opt this flow into the shared money-account selection.
  // Hold automatic/flag selection back while the Predict balance is still
  // loading or already covers the order (manual picks ignore `disable`).
  useMoneyAccountDepositAndOrder({
    disable:
      isPredictBalanceLoading ||
      predictBalance === undefined ||
      isPredictBalanceCoveringOrder,
  });

  // All three Money Account selection paths (manual row, automatic fallback,
  // remote-flag default) write `paymentOverride` on TransactionPayController
  // without notifying PredictController. Move the active order to
  // PAY_WITH_ANY_TOKEN here so handleConfirm runs onApprovalConfirm and
  // placeOrder takes the deposit-and-order branch.
  const wasMoneyAccountSelectedRef = useRef(false);
  useEffect(() => {
    const didSelectMoneyAccount =
      isMoneyAccountSelected && !wasMoneyAccountSelectedRef.current;
    wasMoneyAccountSelectedRef.current = isMoneyAccountSelected;

    if (!isMoneyAccountSelected) {
      return;
    }

    if (
      didSelectMoneyAccount ||
      activeOrder?.state === ActiveOrderState.PREVIEW
    ) {
      Engine.context.PredictController.enterPayWithAnyToken({
        clearError: didSelectMoneyAccount,
      });
    }
  }, [isMoneyAccountSelected, activeOrder?.state]);
  const { feeBreakdown, originalFeeBreakdown } = buildPredictFeeBreakdowns({
    preview,
    side: Side.BUY,
    order: currentValue,
    metamaskFee,
    depositFee,
    total,
  });

  const {
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    isBalancePulsing,
    isBelowMinimum,
    isInsufficientBalance,
    isCurrentTokenInsufficient,
    hasAlternativeBalance,
    isPaySystemSettling,
    isPaymentSelectorNavigationLocked,
    lockPaymentSelectorNavigation,
  } = usePredictBuyConditions({
    currentValue,
    preview,
    isPreviewCalculating,
    isUserInputChange,
    isConfirming,
    totalPayForPredictBalance,
    hasBlockingPayAlerts,
  });

  const {
    errorMessage,
    errorMessageSource,
    buyErrorBanner,
    isOrderNotFilled,
    retryOrderState,
    resetOrderNotFilled,
    clearBuyErrorBanner,
  } = usePredictBuyError({
    preview,
    previewError,
    isPlacingOrder,
    isBelowMinimum,
    isInsufficientBalance,
    isConfirming,
    isPayFeesLoading,
    isPaySystemSettling,
    blockingPayAlertMessage,
    outcomeTokenPrice: getDisplayBuyPrice(outcomeToken),
    isSheetMode,
  });

  const isChangePaymentMode = useMemo(
    () => isCurrentTokenInsufficient && hasAlternativeBalance,
    [isCurrentTokenInsufficient, hasAlternativeBalance],
  );
  const isAddFundsMode = useMemo(
    () => isCurrentTokenInsufficient && !hasAlternativeBalance,
    [isCurrentTokenInsufficient, hasAlternativeBalance],
  );

  const handleChangePaymentMethod = useCallback(() => {
    lockPaymentSelectorNavigation();
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET);
  }, [lockPaymentSelectorNavigation, navigation]);

  const handleAddFunds = useCallback(() => {
    if (isSheetMode) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        params: { autoDeposit: true },
      });
    } else {
      deposit(); // NOSONAR
    }
  }, [deposit, isSheetMode, navigation]);

  const handlePaymentFailureAddFunds = useCallback(() => {
    Engine.context.PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.ADD_FUNDS_SUBMITTED,
      analyticsProperties,
      sharePrice: preview?.sharePrice,
      paymentTokenAddress: activeOrder?.paymentTokenAddress,
      paymentTokenSymbol: activeOrder?.paymentTokenSymbol,
    });
    handleAddFunds();
    onClose?.();
  }, [
    analyticsProperties,
    preview?.sharePrice,
    activeOrder?.paymentTokenAddress,
    activeOrder?.paymentTokenSymbol,
    handleAddFunds,
    onClose,
  ]);

  const paymentFailurePromptedRef = useRef(false);
  useEffect(() => {
    if (buyErrorBanner?.variant !== 'payment_failed') {
      paymentFailurePromptedRef.current = false;
      return;
    }
    if (paymentFailurePromptedRef.current) {
      return;
    }
    paymentFailurePromptedRef.current = true;
    Engine.context.PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.PAYMENT_FAILURE_PROMPTED,
      analyticsProperties,
      sharePrice: preview?.sharePrice,
      paymentTokenAddress: activeOrder?.paymentTokenAddress,
      paymentTokenSymbol: activeOrder?.paymentTokenSymbol,
    });
  }, [
    buyErrorBanner?.variant,
    analyticsProperties,
    preview?.sharePrice,
    activeOrder?.paymentTokenAddress,
    activeOrder?.paymentTokenSymbol,
  ]);

  const { handleConfirm, placeOrder, lastSubmittedPreview } =
    usePredictBuyActions({
      analyticsProperties,
      preview,
      amountUsd: currentValue,
      setIsConfirming,
      isSheetMode,
      onClose,
      transactionActiveAbTests,
    });

  useEffect(() => {
    if (!isPreviewCalculating) {
      setIsUserInputChange(false);
    }
  }, [isPreviewCalculating, setIsUserInputChange]);

  // Keep the shared session ref in sync so swipe/hardware-back dismiss tracking
  // in PredictPreviewSheetContext reads the correct hadEnteredAmount value.
  useEffect(() => {
    if (currentValue > 0) {
      predictBuyPreviewSessionRef.hadEnteredAmount = true;
    }
  }, [currentValue]);

  const {
    retrySheetRef,
    retrySheetVariant,
    retryQuote,
    retryPreviousPrice,
    isRetrying,
    handleRetry,
    handleRetryConfirm,
  } = usePredictOrderRetry({
    preview,
    refetchPreview,
    lastSubmittedPreview,
    placeOrder,
    analyticsProperties,
    isOrderNotFilled,
    resetOrderNotFilled,
    orderState: retryOrderState,
    isSheetMode,
    attempt: Engine.context.PredictController.getRetryablePredictBuyAttempt(),
  });

  const handleRetryDismiss = useCallback(() => {
    if (isOrderNotFilled) {
      Engine.context.PredictController.cancelRetryablePredictBuyAttempt();
    }
    resetOrderNotFilled();
  }, [isOrderNotFilled, resetOrderNotFilled]);

  const isBannerActive = !!buyErrorBanner;
  const previousValueRef = useRef(currentValue);
  useEffect(() => {
    if (previousValueRef.current !== currentValue && isUserInputChange) {
      if (isOrderNotFilled) {
        handleRetryDismiss();
      }
      clearBuyErrorBanner();
    }
    previousValueRef.current = currentValue;
  }, [
    currentValue,
    isUserInputChange,
    isOrderNotFilled,
    handleRetryDismiss,
    clearBuyErrorBanner,
  ]);

  // When the banner appears in sheet mode, close the keypad once so the Retry
  // CTA + banner are immediately visible without blocking the user from
  // tapping the amount field to re-open the keypad and edit the amount.
  const wasBannerActiveRef = useRef(false);
  useEffect(() => {
    const didBannerAppear = isBannerActive && !wasBannerActiveRef.current;
    wasBannerActiveRef.current = isBannerActive;

    if (isSheetMode && didBannerAppear && isKeypadOpen) {
      setIsKeypadOpen(false);
    }
  }, [isSheetMode, isBannerActive, isKeypadOpen, setIsKeypadOpen]);

  const handleBuyButtonPress = useCallback(() => {
    if (isPaymentSelectorNavigationLocked) {
      return;
    }

    if (isBannerActive) {
      if (isOrderNotFilled && (retryOrderState ?? 'unknown') === 'unknown') {
        void handleRetry();
      } else {
        // Non-fill banners (order_failed, payment_failed) or blocked retry
        // states (e.g. PAY_WITH_ANY_TOKEN where a blind CLOB retry without
        // deposit is unsafe) clear the banner so the action button returns to
        // the normal confirm path instead of silently doing nothing.
        clearBuyErrorBanner();
      }
      return;
    }
    if (isChangePaymentMode) {
      handleChangePaymentMethod();
      return;
    }
    if (isAddFundsMode) {
      handleAddFunds();
      return;
    }
    handleConfirm(); // NOSONAR
  }, [
    isBannerActive,
    isPaymentSelectorNavigationLocked,
    isChangePaymentMode,
    isAddFundsMode,
    isOrderNotFilled,
    retryOrderState,
    handleRetry,
    clearBuyErrorBanner,
    handleChangePaymentMethod,
    handleAddFunds,
    handleConfirm,
  ]);

  // Track screen load performance (balance + initial preview)
  usePredictMeasurement({
    traceName: TraceName.PredictBuyPreviewView,
    conditions: [!isBalanceLoading, availableBalance !== undefined, !!market],
    debugContext: {
      marketId: market?.id,
      hasBalance: availableBalance !== undefined,
      isBalanceLoading,
    },
  });

  const Wrapper = isSheetMode ? Box : SafeAreaView;
  const wrapperProps = isSheetMode
    ? {}
    : { style: tw.style('flex-1 bg-background-default') };

  const {
    disabled: isBuyActionButtonDisabled,
    reducedOpacity: showBuyActionButtonReducedOpacity,
  } = getBuyActionButtonState({
    isPaymentSelectorNavigationLocked,
    isBannerActive,
    isChangePaymentMode,
    isAddFundsMode,
    isRetrying,
    hasPreview: Boolean(preview),
    canPlaceBet,
  });
  const shouldSuppressInlineError =
    (isChangePaymentMode || isAddFundsMode) &&
    errorMessageSource === 'insufficient_balance';
  const shouldRenderInlineError =
    !isSheetMode ||
    !buyErrorBanner ||
    errorMessageSource === 'blocking_pay_alert';

  return (
    <Wrapper {...wrapperProps}>
      {!isSheetMode && (
        <PredictBuyPreviewHeader
          market={market}
          outcome={outcome}
          outcomeToken={outcomeToken}
          preview={preview}
          onBack={() => {
            // Mark this dismissal as a back-button press so the beforeRemove
            // listener in usePredictBuyActions reports BACK_BUTTON instead of SWIPE.
            predictBuyPreviewDismissedViaBackRef.current = true;
            navigation.goBack();
          }}
        />
      )}
      {isSheetMode ? (
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          twClassName="w-full pt-6 pb-8"
        >
          <PredictBuyAmountSection
            currentValueUSDString={currentValueUSDString}
            keypadRef={keypadRef}
            isKeypadOpen={isKeypadOpen}
            isBalanceLoading={isAvailableBalanceLoading}
            isBalancePulsing={isBalancePulsing}
            availableBalanceDisplay={availableBalanceDisplay}
            toWin={toWin}
            isShowingToWinSkeleton={isUserChangeTriggeringCalculation}
            isPlacingOrder={isPlacingOrder}
            hideAvailableBalance={isSheetMode}
          />
          {shouldRenderInlineError && (
            <PredictBuyError
              errorMessage={
                shouldSuppressInlineError ? undefined : errorMessage
              }
            />
          )}
        </Box>
      ) : (
        <ScrollView
          style={tw.style('flex-col')}
          contentContainerStyle={tw.style('flex-grow justify-center')}
          showsVerticalScrollIndicator={false}
        >
          <Box
            flexDirection={BoxFlexDirection.Column}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="w-full"
          >
            <PredictBuyAmountSection
              currentValueUSDString={currentValueUSDString}
              keypadRef={keypadRef}
              isKeypadOpen={isKeypadOpen}
              isBalanceLoading={isAvailableBalanceLoading}
              isBalancePulsing={isBalancePulsing}
              availableBalanceDisplay={availableBalanceDisplay}
              toWin={toWin}
              isShowingToWinSkeleton={isUserChangeTriggeringCalculation}
              isPlacingOrder={isPlacingOrder}
              hideAvailableBalance={false}
            />
            {payWithAnyTokenEnabled && (
              <PredictPayWithRow
                disabled={isPlacingOrder || isPaymentSelectorNavigationLocked}
                onPaymentSelectorOpen={lockPaymentSelectorNavigation}
              />
            )}
          </Box>
        </ScrollView>
      )}
      {!isSheetMode && shouldRenderInlineError && (
        <PredictBuyError
          errorMessage={shouldSuppressInlineError ? undefined : errorMessage}
        />
      )}
      {!isSheetMode && (
        <PredictKeypad
          ref={keypadRef}
          isKeypadOpen={isKeypadOpen}
          currentValue={currentValue}
          currentValueUSDString={currentValueUSDString}
          setCurrentValue={setCurrentValue}
          setCurrentValueUSDString={setCurrentValueUSDString}
          setIsKeypadOpen={setIsKeypadOpen}
        />
      )}
      {(isSheetMode || !isKeypadOpen) && (
        <PredictBuyBottomContent hideBorder={isSheetMode}>
          {isSheetMode && (
            <PredictQuickAmounts
              onSelectAmount={handleQuickAmount}
              disabled={isPlacingOrder}
            />
          )}
          {payWithAnyTokenEnabled && isSheetMode && (
            <PredictPayWithRow
              disabled={isPlacingOrder || isPaymentSelectorNavigationLocked}
              variant="row"
              availableBalance={
                isAvailableBalanceLoading ? undefined : availableBalanceDisplay
              }
              onPaymentSelectorOpen={lockPaymentSelectorNavigation}
            />
          )}
          {/* Always enabled when rendered: in legacy mode the parent only
              mounts PredictBuyBottomContent while the keypad is closed; in
              sheet mode the fee summary is always actionable. */}
          <PredictFeeSummary
            disabled={false}
            loading={isPayFeesLoading}
            total={total}
            originalTotal={originalFeeBreakdown?.total}
            feePolicy={preview?.feePolicy}
            rewardsFeeAmountUsd={rewardsFeeAmount}
            rewardsLoadingOverride={isUserChangeTriggeringCalculation}
            handleFeesInfoPress={handleFeesInfoPress}
          />
          {isSheetMode && buyErrorBanner && (
            <PredictBuyErrorBanner
              variant={buyErrorBanner.variant}
              title={buyErrorBanner.title}
              description={buyErrorBanner.description}
              actionLabel={
                buyErrorBanner.variant === 'payment_failed'
                  ? strings('predict.deposit.add_funds')
                  : undefined
              }
              onActionPress={
                buyErrorBanner.variant === 'payment_failed'
                  ? handlePaymentFailureAddFunds
                  : undefined
              }
              actionTestID={
                PredictBuyPreviewSelectorsIDs.PAYMENT_FAILED_ADD_FUNDS_BUTTON
              }
              testID={
                buyErrorBanner.variant === 'price_changed'
                  ? PredictBuyPreviewSelectorsIDs.PRICE_CHANGED_BANNER
                  : buyErrorBanner.variant === 'payment_failed'
                    ? PredictBuyPreviewSelectorsIDs.PAYMENT_FAILED_BANNER
                    : PredictBuyPreviewSelectorsIDs.ORDER_FAILED_BANNER
              }
            />
          )}
          <PredictBuyActionButton
            isLoading={isPlacingOrder || (isBannerActive && isRetrying)}
            onPress={handleBuyButtonPress}
            disabled={isBuyActionButtonDisabled}
            showReducedOpacity={showBuyActionButtonReducedOpacity}
            outcomeTokenTitle={outcomeToken?.title}
            sharePrice={
              preview?.sharePrice ?? getDisplayBuyPrice(outcomeToken) ?? 0
            }
            isSheetMode={isSheetMode}
            isRetry={isSheetMode && isBannerActive}
            isChangePaymentMode={!isBannerActive && isChangePaymentMode}
            isAddFundsMode={!isBannerActive && isAddFundsMode}
            testID={PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON}
          />
        </PredictBuyBottomContent>
      )}
      {isSheetMode && (
        <PredictKeypad
          ref={keypadRef}
          isKeypadOpen={isKeypadOpen}
          currentValue={currentValue}
          currentValueUSDString={currentValueUSDString}
          setCurrentValue={setCurrentValue}
          setCurrentValueUSDString={setCurrentValueUSDString}
          setIsKeypadOpen={setIsKeypadOpen}
          hideHeader
        />
      )}
      {isFeeBreakdownVisible && (
        <PredictFeeBreakdownSheet
          ref={feeBreakdownSheetRef}
          providerFee={feeBreakdown.exchangeFee}
          metamaskFee={feeBreakdown.metamaskFee}
          originalTotal={originalFeeBreakdown?.total}
          feePolicy={preview?.feePolicy}
          depositFee={feeBreakdown.depositFee}
          sharePrice={
            preview?.sharePrice ?? getDisplayBuyPrice(outcomeToken) ?? 0
          }
          contractCount={preview?.minAmountReceived ?? 0}
          betAmount={feeBreakdown.order}
          total={feeBreakdown.total}
          onClose={handleFeeBreakdownClose}
          fakOrdersEnabled={fakOrdersEnabled}
        />
      )}
      <PredictOrderRetrySheet
        ref={retrySheetRef}
        variant={retrySheetVariant}
        preview={retryQuote}
        previousPrice={retryPreviousPrice}
        side={Side.BUY}
        onRetry={handleRetry}
        onConfirm={handleRetryConfirm}
        onDismiss={handleRetryDismiss}
        isRetrying={isRetrying}
      />
      <PredictPayWithAnyTokenInfo
        currentValue={currentValue}
        preview={preview}
        shouldDeferRelaySetup={!isSheetMode && isKeypadOpen}
      />
    </Wrapper>
  );
};

export default PredictBuyWithAnyToken;
