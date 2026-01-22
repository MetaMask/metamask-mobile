import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { ReviewOrderSelectors } from '../../../../../../e2e/selectors/Card/ReviewOrder.selectors';
import DaimoPayService from '../../services/DaimoPayService';
import Logger from '../../../../../util/Logger';
import { useCardSDK } from '../../sdk';
import { useParams } from '../../../../../util/navigation/navUtils';

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface ReviewOrderParams {
  shippingAddress?: ShippingAddress;
  fromUpgrade?: boolean;
}

interface OrderItem {
  label: string;
  value: string;
  onPress?: () => void;
}

const ReviewOrder = () => {
  const { navigate } = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const tw = useTailwind();
  const { shippingAddress: routeShippingAddress, fromUpgrade } =
    useParams<ReviewOrderParams>();

  const { sdk: cardSDK } = useCardSDK();

  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsCreatingPayment(false);
    }, []),
  );

  const handleRenewsPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.REVIEW_ORDER_RENEWS_PRESSED,
          screen: CardScreens.REVIEW_ORDER,
        })
        .build(),
    );

    navigate(Routes.CARD.MODALS.ID, {
      screen: Routes.CARD.MODALS.RECURRING_FEE,
    });
  }, [navigate, trackEvent, createEventBuilder]);

  const shippingAddress: ShippingAddress = useMemo(
    () =>
      routeShippingAddress ?? {
        line1: '',
        city: '',
        state: '',
        zip: '',
      },
    [routeShippingAddress],
  );

  const orderItems: OrderItem[] = useMemo(
    () => [
      {
        label: strings('card.review_order.metal_card_quantity'),
        value: strings('card.review_order.metal_card_price'),
      },
      {
        label: strings('card.review_order.fees'),
        value: strings('card.review_order.fees_free'),
      },
      {
        label: strings('card.review_order.renews'),
        value: strings('card.review_order.renews_annually'),
        onPress: handleRenewsPress,
      },
      {
        label: strings('card.review_order.total'),
        value: strings('card.review_order.metal_card_total'),
      },
    ],
    [handleRenewsPress],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.REVIEW_ORDER,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handlePay = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.REVIEW_ORDER_PAY,
        })
        .build(),
    );

    setIsCreatingPayment(true);
    setPaymentError(null);

    try {
      const response = await DaimoPayService.createPayment({
        cardSDK: cardSDK ?? undefined,
      });

      navigate(Routes.CARD.MODALS.ID, {
        screen: Routes.CARD.MODALS.DAIMO_PAY,
        params: { payId: response.payId, fromUpgrade },
      });
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'ReviewOrder: Failed to create Daimo payment',
      );
      setPaymentError(strings('card.review_order.payment_creation_error'));
      setIsCreatingPayment(false);
    }
  }, [navigate, trackEvent, createEventBuilder, cardSDK, fromUpgrade]);

  const renderOrderItem = useCallback((item: OrderItem, index: number) => {
    const isTotal = item.label === strings('card.review_order.total');
    const isRenews = item.label === strings('card.review_order.renews');
    const isFees = item.label === strings('card.review_order.fees');

    const content = (
      <Box
        twClassName="flex-row justify-between items-center py-3"
        testID={`${ReviewOrderSelectors.ORDER_ITEM}-${index}`}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName={
            isRenews
              ? 'text-alternative underline decoration-dotted'
              : 'text-alternative'
          }
        >
          {item.label}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName={
            isTotal
              ? 'text-default'
              : isFees
                ? 'text-success-default'
                : 'text-alternative'
          }
        >
          {item.value}
        </Text>
      </Box>
    );

    if (item.onPress) {
      return (
        <TouchableOpacity
          key={`order-item-${index}`}
          onPress={item.onPress}
          testID={`${ReviewOrderSelectors.ORDER_ITEM_PRESSABLE}-${index}`}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return <Box key={`order-item-${index}`}>{content}</Box>;
  }, []);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={ReviewOrderSelectors.CONTAINER}
    >
      <Box twClassName="flex-1 px-4">
        <Box twClassName="py-4">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-default"
            testID={ReviewOrderSelectors.TITLE}
          >
            {strings('card.review_order.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-alternative mt-2"
            fontWeight={FontWeight.Regular}
            testID={ReviewOrderSelectors.SUBTITLE}
          >
            {strings('card.review_order.subtitle')}
          </Text>
        </Box>

        <Box
          twClassName="bg-background-muted rounded-xl p-4 mt-4"
          testID={ReviewOrderSelectors.SHIPPING_ADDRESS_CARD}
        >
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            twClassName="text-default mb-1"
          >
            {strings('card.review_order.shipping_address')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-alternative"
            testID={ReviewOrderSelectors.ADDRESS_LINE_1}
          >
            {shippingAddress.line1}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-alternative"
            testID={ReviewOrderSelectors.ADDRESS_CITY_STATE_ZIP}
          >
            {`${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}`}
          </Text>
        </Box>

        <Box twClassName="mt-6" testID={ReviewOrderSelectors.ORDER_SUMMARY}>
          {orderItems.map((item, index) => renderOrderItem(item, index))}
        </Box>

        <Box twClassName="flex-1" />

        <Box twClassName="pb-4 gap-3">
          {paymentError && (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default text-center mb-2"
              testID={ReviewOrderSelectors.PAYMENT_ERROR}
            >
              {paymentError}
            </Text>
          )}
          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.review_order.pay')}
            size={ButtonSize.Lg}
            onPress={handlePay}
            width={ButtonWidthTypes.Full}
            loading={isCreatingPayment}
            testID={ReviewOrderSelectors.PAY_BUTTON}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default ReviewOrder;
