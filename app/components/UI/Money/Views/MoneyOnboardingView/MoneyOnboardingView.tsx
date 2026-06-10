import React, { useCallback, useMemo } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { type StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import {
  ButtonVariant,
  IconColor,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import RiveOnboardingStepper, {
  type OnboardingStep,
  type RiveConfig,
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
    <RiveOnboardingStepper
      steps={steps}
      riveConfig={RIVE_CONFIG}
      riveStyle={RIVE_ANIMATION_STYLE}
      renderBackground={renderBackground}
      titleTextColor={textColor}
      bodyTextColor={textColor}
      footerTextColor={footerTextColor}
      progressBarColor={progressBarColor}
      buttonVariant={ButtonVariant.Primary}
      buttonIsInverse={buttonIsInverse}
      closeButtonIconColor={iconColor}
      onClose={handleClose}
      onComplete={handleComplete}
      onStepViewed={handleStepViewed}
      autoCompleteOnLastStep
      enableRiveAnimation={isStepperAnimationEnabled}
    />
  );
};

export default MoneyOnboardingView;
