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
  useRive,
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
  Modal,
  PixelRatio,
  Pressable,
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
import { scheduleOnRN } from 'react-native-worklets';
import Logger from '../../../../../util/Logger';
import moneyOnboardingRoundedButtons from '../../../../../animations/money_onboarding_rounded_buttons.riv';
import { MoneyPostOnboardingRedirectType } from '../../types/navigation';
import { isE2EOrPerformanceTest } from '../../../../../util/test/utils';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';

/**
 * State machine constants must match the Rive file authored for this animation.
 * Update these if the Rive file's state machine or trigger names change.
 */
const RIVE_STATE_MACHINE_NAME = 'State Machine 1';
const RIVE_ARTBOARD_NAME = 'Money_Account';
const CARD_CASHBACK_PERCENTAGE = 3;
const CLOSE_TRIGGER = 'close';
const ONBOARDING_COMPLETED_TRIGGER = 'onboardingCompleted';

/** Data binding holding the full APY, percent sign included, e.g. "4.6%". */
const RIVE_APY_VALUE_PATH = 'apyValue';

/**
 * Data binding holding how many digits that APY has, which the artboard uses
 * to pick the layout for its APY container on the second step.
 */
const RIVE_APY_AMOUNT_DIGIT_PATH = 'apyAmountDigit';
const RIVE_CURRENT_STEP_PATH = 'currentStep';

/**
 * Steps are authored in the Rive file as 1-based values: UI1 (1), APY (2),
 * Card (3), Coins (4), and FinalState (5).
 */
const FINAL_STEP_INDEX = 4;
const TOTAL_ONBOARDING_STEPS = FINAL_STEP_INDEX + 1;

/** Transition speed passed to the Rive artboard. */
const RIVE_TRANSITION_SPEED = 300;

const TEXT_OVERLAY_DISPLAY_FALLBACK_DELAY_MS = 2500;

const OVERLAY_FADE_DURATION_MS = 600;
const SMALL_OVERLAY_DEVICE_MAX_WIDTH = 375;
const SMALL_OVERLAY_DEVICE_MAX_HEIGHT = 700;
const HEADER_TOP_OFFSET = 75;
const FOOTER_BOTTOM_OFFSET = 90;
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
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    // Matches the Rive X button hit area; large enough to be reliably tappable
    height: 80,
    width: 80,
  },
  riveHidden: {
    opacity: 0,
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
    paddingTop: 16,
    textAlign: 'center',
  },
});

// Used if user accessing onboarding BEFORE apy is loaded from balance service.
const FALLBACK_APY = 4;

const MoneyOnboardingTextOverlay = ({
  content,
  opacity,
  isVisible,
}: {
  content?: OnboardingTextContent;
  opacity: SharedValue<number>;
  isVisible: boolean;
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

  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
    }),
    [],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, animatedStyle]}
      testID={MoneyOnboardingViewTestIds.OVERLAY_CONTAINER}
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
  const analyticsContext = route.params?.analyticsContext;

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

  const [isRiveReady, setIsRiveReady] = useState(false);
  const { riveViewRef, setHybridRef } = useRive();
  const { riveFile } = useRiveFile(moneyOnboardingRoundedButtons);
  // VM instance is created off the file (async) and bound via `dataBind`
  // (replaces the legacy `AutoBind(true)` mode).
  const { instance } = useViewModelInstance(riveFile, {
    artboardName: RIVE_ARTBOARD_NAME,
    async: true,
  });

  const currentStepRef = useRef(0);
  const hasObservedCurrentStepRef = useRef(false);
  const hasCompletedOnboardingRef = useRef(false);
  const [overlayStep, setOverlayStep] = useState(0);
  const overlayOpacity = useSharedValue(1);

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
  const { value: currentStep, error: currentStepError } = useRiveNumber(
    RIVE_CURRENT_STEP_PATH,
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
    setTransitionSpeed(RIVE_TRANSITION_SPEED);
    setButtonText(strings('money.rive_onboarding.button_text'));
  }, [instance, setTransitionSpeed, setButtonText]);

  // Kept out of the config effect above so a rate change re-pushes the APY
  // without replaying the one-off setup.
  useEffect(() => {
    if (!instance) return;

    setApyValue(riveApyValue);
    setApyAmountDigit(apyDigitCount(riveApyValue));
  }, [instance, riveApyValue, setApyValue, setApyAmountDigit]);

  // The native view reports ready once the artboard, state machine and data
  // binding are configured.
  useEffect(() => {
    if (riveViewRef) setIsRiveReady(true);
  }, [riveViewRef]);

  // Fallback for when the Rive file is not loaded in time.
  useEffect(() => {
    if (!riveFile) return;
    const timeoutId = setTimeout(
      () => setIsRiveReady(true),
      TEXT_OVERLAY_DISPLAY_FALLBACK_DELAY_MS,
    );
    return () => clearTimeout(timeoutId);
  }, [riveFile]);

  const navigateToMoneyHome = useCallback(() => {
    navigation.navigate(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: {
          screen: Routes.MONEY.HOME,
          ...(analyticsContext ? { params: { analyticsContext } } : {}),
        },
      },
      { pop: true },
    );
  }, [analyticsContext, navigation]);

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
        ...(postOnboardingRedirect.autoSelectFiatPayment !== undefined
          ? {
              autoSelectFiatPayment:
                postOnboardingRedirect.autoSelectFiatPayment,
            }
          : {}),
        ...(postOnboardingRedirect.intent
          ? { intent: postOnboardingRedirect.intent }
          : {}),
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

  const handleModalRequestClose = useCallback(() => {
    handleClose(currentStepRef.current);
  }, [handleClose]);

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
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
        redirect_target: postOnboardingRedirectTarget,
      });

      dispatch(setMoneyOnboardingSeen(true));
      navigateToPostOnboardingDestination();
    },
    [
      dispatch,
      navigateToPostOnboardingDestination,
      postOnboardingRedirectTarget,
      stepTitlesEnglish,
      trackOnboardingEvent,
    ],
  );

  useEffect(() => {
    if (currentStepError) {
      Logger.error(
        currentStepError,
        '[Money Account] Failed to bind onboarding current step',
      );
    }
  }, [currentStepError]);

  const handleOnboardingCompleted = useCallback(() => {
    if (hasCompletedOnboardingRef.current) {
      return;
    }
    if (
      !hasObservedCurrentStepRef.current ||
      currentStepRef.current !== FINAL_STEP_INDEX
    ) {
      Logger.error(
        new Error(
          'MoneyOnboardingView: onboardingCompleted fired before the final step',
        ),
      );
      return;
    }

    hasCompletedOnboardingRef.current = true;
    handleComplete(currentStepRef.current);
  }, [handleComplete]);

  const handleOverlayFadeOutComplete = useCallback(
    (stepIndex: number) => {
      if (currentStepRef.current !== stepIndex) {
        return;
      }

      setOverlayStep(stepIndex);
      overlayOpacity.set(
        withTiming(1, {
          duration: OVERLAY_FADE_DURATION_MS,
        }),
      );
    },
    [overlayOpacity],
  );

  useEffect(() => {
    if (
      currentStep === undefined ||
      !Number.isInteger(currentStep) ||
      currentStep < 1 ||
      currentStep > TOTAL_ONBOARDING_STEPS
    ) {
      return;
    }

    const stepIndex = currentStep - 1;
    const isInitialStep = !hasObservedCurrentStepRef.current;
    if (!isInitialStep && currentStepRef.current === stepIndex) {
      return;
    }

    currentStepRef.current = stepIndex;
    hasObservedCurrentStepRef.current = true;

    if (!isInitialStep) {
      playImpact(ImpactMoment.PageNavigation);
    }

    if (isInitialStep) {
      if (stepContent[stepIndex]) {
        setOverlayStep(stepIndex);
      }
      overlayOpacity.set(stepContent[stepIndex] ? 1 : 0);
    } else {
      overlayOpacity.set(
        withTiming(0, { duration: OVERLAY_FADE_DURATION_MS }, (finished) => {
          if (finished && stepContent[stepIndex]) {
            scheduleOnRN(handleOverlayFadeOutComplete, stepIndex);
          }
        }),
      );
    }

    handleStepViewed(stepIndex);
  }, [
    currentStep,
    handleOverlayFadeOutComplete,
    handleStepViewed,
    overlayOpacity,
    stepContent,
  ]);

  useRiveTrigger(CLOSE_TRIGGER, instance, {
    onTrigger: () => {
      handleClose(currentStepRef.current);
    },
  });

  useRiveTrigger(ONBOARDING_COMPLETED_TRIGGER, instance, {
    onTrigger: handleOnboardingCompleted,
  });

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
    <Modal
      testID={MoneyOnboardingViewTestIds.MODAL}
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      animationType="fade"
      onRequestClose={handleModalRequestClose}
      transparent
    >
      <ModalSafeAreaProvider>
        <View style={styles.root}>
          {riveFile && instance && (
            <RiveView
              file={riveFile}
              hybridRef={setHybridRef}
              artboardName={RIVE_ARTBOARD_NAME}
              stateMachineName={RIVE_STATE_MACHINE_NAME}
              dataBind={instance}
              autoPlay
              fit={Fit.Layout}
              layoutScaleFactor={PixelRatio.get()}
              onError={handleError}
              style={[
                StyleSheet.absoluteFill,
                !isRiveReady && styles.riveHidden,
              ]}
              testID={MoneyOnboardingViewTestIds.RIVE_ANIMATION}
            />
          )}
          <MoneyOnboardingTextOverlay
            content={stepContent[overlayStep]}
            opacity={overlayOpacity}
            isVisible={isRiveReady}
          />
          <Pressable
            onPress={handleModalRequestClose}
            style={styles.closeButton}
            testID={MoneyOnboardingViewTestIds.CLOSE_BUTTON}
          />
        </View>
      </ModalSafeAreaProvider>
    </Modal>
  );
};

// Used in E2E and performance tests to complete onboarding without rendering Rive.
const MoneyOnboardingViewE2E = () => {
  const dispatch = useDispatch();

  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<MoneyOnboardingRouteProp>();
  const postOnboardingRedirect = route.params?.postOnboardingRedirect;
  const { initiateDeposit } = useMoneyAccountDeposit();

  const navigateToMoneyHome = useCallback(() => {
    navigation.navigate(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      },
      { pop: true },
    );
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
        ...(postOnboardingRedirect.autoSelectFiatPayment !== undefined
          ? {
              autoSelectFiatPayment:
                postOnboardingRedirect.autoSelectFiatPayment,
            }
          : {}),
        ...(postOnboardingRedirect.intent
          ? { intent: postOnboardingRedirect.intent }
          : {}),
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

  const completeOnboardingAndRedirect = useCallback(() => {
    dispatch(setMoneyOnboardingSeen(true));
    navigateToPostOnboardingDestination();
  }, [dispatch, navigateToPostOnboardingDestination]);

  useEffect(() => {
    completeOnboardingAndRedirect();
  }, [completeOnboardingAndRedirect]);

  return null;
};

const MoneyOnboardingViewGate = () => {
  if (isE2EOrPerformanceTest) {
    return <MoneyOnboardingViewE2E />;
  }
  return <MoneyOnboardingView />;
};

export default MoneyOnboardingViewGate;
