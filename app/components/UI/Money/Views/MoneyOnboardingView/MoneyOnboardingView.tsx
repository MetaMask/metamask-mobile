import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { type StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
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
import { useTheme } from '../../../../../util/theme';
import { setMoneyOnboardingSeen } from '../../../../../actions/user';
import { AppThemeKey } from '../../../../../util/theme/models';

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

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  riveAnimation: {
    flex: 1,
    top: 100,
  },
});

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

  const { colors, themeAppearance } = useTheme();

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
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        buttonLabel: strings('money.rive_onboarding.continue'),
      },
      {
        title: strings('money.rive_onboarding.step4_title'),
        body: strings('money.rive_onboarding.step4_body'),
        durationMs: MONEY_ONBOARDING_STEP_DURATION_MS,
        buttonLabel: strings('money.rive_onboarding.continue'),
      },
      {
        durationMs: 4 * 1000, // 4 seconds
        showCloseButton: false,
      },
    ],
    [apyPercent],
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleComplete = useCallback(() => {
    dispatch(setMoneyOnboardingSeen(true));
    navigation.replace(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [dispatch, navigation]);

  const renderBackground = useCallback(
    () => (
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.gradient}
      />
    ),
    [],
  );

  return (
    <RiveOnboardingStepper
      steps={steps}
      riveConfig={RIVE_CONFIG}
      riveStyle={styles.riveAnimation}
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
      autoCompleteOnLastStep
    />
  );
};

export default MoneyOnboardingView;
