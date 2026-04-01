import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RouteProp, useRoute } from '@react-navigation/native';
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
import PredictBuyPreviewHeader from './components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictFeeSummary from './components/PredictFeeSummary/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import PredictOrderRetrySheet from '../../components/PredictOrderRetrySheet';
import PredictPayWithAnyTokenInfo from './components/PredictPayWithAnyTokenInfo';
import { PredictPayWithRow } from './components/PredictPayWithRow';
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
import { PredictNavigationParamList } from '../../types/navigation';
import { parseAnalyticsProperties } from '../../utils/analytics';
import { formatPrice } from '../../utils/format';
import { usePredictBuyError } from './hooks/usePredictBuyError';
import { usePredictActiveOrder } from '../../hooks/usePredictActiveOrder';

const PredictBuyWithAnyToken = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint } = route.params;

  const { isPlacingOrder } = usePredictActiveOrder();

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
    depositAmount,
    rewardsFeeAmount,
    totalPayForPredictBalance,
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
    maxBetAmount,
    canSelectToken,
  } = usePredictBuyConditions({
    currentValue,
    preview,
    isPreviewCalculating,
    isUserInputChange,
    isConfirming,
    totalPayForPredictBalance,
    isInputFocused,
  });

  const { errorMessage, isOrderNotFilled, resetOrderNotFilled } =
    usePredictBuyError({
      preview,
      previewError,
      isPlacingOrder,
      isBelowMinimum,
      isInsufficientBalance,
      maxBetAmount,
      isConfirming,
      isPayFeesLoading,
    });

  const { handleConfirm, placeOrder } = usePredictBuyActions({
    analyticsProperties,
    preview,
    setIsConfirming,
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

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <PredictBuyPreviewHeader
        market={market}
        outcome={outcome}
        outcomeToken={outcomeToken}
        preview={preview}
      />
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
          />
          {payWithAnyTokenEnabled && (
            <PredictPayWithRow disabled={isPlacingOrder || !canSelectToken} />
          )}
        </Box>
      </ScrollView>
      <PredictBuyError errorMessage={errorMessage} />
      <PredictKeypad
        ref={keypadRef}
        isInputFocused={isInputFocused}
        currentValue={currentValue}
        currentValueUSDString={currentValueUSDString}
        setCurrentValue={setCurrentValue}
        setCurrentValueUSDString={setCurrentValueUSDString}
        setIsInputFocused={setIsInputFocused}
      />
      <PredictBuyBottomContent isInputFocused={isInputFocused}>
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
      <PredictPayWithAnyTokenInfo depositAmount={depositAmount} />
    </SafeAreaView>
  );
};

export default PredictBuyWithAnyToken;
