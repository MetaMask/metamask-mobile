import React, { useCallback, useEffect, useMemo } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { type StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { IconColor, TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type {
  OnboardingStep,
  RiveConfig,
} from '../../../RiveOnboardingStepper';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';
import { useTheme } from '../../../../../util/theme';
import { setMoneyOnboardingSeen } from '../../../../../actions/user';
import { AppThemeKey } from '../../../../../util/theme/models';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';

/** RiveOnboarding Imports */
import Rive, {
  AutoBind,
  useRive,
  useRiveString,
  useRiveNumber,
  Fit,
} from 'rive-react-native';
import { PixelRatio } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const MoneyOnboardingAnimationV3 = require('../../../../../animations/money_account_onboarding_animation_v3.riv');
const RIVE_STATE_MACHINE_NAME_V2 = 'State Machine 1';
const CARD_CASHBACK_PERCENTAGE_V2 = 3;

const RIVE_STATE_TO_STEP_INDEX: Record<string, number> = {
  UI1: 0,
  UI2: 1,
  UI3: 2,
  UI4: 3,
};

interface RiveOnboardingProps {
  onStepViewed: (stepIndex: number) => void;
  onComplete: (stepIndex: number) => void;
}

const RiveOnboarding = ({ onStepViewed, onComplete }: RiveOnboardingProps) => {
  const { apyPercent } = useMoneyAccountBalance();
  const [ref, riveRef] = useRive();

  // --- Text runs (stepText1–4: title, content, footer) ---
  const [, setStep1Title] = useRiveString(riveRef, 'stepText1/title');
  const [, setStep1Content] = useRiveString(riveRef, 'stepText1/content');
  const [, setStep1Footer] = useRiveString(riveRef, 'stepText1/footer');

  const [, setStep2Title] = useRiveString(riveRef, 'stepText2/title');
  const [, setStep2Content] = useRiveString(riveRef, 'stepText2/content');
  const [, setStep2Footer] = useRiveString(riveRef, 'stepText2/footer');

  const [, setStep3Title] = useRiveString(riveRef, 'stepText3/title');
  const [, setStep3Content] = useRiveString(riveRef, 'stepText3/content');
  const [, setStep3Footer] = useRiveString(riveRef, 'stepText3/footer');

  const [, setStep4Title] = useRiveString(riveRef, 'stepText4/title');
  const [, setStep4Content] = useRiveString(riveRef, 'stepText4/content');
  const [, setStep4Footer] = useRiveString(riveRef, 'stepText4/footer');

  // --- Number inputs ---
  const [, setTransitionSpeed] = useRiveNumber(riveRef, 'transitionSpeed');
  const [, setCoinSeq] = useRiveNumber(riveRef, 'coinSeq');
  const [, setCardSeq] = useRiveNumber(riveRef, 'cardSeq');

  useEffect(() => {
    if (!riveRef) return;

    setStep1Title(strings('money.rive_onboarding.step1_title'));
    setStep1Content(
      strings('money.rive_onboarding.step1_body', { percentage: apyPercent }),
    );
    setStep1Footer(strings('money.rive_onboarding.step1_footer_text'));

    setStep2Title(strings('money.rive_onboarding.step2_title'));
    setStep2Content(strings('money.rive_onboarding.step2_body'));
    setStep2Footer(strings('money.rive_onboarding.step2_footer_text'));

    setStep3Title(strings('money.rive_onboarding.step3_title'));
    setStep3Content(
      strings('money.rive_onboarding.step3_body', {
        percentage: CARD_CASHBACK_PERCENTAGE_V2,
      }),
    );
    setStep3Footer(strings('money.rive_onboarding.step3_footer_text'));

    setStep4Title(strings('money.rive_onboarding.step4_title'));
    setStep4Content(strings('money.rive_onboarding.step4_body'));
    setStep4Footer(strings('money.rive_onboarding.step4_footer_text'));

    setTransitionSpeed(300);
    setCoinSeq(0);
    setCardSeq(0);
  }, [
    riveRef,
    apyPercent,
    setStep1Title,
    setStep1Content,
    setStep1Footer,
    setStep2Title,
    setStep2Content,
    setStep2Footer,
    setStep3Title,
    setStep3Content,
    setStep3Footer,
    setStep4Title,
    setStep4Content,
    setStep4Footer,
    setTransitionSpeed,
    setCoinSeq,
    setCardSeq,
  ]);

  const handleStateChanged = useCallback(
    (_stateMachineName: string, stateName: string) => {
      const stepIndex = RIVE_STATE_TO_STEP_INDEX[stateName];
      if (stepIndex !== undefined) {
        onStepViewed(stepIndex);
        return;
      }

      if (stateName === 'FinalState') {
        onComplete(3);
      }
    },
    [onStepViewed, onComplete],
  );

  return (
    <Rive
      ref={ref}
      source={MoneyOnboardingAnimationV3}
      artboardName="Money_Account"
      stateMachineName={RIVE_STATE_MACHINE_NAME_V2}
      dataBinding={AutoBind(true)}
      fit={Fit.Layout}
      layoutScaleFactor={PixelRatio.get()}
      onStateChanged={handleStateChanged}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const MoneyOnboardingAnimation = require('../../../../../animations/money_account_onboarding_animation.riv');

/**
 * State machine constants must match the Rive file authored for this animation.
 * Update these if the Rive file's state machine or trigger names change.
 */
const RIVE_STATE_MACHINE_NAME = 'State Machine 1';
const RIVE_TRIGGER_NAME = 'Trig';

// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const GRADIENT_COLORS = ['#190066', '#3F6FD0'];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 0, y: 1 };

const CARD_CASHBACK_PERCENTAGE = 3;

const RIVE_ANIMATION_STYLE = { flex: 1, top: 100 };

const RIVE_CONFIG: RiveConfig = {
  source: MoneyOnboardingAnimation,
  stateMachineName: RIVE_STATE_MACHINE_NAME,
  triggerName: RIVE_TRIGGER_NAME,
};

export const MONEY_ONBOARDING_STEP_DURATION_MS = 4 * 1000; // 4 seconds

const MoneyOnboardingView = () => {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();

  const dispatch = useDispatch();

  const { trackOnboardingEvent } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_ONBOARDING,
    component_name: COMPONENT_NAMES.RIVE_ONBOARDING_STEPPER,
  });

  const { colors, themeAppearance } = useTheme();

  const isStepperAnimationEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );

  const tw = useTailwind();

  const isDarkTheme = themeAppearance === AppThemeKey.dark;

  const progressBarColor = isDarkTheme
    ? colors.primary.default
    : colors.primary.inverse;

  // Title and text color
  const textColor = isDarkTheme
    ? TextColor.TextDefault
    : TextColor.PrimaryInverse;

  const footerTextColor = isDarkTheme
    ? TextColor.TextDefault
    : TextColor.PrimaryInverse;

  const iconColor = isDarkTheme
    ? IconColor.IconDefault
    : IconColor.PrimaryInverse;

  const buttonIsInverse = !isDarkTheme;

  const { apyPercent } = useMoneyAccountBalance();

  const steps: OnboardingStep[] = useMemo(
    () => [
      {
        title: strings('money.rive_onboarding.step1_title'),
        body: strings('money.rive_onboarding.step1_body', {
          percentage: apyPercent,
        }),
        footerText: strings('money.rive_onboarding.step1_footer_text'),
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        buttonLabel: strings('money.rive_onboarding.continue'),
      },
      {
        title: strings('money.rive_onboarding.step2_title'),
        body: strings('money.rive_onboarding.step2_body'),
        footerText: strings('money.rive_onboarding.step2_footer_text'),
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        buttonLabel: strings('money.rive_onboarding.continue'),
      },
      {
        title: strings('money.rive_onboarding.step3_title'),
        body: strings('money.rive_onboarding.step3_body', {
          percentage: CARD_CASHBACK_PERCENTAGE,
        }),
        footerText: strings('money.rive_onboarding.step3_footer_text'),
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        buttonLabel: strings('money.rive_onboarding.continue'),
      },
      {
        title: strings('money.rive_onboarding.step4_title'),
        body: strings('money.rive_onboarding.step4_body'),
        footerText: strings('money.rive_onboarding.step4_footer_text'),
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        buttonLabel: strings('money.rive_onboarding.continue'),
      },
      {
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        showCloseButton: false,
      },
    ],
    [apyPercent],
  );

  // Hardcoded to use English step titles to simplify event tracking.
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

  const handleClose = useCallback(
    (stepIndex: number) => {
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: steps.length,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.EXITED,
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      dispatch(setMoneyOnboardingSeen(true));
      navigation.navigate(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    },
    [
      dispatch,
      navigation,
      stepTitlesEnglish,
      steps.length,
      trackOnboardingEvent,
    ],
  );

  const handleStepViewed = useCallback(
    (stepIndex: number) => {
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: steps.length,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.VIEWED,
        redirect_target: SCREEN_NAMES.MONEY_ONBOARDING,
      });
    },
    [stepTitlesEnglish, steps.length, trackOnboardingEvent],
  );

  const handleComplete = useCallback(
    (stepIndex: number) => {
      dispatch(setMoneyOnboardingSeen(true));
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: steps.length,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.COMPLETED,
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      navigation.navigate(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    },
    [
      dispatch,
      navigation,
      stepTitlesEnglish,
      steps.length,
      trackOnboardingEvent,
    ],
  );

  const renderBackground = useCallback(
    () => (
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={tw`absolute inset-0`}
      />
    ),
    [tw],
  );

  return (
    <RiveOnboarding
      onStepViewed={handleStepViewed}
      onComplete={handleComplete}
    />
  );
};

export default MoneyOnboardingView;
