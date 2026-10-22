import React, { useCallback, useEffect } from 'react';
import { Image } from 'react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import MarketingMoment from '../../../MarketingMoment';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { OrderCompletedSelectors } from './OrderCompleted.testIds';
import MM_METAL_CARD from '../../../../../images/metal-card.png';
import { useParams } from '../../../../../util/navigation/navUtils';

export interface OrderCompletedParams {
  paymentMethod?: string;
  transactionHash?: string;
  fromUpgrade?: boolean;
}

const OrderCompleted: React.FC = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const headerHandlers = useCardHeaderHandlers('back');
  const insets = useSafeAreaInsets();
  const { fromUpgrade } = useParams<OrderCompletedParams>();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.ORDER_COMPLETED,
            from_upgrade: fromUpgrade,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder, fromUpgrade]);

  const handleSetUpCard = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            action: CardActions.ORDER_COMPLETED_SET_UP_CARD,
            from_upgrade: fromUpgrade,
          }),
        )
        .build(),
    );

    if (fromUpgrade) {
      navigation.navigate(Routes.CARD.HOME);
    } else {
      navigation.dispatch(
        StackActions.replace(Routes.CARD.SPENDING_LIMIT, {
          flow: 'onboarding',
        }),
      );
    }
  }, [navigation, trackEvent, createEventBuilder, fromUpgrade]);

  const buttonLabel = fromUpgrade
    ? strings('card.order_completed.back_to_card_button')
    : strings('card.order_completed.set_up_card_button');

  return (
    <Box twClassName="min-h-0 flex-1 bg-default">
      <HeaderStandard
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
        backButtonProps={{ testID: OrderCompletedSelectors.BACK_BUTTON }}
      />
      {/* MarketingMoment also insets the top. Pull it up so the header is the only top inset. */}
      <Box twClassName="min-h-0 flex-1" style={{ marginTop: -insets.top }}>
        <MarketingMoment
          testID={OrderCompletedSelectors.CONTAINER}
          title={strings('card.order_completed.title')}
          titleProps={{
            testID: OrderCompletedSelectors.TITLE,
            twClassName: 'px-10',
          }}
          description={
            <Box flexDirection={BoxFlexDirection.Column} gap={2}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="text-center"
                testID={OrderCompletedSelectors.SUBTITLE}
              >
                {strings('card.order_completed.subtitle')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                twClassName="text-center"
                testID={OrderCompletedSelectors.DESCRIPTION}
              >
                {strings('card.order_completed.description')}
              </Text>
            </Box>
          }
          artwork={
            <Image
              source={MM_METAL_CARD}
              style={tw.style('h-full w-full')}
              resizeMode="contain"
              testID={OrderCompletedSelectors.CARD_IMAGE}
            />
          }
          primaryAction={{
            label: buttonLabel,
            onPress: handleSetUpCard,
            testID: OrderCompletedSelectors.SET_UP_CARD_BUTTON,
          }}
        />
      </Box>
    </Box>
  );
};

export default OrderCompleted;
