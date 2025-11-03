import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize as ButtonSizeHero,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  NavigationProp,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Engine from '../../../../../core/Engine';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import {
  PredictEventType,
  PredictEventValues,
} from '../../constants/eventNames';
import { formatCents, formatPrice } from '../../utils/format';
import PredictAmountDisplay from '../../components/PredictAmountDisplay';
import PredictFeeSummary from '../../components/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();

  const { market, outcome, outcomeToken, entryPoint } = route.params;

  // Prepare analytics properties (userAddress will be added by PredictController)
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

  const {
    preview,
    isCalculating,
    error: previewError,
  } = usePredictOrderPreview({
    providerId: outcome.providerId,
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 1000,
  });

  const errorMessage = previewError ?? placeOrderError;

  // Track Predict Action Initiated when screen mounts
  useEffect(() => {
    const controller = Engine.context.PredictController;

    controller.trackPredictOrderEvent({
      eventType: PredictEventType.INITIATED,
      analyticsProperties,
      providerId: outcome.providerId,
      sharePrice: outcomeToken?.price,
    });
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
    !isCalculating &&
    !isLoading &&
    !isBalanceLoading &&
    !isRateLimited;

  const title = market.title;
  const outcomeGroupTitle = outcome.groupItemTitle
    ? outcome.groupItemTitle
    : '';

  const separator = '·';
  const outcomeTokenLabel = `${outcomeToken?.title} at ${formatCents(
    preview?.sharePrice ?? outcomeToken?.price ?? 0,
  )}`;

  useEffect(() => {
    if (result?.success) {
      dispatch(StackActions.pop());
    }
  }, [dispatch, result]);

  const onPlaceBet = async () => {
    if (!preview || hasInsufficientFunds || isBelowMinimum) return;

    await placeOrder({
      providerId: outcome.providerId,
      analyticsProperties,
      preview,
    });
  };

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
              variant={TextVariant.HeadingSM}
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
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Alternative}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {outcomeGroupTitle}
                  </Text>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Alternative}
                  >
                    {separator}
                  </Text>
                </>
              )}
              <Text
                variant={TextVariant.BodySMMedium}
                color={
                  outcomeToken?.title === 'Yes'
                    ? TextColor.Success
                    : TextColor.Error
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
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {`${strings('predict.order.available')}: `}
              {formatPrice(balance, { minimumDecimals: 2, maximumDecimals: 2 })}
            </Text>
          )}
        </Box>
        <Box twClassName="text-center mt-2">
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Success}>
            {`${strings('predict.order.to_win')} `}
            {formatPrice(toWin, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            })}
          </Text>
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
            variant={TextVariant.BodySM}
            color={TextColor.Error}
            style={tw.style('text-center')}
          >
            {strings('predict.order.prediction_insufficient_funds')}
          </Text>
        </Box>
      );
    }

    if (isBelowMinimum) {
      return (
        <Box twClassName="px-12 pb-4">
          <Text
            variant={TextVariant.BodySM}
            color={TextColor.Error}
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
                variant={TextVariant.BodyLGMedium}
                color={TextColor.Inverse}
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
        onPress={onPlaceBet}
        disabled={!canPlaceBet}
        isLoading={isLoading}
        size={ButtonSizeHero.Lg}
        style={tw.style('w-full')}
      >
        <Text variant={TextVariant.BodyMDMedium} style={tw.style('text-white')}>
          {outcomeToken?.title} · {formatCents(outcomeToken?.price ?? 0)}
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
              variant={TextVariant.BodySM}
              color={TextColor.Error}
              style={tw.style('text-center pb-2')}
            >
              {errorMessage}
            </Text>
          )}
          <Box twClassName="w-full h-12">{renderActionButton()}</Box>
          <Box twClassName="text-center items-center">
            <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
              {strings('predict.order.payments_made_in_usdc')}
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
    </SafeAreaView>
  );
};

export default PredictBuyPreview;
