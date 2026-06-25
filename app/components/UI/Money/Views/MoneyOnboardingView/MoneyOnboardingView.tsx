import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
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
  Animated,
  PixelRatio,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logger from '../../../../../util/Logger';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import-x/no-commonjs
const MoneyOnboardingAnimationNoTextV2 = require('../../../../../animations/money_account_onboarding_flow_final_no_text_button_text_configurable_v2.riv');

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
const OVERLAY_TEXT_PRESETS = {
  small: {
    title: { fontSize: 18, lineHeight: 25, paddingHorizontal: 42 },
    content: { fontSize: 14, lineHeight: 20 },
    footer: { fontSize: 10, lineHeight: 14 },
  },
  default: {
    title: { fontSize: 24 },
    content: { fontSize: 16 },
    footer: { fontSize: 12 },
  },
} as const;

interface OnboardingTextContent {
  title: string;
  content: string;
  footer: string;
}

type StepLayout = Readonly<{ titleTopPct: number; footerBottomPct: number }>;

const STEP_LAYOUT_PRESETS = {
  small: { titleTopPct: 0.08, footerBottomPct: 0.1 },
  default: { titleTopPct: 0.05, footerBottomPct: 0.1 },
} as const satisfies Record<'small' | 'default', StepLayout>;

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
  footer: {
    opacity: 0.7,
    paddingHorizontal: 16,
    position: 'absolute',
    alignSelf: 'center',
  },
});

// Used if user accessing onboarding BEFORE apy is loaded from balance service.
const FALLBACK_APY = 4;

const MoneyOnboardingTextOverlay = ({
  content,
  isVisible,
}: {
  content?: OnboardingTextContent;
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
  const stepLayout = useMemo<StepLayout>(
    () =>
      isSmallScreen ? STEP_LAYOUT_PRESETS.small : STEP_LAYOUT_PRESETS.default,
    [isSmallScreen],
  );

  const fadeAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const hasMountedRef = useRef(false);

  useEffect(() => {
    fadeAnim.stopAnimation();

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fadeAnim.setValue(isVisible ? 1 : 0);
      return () => {
        fadeAnim.stopAnimation();
      };
    }

    if (isVisible) {
      fadeAnim.setValue(0);
    }

    Animated.timing(fadeAnim, {
      duration: OVERLAY_FADE_DURATION_MS,
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
    }).start();

    return () => {
      fadeAnim.stopAnimation();
    };
  }, [fadeAnim, isVisible]);

  if (!content) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
    >
      <View
        style={[
          styles.textGroup,
          {
            top: insets.top + height * stepLayout.titleTopPct,
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
      <Text
        color={TextColor.OverlayInverse}
        variant={TextVariant.BodyXs}
        numberOfLines={1}
        style={[
          styles.footer,
          overlayTextPreset.footer,
          {
            bottom: insets.bottom + height * stepLayout.footerBottomPct,
          },
        ]}
        testID={MoneyOnboardingViewTestIds.OVERLAY_FOOTER}
      >
        {content.footer}
      </Text>
    </Animated.View>
  );
};

const MoneyOnboardingView = () => {
  const navigation = useNavigation<AppNavigationProp>();

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
  const [overlayStep, setOverlayStep] = useState(0);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

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
  }, [riveRef, setTransitionSpeed, setButtonText]);

  const navigateToMoneyHome = useCallback(() => {
    navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [navigation]);

  const handleClose = useCallback(
    (stepIndex: number) => {
      playImpact(ImpactMoment.PageNavigation);
      trackOnboardingEvent({
        step: stepIndex + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitlesEnglish[stepIndex],
        total_steps: TOTAL_ONBOARDING_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.EXITED,
        redirect_target: SCREEN_NAMES.MONEY_HOME,
      });

      dispatch(setMoneyOnboardingSeen(true));
      navigateToMoneyHome();
    },
    [dispatch, navigateToMoneyHome, stepTitlesEnglish, trackOnboardingEvent],
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

      navigateToMoneyHome();
    },
    [dispatch, navigateToMoneyHome, stepTitlesEnglish, trackOnboardingEvent],
  );

  useRiveTrigger(riveRef, CLOSE_TRIGGER, () => {
    handleClose(stepRef.current);
  });

  const handleStateChanged = useCallback(
    (_stateMachineName: string, stateName: string) => {
      if (RIVE_TRANSITION_STATES.has(stateName)) {
        playImpact(ImpactMoment.PageNavigation);
        setIsOverlayVisible(false);
        return;
      }

      const stepIndex = RIVE_STATE_TO_STEP_INDEX[stateName];

      if (stepIndex !== undefined) {
        stepRef.current = stepIndex;

        if (stepContent[stepIndex]) {
          setOverlayStep(stepIndex);
          setIsOverlayVisible(true);
        }

        handleStepViewed(stepIndex);
      }

      if (stateName === RIVE_STEP_NAMES.FINAL_STATE) {
        handleComplete(stepRef.current);
      }
    },
    [handleStepViewed, handleComplete, stepContent],
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
        source={MoneyOnboardingAnimationNoTextV2}
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
        isVisible={Boolean(riveRef) && isOverlayVisible}
      />
    </View>
  );
};

export default MoneyOnboardingView;
