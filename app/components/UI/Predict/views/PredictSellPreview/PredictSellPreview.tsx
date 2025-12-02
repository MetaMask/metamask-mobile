import {
  Box,
  ButtonSize as ButtonSizeHero,
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
import React, { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PredictCashOutSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import Engine from '../../../../../core/Engine';
import { TraceName } from '../../../../../util/trace';
import {
  PredictEventValues,
  PredictTradeStatus,
} from '../../constants/eventNames';
import { usePredictMeasurement } from '../../hooks/usePredictMeasurement';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import {
  formatCents,
  formatPercentage,
  formatPositionSize,
  formatPrice,
} from '../../utils/format';
import styleSheet from './PredictSellPreview.styles';

const PredictSellPreview = () => {
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictSellPreview'>>();
  const { market, position, outcome, entryPoint } = route.params;

  const {
    icon,
    title,
    outcome: outcomeSideText,
    initialValue,
    size,
  } = position;

  const outcomeGroupTitle = outcome?.groupItemTitle ?? '';
  const outcomeTitle = title;

  // Prepare analytics properties for sell/cash-out action
  const analyticsProperties = useMemo(
    () => ({
      marketId: market?.id,
      marketTitle: market?.title,
      marketCategory: market?.category,
      marketTags: market?.tags,
      entryPoint:
        entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
      transactionType: PredictEventValues.TRANSACTION_TYPE.MM_PREDICT_SELL,
      liquidity: market?.liquidity,
      volume: outcome?.volume,
      sharePrice: position?.price,
      // Market type: binary if 1 outcome group, multi-outcome otherwise
      marketType:
        market?.outcomes?.length === 1
          ? PredictEventValues.MARKET_TYPE.BINARY
          : PredictEventValues.MARKET_TYPE.MULTI_OUTCOME,
      // Outcome: use actual outcome text (e.g., "Yes", "No", "Trump", "Biden", etc.)
      outcome: position?.outcome?.toLowerCase(),
    }),
    [market, position, outcome, entryPoint],
  );

  const {
    placeOrder,
    isLoading,
    result,
    error: placeOrderError,
  } = usePredictPlaceOrder();

  const {
    preview,
    error: previewError,
    isLoading: isPreviewLoading,
  } = usePredictOrderPreview({
    providerId: position.providerId,
    marketId: position.marketId,
    outcomeId: position.outcomeId,
    outcomeTokenId: position.outcomeTokenId,
    side: Side.SELL,
    size: position.amount,
    positionId: position.id,
    autoRefreshTimeout: 1000,
  });

  // Track screen load performance (position data + preview)
  usePredictMeasurement({
    traceName: TraceName.PredictSellPreviewView,
    conditions: [!!position, !!preview, !!market],
    debugContext: {
      marketId: market?.id,
      hasPosition: !!position,
      hasPreview: !!preview,
    },
  });

  // Track Predict Trade Transaction with initiated status when screen mounts
  useEffect(() => {
    const controller = Engine.context.PredictController;

    controller.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties,
      providerId: position.providerId,
      sharePrice: position?.price,
      amountUsd: position?.amount,
      pnl: position?.percentPnl, // PnL as percentage for sell orders
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result?.success) {
      dispatch(StackActions.pop());
    }
  }, [dispatch, result]);

  // Use preview data if available, fallback to position data on error or when preview is unavailable
  const currentValue = preview
    ? preview.minAmountReceived
    : position.currentValue;
  const currentPrice = preview?.sharePrice ?? 0;
  const { avgPrice } = position;

  // Recalculate PnL based on preview data
  const cashPnl = useMemo(
    () => currentValue - initialValue,
    [currentValue, initialValue],
  );

  const percentPnl = useMemo(
    () => (initialValue > 0 ? (cashPnl / initialValue) * 100 : 0),
    [cashPnl, initialValue],
  );

  const signal = useMemo(() => {
    if (cashPnl === 0) {
      return '';
    }
    return cashPnl > 0 ? '+' : '-';
  }, [cashPnl]);

  const onCashOut = useCallback(async () => {
    if (!preview) return;

    await placeOrder({
      providerId: position.providerId,
      analyticsProperties,
      preview,
    });
  }, [preview, placeOrder, analyticsProperties, position.providerId]);

  const renderCashOutButton = () => {
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
                {`${strings('predict.order.cashing_out_loading')}`}
              </Text>
            </Box>
          }
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          onPress={onCashOut}
          width={ButtonWidthTypes.Full}
          style={tw.style('opacity-50')}
          disabled
        />
      );
    }

    return (
      <ButtonHero
        testID={PredictCashOutSelectorsIDs.SELL_PREVIEW_CASH_OUT_BUTTON}
        disabled={!preview || isLoading}
        onPress={onCashOut}
        style={{
          ...styles.cashOutButton,
        }}
        isLoading={isLoading}
        size={ButtonSizeHero.Lg}
      >
        <Text
          variant={TextVariant.BodyMd}
          style={tw.style('text-white font-medium')}
        >
          {strings('predict.cash_out')}
        </Text>
      </ButtonHero>
    );
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <BottomSheetHeader onClose={() => goBack()}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('predict.cash_out')}
        </Text>
      </BottomSheetHeader>
      <View
        testID={PredictCashOutSelectorsIDs.CONTAINER}
        style={styles.container}
      >
        <View style={styles.cashOutContainer}>
          {isPreviewLoading ? (
            <Box twClassName="items-center gap-2">
              <Skeleton
                width={200}
                height={74}
                style={tw.style('rounded-lg')}
                testID="predict-sell-preview-value-skeleton"
              />
              <Skeleton
                width={180}
                height={24}
                style={tw.style('rounded-md')}
                testID="predict-sell-preview-price-skeleton"
              />
              <Skeleton
                width={150}
                height={24}
                style={tw.style('rounded-md')}
                testID="predict-sell-preview-pnl-skeleton"
              />
            </Box>
          ) : (
            <>
              <Text
                style={styles.currentValue}
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
              >
                {formatPrice(currentValue, { maximumDecimals: 2 })}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
              >
                {strings('predict.at_price_per_share', {
                  size: formatPositionSize(size, {
                    minimumDecimals: 2,
                    maximumDecimals: 2,
                  }),
                  price: formatCents(currentPrice),
                })}
              </Text>
              <Text
                style={styles.percentPnl}
                twClassName="font-medium"
                color={
                  percentPnl > 0
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
                variant={TextVariant.BodyMd}
              >
                {`${signal}${formatPrice(Math.abs(cashPnl), {
                  maximumDecimals: 4,
                })} (${formatPercentage(percentPnl)})`}
              </Text>
            </>
          )}
        </View>
        <View style={styles.bottomContainer}>
          {placeOrderError && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              style={tw.style('text-center')}
            >
              {placeOrderError}
            </Text>
          )}
          {previewError && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              style={tw.style('text-center')}
            >
              {previewError}
            </Text>
          )}
          <Box twClassName="flex-row items-center gap-4">
            <Box twClassName="w-10 h-10 self-start mt-1">
              <Image source={{ uri: icon }} style={styles.positionIcon} />
            </Box>
            <Box twClassName="flex-col gap-1 flex-1">
              <Text variant={TextVariant.HeadingSm}>{outcomeTitle}</Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
              >
                {outcomeGroupTitle
                  ? strings('predict.cashout_info_multiple', {
                      amount: formatPrice(initialValue),
                      outcomeGroupTitle,
                      outcome: outcomeSideText,
                      initialPrice: formatCents(avgPrice),
                    })
                  : strings('predict.cashout_info', {
                      amount: formatPrice(initialValue),
                      outcome: outcomeSideText,
                      initialPrice: formatCents(avgPrice),
                    })}
              </Text>
            </Box>
          </Box>
          <View style={styles.cashOutButtonContainer}>
            {renderCashOutButton()}
            <Text variant={TextVariant.BodyXs} style={styles.cashOutButtonText}>
              {strings('predict.cash_out_info')}
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PredictSellPreview;
