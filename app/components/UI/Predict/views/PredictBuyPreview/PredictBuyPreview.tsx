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
import Engine from '../../../../../core/Engine';
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
import { PredictTradeStatus } from '../../constants/eventNames';
import { MINIMUM_BET } from '../../constants/transactions';
import { usePredictAutoPlaceOrder } from '../../hooks/usePredictAutoPlaceOrder';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictOrderRetry } from '../../hooks/usePredictOrderRetry';
import { selectPredictFakOrdersEnabledFlag } from '../../selectors/featureFlags';
import { PredictPayWithRow } from '../../components/PredictPayWithRow';
import { usePredictAutoPlaceOrder } from '../../hooks/usePredictAutoPlaceOrder';
import { usePredictPayWithAnyToken } from '../../hooks/usePredictPayWithAnyToken';
import { usePredictPaymentToken } from '../../hooks/usePredictPaymentToken';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { usePredictRewards } from '../../hooks/usePredictRewards';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { parseAnalyticsProperties } from '../../utils/analytics';
import { formatPrice } from '../../utils/format';

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const { goBack, dispatch } = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint, amount, transactionId } =
    route.params;
  const shouldPreserveSelectedPaymentToken = Boolean(transactionId);

  const analyticsProperties = useMemo(
    () => parseAnalyticsProperties(market, outcomeToken, entryPoint),
    [market, outcomeToken, entryPoint],
  );

  const {
    placeOrder,
    isLoading,
    error: placeOrderError,
    result,
    isOrderNotFilled,
    resetOrderNotFilled,
  } = usePredictPlaceOrder();

  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const autoPlaceAmount =
    typeof amount === 'number' && amount > 0 ? amount : undefined;
  const [currentValue, setCurrentValue] = useState(() => autoPlaceAmount ?? 0);
  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    autoPlaceAmount ? autoPlaceAmount.toString() : '',
  );
  const [isInputFocused, setIsInputFocused] = useState(() => !autoPlaceAmount);
  const [isPayWithAnyTokenLoading, setIsPayWithAnyTokenLoading] =
    useState(false);

  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const shouldPreserveActiveOrderOnUnmountRef = useRef(false);
  const markShouldPreserveActiveOrderOnUnmount = useCallback(() => {
    shouldPreserveActiveOrderOnUnmountRef.current = true;
  }, []);
  const isMountedRef = useRef(true);
  const { triggerPayWithAnyToken } = usePredictPayWithAnyToken();
  const triggerPayWithAnyTokenFlow = useCallback(
    async (params: Parameters<typeof triggerPayWithAnyToken>[0]) => {
      markShouldPreserveActiveOrderOnUnmount();

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
    [markShouldPreserveActiveOrderOnUnmount, triggerPayWithAnyToken],
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

  const handleAutoPlaceDepositFailed = async (depositErrorMessage?: string) => {
    await triggerPayWithAnyTokenFlow({
      market,
      outcome,
      outcomeToken,
      isInputFocused,
      ...(currentValue > 0 ? { amountUsd: currentValue } : {}),
      transactionError:
        depositErrorMessage ?? strings('predict.deposit.error_description'),
    });
  };

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

  const previousValue = usePreviousValue(currentValue);
  const isUserInputChange =
    isCalculating && currentValue > 0 && currentValue !== (previousValue ?? 0);

  const errorMessage = useMemo(
    () => (isOrderNotFilled ? undefined : (previewError ?? placeOrderError)),
    [isOrderNotFilled, previewError, placeOrderError],
  );

  // Track Predict Trade Transaction with initiated status when screen mounts
  useEffect(() => {
    const controller = Engine.context.PredictController;
    const preserveRef = shouldPreserveActiveOrderOnUnmountRef;

    controller.setActiveOrder({
      market,
      outcome,
      outcomeToken,
    });
    if (!shouldPreserveSelectedPaymentToken) {
      controller.setSelectedPaymentToken(null);
    }

    controller.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      sharePrice: outcomeToken?.price,
    });
    return () => {
      if (!preserveRef.current) {
        controller.clearActiveOrder();
      }
    };
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const { isAutoPlaceLoading } = usePredictAutoPlaceOrder({
    amount,
    transactionId,
    canPlaceBet,
    preview,
    analyticsProperties,
    placeOrder,
    setCurrentValue,
    setCurrentValueUSDString,
    setIsInputFocused,
    onDepositFailed: handleAutoPlaceDepositFailed,
  });
  const isPlacingOrder = isLoading || isAutoPlaceLoading;
  const canPlaceBetAction = canPlaceBet && !isAutoPlaceLoading;

  const {
    enabled: isRewardsEnabled,
    isLoading: isRewardsLoading,
    accountOptedIn: isAccountOptedIntoRewards,
    rewardsAccountScope,
    estimatedPoints: estimatedRewardsPoints,
    hasError: isRewardsError,
  } = usePredictRewards(
    isPlacingOrder || previewError ? undefined : (preview?.fees?.totalFee ?? 0),
  );

  const isLoadingRewardsState =
    (isCalculating && isUserInputChange) || isRewardsLoading;

  const shouldShowRewardsRow = useMemo(
    () =>
      isRewardsEnabled && currentValue > 0 && isAccountOptedIntoRewards != null,
    [isRewardsEnabled, currentValue, isAccountOptedIntoRewards],
  );

  const { title, outcomeGroupTitle } = useMemo(
    () => ({
      title: market.title,
      outcomeGroupTitle: outcome.groupItemTitle ? outcome.groupItemTitle : '',
    }),
    [market, outcome],
  );

  useEffect(() => {
    if (result?.success) {
      dispatch(StackActions.pop());
    }
  }, [dispatch, result]);

  const onPlaceBet = useCallback(async () => {
    if (!preview || isBelowMinimum) return;

    await placeOrder({
      analyticsProperties,
      preview,
    });
  }, [preview, isBelowMinimum, placeOrder, analyticsProperties]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <PredictBuyPreviewHeader
        title={title}
        outcomeImage={outcome?.image}
        outcomeGroupTitle={outcomeGroupTitle}
        outcomeToken={outcomeToken}
        sharePrice={preview?.sharePrice}
        onBack={goBack}
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
          shouldShowRewardsRow={shouldShowRewardsRow}
          rewardsAccountScope={rewardsAccountScope}
          accountOptedIn={isAccountOptedIntoRewards}
          estimatedPoints={estimatedRewardsPoints}
          isLoadingRewards={isLoadingRewardsState}
          hasRewardsError={isRewardsError}
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
