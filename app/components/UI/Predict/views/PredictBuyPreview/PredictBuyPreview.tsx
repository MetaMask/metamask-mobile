import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize as ButtonSizeHero,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  NavigationProp,
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
import PredictFeeSummary from '../../components/PredictFeeSummary';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import { usePredictRewards } from '../../hooks/usePredictRewards';
import { TraceName } from '../../../../../util/trace';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { PredictBuyPreviewSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint } = route.params;

  // Prepare analytics properties
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
      // Market type: binary if 1 outcome group, multi-outcome otherwise
      marketType:
        market?.outcomes?.length === 1
          ? PredictEventValues.MARKET_TYPE.BINARY
          : PredictEventValues.MARKET_TYPE.MULTI_OUTCOME,
      // Outcome: use actual outcome token title (e.g., "Yes", "No", "Trump", "Biden", etc.)
      outcome: outcomeToken?.title?.toLowerCase(),
    }),
    [market, outcomeToken, entryPoint],
  );

  const {
    placeOrder,
    isLoading,
    error: placeOrderError,
    result,
  } = usePredictPlaceOrder();

  const { balance, isLoading: isBalanceLoading } = usePredictBalance({
    providerId: outcome.providerId,
    loadOnMount: true,
    refreshOnFocus: true,
  });

  const { deposit } = usePredictDeposit({
    providerId: outcome.providerId,
  });

  const [currentValue, setCurrentValue] = useState(0);
  const [currentValueUSDString, setCurrentValueUSDString] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [isUserInputChange, setIsUserInputChange] = useState(false);
  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);
  const previousValueRef = useRef(0);

  const {
    preview,
    error: previewError,
    isCalculating,
  } = usePredictOrderPreview({
    providerId: outcome.providerId,
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 1000,
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

  const errorMessage = previewError ?? placeOrderError;

  // Track Predict Trade Transaction with initiated status when screen mounts
  useEffect(() => {
    const controller = Engine.context.PredictController;

    controller.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      providerId: outcome.providerId,
      sharePrice: outcomeToken?.price,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toWin = preview?.minAmountReceived ?? 0;
  const isRateLimited = preview?.rateLimited ?? false;

  const metamaskFee = preview?.fees?.metamaskFee ?? 0;
  const providerFee = preview?.fees?.providerFee ?? 0;
  const total = currentValue + providerFee + metamaskFee;

  // Validation constants and states
  const MINIMUM_BET = 1; // $1 minimum bet
  const hasInsufficientFunds = total > balance;
  const isBelowMinimum = currentValue > 0 && currentValue < MINIMUM_BET;
  const canPlaceBet =
    currentValue >= MINIMUM_BET &&
    !hasInsufficientFunds &&
    preview &&
    !isLoading &&
    !isBalanceLoading &&
    !isRateLimited;

  const {
    enabled: isRewardsEnabled,
    isLoading: isRewardsLoading,
    accountOptedIn: isAccountOptedIntoRewards,
    rewardsAccountScope,
    estimatedPoints: estimatedRewardsPoints,
    hasError: isRewardsError,
  } = usePredictRewards(
    isLoading || previewError ? undefined : (preview?.fees?.totalFee ?? 0),
  );

  // Show rewards row if we have a valid amount
  // && either active account address is opted in or not opted in but opt-in is supported
  const shouldShowRewardsRow =
    isRewardsEnabled && currentValue > 0 && isAccountOptedIntoRewards != null;

  const title = market.title;
  const outcomeGroupTitle = outcome.groupItemTitle
    ? outcome.groupItemTitle
    : '';

  const maxBetAmount = balance - (providerFee + metamaskFee);

  const separator = '·';
  const outcomeTokenLabel = `${outcomeToken?.title} at ${formatCents(
    preview?.sharePrice ?? outcomeToken?.price ?? 0,
  )}`;

  useEffect(() => {
    if (result?.success) {
      dispatch(StackActions.pop());
    }
  }, [dispatch, result]);

  const onPlaceBet = useCallback(async () => {
    if (!preview || hasInsufficientFunds || isBelowMinimum) return;

    await placeOrder({
      providerId: outcome.providerId,
      analyticsProperties,
      preview,
    });
  }, [
    preview,
    hasInsufficientFunds,
    isBelowMinimum,
    placeOrder,
    outcome.providerId,
    analyticsProperties,
  ]);

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

  const renderHeader = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full gap-4 p-4"
    >
      <TouchableOpacity testID="back-button" onPress={() => goBack()}>
        <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
      </TouchableOpacity>
      <Image
        source={{ uri: outcome?.image }}
        style={tw.style('w-10 h-10 rounded')}
      />
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 min-w-0">
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.HeadingSm}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </Box>
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
              {!!outcomeGroupTitle && (
                <>
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="font-medium"
                    color={TextColor.TextAlternative}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {outcomeGroupTitle}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    twClassName="font-medium"
                    color={TextColor.TextAlternative}
                  >
                    {separator}
                  </Text>
                </>
              )}
              <Text
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={
                  outcomeToken?.title === 'Yes'
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {outcomeTokenLabel}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

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
            hasError={hasInsufficientFunds}
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
      </Box>
    </ScrollView>
  );

  const renderErrorMessage = () => {
    if (isBalanceLoading) return null;

    if (hasInsufficientFunds) {
      return (
        <Box twClassName="px-12 pb-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            style={tw.style('text-center')}
          >
            {strings('predict.order.prediction_insufficient_funds', {
              amount: formatPrice(maxBetAmount, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              }),
            })}
          </Text>
        </Box>
      );
    }

    if (isBelowMinimum) {
      return (
        <Box twClassName="px-12 pb-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            style={tw.style('text-center')}
          >
            {strings('predict.order.prediction_minimum_bet', {
              amount: formatPrice(MINIMUM_BET, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              }),
            })}
          </Text>
        </Box>
      );
    }

    return null;
  };

  const renderActionButton = () => {
    if (hasInsufficientFunds) {
      return (
        <Button
          label={strings('predict.deposit.add_funds')}
          variant={ButtonVariants.Primary}
          onPress={deposit}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
      );
    }

    if (isLoading) {
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
        disabled={!canPlaceBet}
        isLoading={isLoading}
        size={ButtonSizeHero.Lg}
        style={tw.style('w-full')}
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

  const renderBottomContent = () => {
    if (isInputFocused) {
      return null;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="border-t border-muted p-4 pb-0 gap-4"
      >
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
      {renderHeader()}
      {renderAmount()}
      <PredictFeeSummary
        disabled={isInputFocused}
        total={total}
        metamaskFee={metamaskFee}
        providerFee={providerFee}
        shouldShowRewardsRow={shouldShowRewardsRow}
        rewardsAccountScope={rewardsAccountScope}
        accountOptedIn={isAccountOptedIntoRewards}
        estimatedPoints={estimatedRewardsPoints}
        isLoadingRewards={
          (isCalculating && isUserInputChange) || isRewardsLoading
        }
        hasRewardsError={isRewardsError}
        onFeesInfoPress={handleFeesInfoPress}
      />
      {renderErrorMessage()}
      <PredictKeypad
        ref={keypadRef}
        isInputFocused={isInputFocused}
        currentValue={currentValue}
        currentValueUSDString={currentValueUSDString}
        setCurrentValue={setCurrentValue}
        setCurrentValueUSDString={setCurrentValueUSDString}
        setIsInputFocused={setIsInputFocused}
        hasInsufficientFunds={hasInsufficientFunds}
        onAddFunds={deposit}
      />
      {renderBottomContent()}
      {isFeeBreakdownVisible && (
        <PredictFeeBreakdownSheet
          ref={feeBreakdownSheetRef}
          providerFee={providerFee}
          metamaskFee={metamaskFee}
          onClose={handleFeeBreakdownClose}
        />
      )}
    </SafeAreaView>
  );
};

export default PredictBuyPreview;
