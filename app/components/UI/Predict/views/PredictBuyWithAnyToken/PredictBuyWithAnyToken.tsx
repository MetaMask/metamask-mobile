import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
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
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { usePredictBuyFlow } from './machine/usePredictBuyFlow';

const PredictBuyWithAnyToken = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint } = route.params;

  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  const {
    isPlacingOrder,
    preview,
    input,
    availableBalanceDisplay,
    isBalanceLoading,
    isBalancePulsing,
    toWin,
    isUserChangeTriggeringCalculation,
    isPayFeesLoading,
    canPlaceBet,
    total,
    rewardsFeeAmount,
    metamaskFee,
    providerFee,
    depositFee,
    depositAmount,
    errorMessage,
    handleConfirm,
    retrySheetRef,
    retrySheetVariant,
    isRetrying,
    handleRetryWithBestPrice,
    resetOrderNotFilled,
    payWithAnyTokenEnabled,
    fakOrdersEnabled,
  } = usePredictBuyFlow({ market, outcome, outcomeToken, entryPoint });

  const {
    currentValue,
    setCurrentValue,
    currentValueUSDString,
    setCurrentValueUSDString,
    isInputFocused,
    setIsInputFocused,
  } = input;

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
            <PredictPayWithRow disabled={isPlacingOrder} />
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
