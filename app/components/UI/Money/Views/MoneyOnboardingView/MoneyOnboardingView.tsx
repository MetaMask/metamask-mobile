import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../../core/NavigationService/types';
import { useDispatch, useSelector } from 'react-redux';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { setMoneyOnboardingSeen } from '../../../../../actions/user';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import Rive, {
  AutoBind,
  useRive,
  useRiveNumber,
  Fit,
  useRiveTrigger,
  useRiveString,
  RNRiveError,
} from 'rive-react-native';
import { MoneyOnboardingViewTestIds } from './MoneyOnboardingView.testIds';
import { selectIsUsUnauthenticatedNonCardholder } from '../../selectors/eligibility';
import {
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logger from '../../../../../util/Logger';
import onboardingFlowV24Animation from '../../../../../animations/onboarding_flow_v24.riv';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';

/**
 * State machine constants must match the Rive file authored for this animation.
 * Update these if the Rive file's state machine or trigger names change.
 */
const RIVE_STATE_MACHINE_NAME = 'State Machine 1';
const RIVE_ARTBOARD_NAME = 'Money_Account';
const CARD_CASHBACK_PERCENTAGE = 3;
const CLOSE_TRIGGER = 'close';

/**
 * The keys in this mapping refer to the step state names in the Rive file.
 * Do not change the keys without updating the Rive file.
 */
const RIVE_STEP_NAMES = {
  UI1: 'UI1',
  APY: 'APY',
  CARD: 'Card',
  COINS: 'Coins',
  FINAL_STATE: 'FinalState',
};

const RIVE_TRANSITION_STATE_NAMES = {
  // Forward navigation states
  UI_TO_APY: 'UI to APY',
  APY_TO_WALLET: 'APY to Wallet',
  CARD_TO_COINS: 'Card to Coins',
  COINS_TO_FOX: 'Coins to Fox',
  // Backward navigation states
  APY_TO_UI: 'APY to UI',
  WALLET_TO_APY: 'Wallet to APY',
  COINS_TO_CARD: 'Coins to Card',
  FOX_TO_COINS: 'Fox to Coins',
};

const RIVE_STATE_TO_STEP_INDEX: Record<string, number> = {
  [RIVE_STEP_NAMES.UI1]: 0,
  [RIVE_STEP_NAMES.APY]: 1,
  [RIVE_STEP_NAMES.CARD]: 2,
  [RIVE_STEP_NAMES.COINS]: 3,
  [RIVE_STEP_NAMES.FINAL_STATE]: 4,
};

const RIVE_TRANSITION_STATES = new Set<string>(
  Object.values(RIVE_TRANSITION_STATE_NAMES),
);

const TOTAL_ONBOARDING_STEPS = Object.keys(RIVE_STATE_TO_STEP_INDEX).length;
const OVERLAY_FADE_DURATION_MS = 200;
const SMALL_OVERLAY_DEVICE_MAX_WIDTH = 375;
const SMALL_OVERLAY_DEVICE_MAX_HEIGHT = 700;
const HEADER_TOP_OFFSET = 60;
const FOOTER_BOTTOM_OFFSET = 100;
const OVERLAY_TEXT_PRESETS = {
  small: {
    title: { fontSize: 18, lineHeight: 25, paddingHorizontal: 42 },
    content: { fontSize: 14, lineHeight: 20 },
    footer: { fontSize: 10, lineHeight: 12 },
  },
  default: {
    title: { fontSize: 24 },
    content: { fontSize: 16 },
    footer: { fontSize: 12 },
  },
} as const;

type MoneyOnboardingRouteProp = RouteProp<
  RootStackParamList,
  'MoneyOnboarding'
>;
interface OnboardingTextContent {
  title: string;
  content: string;
  footer: string;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  textGroup: {
    position: 'absolute',
  },
  title: {
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  content: {
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  footerContainer: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
  footer: {
    opacity: 0.7,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
});

// Used if user accessing onboarding BEFORE apy is loaded from balance service.
const FALLBACK_APY = 4;

const MoneyOnboardingTextOverlay = ({
  content,
  opacity,
}: {
  content?: OnboardingTextContent;
  opacity: SharedValue<number>;
}) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const isSmallScreen =
    width <= SMALL_OVERLAY_DEVICE_MAX_WIDTH ||
    height < SMALL_OVERLAY_DEVICE_MAX_HEIGHT;
  const overlayTextPreset = useMemo(
    () =>
      isSmallScreen ? OVERLAY_TEXT_PRESETS.small : OVERLAY_TEXT_PRESETS.default,
    [isSmallScreen],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animatedStyle]}
    >
      {content && (
        <>
          <View
            style={[
              styles.textGroup,
              {
                top: insets.top + HEADER_TOP_OFFSET,
              },
            ]}
          >
            <Text
              color={TextColor.OverlayInverse}
              fontWeight={FontWeight.Bold}
              numberOfLines={3}
              style={[styles.title, overlayTextPreset.title]}
              testID={MoneyOnboardingViewTestIds.OVERLAY_TITLE}
              variant={TextVariant.HeadingLg}
            >
              {content.title}
            </Text>
            <Text
              color={TextColor.OverlayInverse}
              numberOfLines={3}
              style={[styles.content, overlayTextPreset.content]}
              testID={MoneyOnboardingViewTestIds.OVERLAY_CONTENT}
              variant={TextVariant.BodyMd}
            >
              {content.content}
            </Text>
          </View>
          <View
            style={[
              styles.footerContainer,
              {
                bottom: insets.bottom + FOOTER_BOTTOM_OFFSET,
              },
            ]}
          >
            <Text
              color={TextColor.OverlayInverse}
              numberOfLines={1}
              style={[styles.footer, overlayTextPreset.footer]}
              testID={MoneyOnboardingViewTestIds.OVERLAY_FOOTER}
              variant={TextVariant.BodyXs}
            >
              {content.footer}
            </Text>
          </View>
        </>
      )}
    </Animated.View>
  );
};

const MoneyOnboardingView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<MoneyOnboardingRouteProp>();
  const postOnboardingRedirect = route.params?.postOnboardingRedirect;

  const isUsUnauthenticatedNonCardholder = useSelector(
    selectIsUsUnauthenticatedNonCardholder,
  );

  const dispatch = useDispatch();

  const { trackOnboardingEvent } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_ONBOARDING,
    component_name: COMPONENT_NAMES.RIVE_ONBOARDING_STEPPER,
  });

  const { apyPercent } = useMoneyAccountBalance();
  const { initiateDeposit } = useMoneyAccountDeposit();

  const [ref, riveRef] = useRive();

  const stepRef = useRef(0);
  const [overlayStep, setOverlayStep] = useState(0);
  const overlayOpacity = useSharedValue(0);

  const [, setButtonText] = useRiveString(riveRef, 'button');
  const [, setTransitionSpeed] = useRiveNumber(riveRef, 'transitionSpeed');

  // Hardcoded to English to simplify event tracking.
  const stepTitlesEnglish: string[] = useMemo(
    () => [
      strings('money.rive_onboarding.step1_title', { locale: 'en' }),
      strings('money.rive_onboarding.step2_title', { locale: 'en' }),
      strings('money.rive_onboarding.step3_title', { locale: 'en' }),
      strings('money.rive_onboarding.step4_title', { locale: 'en' }),
      '', // Final step doesn't have a title.
    ],
    [],
  );

  const stepContent: OnboardingTextContent[] = useMemo(
    () => [
      {
        title: strings('money.rive_onboarding.step1_title'),
        content: strings('money.rive_onboarding.step1_body', {
          percentage: apyPercent ?? FALLBACK_APY,
        }),
        footer: strings('money.rive_onboarding.step1_footer_text'),
      },
      {
        title: strings('money.rive_onboarding.step2_title'),
        content: strings('money.rive_onboarding.step2_body'),
        footer: strings('money.rive_onboarding.step2_footer_text'),
      },
      {
        title: strings('money.rive_onboarding.step3_title'),
        content: strings(
          isUsUnauthenticatedNonCardholder
            ? 'money.rive_onboarding.step3_body_card_ineligible'
            : 'money.rive_onboarding.step3_body_card_eligible',
          {
            percentage: CARD_CASHBACK_PERCENTAGE,
          },
        ),
        footer: strings('money.rive_onboarding.step3_footer_text'),
      },
      {
        title: strings('money.rive_onboarding.step4_title'),
        content: strings('money.rive_onboarding.step4_body'),
        footer: strings('money.rive_onboarding.step4_footer_text'),
      },
    ],
    [apyPercent, isUsUnauthenticatedNonCardholder],
  );

  useEffect(() => {
    if (!riveRef) return;

    // Config
    setTransitionSpeed(300);
    setButtonText(strings('money.rive_onboarding.button_text'));
    overlayOpacity.set(
      withTiming(1, {
        duration: OVERLAY_FADE_DURATION_MS,
      }),
    );
  }, [riveRef, setTransitionSpeed, setButtonText, overlayOpacity]);

  const navigateToMoneyHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const navigateToPostOnboardingDestination = useCallback(async () => {
    if (
      postOnboardingRedirect?.type !== MoneyPostOnboardingRedirectType.DEPOSIT
    ) {
      navigateToMoneyHome();
      return;
    }

    try {
      await initiateDeposit({
        preferredPaymentToken: postOnboardingRedirect.preferredPaymentToken,
        replaceConfirmation: true,
      });
    } catch (error) {
      Logger.error(
        error as Error,
        '[Money Account] Failed to initiate deposit after onboarding',
      );
    }
  }, [initiateDeposit, navigateToMoneyHome, postOnboardingRedirect]);

  const postOnboardingRedirectTarget =
    postOnboardingRedirect?.type === MoneyPostOnboardingRedirectType.DEPOSIT
      ? SCREEN_NAMES.MONEY_DEPOSIT
      : SCREEN_NAMES.MONEY_HOME;

  const handleClose = useCallback(
    (stepIndex: number) => {
      playImpact(ImpactMoment.PageNavigation);
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.EXITED,
        redirect_target: postOnboardingRedirectTarget,
      });

      dispatch(setMoneyOnboardingSeen(true));
      return navigateToPostOnboardingDestination();
    },
    [
      dispatch,
      navigateToPostOnboardingDestination,
      postOnboardingRedirectTarget,
      stepTitlesEnglish,
      trackOnboardingEvent,
    ],
  );

  const handleStepViewed = useCallback(
    (stepIndex: number) => {
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    },
    [stepTitlesEnglish, trackOnboardingEvent],
  );

  const handleComplete = useCallback(
    (stepIndex: number) => {
      dispatch(setMoneyOnboardingSeen(true));
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
        redirect_target: postOnboardingRedirectTarget,
      });

      return navigateToPostOnboardingDestination();
    },
    [
      dispatch,
      navigateToPostOnboardingDestination,
      postOnboardingRedirectTarget,
      stepTitlesEnglish,
      trackOnboardingEvent,
    ],
  );

  useRiveTrigger(riveRef, CLOSE_TRIGGER, () => {
    handleClose(stepRef.current);
  });

  const handleStateChanged = useCallback(
    (_stateMachineName: string, stateName: string) => {
      if (RIVE_TRANSITION_STATES.has(stateName)) {
        playImpact(ImpactMoment.PageNavigation);
        overlayOpacity.set(
          withTiming(0, {
            duration: OVERLAY_FADE_DURATION_MS,
          }),
        );
        return;
      }

      const stepIndex = RIVE_STATE_TO_STEP_INDEX[stateName];

      if (stepIndex !== undefined) {
        stepRef.current = stepIndex;

        if (stepContent[stepIndex]) {
          setOverlayStep(stepIndex);
          overlayOpacity.set(
            withTiming(1, {
              duration: OVERLAY_FADE_DURATION_MS,
            }),
          );
        }

        handleStepViewed(stepIndex);
      }

      if (stateName === RIVE_STEP_NAMES.FINAL_STATE) {
        handleComplete(stepRef.current);
      }
    },
    [handleStepViewed, handleComplete, overlayOpacity, stepContent],
  );

  const handleError = useCallback(
    (riveError: RNRiveError) => {
      Logger.error(
        new Error(
          `MoneyOnboardingView: Rive error: ${riveError.message} - ${riveError.type}`,
        ),
      );
      dispatch(setMoneyOnboardingSeen(true));
      navigateToMoneyHome();
    },
    [dispatch, navigateToMoneyHome],
  );

  return (
    <View style={styles.root}>
      <Rive
        ref={ref}
        source={onboardingFlowV24Animation}
        artboardName={RIVE_ARTBOARD_NAME}
        stateMachineName={RIVE_STATE_MACHINE_NAME}
        dataBinding={AutoBind(true)}
        fit={Fit.Layout}
        layoutScaleFactor={PixelRatio.get()}
        onStateChanged={handleStateChanged}
        onError={handleError}
        style={StyleSheet.absoluteFillObject}
        testID={MoneyOnboardingViewTestIds.RIVE_ANIMATION}
      />
      <MoneyOnboardingTextOverlay
        content={stepContent[overlayStep]}
        opacity={overlayOpacity}
      />
    </View>
  );
};

export default MoneyOnboardingView;
