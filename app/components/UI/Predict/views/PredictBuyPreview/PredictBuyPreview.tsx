import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import { Image, ScrollView, TouchableOpacity } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useMetrics } from '../../../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import {
  PredictEventProperties,
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

const PredictBuyPreview = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const { trackEvent, createEventBuilder } = useMetrics();
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
      marketCategory: market?.categories?.[0],
      entryPoint: entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_FEED,
      transactionType:
        outcomeToken?.title === 'Yes'
          ? PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_BUY
          : PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_SELL,
      liquidity: market?.liquidity,
      volume: market?.volume,
      sharePrice: outcomeToken?.price,
    }),
    [market, outcomeToken, entryPoint],
  );

  const { placeOrder, isLoading } = usePredictPlaceOrder();

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

  const { preview, isCalculating } = usePredictOrderPreview({
    providerId: outcome.providerId,
    marketId: market.id,
    outcomeId: outcome.id,
    outcomeTokenId: outcomeToken.id,
    side: Side.BUY,
    size: currentValue,
    autoRefreshTimeout: 5000,
  });

  // Track Predict Action Initiated when screen mounts
  useEffect(() => {
    const regularProperties = {
      [PredictEventProperties.TIMESTAMP]: Date.now(),
      [PredictEventProperties.MARKET_ID]: analyticsProperties.marketId,
      [PredictEventProperties.MARKET_TITLE]: analyticsProperties.marketTitle,
      [PredictEventProperties.MARKET_CATEGORY]:
        analyticsProperties.marketCategory,
      [PredictEventProperties.ENTRY_POINT]: analyticsProperties.entryPoint,
      [PredictEventProperties.TRANSACTION_TYPE]:
        analyticsProperties.transactionType,
      [PredictEventProperties.LIQUIDITY]: analyticsProperties.liquidity,
      [PredictEventProperties.SHARE_PRICE]: outcomeToken?.price,
      [PredictEventProperties.VOLUME]: analyticsProperties.volume,
    };

    DevLogger.log('📊 [Analytics] PREDICT_ACTION_INITIATED', {
      regularProperties,
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.PREDICT_ACTION_INITIATED)
        .addProperties(regularProperties)
        .build(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toWin = preview?.minAmountReceived ?? 0;

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
    !isBalanceLoading;

  const title = market.title;
  const outcomeGroupTitle = outcome.groupItemTitle
    ? `${outcome.groupItemTitle} • `
    : '';
  const outcomeTokenLabel = `${outcomeToken?.title} at ${formatCents(
    preview?.sharePrice ?? outcomeToken?.price ?? 0,
  )}`;

  const onPlaceBet = () => {
    if (!preview || hasInsufficientFunds || isBelowMinimum) return;

    placeOrder({
      providerId: outcome.providerId,
      analyticsProperties,
      preview,
    });
    dispatch(StackActions.pop());
  };

  const renderHeader = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full gap-4 p-4 border-b border-muted"
    >
      <TouchableOpacity testID="back-button" onPress={() => goBack()}>
        <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
      </TouchableOpacity>
      <Image
        source={{ uri: outcome?.image }}
        style={tw.style('w-10 h-10 rounded')}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="flex-1 min-w-0 gap-1"
      >
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMDMedium}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>
          </Box>
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Box flexDirection={BoxFlexDirection.Row}>
              {!!outcomeGroupTitle && (
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={TextColor.Alternative}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {outcomeGroupTitle}
                </Text>
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
          <Box twClassName="w-full h-12">
            {hasInsufficientFunds ? (
              <Button
                label={strings('predict.deposit.add_funds')}
                variant={ButtonVariants.Primary}
                onPress={deposit}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
              />
            ) : (
              <Button
                label={`${outcomeToken?.title} • ${formatCents(
                  outcomeToken?.price ?? 0,
                )}`}
                variant={ButtonVariants.Secondary}
                onPress={onPlaceBet}
                style={tw.style(
                  outcomeToken?.title === 'Yes'
                    ? 'bg-success-default/15'
                    : 'bg-error-default/15',
                  outcomeToken?.title === 'Yes'
                    ? 'text-success-default'
                    : 'text-error-default',
                )}
                disabled={!canPlaceBet}
                loading={isLoading}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
              />
            )}
          </Box>
          <Box twClassName="text-center items-center">
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
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
