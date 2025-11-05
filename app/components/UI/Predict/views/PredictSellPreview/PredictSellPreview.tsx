import {
  NavigationProp,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import Engine from '../../../../../core/Engine';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import {
  PredictEventType,
  PredictEventValues,
} from '../../constants/eventNames';
import { formatPercentage, formatPrice } from '../../utils/format';
import styleSheet from './PredictSellPreview.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictCashOutSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  ButtonSize as ButtonSizeHero,
} from '@metamask/design-system-react-native';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import PredictConsentSheet, {
  type PredictConsentSheetRef,
} from '../../components/PredictConsentSheet';
import { usePredictAgreement } from '../../hooks/usePredictAgreement';

const PredictSellPreview = () => {
  const tw = useTailwind();
  const { styles } = useStyles(styleSheet, {});
  const consentSheetRef = useRef<PredictConsentSheetRef>(null);
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictSellPreview'>>();
  const { market, position, outcome, entryPoint } = route.params;

  const { icon, title, outcome: outcomeSideText, initialValue } = position;

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

  const { preview } = usePredictOrderPreview({
    providerId: position.providerId,
    marketId: position.marketId,
    outcomeId: position.outcomeId,
    outcomeTokenId: position.outcomeTokenId,
    side: Side.SELL,
    size: position.amount,
    positionId: position.id,
    autoRefreshTimeout: 1000,
  });

  const { isAgreementAccepted } = usePredictAgreement({
    providerId: position.providerId,
  });

  // Track Predict Action Initiated when screen mounts
  useEffect(() => {
    const controller = Engine.context.PredictController;

    controller.trackPredictOrderEvent({
      eventType: PredictEventType.INITIATED,
      analyticsProperties,
      providerId: position.providerId,
      sharePrice: position?.price,
      amountUsd: position?.amount,
      pnl: position?.percentPnl, // PnL as percentage for sell orders
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result?.success) {
      dispatch(StackActions.pop());
    }
  }, [dispatch, result]);

  const currentValue = preview?.minAmountReceived ?? 0;
  const { cashPnl, percentPnl } = position;

  const signal = useMemo(() => (cashPnl >= 0 ? '+' : '-'), [cashPnl]);

  const onCashOut = useCallback(async () => {
    if (!preview) return;

    // Check if user has accepted the agreement
    if (!isAgreementAccepted) {
      consentSheetRef.current?.onOpenBottomSheet();
      return;
    }

    await placeOrder({
      providerId: position.providerId,
      analyticsProperties,
      preview,
    });
  }, [
    preview,
    isAgreementAccepted,
    placeOrder,
    analyticsProperties,
    position.providerId,
  ]);

  const renderCashOutButton = () => {
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
        <Text variant={TextVariant.BodyMDMedium} style={tw.style('text-white')}>
          {strings('predict.cash_out')}
        </Text>
      </ButtonHero>
    );
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <BottomSheetHeader onClose={() => goBack()}>
        <Text variant={TextVariant.HeadingMD}>Cash Out</Text>
      </BottomSheetHeader>
      <View
        testID={PredictCashOutSelectorsIDs.CONTAINER}
        style={styles.container}
      >
        <View style={styles.cashOutContainer}>
          <Text style={styles.currentValue} variant={TextVariant.BodyMDMedium}>
            {formatPrice(currentValue, { maximumDecimals: 2 })}
          </Text>
          <Text
            style={styles.percentPnl}
            color={percentPnl > 0 ? TextColor.Success : TextColor.Error}
            variant={TextVariant.BodyMDMedium}
          >
            {`${signal}${formatPrice(Math.abs(cashPnl), {
              maximumDecimals: 2,
            })} (${formatPercentage(percentPnl)})`}
          </Text>
        </View>
        <View style={styles.bottomContainer}>
          {placeOrderError && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Error}
              style={tw.style('text-center')}
            >
              {strings('predict.order.order_failed_generic')}
            </Text>
          )}
          <View style={styles.positionContainer}>
            <View>
              <Image source={{ uri: icon }} style={styles.positionIcon} />
            </View>
            <View style={styles.positionDetails}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.detailsLeft}
                variant={TextVariant.HeadingSM}
              >
                {outcomeTitle}
              </Text>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={styles.detailsResolves}
                variant={TextVariant.BodySMMedium}
              >
                {formatPrice(initialValue, { maximumDecimals: 2 })} on{' '}
                {outcomeSideText}
              </Text>
            </View>
          </View>
          <View style={styles.cashOutButtonContainer}>
            {renderCashOutButton()}
            <Text variant={TextVariant.BodyXS} style={styles.cashOutButtonText}>
              {strings('predict.cash_out_info')}
            </Text>
          </View>
        </View>
      </View>
      <PredictConsentSheet
        ref={consentSheetRef}
        providerId={position.providerId}
        onAgree={onCashOut}
      />
    </SafeAreaView>
  );
};

export default PredictSellPreview;
