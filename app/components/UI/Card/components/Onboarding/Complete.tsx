import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { AnimationDuration } from '@metamask/design-tokens';
import {
  StackActions,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import { useDispatch, useSelector } from 'react-redux';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { getCardBaanxToken } from '../../util/cardTokenVault';
import Logger from '../../../../../util/Logger';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CompleteSelectors } from './Complete.testIds';
import MarketingMomentTitle from '../../../MarketingMomentTitle';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useReduceMotionState } from '../../../Money/hooks/useReduceMotion';
import CompleteCheckAnimation from './CompleteCheckAnimation';

/**
 * Route params for Complete screen
 * Used when navigating from deep link handlers
 */
type NextDestination = 'personal_details' | 'card_home';

interface CompleteRouteParams {
  /** Determines where to navigate after tapping continue
   * - 'personal_details': Navigate to PersonalDetails (from onboarding flow KYC approval)
   * - 'card_home': Navigate to CardHome (from authenticated flow KYC approval)
   * - undefined: Default behavior - check token and navigate accordingly
   */
  nextDestination?: NextDestination;
}

// -- Content cascade ---------------------------------------------------------
// Once the tick starts drawing, the title, description and button each fade in
// and rise into place, one after another. Under Reduce Motion they show at once.

/** How far each item rises into place. */
const CASCADE_RISE_PX = 10;
/** Delay after the tick starts before the title enters, so it lands mid-draw. */
const CASCADE_LEAD_MS = AnimationDuration.Regularly;
/** Gap between each item starting. */
const CASCADE_STAGGER_MS = 80;
/** How long each item takes to enter. */
const CASCADE_DURATION_MS = AnimationDuration.Regularly;
/**
 * Cap on waiting for the tick to start. The Rive file load and the native
 * view-ready handshake are both unbounded, and the copy must never wait on them.
 */
export const COMPLETE_ENTRANCE_START_TIMEOUT_MS = 2000;

type CascadeState = 'pending' | 'play' | 'static';

const useCascadeStyle = (step: number, state: CascadeState) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (state === 'static') {
      progress.value = 1;
      return;
    }
    if (state === 'play') {
      progress.value = withDelay(
        CASCADE_LEAD_MS + step * CASCADE_STAGGER_MS,
        withTiming(1, {
          duration: CASCADE_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        }),
      );
    }
  }, [progress, state, step]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * CASCADE_RISE_PX }],
  }));
};

/**
 * Card onboarding success ("You're in!"). Visual layout mirrors VBA's
 * IdentityVerified success pattern (KycIllustration checkmark + centred
 * TitleStandard + pinned primary button). No Not now / header back — Continue
 * is the only exit (Connor). Replaces MarketingMoment and the old success PNG.
 */
const Complete = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const [isLoading, setIsLoading] = useState(false);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<{ params: CompleteRouteParams }, 'params'>>();
  const nextDestination = route.params?.nextDestination;
  // `null` while the Reduce Motion check is in flight; nothing animates or
  // shows until it resolves, so the first paint never flashes.
  const reduceMotion = useReduceMotionState();
  const [hasEntranceStarted, setHasEntranceStarted] = useState(false);
  const startEntrance = useCallback(() => setHasEntranceStarted(true), []);

  let cascadeState: CascadeState = 'pending';
  if (reduceMotion === true) {
    cascadeState = 'static';
  } else if (reduceMotion === false && hasEntranceStarted) {
    cascadeState = 'play';
  }
  const titleStyle = useCascadeStyle(0, cascadeState);
  const descriptionStyle = useCascadeStyle(1, cascadeState);
  const buttonStyle = useCascadeStyle(2, cascadeState);

  // A view at zero opacity still takes taps, so the button only becomes
  // pressable once its fade-in starts (straight away under Reduce Motion).
  const [isButtonInteractive, setIsButtonInteractive] = useState(false);
  useEffect(() => {
    if (cascadeState === 'static') {
      setIsButtonInteractive(true);
      return undefined;
    }
    if (cascadeState !== 'play') {
      return undefined;
    }
    const timeout = setTimeout(
      () => setIsButtonInteractive(true),
      CASCADE_LEAD_MS + 2 * CASCADE_STAGGER_MS,
    );
    return () => clearTimeout(timeout);
  }, [cascadeState]);

  let checkMode: 'pending' | 'animate' | 'static' = 'pending';
  if (reduceMotion === true) {
    checkMode = 'static';
  } else if (reduceMotion === false) {
    checkMode = 'animate';
  }

  useEffect(() => {
    if (reduceMotion !== false || hasEntranceStarted) {
      return undefined;
    }
    const timeout = setTimeout(
      startEntrance,
      COMPLETE_ENTRANCE_START_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [reduceMotion, hasEntranceStarted, startEntrance]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            screen: CardScreens.COMPLETE,
          }),
        )
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleContinue = async () => {
    setIsLoading(true);
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Baanx, {
            action: CardActions.COMPLETE_BUTTON,
          }),
        )
        .build(),
    );

    try {
      // Handle navigation based on nextDestination param (from deep link)
      if (nextDestination === 'personal_details') {
        // Coming from onboarding flow KYC approval - continue to PersonalDetails
        navigation.dispatch(
          StackActions.replace(Routes.CARD.ONBOARDING.PERSONAL_DETAILS),
        );
        return;
      }

      if (nextDestination === 'card_home') {
        // Coming from authenticated flow KYC approval - go to CardHome
        dispatch(resetOnboardingState());
        navigation.dispatch(
          StackActions.replace(Routes.CARD.SPENDING_LIMIT, {
            flow: 'onboarding',
          }),
        );
        return;
      }

      // Default behavior: Check token and navigate accordingly
      const token = await getCardBaanxToken();
      if (token.success && token.tokenData?.accessToken) {
        dispatch(resetOnboardingState());
        navigation.dispatch(
          StackActions.replace(Routes.CARD.HOME, { fromCardOnboarding: true }),
        );
      } else {
        dispatch(resetOnboardingState());
        navigation.dispatch(StackActions.replace(Routes.CARD.AUTHENTICATION));
      }
    } catch (error) {
      Logger.log('Complete::handleContinue error', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
      >
        <TitleStandard
          title={
            <Animated.View style={[tw.style('w-full'), titleStyle]}>
              <MarketingMomentTitle
                twClassName="w-full text-center"
                testID={CompleteSelectors.TITLE}
              >
                {strings('card.card_onboarding.complete.title')}
              </MarketingMomentTitle>
            </Animated.View>
          }
          bottomLabel={
            <Animated.View style={[tw.style('w-full'), descriptionStyle]}>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
                twClassName="text-center"
                testID={CompleteSelectors.DESCRIPTION}
              >
                {strings('card.card_onboarding.complete.description')}
              </Text>
            </Animated.View>
          }
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.End}
              twClassName="mb-5 w-full"
              testID={CompleteSelectors.IMAGE}
            >
              <CompleteCheckAnimation
                mode={checkMode}
                onEntranceStart={startEntrance}
                onRiveError={startEntrance}
              />
            </Box>
          }
        />
      </ScrollView>
      <Animated.View
        style={buttonStyle}
        pointerEvents={isButtonInteractive ? 'auto' : 'none'}
        testID={CompleteSelectors.FOOTER}
      >
        <Box twClassName="gap-2 px-4 pb-2 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleContinue}
            isFullWidth
            isDisabled={isLoading}
            isLoading={isLoading}
            testID={CompleteSelectors.CONFIRM_BUTTON}
          >
            {strings('card.card_onboarding.complete.confirm_button')}
          </Button>
        </Box>
      </Animated.View>
    </SafeAreaView>
  );
};

export default Complete;
