import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RouteProp, useRoute } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { TraceName } from '../../../../../util/trace';
import { PredictBuyPreviewSelectorsIDs } from '../../Predict.testIds';
import PredictBuyActionButton from '../../components/PredictBuyActionButton';
import PredictBuyAmountSection from '../../components/PredictBuyAmountSection';
import PredictBuyBottomContent from '../../components/PredictBuyBottomContent';
import PredictBuyMinimumError from '../../components/PredictBuyMinimumError';
import PredictBuyPreviewHeader from '../../components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictFeeSummary from '../../components/PredictFeeSummary/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import PredictOrderRetrySheet from '../../components/PredictOrderRetrySheet';
import PredictPayWithAnyTokenInfo from '../../components/PredictPayWithAnyTokenInfo';
import { usePredictBuyAvailableBalance } from '../../hooks/usePredictBuyAvailableBalance';
import { usePredictBuyConditions } from '../../hooks/usePredictBuyConditions';
import { usePredictBuyInfo } from '../../hooks/usePredictBuyInfo';
import { usePredictBuyInputState } from '../../hooks/usePredictBuyInputState';
import { usePredictBuyActions } from '../../hooks/usePredictBuyPreviewActions';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictOrderRetry } from '../../hooks/usePredictOrderRetry';
import { selectPredictFakOrdersEnabledFlag } from '../../selectors/featureFlags';
import { PredictPayWithRow } from '../../components/PredictPayWithRow';
import { usePredictAutoPlaceOrder } from '../../hooks/usePredictAutoPlaceOrder';
import { usePredictPayWithAnyToken } from '../../hooks/usePredictPayWithAnyToken';
import { usePredictPayWithAnyTokenTracking } from '../../hooks/usePredictPayWithAnyTokenTracking';
import { usePredictPaymentToken } from '../../hooks/usePredictPaymentToken';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { parseAnalyticsProperties } from '../../utils/analytics';
import usePredictBuyBackSwipe from '../../hooks/usePredictBuyBackSwipe';

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const {
    market,
    outcome,
    outcomeToken,
    entryPoint,
    transactionId,
    isConfirmation,
  } = route.params;

  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const analyticsProperties = useMemo(
    () => parseAnalyticsProperties(market, outcomeToken, entryPoint),
    [market, outcomeToken, entryPoint],
  );

  const { availableBalance, isBalanceLoading } =
    usePredictBuyAvailableBalance();

  const {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isInputFocused,
    setIsInputFocused,
    isUserInputChange,
    setIsUserInputChange,
  } = usePredictBuyInputState();

  const {
    placeOrder,
    isLoading: isPlaceOrderLoading,
    error: placeOrderError,
    result,
    isOrderNotFilled,
    resetOrderNotFilled,
  } = usePredictPlaceOrder();

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  const handleTokenSelected = useCallback(
    async (
      selectedTokenAddress: string | null,
      selectedTokenKey: string | null,
    ) => {
      if (selectedTokenKey === 'predict-balance' || !selectedTokenAddress) {
        return;
      }

      await triggerPayWithAnyToken({
        market,
        outcome,
        outcomeToken,
        isInputFocused,
        ...(currentValue > 0 ? { amountUsd: currentValue } : {}),
      });
    },
    [
      currentValue,
      isInputFocused,
      market,
      outcome,
      outcomeToken,
      triggerPayWithAnyToken,
    ],
  );

  usePredictPaymentToken({
    onTokenSelected: handleTokenSelected,
  });

  const handleDepositFailed = useCallback(
    async (depositErrorMessage?: string) => {
      await triggerPayWithAnyTokenFlow({
        market,
        outcome,
        outcomeToken,
        isInputFocused,
        ...(currentValue > 0 ? { amountUsd: currentValue } : {}),
        transactionError:
          depositErrorMessage ?? strings('predict.deposit.error_description'),
      });
    },
    [
      market,
      outcome,
      outcomeToken,
      isInputFocused,
      currentValue,
      triggerPayWithAnyTokenFlow,
    ],
  );

  const { isProcessing } = usePredictPayWithAnyTokenTracking({
    transactionId,
    onFail: handleDepositFailed,
  });

  const { deposit } = usePredictDeposit();
  const fakOrdersEnabled = useSelector(selectPredictFakOrdersEnabledFlag);

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
  } = usePredictBuyInfo({
    currentValue,
    preview,
    previewError,
    isPlaceOrderLoading,
  });

  const {
    handleBack,
    handleBackSwipe,
    handleTokenSelected,
    handleConfirm,
    handleDepositFailed,
    handlePlaceOrderSuccess,
  } = usePredictBuyActions({
    currentValue,
    analyticsProperties,
    preview,
    placeOrder,
    depositAmount: total - depositFee,
  });

  usePredictBuyBackSwipe({ onBack: handleBackSwipe });

  usePredictPayWithAnyTokenTracking({
    transactionId,
    onFail: handleDepositFailed,
    onConfirm: handleConfirm,
  });

  const {
    isPlacingOrder,
    isBelowMinimum,
    canPlaceBet,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
  } = usePredictBuyConditions({
    currentValue,
    preview,
    isPreviewCalculating,
    isPlaceOrderLoading,
    isUserInputChange,
  });

  usePredictPaymentToken({
    onTokenSelected: handleTokenSelected,
  });

  useEffect(() => {
    if (!isPreviewCalculating) {
      setIsUserInputChange(false);
    }
  }, [isPreviewCalculating, setIsUserInputChange]);

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
  });

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

  const errorMessage = useMemo(
    () => (isOrderNotFilled ? undefined : (previewError ?? placeOrderError)),
    [isOrderNotFilled, previewError, placeOrderError],
  );

  useEffect(() => {
    if (result?.success) {
      handlePlaceOrderSuccess();
    }
  }, [handlePlaceOrderSuccess, result]);

  const edges = useMemo(
    () => (isConfirmation ? (['top', 'left', 'right'] as Edge[]) : undefined),
    [isConfirmation],
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={edges}
    >
      <PredictBuyPreviewHeader
        market={market}
        outcome={outcome}
        preview={preview}
        onBack={handleBack}
      />
      <PredictBuyAmountSection
        currentValueUSDString={currentValueUSDString}
        keypadRef={keypadRef}
        isInputFocused={isInputFocused}
        isBalanceLoading={isBalanceLoading}
        availableBalanceDisplay={availableBalance}
        toWin={toWin}
        isShowingToWinSkeleton={isUserChangeTriggeringCalculation}
      />
      <PredictBuyMinimumError
        isBalanceLoading={isBalanceLoading}
        isBelowMinimum={isBelowMinimum}
      />
      <PredictKeypad
        ref={keypadRef}
        isInputFocused={isInputFocused}
        currentValue={currentValue}
        currentValueUSDString={currentValueUSDString}
        setCurrentValue={setCurrentValue}
        setCurrentValueUSDString={setCurrentValueUSDString}
        setIsInputFocused={setIsInputFocused}
      />
      <PredictBuyBottomContent
        isInputFocused={isInputFocused}
        errorMessage={errorMessage}
      >
        <PredictFeeSummary
          disabled={isInputFocused}
          loading={isPayFeesLoading}
          total={total}
          rewardsFeeAmountUsd={rewardsFeeAmount}
          rewardsLoadingOverride={isUserChangeTriggeringCalculation}
          handleFeesInfoPress={handleFeesInfoPress}
        />
        <PredictBuyActionButton
          isLoading={isPlacingOrder}
          onPress={handleConfirm}
          disabled={!canPlaceBet}
          showReducedOpacity={!canPlaceBet}
          outcomeTokenTitle={outcomeToken?.title}
          sharePrice={preview?.sharePrice ?? outcomeToken?.price ?? 0}
          testID={PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON}
        />
      </PredictBuyBottomContent>
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
      {isConfirmation && (
        <PredictPayWithAnyTokenInfo depositAmount={total - depositFee} />
      )}
    </SafeAreaView>
  );
};

export default PredictBuyPreview;
