import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { Image, StatusBar, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../../../../../../locales/i18n';
import StackedCardsImage from '../../../../../images/stacked-cards.png';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import createStyles, { GRADIENT_COLORS } from './CardWelcome.styles';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';
import { selectHasCardholderAccounts } from '../../../../../selectors/cardController';
import { useSelector } from 'react-redux';
import { useCardPostAuthRedirect } from '../../hooks/useCardPostAuthRedirect';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  ButtonBase,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

interface TransitionEndEvent {
  data?: { closing?: boolean };
}

interface StatusBarNavigation {
  addListener: (
    type: 'transitionEnd',
    callback: (event: TransitionEndEvent) => void,
  ) => () => void;
  getParent: () => StatusBarNavigation | undefined;
}

const CardWelcome = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation();
  const { goBack, navigate } = navigation;
  const hasCardholderAccounts = useSelector(selectHasCardholderAccounts);
  const postAuthRedirect = useCardPostAuthRedirect();
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

  useFocusEffect(
    useCallback(() => {
      const applyLightStatusBar = () =>
        StatusBar.setBarStyle('light-content', true);

      applyLightStatusBar();

      const handleTransitionEnd = (event: TransitionEndEvent) => {
        if (event?.data?.closing) {
          return;
        }
        applyLightStatusBar();
      };

      const unsubscribers: (() => void)[] = [];
      let current: StatusBarNavigation | undefined =
        navigation as StatusBarNavigation;
      while (current) {
        unsubscribers.push(
          current.addListener('transitionEnd', handleTransitionEnd),
        );
        current = current.getParent?.();
      }

      return () => {
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        StatusBar.setBarStyle(
          theme.themeAppearance === AppThemeKey.dark
            ? 'light-content'
            : 'dark-content',
          true,
        );
      };
    }, [navigation, theme.themeAppearance]),
  );

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
      navigate(
        Routes.CARD.AUTHENTICATION,
        postAuthRedirect ? { postAuthRedirect } : undefined,
      );
    } else {
      navigate(
        Routes.CARD.ONBOARDING.ROOT,
        postAuthRedirect ? { postAuthRedirect } : undefined,
      );
    }
  }, [
    hasCardholderAccounts,
    navigate,
    postAuthRedirect,
    trackEvent,
    createEventBuilder,
  ]);

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
          variant={TextVariant.HeadingLg}
          testID={CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT}
        >
          {strings('card.card_onboarding.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
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
          style={styles.getStartedButton}
          isFullWidth
        >
          <Text
            variant={TextVariant.BodyMd}
            style={styles.getStartedButtonText}
          >
            {strings(
              hasCardholderAccounts
                ? 'card.card_onboarding.login_button'
                : 'card.card_onboarding.apply_now_button',
            )}
          </Text>
        </ButtonBase>
        <Button
          variant={ButtonVariant.Secondary}
          onPress={handleClose}
          testID={CardWelcomeSelectors.NOT_NOW_BUTTON}
          size={ButtonSize.Lg}
          style={styles.notNowButton}
          isFullWidth
        >
          <Text variant={TextVariant.BodyMd} style={styles.notNowButtonText}>
            {strings('card.card_onboarding.not_now_button')}
          </Text>
        </Button>
      </SafeAreaView>
    </LinearGradient>
  );
};

export default CardWelcome;
