import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  RouteProp,
  StackActions,
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
import { MINIMUM_BET } from '../../constants/transactions';
import { usePredictAutoPlaceOrder } from '../../hooks/usePredictAutoPlaceOrder';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictBuyInputState } from '../../hooks/usePredictBuyInputState';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
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
import { formatPrice } from '../../utils/format';

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const { dispatch } = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint, transactionId } =
    route.params;

  const [isPayWithAnyTokenLoading, setIsPayWithAnyTokenLoading] =
    useState(false);
  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const analyticsProperties = useMemo(
    () => parseAnalyticsProperties(market, outcomeToken, entryPoint),
    [market, outcomeToken, entryPoint],
  );

  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();

  const { deposit } = usePredictDeposit();

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
    isLoading,
    error: placeOrderError,
    result,
    isOrderNotFilled,
    resetOrderNotFilled,
  } = usePredictPlaceOrder();

  const { triggerPayWithAnyToken } = usePredictPayWithAnyToken();

  const isMountedRef = useRef(true);

  const triggerPayWithAnyTokenFlow = useCallback(
    async (params: Parameters<typeof triggerPayWithAnyToken>[0]) => {
      if (isMountedRef.current) {
        setIsPayWithAnyTokenLoading(true);
      }

      try {
        await triggerPayWithAnyToken(params);
      } finally {
        if (isMountedRef.current) {
          setIsPayWithAnyTokenLoading(false);
        }
      }
    },
    [setIsPayWithAnyTokenLoading, triggerPayWithAnyToken],
  );

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

      await triggerPayWithAnyTokenFlow({
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
      triggerPayWithAnyTokenFlow,
    ],
  );

  usePredictPaymentToken({
    onTokenSelected: handleTokenSelected,
  });

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

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
    isCalculating,
  } = usePredictOrderPreview({
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 1000,
  });

  useEffect(() => {
    if (!isCalculating) {
      setIsUserInputChange(false);
    }
  }, [isCalculating, setIsUserInputChange]);

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
    conditions: [!isBalanceLoading, balance !== undefined, !!market],
    debugContext: {
      marketId: market?.id,
      hasBalance: balance !== undefined,
      isBalanceLoading,
    },
  });

  const errorMessage = useMemo(
    () => (isOrderNotFilled ? undefined : (previewError ?? placeOrderError)),
    [isOrderNotFilled, previewError, placeOrderError],
  );

  const { toWin, isRateLimited, metamaskFee, providerFee, total } = useMemo(
    () => ({
      toWin: preview?.minAmountReceived ?? 0,
      isRateLimited: preview?.rateLimited ?? false,
      metamaskFee: preview?.fees?.metamaskFee ?? 0,
      providerFee: preview?.fees?.providerFee ?? 0,
      total:
        currentValue +
        (preview?.fees?.providerFee ?? 0) +
        (preview?.fees?.metamaskFee ?? 0),
    }),
    [currentValue, preview],
  );

  const isBelowMinimum = useMemo(
    () => currentValue > 0 && currentValue < MINIMUM_BET,
    [currentValue],
  );
  const canPlaceBet = useMemo(
    () =>
      currentValue >= MINIMUM_BET &&
      !!preview &&
      !isLoading &&
      !isBalanceLoading &&
      !isRateLimited &&
      !isCalculating,
    [
      currentValue,
      preview,
      isLoading,
      isBalanceLoading,
      isRateLimited,
      isCalculating,
    ],
  );

  const onPlaceBet = useCallback(async () => {
    if (!preview || isBelowMinimum) return;

    await placeOrder({
      analyticsProperties,
      preview,
    });
  }, [preview, isBelowMinimum, placeOrder, analyticsProperties]);

  const { isAutoPlaceLoading } = usePredictAutoPlaceOrder({
    handlePlaceOrder: onPlaceBet,
  });

  const isPlacingOrder = isLoading || isAutoPlaceLoading || !!isProcessing;
  const canPlaceBetAction = canPlaceBet && !isAutoPlaceLoading;

  const rewardsFeeAmountUsd =
    isPlacingOrder || previewError ? undefined : (preview?.fees?.totalFee ?? 0);
  const rewardsLoadingOverride = isCalculating && isUserInputChange;

  useEffect(() => {
    if (result?.success) {
      dispatch(StackActions.pop());
    }
  }, [dispatch, result]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <PredictBuyPreviewHeader
        market={market}
        outcome={outcome}
        preview={preview}
      />
      <PredictBuyAmountSection
        currentValueUSDString={currentValueUSDString}
        keypadRef={keypadRef}
        isInputFocused={isInputFocused}
        isBalanceLoading={isBalanceLoading}
        availableBalanceDisplay={formatPrice(balance, {
          minimumDecimals: 2,
          maximumDecimals: 2,
        })}
        toWin={toWin}
        isShowingToWinSkeleton={isCalculating && isUserInputChange}
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
        onAddFunds={deposit}
      />
      <PredictBuyBottomContent
        isInputFocused={isInputFocused}
        errorMessage={errorMessage}
      >
        <PredictFeeSummary
          disabled={isInputFocused}
          loading={isPayWithAnyTokenLoading}
          total={total}
          rewardsFeeAmountUsd={rewardsFeeAmountUsd}
          rewardsLoadingOverride={rewardsLoadingOverride}
          handleFeesInfoPress={handleFeesInfoPress}
        />
        <PredictBuyActionButton
          isLoading={isPlacingOrder}
          onPress={onPlaceBet}
          disabled={!canPlaceBetAction}
          showReducedOpacity={isPayWithAnyTokenLoading}
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
    </SafeAreaView>
  );
};

export default PredictBuyPreview;
