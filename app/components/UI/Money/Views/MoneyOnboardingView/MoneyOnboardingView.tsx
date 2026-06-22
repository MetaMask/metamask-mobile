import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { type StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { setMoneyOnboardingSeen } from '../../../../../actions/user';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import Rive, {
  AutoBind,
  useRive,
  useRiveString,
  useRiveNumber,
  Fit,
  useRiveTrigger,
} from 'rive-react-native';
import { MoneyOnboardingViewTestIds } from './MoneyOnboardingView.testIds';
import { selectIsUsUnauthenticatedNonCardholder } from '../../selectors/eligibility';
import { PixelRatio } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const MoneyOnboardingAnimationV6 = require('../../../../../animations/money_account_onboarding_animation_v6.riv');

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

const RIVE_STATE_TO_STEP_INDEX: Record<string, number> = {
  [RIVE_STEP_NAMES.UI1]: 0,
  [RIVE_STEP_NAMES.APY]: 1,
  [RIVE_STEP_NAMES.CARD]: 2,
  [RIVE_STEP_NAMES.COINS]: 3,
  [RIVE_STEP_NAMES.FINAL_STATE]: 4,
};

const TOTAL_ONBOARDING_STEPS = Object.keys(RIVE_STATE_TO_STEP_INDEX).length;

const MoneyOnboardingView = () => {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();

  const isUsUnauthenticatedNonCardholder = useSelector(
    selectIsUsUnauthenticatedNonCardholder,
  );

  const dispatch = useDispatch();

  const { trackOnboardingEvent } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_ONBOARDING,
    component_name: COMPONENT_NAMES.RIVE_ONBOARDING_STEPPER,
  });

  const { apyPercent } = useMoneyAccountBalance();

  const [ref, riveRef] = useRive();

  const stepRef = useRef(0);

  // --- Text runs (stepText1–4: title, content, footer) ---
  const [, setStep1Title] = useRiveString(riveRef, 'stepText1/title');
  const [, setStep1Content] = useRiveString(riveRef, 'stepText1/content');
  const [, setStep1Footer] = useRiveString(riveRef, 'stepText1/footer');
  const [, setStep1ButtonText] = useRiveString(riveRef, 'stepText1/button');

  const [, setStep2Title] = useRiveString(riveRef, 'stepText2/title');
  const [, setStep2Content] = useRiveString(riveRef, 'stepText2/content');
  const [, setStep2Footer] = useRiveString(riveRef, 'stepText2/footer');
  const [, setStep2ButtonText] = useRiveString(riveRef, 'stepText2/button');

  const [, setStep3Title] = useRiveString(riveRef, 'stepText3/title');
  const [, setStep3Content] = useRiveString(riveRef, 'stepText3/content');
  const [, setStep3Footer] = useRiveString(riveRef, 'stepText3/footer');
  const [, setStep3ButtonText] = useRiveString(riveRef, 'stepText3/button');

  const [, setStep4Title] = useRiveString(riveRef, 'stepText4/title');
  const [, setStep4Content] = useRiveString(riveRef, 'stepText4/content');
  const [, setStep4Footer] = useRiveString(riveRef, 'stepText4/footer');
  const [, setStep4ButtonText] = useRiveString(riveRef, 'stepText4/button');

  // --- Number inputs ---
  const [, setTransitionSpeed] = useRiveNumber(riveRef, 'transitionSpeed');
  const [, setCoinSeq] = useRiveNumber(riveRef, 'coinSeq');
  const [, setCardSeq] = useRiveNumber(riveRef, 'cardSeq');

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

  useEffect(() => {
    if (!riveRef) return;

    // Step 1
    setStep1Title(strings('money.rive_onboarding.step1_title'));
    setStep1Content(
      strings('money.rive_onboarding.step1_body', { percentage: apyPercent }),
    );
    setStep1Footer(strings('money.rive_onboarding.step1_footer_text'));
    setStep1ButtonText(strings('money.rive_onboarding.button_text'));

    // Step 2
    setStep2Title(strings('money.rive_onboarding.step2_title'));
    setStep2Content(strings('money.rive_onboarding.step2_body'));
    setStep2Footer(strings('money.rive_onboarding.step2_footer_text'));
    setStep2ButtonText(strings('money.rive_onboarding.button_text'));

    // Step 3
    setStep3Title(strings('money.rive_onboarding.step3_title'));
    setStep3Content(
      strings(
        isUsUnauthenticatedNonCardholder
          ? 'money.rive_onboarding.step3_body_card_ineligible'
          : 'money.rive_onboarding.step3_body_card_eligible',
        {
          percentage: CARD_CASHBACK_PERCENTAGE,
        },
      ),
    );
    setStep3Footer(strings('money.rive_onboarding.step3_footer_text'));
    setStep3ButtonText(strings('money.rive_onboarding.button_text'));

    // Step 4
    setStep4Title(strings('money.rive_onboarding.step4_title'));
    setStep4Content(strings('money.rive_onboarding.step4_body'));
    setStep4Footer(strings('money.rive_onboarding.step4_footer_text'));
    setStep4ButtonText(strings('money.rive_onboarding.button_text'));

    // Config
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
    setStep1ButtonText,
    setStep2ButtonText,
    setStep3ButtonText,
    setStep4ButtonText,
    isUsUnauthenticatedNonCardholder,
  ]);

  const handleClose = useCallback(
    (stepIndex: number) => {
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.EXITED,
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      dispatch(setMoneyOnboardingSeen(true));
      navigation.navigate(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    },
    [dispatch, navigation, stepTitlesEnglish, trackOnboardingEvent],
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
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      navigation.navigate(Routes.HOME_TABS, {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      });
    },
    [dispatch, navigation, stepTitlesEnglish, trackOnboardingEvent],
  );

  useRiveTrigger(riveRef, CLOSE_TRIGGER, () => {
    handleClose(stepRef.current);
  });

  const handleStateChanged = useCallback(
    (_stateMachineName: string, stateName: string) => {
      const stepIndex = RIVE_STATE_TO_STEP_INDEX[stateName];

      if (stepIndex !== undefined) {
        stepRef.current = stepIndex;
        handleStepViewed(stepIndex);
      }

      if (stateName === RIVE_STEP_NAMES.FINAL_STATE) {
        handleComplete(stepRef.current);
      }
    },
    [handleStepViewed, handleComplete],
  );

  return (
    <Rive
      ref={ref}
      source={MoneyOnboardingAnimationV6}
      artboardName={RIVE_ARTBOARD_NAME}
      stateMachineName={RIVE_STATE_MACHINE_NAME}
      dataBinding={AutoBind(true)}
      fit={Fit.Layout}
      layoutScaleFactor={PixelRatio.get()}
      onStateChanged={handleStateChanged}
      testID={MoneyOnboardingViewTestIds.RIVE_ANIMATION}
    />
  );
};

export default MoneyOnboardingView;
