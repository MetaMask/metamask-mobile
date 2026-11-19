import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useEffect } from 'react';
import { Image, StatusBar, StyleSheet, View } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { Theme } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { trackCardLinkRoutingDisagreement } from '../../util/trackCardLinkRoutingDisagreement';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardEntryRouting,
  selectHasCardSignInLink,
} from '../../../../../selectors/cardController';
import { useSelector } from 'react-redux';
import { useCardPostAuthRedirect } from '../../hooks/useCardPostAuthRedirect';
import MarketingMoment from '../../../MarketingMoment';
import CardRebrandImage from '../../../../../images/mm-card-rebrand.png';

/**
 * Crop of the rebrand card inside its square frame, matching Figma node
 * 1351:685. The source sits at 108.89% of the frame, shifted up and to the left.
 */
const CARD_ARTWORK_SCALE = '108.89%';
const CARD_ARTWORK_LEFT = '-7.22%';
const CARD_ARTWORK_TOP = '-1.11%';

const styles = StyleSheet.create({
  artworkClip: {
    aspectRatio: 1,
    overflow: 'hidden',
    width: '100%',
  },
  artworkImage: {
    height: CARD_ARTWORK_SCALE,
    left: CARD_ARTWORK_LEFT,
    position: 'absolute',
    top: CARD_ARTWORK_TOP,
    width: CARD_ARTWORK_SCALE,
  },
});

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
  const cardEntryRouting = useSelector(selectCardEntryRouting);
  const hasSignInLink = useSelector(selectHasCardSignInLink);
  const postAuthRedirect = useCardPostAuthRedirect();
  const theme = useTheme();

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
      const applyStatusBar = () => StatusBar.setBarStyle('dark-content', true);

      applyStatusBar();

      const handleTransitionEnd = (event: TransitionEndEvent) => {
        if (event?.data?.closing) {
          return;
        }
        applyStatusBar();
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

  const shouldGoToSignIn = cardEntryRouting.hasCard || hasSignInLink;

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
    trackCardLinkRoutingDisagreement(cardEntryRouting, 'card_welcome');

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
    cardEntryRouting,
    shouldGoToSignIn,
    navigate,
    postAuthRedirect,
    trackEvent,
    createEventBuilder,
  ]);

  return (
    <MarketingMoment
      testID="card-gtm-modal-container"
      theme={Theme.Light}
      background={<Box twClassName="h-full w-full bg-accent04-light" />}
      title={strings('card.card_onboarding.title')}
      description={strings('card.card_onboarding.description')}
      titleProps={{
        testID: CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT,
        twClassName: 'text-accent04-dark text-center',
      }}
      descriptionProps={{
        testID: CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT,
        // padding to prevent orphan
        twClassName: 'text-accent04-dark text-center px-3',
      }}
      artworkWrapperProps={{ paddingHorizontal: 3 }}
      artwork={
        <View style={styles.artworkClip}>
          <Image
            source={CardRebrandImage}
            resizeMode="cover"
            style={styles.artworkImage}
            testID={CardWelcomeSelectors.CARD_IMAGE}
          />
        </View>
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
