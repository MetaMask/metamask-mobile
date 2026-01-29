import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonBase from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import StackedCardsImage from '../../../../../images/stacked-cards.png';
import { useTheme } from '../../../../../util/theme';
import createStyles, { GRADIENT_COLORS } from './CardWelcome.styles';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { selectHasCardholderAccounts } from '../../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';

const CardWelcome = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { goBack, navigate } = useNavigation();
  const hasCardholderAccounts = useSelector(selectHasCardholderAccounts);
  const theme = useTheme();
  const dimensions = useWindowDimensions();
  const styles = createStyles(theme, dimensions);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.WELCOME,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleClose = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleButtonPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.VERIFY_ACCOUNT_BUTTON,
        })
        .build(),
    );

    if (hasCardholderAccounts) {
      navigate(Routes.CARD.AUTHENTICATION);
    } else {
      navigate(Routes.CARD.ONBOARDING.ROOT);
    }
  }, [hasCardholderAccounts, navigate, trackEvent, createEventBuilder]);

  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.pageContainer}
      testID="card-gtm-modal-container"
    >
      {/* Header Section */}
      <SafeAreaView style={styles.headerContainer} edges={['top']}>
        <Text
          style={styles.title}
          variant={TextVariant.HeadingLG}
          testID={CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT}
        >
          {strings('card.card_onboarding.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          style={styles.titleDescription}
          testID={CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT}
        >
          {strings('card.card_onboarding.description')}
        </Text>
      </SafeAreaView>

      {/* Image Section - Positioned absolutely to extend behind footer */}
      <View style={styles.imageContainer}>
        <Image
          source={StackedCardsImage}
          style={styles.image}
          resizeMode="contain"
          testID={CardWelcomeSelectors.CARD_IMAGE}
        />
      </View>

      {/* Footer Section - Positioned absolutely at bottom */}
      <SafeAreaView style={styles.footerContainer} edges={['bottom']}>
        <ButtonBase
          onPress={handleButtonPress}
          testID={CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          style={styles.getStartedButton}
          activeOpacity={0.6}
          label={
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.getStartedButtonText}
            >
              {strings(
                hasCardholderAccounts
                  ? 'card.card_onboarding.login_button'
                  : 'card.card_onboarding.apply_now_button',
              )}
            </Text>
          }
        />
        <Button
          variant={ButtonVariants.Secondary}
          onPress={handleClose}
          testID={CardWelcomeSelectors.NOT_NOW_BUTTON}
          width={ButtonWidthTypes.Full}
          size={ButtonSize.Lg}
          style={styles.notNowButton}
          activeOpacity={0.6}
          label={
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.notNowButtonText}
            >
              {strings('card.card_onboarding.not_now_button')}
            </Text>
          }
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CardWelcome;
