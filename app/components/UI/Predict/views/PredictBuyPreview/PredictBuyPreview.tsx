import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize as ButtonSizeHero,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Engine from '../../../../../core/Engine';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import {
  PredictTradeStatus,
  PredictEventValues,
} from '../../constants/eventNames';
import { formatCents, formatPrice } from '../../utils/format';
import PredictAmountDisplay from '../../components/PredictAmountDisplay';
import { IconName as IconNameLegacy } from '../../../../../component-library/components/Icons/Icon';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import {
  TextVariant as LegacyTextVariant,
  TextColor as LegacyTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';
import AddRewardsAccount from '../../../Rewards/components/AddRewardsAccount/AddRewardsAccount';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictOrderRetrySheet from '../../components/PredictOrderRetrySheet';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import PredictBuyPreviewHeader from '../../components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import { usePredictRewards } from '../../hooks/usePredictRewards';
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { PredictBuyPreviewSelectorsIDs } from '../../Predict.testIds';
import { usePredictOrderRetry } from '../../hooks/usePredictOrderRetry';
import { selectPredictFakOrdersEnabledFlag } from '../../selectors/featureFlags';
import { PredictPayWithRow } from '../../components/PredictPayWithRow';
import { usePredictPaymentToken } from '../../hooks/usePredictPaymentToken';
import { usePredictTokenSelection } from '../../hooks/usePredictTokenSelection';
import { usePredictAutoPlaceOrder } from '../../hooks/usePredictAutoPlaceOrder';

export const MINIMUM_BET = 1; // $1 minimum bet

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const { goBack, dispatch } = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint, amount, transactionId } =
    route.params;

  const analyticsProperties = useMemo(
    () => ({
      marketId: market?.id,
      marketTitle: market?.title,
      marketCategory: market?.category,
      marketTags: market?.tags,
      entryPoint: entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      transactionType: PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY,
      liquidity: market?.liquidity,
      volume: market?.volume,
      sharePrice: outcomeToken?.price,
      marketType:
        market?.outcomes?.length === 1
          ? PredictEventValues.MARKET_TYPE.BINARY
          : PredictEventValues.MARKET_TYPE.MULTI_OUTCOME,
      outcome: outcomeToken?.title?.toLowerCase(),
      marketSlug: market?.slug,
      gameId: market?.game?.id,
      gameStartTime: market?.game?.startTime,
      gameLeague: market?.game?.league,
      gameStatus: market?.game?.status,
      gamePeriod: market?.game?.period,
      gameClock: market?.game?.elapsed,
    }),
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
  const { isPredictBalanceSelected } = usePredictPaymentToken();
  const autoPlaceAmount =
    typeof amount === 'number' && amount > 0 ? amount : undefined;
  const [currentValue, setCurrentValue] = useState(() => autoPlaceAmount ?? 0);
  const [currentValueUSDString, setCurrentValueUSDString] = useState(() =>
    autoPlaceAmount ? autoPlaceAmount.toString() : '',
  );
  const [isInputFocused, setIsInputFocused] = useState(() => !autoPlaceAmount);
  const [isUserInputChange, setIsUserInputChange] = useState(false);
  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);
  const previousValueRef = useRef(0);
  const { shouldPreserveActiveOrderOnUnmountRef, isDepositAndOrderLoading } =
    usePredictTokenSelection({
      market,
      outcome,
      outcomeToken,
      analyticsProperties,
      amountUsd: currentValue,
      isInputFocused,
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

  // Track when user changes input to show skeleton only during user input changes
  useEffect(() => {
    if (!isCalculating) {
      setIsUserInputChange(false);
      if (currentValue === 0) {
        previousValueRef.current = 0;
      }
      return;
    }

    if (
      currentValue > 0 &&
      currentValue !== previousValueRef.current &&
      isCalculating
    ) {
      setIsUserInputChange(true);
    }

    previousValueRef.current = currentValue;
  }, [currentValue, isCalculating]);

  const errorMessage = isOrderNotFilled
    ? undefined
    : (previewError ?? placeOrderError);

  // Track Predict Trade Transaction with initiated status when screen mounts
  useEffect(() => {
    const controller = Engine.context.PredictController;
    const preserveRef = shouldPreserveActiveOrderOnUnmountRef;

    controller.setActiveOrder({
      market,
      outcome,
      outcomeToken,
    });
    controller.setSelectedPaymentToken(null);

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

  const toWin = preview?.minAmountReceived ?? 0;
  const isRateLimited = preview?.rateLimited ?? false;

  const metamaskFee = preview?.fees?.metamaskFee ?? 0;
  const providerFee = preview?.fees?.providerFee ?? 0;
  const total = currentValue + providerFee + metamaskFee;

  const isBelowMinimum = currentValue > 0 && currentValue < MINIMUM_BET;
  const canPlaceBet =
    currentValue >= MINIMUM_BET &&
    !!preview &&
    !isLoading &&
    !isBalanceLoading &&
    !isRateLimited &&
    !isCalculating;

  const { isAutoPlaceLoading } = usePredictAutoPlaceOrder({
    amount,
    transactionId,
    isPredictBalanceSelected,
    canPlaceBet,
    preview,
    analyticsProperties,
    placeOrder,
    setCurrentValue,
    setCurrentValueUSDString,
    setIsInputFocused,
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

  // Show rewards row if we have a valid amount
  // && either active account address is opted in or not opted in but opt-in is supported
  const shouldShowRewardsRow =
    isRewardsEnabled && currentValue > 0 && isAccountOptedIntoRewards != null;

  const title = market.title;
  const outcomeGroupTitle = outcome.groupItemTitle
    ? outcome.groupItemTitle
    : '';

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

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  useEffect(() => {
    if (isFeeBreakdownVisible) {
      feeBreakdownSheetRef.current?.onOpenBottomSheet();
    }
  }, [isFeeBreakdownVisible]);

  const renderAmount = () => (
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
        <Box twClassName="text-center leading-[72px]">
          <PredictAmountDisplay
            amount={currentValueUSDString}
            onPress={() => keypadRef.current?.handleAmountPress()}
            isActive={isInputFocused}
            hasError={false}
          />
        </Box>
        {/* Available balance */}
        <Box twClassName="text-center mt-2">
          {isBalanceLoading ? (
            <Skeleton width={120} height={20} />
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {`${strings('predict.order.available')}: `}
              {formatPrice(balance, { minimumDecimals: 2, maximumDecimals: 2 })}
            </Text>
          )}
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="mt-2"
        >
          <Text
            variant={TextVariant.BodyLg}
            twClassName="font-medium"
            color={TextColor.SuccessDefault}
          >
            {`${strings('predict.order.to_win')} `}
          </Text>
          {isCalculating && isUserInputChange ? (
            <Skeleton width={80} height={24} style={tw.style('rounded-md')} />
          ) : (
            <Text
              variant={TextVariant.BodyLg}
              twClassName="font-medium"
              color={TextColor.SuccessDefault}
            >
              {formatPrice(toWin, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              })}
            </Text>
          )}
        </Box>
        <Box twClassName="mt-4 w-full">
          {isBalanceLoading ? (
            <Skeleton width={220} height={40} />
          ) : (
            <PredictPayWithRow />
          )}
        </Box>
      </Box>
    </ScrollView>
  );

  const renderActionButton = () => {
    if (isPlacingOrder) {
      return (
        <Button
          label={
            <Box twClassName="flex-row items-center gap-1">
              <ActivityIndicator size="small" />
              <Text
                variant={TextVariant.BodyLg}
                twClassName="font-medium"
                color={TextColor.PrimaryInverse}
              >
                {`${strings('predict.order.placing_prediction')}...`}
              </Text>
            </Box>
          }
          variant={ButtonVariants.Primary}
          onPress={onPlaceBet}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          style={tw.style('opacity-50')}
          disabled
        />
      );
    }

    return (
      <ButtonHero
        testID={PredictBuyPreviewSelectorsIDs.PLACE_BET_BUTTON}
        onPress={onPlaceBet}
        disabled={!canPlaceBetAction}
        isLoading={isPlacingOrder}
        size={ButtonSizeHero.Lg}
        style={tw.style('w-full', isDepositAndOrderLoading && 'opacity-50')}
      >
        <Text
          variant={TextVariant.BodyMd}
          style={tw.style('text-white font-medium')}
        >
          {outcomeToken?.title} ·{' '}
          {formatCents(preview?.sharePrice ?? outcomeToken?.price ?? 0)}
        </Text>
      </ButtonHero>
    );
  };

  const renderMinimumBetWarning = () => {
    if (isBalanceLoading || !isBelowMinimum) {
      return null;
    }

    return (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.ErrorDefault}
        style={tw.style('text-center pb-2')}
      >
        {strings('predict.order.prediction_minimum_bet', {
          amount: formatPrice(MINIMUM_BET, {
            minimumDecimals: 2,
            maximumDecimals: 2,
          }),
        })}
      </Text>
    );
  };

  const renderBottomContent = () => {
    if (isInputFocused) {
      return null;
    }

    const isLoadingRewardsState =
      (isCalculating && isUserInputChange) || isRewardsLoading;
    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="border-t border-muted p-4 pb-0 gap-4"
      >
        <TouchableOpacity
          onPress={handleFeesInfoPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={tw.style('py-1')}
        >
          <Box twClassName="flex-row justify-between items-center">
            <Box twClassName="flex-col">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                color={TextColor.TextDefault}
              >
                {strings('predict.fee_summary.total')}
              </Text>
              <Box twClassName="flex-row items-center gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('predict.fee_summary.total_incl_fees')}
                </Text>
                <Icon
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
              </Box>
            </Box>
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {formatPrice(total, { maximumDecimals: 2 })}
            </Text>
          </Box>
        </TouchableOpacity>

        {shouldShowRewardsRow &&
          (isAccountOptedIntoRewards || rewardsAccountScope) && (
            <KeyValueRow
              field={{
                label: {
                  text: strings('predict.fee_summary.estimated_points'),
                  variant: LegacyTextVariant.BodyMD,
                  color: LegacyTextColor.Default,
                },
                tooltip: {
                  title: strings('predict.fee_summary.points_tooltip'),
                  content: `${strings(
                    'predict.fee_summary.points_tooltip_content_1',
                  )}\n\n${strings(
                    'predict.fee_summary.points_tooltip_content_2',
                  )}`,
                  size: TooltipSizes.Sm,
                  iconName: IconNameLegacy.Info,
                },
              }}
              value={{
                label: (
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Center}
                    gap={1}
                  >
                    {isAccountOptedIntoRewards ? (
                      <RewardsAnimations
                        value={estimatedRewardsPoints ?? 0}
                        state={
                          isLoadingRewardsState
                            ? RewardAnimationState.Loading
                            : isRewardsError
                              ? RewardAnimationState.ErrorState
                              : RewardAnimationState.Idle
                        }
                      />
                    ) : rewardsAccountScope ? (
                      <AddRewardsAccount account={rewardsAccountScope} />
                    ) : (
                      <></>
                    )}
                  </Box>
                ),
                ...(isRewardsError && {
                  tooltip: {
                    title: strings('predict.fee_summary.points_error'),
                    content: strings(
                      'predict.fee_summary.points_error_content',
                    ),
                    size: TooltipSizes.Sm,
                    iconName: IconNameLegacy.Info,
                  },
                }),
              }}
            />
          )}
        <Box justifyContent={BoxJustifyContent.Center} twClassName="gap-2">
          {errorMessage && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              style={tw.style('text-center pb-2')}
            >
              {errorMessage}
            </Text>
          )}
          <Box twClassName="w-full h-12">{renderActionButton()}</Box>
          <Box twClassName="text-center items-center flex-row gap-1 justify-center">
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('predict.consent_sheet.disclaimer')}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              style={tw.style('text-info-default')}
              onPress={() => {
                Linking.openURL('https://polymarket.com/tos');
              }}
            >
              {strings('predict.consent_sheet.learn_more')}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };

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
      {renderAmount()}
      {renderMinimumBetWarning()}
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
      {renderBottomContent()}
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
