import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import createStyles, { GRADIENT_COLORS } from './CardWelcome.styles';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import CardWelcomeCardsAnimation, {
  CARDS_IN_DURATION_MS,
} from './CardWelcomeCardsAnimation';
import { useCardEducationAnimationState } from './useCardEducationAnimationState';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
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

const TEXT_REVEAL_DURATION_MS = 300;
const TEXT_REVEAL_TRANSLATE_Y = 10;

const CardWelcome = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation<AppNavigationProp>();
  const { goBack, navigate } = navigation;
  const hasCardholderAccounts = useSelector(selectHasCardholderAccounts);
  const postAuthRedirect = useCardPostAuthRedirect();
  const theme = useTheme();
  const dimensions = useWindowDimensions();
  const styles = createStyles(theme, dimensions);
  const animationState = useCardEducationAnimationState();
  const [hasCardsAnimationError, setHasCardsAnimationError] = useState(false);
  // A Rive failure swaps in the static cards image, so there is no entrance
  // left to sequence against: fall back to the static reveal rather than
  // holding the copy hidden for the full CardsIn duration.
  const resolvedAnimationState =
    animationState === 'animate' && hasCardsAnimationError
      ? 'static'
      : animationState;
  const isAnimating = resolvedAnimationState === 'animate';
  const isContentHidden = resolvedAnimationState === 'pending';
  // Reanimated attaches the animated style a frame after `isAnimating` flips,
  // so the copy would paint at full opacity for that frame. Keeping the static
  // hidden style underneath holds it down until the reveal takes over.
  const isCopyHiddenUntilRevealed = isContentHidden || isAnimating;

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(TEXT_REVEAL_TRANSLATE_Y);
  const textRevealStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const handleCardsAnimationError = useCallback(() => {
    setHasCardsAnimationError(true);
  }, []);

  useEffect(() => {
    if (!isAnimating) {
      return;
    }
    textOpacity.value = withDelay(
      CARDS_IN_DURATION_MS,
      withTiming(1, { duration: TEXT_REVEAL_DURATION_MS }),
    );
    textTranslateY.value = withDelay(
      CARDS_IN_DURATION_MS,
      withTiming(0, { duration: TEXT_REVEAL_DURATION_MS }),
    );
  }, [isAnimating, textOpacity, textTranslateY]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.WELCOME,
          }),
        )
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
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            action: CardActions.VERIFY_ACCOUNT_BUTTON,
          }),
        )
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
        <Animated.View
          style={[
            isCopyHiddenUntilRevealed && styles.hiddenText,
            isAnimating && textRevealStyle,
          ]}
        >
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
        </Animated.View>
      </SafeAreaView>

      {/* Image Section - Positioned absolutely to extend behind footer */}
      <View style={styles.imageContainer}>
        {resolvedAnimationState !== 'pending' && (
          <CardWelcomeCardsAnimation
            animate={isAnimating}
            style={styles.image}
            onRiveError={handleCardsAnimationError}
          />
        )}
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
