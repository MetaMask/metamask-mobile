import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
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
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
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
import { usePredictBuyAvailableBalance } from './hooks/usePredictBuyAvailableBalance';
import { usePredictBuyConditions } from './hooks/usePredictBuyConditions';
import { usePredictBuyInfo } from './hooks/usePredictBuyInfo';
import { usePredictBuyInputState } from './hooks/usePredictBuyInputState';
import { usePredictBuyActions } from './hooks/usePredictBuyActions';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictOrderRetry } from '../../hooks/usePredictOrderRetry';

import {
  selectPredictFakOrdersEnabledFlag,
  selectPredictWithAnyTokenEnabledFlag,
} from '../../selectors/featureFlags';
import { Side } from '../../types';
import {
  PredictBuyPreviewProps,
  PredictNavigationParamList,
} from '../../types/navigation';
import Routes from '../../../../../constants/navigation/Routes';
import { parseAnalyticsProperties } from '../../utils/analytics';
import { formatPrice } from '../../utils/format';
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
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const isSheetMode = props.mode === 'sheet';
  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    transactionActiveAbTests,
  } = isSheetMode ? props : route.params;
  const onClose = isSheetMode ? props.onClose : undefined;

  const { isPlacingOrder } = usePredictActiveOrder();
  const { deposit } = usePredictDeposit();

  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const payWithAnyTokenEnabled = useSelector(
    selectPredictWithAnyTokenEnabledFlag,
  );
  const fakOrdersEnabled = useSelector(selectPredictFakOrdersEnabledFlag);

  const analyticsProperties = useMemo(
    () => parseAnalyticsProperties(market, outcomeToken, entryPoint),
    [market, outcomeToken, entryPoint],
  );

  const { availableBalance, isBalanceLoading } =
    usePredictBuyAvailableBalance();

  const availableBalanceDisplay = useMemo(
    () =>
      formatPrice(availableBalance, {
        minimumDecimals: 2,
        maximumDecimals: 2,
      }),
    [availableBalance],
  );

  const {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isInputFocused,
    setIsInputFocused,
    isUserInputChange,
    setIsUserInputChange,
    isConfirming,
    setIsConfirming,
  } = usePredictBuyInputState();

  const handleQuickAmount = useCallback(
    (amount: number) => {
      setCurrentValue(amount);
      setCurrentValueUSDString(amount.toString());
      setIsInputFocused(false);
    },
    [setCurrentValue, setCurrentValueUSDString, setIsInputFocused],
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
  } = usePredictOrderPreview({
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 1000,
  });

  const {
    toWin,
    metamaskFee,
    providerFee,
    total,
    depositFee,
    rewardsFeeAmount,
    totalPayForPredictBalance,
    hasBlockingPayAlerts,
    blockingPayAlertMessage,
  } = usePredictBuyInfo({
    currentValue,
    preview,
    previewError,
    isConfirming,
    isPlacingOrder,
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
    maxBetAmount,
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
    resetOrderNotFilled,
    clearBuyErrorBanner,
  } = usePredictBuyError({
    preview,
    previewError,
    isPlacingOrder,
    isBelowMinimum,
    isInsufficientBalance,
    maxBetAmount,
    isConfirming,
    isPayFeesLoading,
    blockingPayAlertMessage,
    outcomeTokenPrice: outcomeToken?.price,
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
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [lockPaymentSelectorNavigation, navigation]);

  const handleAddFunds = useCallback(() => {
    if (isSheetMode) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
        params: { autoDeposit: true },
      });
    } else {
      deposit();
    }
  }, [deposit, isSheetMode, navigation]);

  const { handleConfirm, placeOrder } = usePredictBuyActions({
    analyticsProperties,
    preview,
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
    isRetrying,
    handleRetryWithBestPrice,
  } = usePredictOrderRetry({
    preview,
    placeOrder,
    analyticsProperties,
    isOrderNotFilled,
    resetOrderNotFilled,
    isSheetMode,
  });

  const isBannerActive = !!buyErrorBanner;
  const previousValueRef = useRef(currentValue);
  useEffect(() => {
    if (previousValueRef.current !== currentValue && isUserInputChange) {
      clearBuyErrorBanner();
    }
    previousValueRef.current = currentValue;
  }, [currentValue, isUserInputChange, clearBuyErrorBanner]);

  // When the banner appears in sheet mode, blur the amount input so the keypad
  // collapses and the Retry CTA + banner are immediately visible without the
  // user having to dismiss the keyboard.
  useEffect(() => {
    if (isSheetMode && isBannerActive && isInputFocused) {
      setIsInputFocused(false);
    }
  }, [isSheetMode, isBannerActive, isInputFocused, setIsInputFocused]);

  const handleBuyButtonPress = useCallback(() => {
    if (isPaymentSelectorNavigationLocked) {
      return;
    }

    if (isBannerActive) {
      handleRetryWithBestPrice();
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
    handleConfirm();
  }, [
    isBannerActive,
    isPaymentSelectorNavigationLocked,
    isChangePaymentMode,
    isAddFundsMode,
    handleRetryWithBestPrice,
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
    ? { twClassName: 'bg-background-default' }
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
          twClassName="w-full py-4"
        >
          <PredictBuyAmountSection
            currentValueUSDString={currentValueUSDString}
            keypadRef={keypadRef}
            isInputFocused={isInputFocused}
            isBalanceLoading={isBalanceLoading}
            isBalancePulsing={isBalancePulsing}
            availableBalanceDisplay={availableBalanceDisplay}
            toWin={toWin}
            isShowingToWinSkeleton={isUserChangeTriggeringCalculation}
            isPlacingOrder={isPlacingOrder}
            hideAvailableBalance={isSheetMode}
          />
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
              isInputFocused={isInputFocused}
              isBalanceLoading={isBalanceLoading}
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
      {shouldRenderInlineError && (
        <PredictBuyError
          errorMessage={shouldSuppressInlineError ? undefined : errorMessage}
        />
      )}
      {!isSheetMode && (
        <PredictKeypad
          ref={keypadRef}
          isInputFocused={isInputFocused}
          currentValue={currentValue}
          currentValueUSDString={currentValueUSDString}
          setCurrentValue={setCurrentValue}
          setCurrentValueUSDString={setCurrentValueUSDString}
          setIsInputFocused={setIsInputFocused}
        />
      )}
      <PredictBuyBottomContent
        isInputFocused={isSheetMode ? false : isInputFocused}
        hideBorder={isSheetMode}
      >
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
            availableBalance={availableBalanceDisplay}
            onPaymentSelectorOpen={lockPaymentSelectorNavigation}
          />
        )}
        <PredictFeeSummary
          disabled={isSheetMode ? false : isInputFocused}
          loading={isPayFeesLoading}
          total={total}
          rewardsFeeAmountUsd={rewardsFeeAmount}
          rewardsLoadingOverride={isUserChangeTriggeringCalculation}
          handleFeesInfoPress={handleFeesInfoPress}
        />
        {isSheetMode && buyErrorBanner && (
          <PredictBuyErrorBanner
            variant={buyErrorBanner.variant}
            title={buyErrorBanner.title}
            description={buyErrorBanner.description}
            testID={
              buyErrorBanner.variant === 'price_changed'
                ? PredictBuyPreviewSelectorsIDs.PRICE_CHANGED_BANNER
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
          sharePrice={preview?.sharePrice ?? outcomeToken?.price ?? 0}
          isSheetMode={isSheetMode}
          isRetry={isSheetMode && isBannerActive}
          isChangePaymentMode={!isBannerActive && isChangePaymentMode}
          isAddFundsMode={!isBannerActive && isAddFundsMode}
          testID={PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON}
        />
      </PredictBuyBottomContent>
      {isSheetMode && (
        <PredictKeypad
          ref={keypadRef}
          isInputFocused={isInputFocused}
          currentValue={currentValue}
          currentValueUSDString={currentValueUSDString}
          setCurrentValue={setCurrentValue}
          setCurrentValueUSDString={setCurrentValueUSDString}
          setIsInputFocused={setIsInputFocused}
          hideHeader
        />
      )}
      {isFeeBreakdownVisible && (
        <PredictFeeBreakdownSheet
          ref={feeBreakdownSheetRef}
          providerFee={providerFee}
          metamaskFee={metamaskFee}
          depositFee={depositFee}
          sharePrice={preview?.sharePrice ?? outcomeToken?.price ?? 0}
          contractCount={preview?.minAmountReceived ?? 0}
          betAmount={currentValue}
          total={total}
          onClose={handleFeeBreakdownClose}
          fakOrdersEnabled={fakOrdersEnabled}
        />
      )}
      <PredictOrderRetrySheet
        ref={retrySheetRef}
        variant={retrySheetVariant}
        sharePrice={preview?.sharePrice ?? outcomeToken?.price ?? 0}
        side={Side.BUY}
        onRetry={handleRetryWithBestPrice}
        onDismiss={resetOrderNotFilled}
        isRetrying={isRetrying}
      />
      <PredictPayWithAnyTokenInfo
        currentValue={currentValue}
        preview={preview}
        isInputFocused={isSheetMode ? false : isInputFocused}
      />
    </Wrapper>
  );
};

export default PredictBuyWithAnyToken;
