import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useEffect } from 'react';
import { Image, useWindowDimensions, View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import MM_CARDS_MOCKUP from '../../../../../images/mm-cards-mockup.png';
import { useTheme } from '../../../../../util/theme';
import createStyles from './CardWelcome.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardWelcomeSelectors } from '../../../../../../e2e/selectors/Card/CardWelcome.selectors';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useIsCardholder } from '../../hooks/useIsCardholder';
import { CardActions, CardScreens } from '../../util/metrics';

const CardWelcome = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
  const isCardholder = useIsCardholder();
  const theme = useTheme();
  const deviceWidth = useWindowDimensions().width;
  const styles = createStyles(theme, deviceWidth);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.WELCOME,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const cardWelcomeCopies = useMemo(() => {
    if (isCardholder) {
      return {
        title: strings('card.card_onboarding.title'),
        description: strings('card.card_onboarding.description'),
        verify_account_button: strings(
          'card.card_onboarding.verify_account_button',
        ),
      };
    }

    return {
      title: strings('card.card_onboarding.non_cardholder_title'),
      description: strings('card.card_onboarding.non_cardholder_description'),
      verify_account_button: strings(
        'card.card_onboarding.non_cardholder_verify_account_button',
      ),
    };
  }, [isCardholder]);

  const handleButtonPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VERIFY_ACCOUNT_BUTTON,
        })
        .build(),
    );

    if (isCardholder) {
      navigate(Routes.CARD.AUTHENTICATION);
    } else {
      navigate(Routes.CARD.ONBOARDING.ROOT);
    }
  }, [isCardholder, navigate, trackEvent, createEventBuilder]);

  return (
    <SafeAreaView style={styles.safeAreaView} edges={['bottom']}>
      <View accessibilityRole="none" accessible={false} style={styles.container}>
        <View accessibilityRole="none" accessible={false} style={styles.imageWrapper}>
          <Image
            source={MM_CARDS_MOCKUP}
            style={styles.image}
            resizeMode="contain"
            testID={CardWelcomeSelectors.CARD_IMAGE}
          />
        </View>
        <View accessibilityRole="none" accessible={false}>
          <Text
            variant={TextVariant.HeadingLG}
            testID={CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT}
          >
            {cardWelcomeCopies.title}
          </Text>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            testID={CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT}
          >
            {cardWelcomeCopies.description}
          </Text>

          <Button
            variant={ButtonVariants.Primary}
            label={cardWelcomeCopies.verify_account_button}
            size={ButtonSize.Lg}
            testID={CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON}
            onPress={handleButtonPress}
            style={styles.button}
            width={ButtonWidthTypes.Full}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CardWelcome;
