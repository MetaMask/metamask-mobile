import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import MM_CARDS_WELCOME from '../../../../../images/mm-card-welcome.png';
import { useTheme } from '../../../../../util/theme';
import createStyles from './CardWelcome.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { selectHasCardholderAccounts } from '../../../../../core/redux/slices/card';
import { useSelector } from 'react-redux';
import ButtonBase from '../../../../../component-library/components/Buttons/Button/foundation/ButtonBase';

const CardWelcome = () => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const { navigate } = useNavigation();
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
    navigate(Routes.WALLET.HOME);
  }, [navigate]);

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
    <View style={[styles.pageContainer]} testID="card-gtm-modal-container">
      <SafeAreaView style={styles.contentContainer}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
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
        </View>

        {/* Image Section */}
        <View style={styles.imageContainer}>
          <Image
            source={MM_CARDS_WELCOME}
            style={styles.image}
            resizeMode="cover"
            testID={CardWelcomeSelectors.CARD_IMAGE}
          />
        </View>

        {/* Footer Section */}
        <View style={styles.footerContainer}>
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
                {strings('card.card_onboarding.apply_now_button')}
              </Text>
            }
          />
          <Button
            variant={ButtonVariants.Secondary}
            onPress={handleClose}
            testID="predict-gtm-not-now-button"
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
        </View>
      </SafeAreaView>
    </View>
  );
};

export default CardWelcome;
