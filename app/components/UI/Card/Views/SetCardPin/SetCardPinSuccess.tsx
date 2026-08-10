import React, { useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { CardActions, CardScreens } from '../../util/metrics';
import { SetCardPinSelectors } from './SetCardPin.testIds';
import { clearPinDraft } from './pinDraftStore';

const PROVIDER = CardProviderIds.Immersve;
const SUCCESS_ICON_SIZE = 64;

const SetCardPinSuccess: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const iconScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    clearPinDraft();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.SET_PIN_SUCCESS,
          provider: PROVIDER,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  useEffect(() => {
    Animated.spring(iconScale, {
      toValue: 1,
      friction: 4,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [iconScale]);

  const handleDone = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.SET_PIN_SUCCESS_DONE,
          provider: PROVIDER,
        })
        .build(),
    );
    navigation.reset({
      index: 0,
      routes: [{ name: Routes.CARD.HOME }],
    });
  }, [navigation, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView
      testID={SetCardPinSelectors.SUCCESS_ROOT}
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
    >
      <Box
        twClassName="flex-1 px-4"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={4}
      >
        <Animated.View
          testID={SetCardPinSelectors.SUCCESS_ICON}
          style={{ transform: [{ scale: iconScale }] }}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="rounded-full bg-success-default"
            style={{ width: SUCCESS_ICON_SIZE, height: SUCCESS_ICON_SIZE }}
          >
            <Icon
              name={IconName.Check}
              color={IconColor.SuccessInverse}
              size={IconSize.Xl}
            />
          </Box>
        </Animated.View>

        <Box twClassName="gap-2 px-2" alignItems={BoxAlignItems.Center}>
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-default text-center"
            testID={SetCardPinSelectors.SUCCESS_TITLE}
          >
            {strings('card.set_pin.success_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative text-center"
          >
            {strings('card.set_pin.success_description')}
          </Text>
        </Box>
      </Box>

      <Box twClassName="px-4 pb-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleDone}
          testID={SetCardPinSelectors.DONE_BUTTON}
        >
          {strings('card.set_pin.success_done')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default SetCardPinSuccess;
