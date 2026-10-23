import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { brandColor } from '@metamask/design-tokens';
import { Theme, useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import CardWelcomeCardsAnimation from './CardWelcomeCardsAnimation';
import { useCardEducationAnimationState } from './useCardEducationAnimationState';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectHasCardholderAccounts,
  selectHasCardSignInLink,
} from '../../../../../selectors/cardController';
import { useSelector } from 'react-redux';
import { useCardPostAuthRedirect } from '../../hooks/useCardPostAuthRedirect';
import MarketingMoment from '../../../MarketingMoment';
import { colors } from '../../../../../styles/common';

const GRADIENT_COLORS = [colors.cardWelcomeGradientDark, brandColor.purple800];

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
  const navigation = useNavigation<AppNavigationProp>();
  const { goBack, navigate } = navigation;
  const hasCardholderAccounts = useSelector(selectHasCardholderAccounts);
  const hasSignInLink = useSelector(selectHasCardSignInLink);
  const postAuthRedirect = useCardPostAuthRedirect();
  const theme = useTheme();
  const tw = useTailwind();
  const animationState = useCardEducationAnimationState();
  const shouldAnimateCards = animationState === 'animate';

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

  const shouldGoToSignIn = hasCardholderAccounts || hasSignInLink;

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

    if (shouldGoToSignIn) {
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
    shouldGoToSignIn,
    navigate,
    postAuthRedirect,
    trackEvent,
    createEventBuilder,
  ]);

  return (
    <MarketingMoment
      testID="card-gtm-modal-container"
      theme={Theme.Dark}
      background={
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={tw.style('flex-1')}
        />
      }
      title={strings('card.card_onboarding.title')}
      description={strings('card.card_onboarding.description')}
      titleProps={{
        testID: CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT,
        twClassName: 'text-accent02-light text-center',
      }}
      descriptionProps={{
        testID: CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT,
        // padding to prevent orphan
        twClassName: 'text-accent02-light text-center px-3',
      }}
      artwork={
        animationState === 'pending' ? null : (
          <CardWelcomeCardsAnimation
            animate={shouldAnimateCards}
            style={tw.style('h-full w-full')}
          />
        )
      }
      primaryAction={{
        label: strings(
          shouldGoToSignIn
            ? 'card.card_onboarding.login_button'
            : 'card.card_onboarding.apply_now_button',
        ),
        onPress: handleButtonPress,
        testID: CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON,
      }}
      secondaryAction={{
        label: strings('card.card_onboarding.not_now_button'),
        onPress: handleClose,
        testID: CardWelcomeSelectors.NOT_NOW_BUTTON,
      }}
    />
  );
};

export default CardWelcome;
