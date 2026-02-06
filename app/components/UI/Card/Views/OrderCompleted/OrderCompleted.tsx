import React, { useCallback, useEffect } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
import { OrderCompletedSelectors } from '../../../../../../e2e/selectors/Card/OrderCompleted.selectors';
import MM_METAL_CARD from '../../../../../images/metal-card.png';
import { useParams } from '../../../../../util/navigation/navUtils';

export interface OrderCompletedParams {
  paymentMethod?: string;
  transactionHash?: string;
  fromUpgrade?: boolean;
}

const OrderCompleted: React.FC = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
  const tw = useTailwind();
  const { fromUpgrade } = useParams<OrderCompletedParams>();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.ORDER_COMPLETED,
          from_upgrade: fromUpgrade,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, fromUpgrade]);

  const handleSetUpCard = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ORDER_COMPLETED_SET_UP_CARD,
          from_upgrade: fromUpgrade,
        })
        .build(),
    );

    navigate(Routes.CARD.HOME);
  }, [navigate, trackEvent, createEventBuilder, fromUpgrade]);

  const buttonLabel = fromUpgrade
    ? strings('card.order_completed.back_to_card_button')
    : strings('card.order_completed.set_up_card_button');

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
      testID={OrderCompletedSelectors.CONTAINER}
    >
      <Box twClassName="flex-1 px-4">
        <Box twClassName="flex-1 items-center ">
          <Image
            source={MM_METAL_CARD}
            style={tw.style('w-96 h-96')}
            resizeMode="contain"
            testID={OrderCompletedSelectors.CARD_IMAGE}
          />

          <Text
            style={tw.style('text-center mt-6', {
              fontFamily: 'MMPoly-Regular',
              fontWeight: '400',
              fontSize: 24,
              lineHeight: 36,
              letterSpacing: 0,
            })}
            twClassName="text-default"
            variant={TextVariant.HeadingLg}
            testID={OrderCompletedSelectors.TITLE}
          >
            {strings('card.order_completed.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-alternative text-center mt-3"
            testID={OrderCompletedSelectors.SUBTITLE}
          >
            {strings('card.order_completed.subtitle')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            twClassName="text-alternative text-center mt-2 px-4"
            testID={OrderCompletedSelectors.DESCRIPTION}
          >
            {strings('card.order_completed.description')}
          </Text>
        </Box>

        <Box twClassName="pb-4">
          <Button
            variant={ButtonVariants.Primary}
            label={buttonLabel}
            size={ButtonSize.Lg}
            onPress={handleSetUpCard}
            width={ButtonWidthTypes.Full}
            testID={OrderCompletedSelectors.SET_UP_CARD_BUTTON}
          />
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default OrderCompleted;
