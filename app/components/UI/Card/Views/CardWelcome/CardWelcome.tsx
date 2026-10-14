import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { AppThemeKey } from '../../../../../util/theme/models';
import createStyles, { GRADIENT_COLORS } from './CardWelcome.styles';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import CardWelcomeCardsAnimation, {
  CARDS_ENTRANCE_START_TIMEOUT_MS,
  CARDS_IN_DURATION_MS,
} from './CardWelcomeCardsAnimation';
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
import { Box } from '@metamask/design-system-react-native';
import MarketingMoment from '../../../MarketingMoment';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../../../util/deviceCapability/types';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';

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
/**
 * Big title starts a beat before CardsIn finishes; description follows.
 * Delays are from entrance-start, same as the previous single-copy reveal.
 */
const TITLE_REVEAL_DELAY_MS = CARDS_IN_DURATION_MS - 350;
const DESCRIPTION_REVEAL_STAGGER_MS = 200;
const DESCRIPTION_REVEAL_DELAY_MS =
  TITLE_REVEAL_DELAY_MS + DESCRIPTION_REVEAL_STAGGER_MS;
/** Buttons fade in on mount after a short beat that mirrors CardsIn starting. */
const BUTTONS_REVEAL_DELAY_MS = 500;
const BUTTONS_REVEAL_DURATION_MS = 300;

/**
 * Low-memory hardware uses the static card image. The Rive file is bundled,
 * so network tier does not fetch or skip it. Unknown hardware keeps Rive.
 */
export function shouldUseStaticCardArtwork(
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean {
  const networkDoesNotGateArtwork =
    networkTier === 'NONE' ||
    networkTier === 'SLOW_CELLULAR' ||
    networkTier === 'FAST_CELLULAR' ||
    networkTier === 'WIFI' ||
    networkTier === null;

  return hardwareTier === 'LOW' && networkDoesNotGateArtwork;
}

const CardWelcome = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const navigation = useNavigation<AppNavigationProp>();
  const { goBack, navigate } = navigation;
  const hasCardholderAccounts = useSelector(selectHasCardholderAccounts);
  const hasSignInLink = useSelector(selectHasCardSignInLink);
  const postAuthRedirect = useCardPostAuthRedirect();
  const theme = useTheme();
  const dimensions = useWindowDimensions();
  const styles = createStyles(theme, dimensions);
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const animationState = useCardEducationAnimationState();
  const [hasCardsAnimationError, setHasCardsAnimationError] = useState(false);
  const [hasCardsEntranceStarted, setHasCardsEntranceStarted] = useState(false);
  // A Rive failure, or low-memory hardware, swaps in the static cards image,
  // so there is no entrance left to sequence against.
  const resolvedAnimationState =
    animationState === 'animate' &&
    (hasCardsAnimationError ||
      shouldUseStaticCardArtwork(hardwareTier, networkTier))
      ? 'static'
      : animationState;
  const isAnimating = resolvedAnimationState === 'animate';
  const isContentHidden = resolvedAnimationState === 'pending';
  // Reanimated attaches the animated style a frame after `isAnimating` flips,
  // so chrome would paint at full opacity for that frame. Keeping the static
  // hidden style underneath holds it down until the reveal takes over.
  const isChromeHiddenUntilRevealed = isContentHidden || isAnimating;
  // Title/description wait for the cards entrance; buttons fade on mount.
  const isTextRevealing = isAnimating && hasCardsEntranceStarted;
  const isButtonsRevealing = isAnimating;

  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(TEXT_REVEAL_TRANSLATE_Y);
  const titleRevealStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const descriptionOpacity = useSharedValue(0);
  const descriptionTranslateY = useSharedValue(TEXT_REVEAL_TRANSLATE_Y);
  const descriptionRevealStyle = useAnimatedStyle(() => ({
    opacity: descriptionOpacity.value,
    transform: [{ translateY: descriptionTranslateY.value }],
  }));

  const buttonsOpacity = useSharedValue(0);
  const buttonsRevealStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const handleCardsAnimationError = useCallback(() => {
    setHasCardsAnimationError(true);
  }, []);

  const handleCardsEntranceStart = useCallback(() => {
    setHasCardsEntranceStarted(true);
  }, []);

  // The Rive file loads asynchronously and the native view reports ready some
  // time after that, so timing the title reveal from `isAnimating` would fade
  // the copy in while the cards are still settling — or still blank. Wait for
  // the entrance to actually start, but never longer than the cap, so a view
  // that never reports ready cannot leave the copy hidden.
  useEffect(() => {
    if (!isAnimating || hasCardsEntranceStarted) {
      return undefined;
    }
    const timeout = setTimeout(
      () => setHasCardsEntranceStarted(true),
      CARDS_ENTRANCE_START_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [isAnimating, hasCardsEntranceStarted]);

  // Buttons: fade in on mount after a short delay (not gated on Rive ready).
  useEffect(() => {
    if (!isAnimating) {
      return;
    }
    buttonsOpacity.value = withDelay(
      BUTTONS_REVEAL_DELAY_MS,
      withTiming(1, { duration: BUTTONS_REVEAL_DURATION_MS }),
    );
  }, [isAnimating, buttonsOpacity]);

  // Staggered copy: big title first (a bit before CardsIn ends), then body.
  useEffect(() => {
    if (!isAnimating || !hasCardsEntranceStarted) {
      return;
    }
    titleOpacity.value = withDelay(
      TITLE_REVEAL_DELAY_MS,
      withTiming(1, { duration: TEXT_REVEAL_DURATION_MS }),
    );
    titleTranslateY.value = withDelay(
      TITLE_REVEAL_DELAY_MS,
      withTiming(0, { duration: TEXT_REVEAL_DURATION_MS }),
    );
    descriptionOpacity.value = withDelay(
      DESCRIPTION_REVEAL_DELAY_MS,
      withTiming(1, { duration: TEXT_REVEAL_DURATION_MS }),
    );
    descriptionTranslateY.value = withDelay(
      DESCRIPTION_REVEAL_DELAY_MS,
      withTiming(0, { duration: TEXT_REVEAL_DURATION_MS }),
    );
  }, [
    isAnimating,
    hasCardsEntranceStarted,
    titleOpacity,
    titleTranslateY,
    descriptionOpacity,
    descriptionTranslateY,
  ]);

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
    <LinearGradient
      colors={GRADIENT_COLORS}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.pageContainer}
      testID="card-gtm-modal-container"
    >
      <MarketingMoment
        twClassName="bg-transparent"
        title={strings('card.card_onboarding.title')}
        description={strings('card.card_onboarding.description')}
        titleTestID={CardWelcomeSelectors.WELCOME_TO_CARD_TITLE_TEXT}
        descriptionTestIDs={[
          CardWelcomeSelectors.WELCOME_TO_CARD_DESCRIPTION_TEXT,
        ]}
        titleFrameStyle={[
          isChromeHiddenUntilRevealed && styles.hiddenText,
          isTextRevealing && titleRevealStyle,
        ]}
        descriptionFrameStyle={[
          isChromeHiddenUntilRevealed && styles.hiddenText,
          isTextRevealing && descriptionRevealStyle,
        ]}
        actionsFrameStyle={[
          styles.footerContent,
          isChromeHiddenUntilRevealed && styles.hiddenText,
          isButtonsRevealing && buttonsRevealStyle,
        ]}
        titleStyle={styles.lightCopy}
        descriptionStyle={styles.lightCopy}
        backdrop={
          <Box style={styles.imageContainer}>
            {resolvedAnimationState !== 'pending' && (
              <CardWelcomeCardsAnimation
                animate={isAnimating}
                style={styles.image}
                animationStyle={styles.animation}
                onEntranceStart={handleCardsEntranceStart}
                onRiveError={handleCardsAnimationError}
              />
            )}
          </Box>
        }
        primaryAction={{
          label: strings(
            shouldGoToSignIn
              ? 'card.card_onboarding.login_button'
              : 'card.card_onboarding.apply_now_button',
          ),
          onPress: handleButtonPress,
          testID: CardWelcomeSelectors.VERIFY_ACCOUNT_BUTTON,
          twClassName: 'bg-white',
          textClassName: 'text-black',
        }}
        secondaryAction={{
          label: strings('card.card_onboarding.not_now_button'),
          onPress: handleClose,
          testID: CardWelcomeSelectors.NOT_NOW_BUTTON,
          textClassName: 'text-white',
        }}
      />
    </LinearGradient>
  );
};

export default CardWelcome;
