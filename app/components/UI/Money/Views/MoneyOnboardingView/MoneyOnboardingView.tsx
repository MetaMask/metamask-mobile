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
import useMoneyVaultApy from '../../hooks/useMoneyVaultApy';
import { apyDigitCount } from '../../utils/riveApy';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import { setMoneyOnboardingSeen } from '../../../../../actions/user';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { ImpactMoment, playImpact } from '../../../../../util/haptics';
import {
  Fit,
  RiveErrorType,
  RiveView,
  useRiveFile,
  useRiveNumber,
  useRiveString,
  useRiveTrigger,
  useViewModelInstance,
  type RiveError,
} from '@rive-app/react-native';
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
import onboardingFlowV25Animation from '../../../../../animations/onboarding_flow_v25.riv';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';

/**
 * State machine constants must match the Rive file authored for this animation.
 * Update these if the Rive file's state machine or trigger names change.
 */
const RIVE_STATE_MACHINE_NAME = 'State Machine 1';
const RIVE_ARTBOARD_NAME = 'Money_Account';
const CARD_CASHBACK_PERCENTAGE = 3;
const CLOSE_TRIGGER = 'close';
const CONTINUE_TRIGGER = 'continue';
const BACK_TRIGGER = 'back';

/** Data binding holding the full APY, percent sign included, e.g. "4.6%". */
const RIVE_APY_VALUE_PATH = 'apyValue';

/**
 * Data binding holding how many digits that APY has, which the artboard uses
 * to pick the layout for its APY container on the second step.
 */
const RIVE_APY_AMOUNT_DIGIT_PATH = 'apyAmountDigit';

/**
 * Steps as authored in the Rive file: UI1 (0), APY (1), Card (2), Coins (3)
 * and FinalState (4). The Nitro runtime has no `onStateChanged`, so the
 * current step is reconstructed from the artboard's `continue`/`back`
 * view-model triggers instead of the reported state names.
 */
const FINAL_STEP_INDEX = 4;
const TOTAL_ONBOARDING_STEPS = FINAL_STEP_INDEX + 1;

/**
 * Matches the transition speed pushed to the artboard (`setTransitionSpeed`).
 * With no `onStateChanged` to observe the transition finishing, the overlay
 * copy swap, VIEWED tracking, and final-step completion are timed to the
 * authored transition instead.
 */
const STEP_TRANSITION_MS = 300;
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

  const { apyPercent, apyPercentFormatted } = useMoneyVaultApy();
  const riveApyValue = apyPercentFormatted ?? `${FALLBACK_APY}%`;
  const { initiateDeposit } = useMoneyAccountDeposit();

  const { riveFile } = useRiveFile(onboardingFlowV25Animation);
  // VM instance is created off the file (async) and bound via `dataBind`
  // (replaces the legacy `AutoBind(true)` mode).
  const { instance } = useViewModelInstance(riveFile, {
    artboardName: RIVE_ARTBOARD_NAME,
    async: true,
  });

  const stepRef = useRef(0);
  const [overlayStep, setOverlayStep] = useState(0);
  const overlayOpacity = useSharedValue(0);

  const { setValue: setButtonText } = useRiveString('button', instance);
  const { setValue: setTransitionSpeed } = useRiveNumber(
    'transitionSpeed',
    instance,
  );
  const { setValue: setApyValue } = useRiveString(
    RIVE_APY_VALUE_PATH,
    instance,
  );
  const { setValue: setApyAmountDigit } = useRiveNumber(
    RIVE_APY_AMOUNT_DIGIT_PATH,
    instance,
  );

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
    if (!instance) return;

    // Config
    setTransitionSpeed(STEP_TRANSITION_MS);
    setButtonText(strings('money.rive_onboarding.button_text'));
    overlayOpacity.set(
      withTiming(1, {
        duration: OVERLAY_FADE_DURATION_MS,
      }),
    );
  }, [instance, setTransitionSpeed, setButtonText, overlayOpacity]);

  // Kept out of the config effect above so a rate change re-pushes the APY
  // without replaying the one-off setup.
  useEffect(() => {
    if (!instance) return;

    setApyValue(riveApyValue);
    setApyAmountDigit(apyDigitCount(riveApyValue));
  }, [instance, riveApyValue, setApyValue, setApyAmountDigit]);

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
        onDepositSetupFailure: navigateToMoneyHome,
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
    async (stepIndex: number) => {
      playImpact(ImpactMoment.PageNavigation);
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.EXITED,
        redirect_target: postOnboardingRedirectTarget,
      });

      dispatch(setMoneyOnboardingSeen(true));
      await navigateToPostOnboardingDestination();
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
    async (stepIndex: number) => {
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
        redirect_target: postOnboardingRedirectTarget,
      });

      dispatch(setMoneyOnboardingSeen(true));
      await navigateToPostOnboardingDestination();
    },
    [
      dispatch,
      navigateToPostOnboardingDestination,
      postOnboardingRedirectTarget,
      stepTitlesEnglish,
      trackOnboardingEvent,
    ],
  );

  // Legacy tracked the first VIEWED when `onStateChanged` reported the initial
  // `UI1` state; Nitro exposes no such signal, so it's tracked once the
  // view-model instance is bound.
  const hasTrackedInitialStepRef = useRef(false);
  useEffect(() => {
    if (!instance || hasTrackedInitialStepRef.current) return;
    hasTrackedInitialStepRef.current = true;
    handleStepViewed(0);
  }, [instance, handleStepViewed]);

  // Step navigation. The artboard owns the actual slide transitions; RN
  // observes the `continue`/`back` view-model triggers to mirror the step
  // index. The overlay fades out immediately (as the authored transition
  // starts) and the copy swap / VIEWED tracking / completion fire once the
  // transition has had time to finish.
  const stepTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(
    () => () => {
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    },
    [],
  );

  const goToStep = useCallback(
    (nextStep: number) => {
      stepRef.current = nextStep;
      playImpact(ImpactMoment.PageNavigation);
      overlayOpacity.set(
        withTiming(0, {
          duration: OVERLAY_FADE_DURATION_MS,
        }),
      );
      if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
      stepTimerRef.current = setTimeout(() => {
        if (stepContent[nextStep]) {
          setOverlayStep(nextStep);
          overlayOpacity.set(
            withTiming(1, {
              duration: OVERLAY_FADE_DURATION_MS,
            }),
          );
        }

        handleStepViewed(nextStep);

        if (nextStep === FINAL_STEP_INDEX) {
          handleComplete(nextStep);
        }
      }, STEP_TRANSITION_MS);
    },
    [handleStepViewed, handleComplete, overlayOpacity, stepContent],
  );

  const handleContinue = useCallback(() => {
    if (stepRef.current >= FINAL_STEP_INDEX) return;
    goToStep(stepRef.current + 1);
  }, [goToStep]);

  const handleBack = useCallback(() => {
    if (stepRef.current === 0) return;
    goToStep(stepRef.current - 1);
  }, [goToStep]);

  useRiveTrigger(CLOSE_TRIGGER, instance, {
    onTrigger: () => {
      handleClose(stepRef.current);
    },
  });
  useRiveTrigger(CONTINUE_TRIGGER, instance, { onTrigger: handleContinue });
  useRiveTrigger(BACK_TRIGGER, instance, { onTrigger: handleBack });

  const handleError = useCallback(
    (riveError: RiveError) => {
      Logger.error(
        new Error(
          `MoneyOnboardingView: Rive error: ${riveError.message} - ${
            RiveErrorType[riveError.type]
          }`,
        ),
      );
      dispatch(setMoneyOnboardingSeen(true));
      navigateToMoneyHome();
    },
    [dispatch, navigateToMoneyHome],
  );

  return (
    <View style={styles.root}>
      {riveFile && instance && (
        <RiveView
          file={riveFile}
          artboardName={RIVE_ARTBOARD_NAME}
          stateMachineName={RIVE_STATE_MACHINE_NAME}
          dataBind={instance}
          autoPlay
          fit={Fit.Layout}
          layoutScaleFactor={PixelRatio.get()}
          onError={handleError}
          style={StyleSheet.absoluteFillObject}
          testID={MoneyOnboardingViewTestIds.RIVE_ANIMATION}
        />
      )}
      <MoneyOnboardingTextOverlay
        content={stepContent[overlayStep]}
        opacity={overlayOpacity}
      />
    </View>
  );
};

export default MoneyOnboardingView;
