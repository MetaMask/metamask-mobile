import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Dimensions, Easing, Image } from 'react-native';
import Rive, { Alignment, Fit, RiveRef } from 'rive-react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';
import {
  suppressWalletHomeOnboardingSteps,
  setWalletHomeOnboardingStepsStep,
} from '../../../actions/onboarding';
import { selectWalletHomeOnboardingSteps } from '../../../selectors/onboarding';
import { WalletHomeOnboardingStepsSelectors } from './WalletHomeOnboardingSteps.testIds';
import Logger from '../../../util/Logger';
import onboardChecklistV05Animation from '../../../animations/onboard_checklist_v05.riv';
import { isE2E } from '../../../util/test/utils';
import {
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_ARTBOARD,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_OUTRO_TRIGGER,
  WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE,
  WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_IN_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_OUT_MS,
} from './walletHomeOnboardingChecklistRive';
import { WALLET_HOME_ONBOARDING_STEP_HERO } from './walletHomeOnboardingStepHero';

type StepKind = 'fund' | 'trade' | 'notifications';

/** Rive / Image fill the hero `Box` (`h-52`); defined once to avoid per-render style objects. */
const HERO_MEDIA_LAYOUT_STYLE = {
  width: '100%' as const,
  height: '100%' as const,
  minHeight: 0,
};

const SLIDE_DISTANCE = Dimensions.get('window').width;

type StepButtonLayout = 'full_width_primary' | 'skip_and_primary_row';

interface VisibleStep {
  kind: StepKind;
  buttonLayout: StepButtonLayout;
}

function titleForKind(kind: StepKind): string {
  switch (kind) {
    case 'fund':
      return strings('wallet.home_onboarding_steps.fund_title');
    case 'trade':
      return strings('wallet.home_onboarding_steps.trade_title');
    case 'notifications':
      return strings('wallet.home_onboarding_steps.notifications_title');
  }
}

function subtitleForKind(kind: StepKind): string {
  switch (kind) {
    case 'fund':
      return strings('wallet.home_onboarding_steps.fund_subtitle');
    case 'trade':
      return strings('wallet.home_onboarding_steps.trade_subtitle');
    case 'notifications':
      return strings('wallet.home_onboarding_steps.notifications_subtitle');
  }
}

function primaryLabelForKind(kind: StepKind): string {
  switch (kind) {
    case 'fund':
      return strings('wallet.home_onboarding_steps.fund_primary');
    case 'trade':
      return strings('wallet.home_onboarding_steps.trade_primary');
    case 'notifications':
      return strings('wallet.home_onboarding_steps.notifications_primary');
  }
}

const VISIBLE_STEPS: VisibleStep[] = [
  { kind: 'fund', buttonLayout: 'full_width_primary' },
  { kind: 'trade', buttonLayout: 'skip_and_primary_row' },
  { kind: 'notifications', buttonLayout: 'skip_and_primary_row' },
];

export interface WalletHomeOnboardingStepsProps {
  testID?: string;
}

/**
 * Multi-step onboarding flow for newly onboarded users with zero aggregated balance.
 * Primary advances each step; Skip (steps 2–3 only) advances without committing to the primary action.
 * Step 1 (fund) has no Skip — users must use Add to continue.
 */
const WalletHomeOnboardingSteps: React.FC<WalletHomeOnboardingStepsProps> = ({
  testID = WalletHomeOnboardingStepsSelectors.CONTAINER,
}) => {
  const tw = useTailwind();
  const checklistRiveRef = useRef<RiveRef>(null);
  const dispatch = useDispatch();
  const walletHomeOnboardingStepsState = useSelector(
    selectWalletHomeOnboardingSteps,
  );
  const stepIndex = walletHomeOnboardingStepsState.stepIndex ?? 0;

  const slideX = useRef(new Animated.Value(0)).current;
  const progressRatioAnim = useRef(
    new Animated.Value(1 / VISIBLE_STEPS.length),
  ).current;
  const isFirstProgressSync = useRef(true);
  const advanceLockRef = useRef(false);
  const outroHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [isStepTransitioning, setIsStepTransitioning] = useState(false);

  const stepIndexRef = useRef(stepIndex);
  const isLastStepRef = useRef(stepIndex >= VISIBLE_STEPS.length - 1);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
    isLastStepRef.current = stepIndex >= VISIBLE_STEPS.length - 1;
  }, [stepIndex]);

  useEffect(
    () => () => {
      if (outroHoldTimeoutRef.current !== null) {
        clearTimeout(outroHoldTimeoutRef.current);
        outroHoldTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const max = Math.max(0, VISIBLE_STEPS.length - 1);
    if (stepIndex > max) {
      dispatch(setWalletHomeOnboardingStepsStep(max));
    }
  }, [dispatch, stepIndex]);

  const currentStep =
    VISIBLE_STEPS[Math.min(stepIndex, VISIBLE_STEPS.length - 1)];
  const totalSteps = VISIBLE_STEPS.length;

  useEffect(() => {
    const target = (stepIndex + 1) / totalSteps;
    if (isFirstProgressSync.current) {
      isFirstProgressSync.current = false;
      progressRatioAnim.setValue(target);
      return;
    }
    Animated.timing(progressRatioAnim, {
      toValue: target,
      duration: isE2E ? 0 : WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressRatioAnim, stepIndex, totalSteps]);

  const finishAdvance = useCallback(() => {
    advanceLockRef.current = false;
    setIsStepTransitioning(false);
  }, []);

  const goNextOrComplete = useCallback(() => {
    if (advanceLockRef.current) {
      return;
    }

    const fromIndex = stepIndexRef.current;
    const fromIsLast = isLastStepRef.current;

    if (isE2E) {
      if (fromIsLast) {
        dispatch(suppressWalletHomeOnboardingSteps('flow_completed'));
      } else {
        dispatch(setWalletHomeOnboardingStepsStep(fromIndex + 1));
      }
      return;
    }

    advanceLockRef.current = true;
    setIsStepTransitioning(true);

    try {
      checklistRiveRef.current?.fireState(
        WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE,
        WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_OUTRO_TRIGGER,
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'WalletHomeOnboardingSteps: failed to fire checklist Rive outro',
      );
    }

    const runSlideOutThenCommit = () => {
      Animated.timing(slideX, {
        toValue: -SLIDE_DISTANCE,
        duration: WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          slideX.setValue(0);
          finishAdvance();
          return;
        }
        if (fromIsLast) {
          // Keep `slideX` at the slide-out position until unmount — resetting to 0 would flash
          // the panel back on-screen for a frame before the parent hides this tile.
          dispatch(suppressWalletHomeOnboardingSteps('flow_completed'));
          finishAdvance();
          return;
        }
        dispatch(setWalletHomeOnboardingStepsStep(fromIndex + 1));
        slideX.setValue(SLIDE_DISTANCE);
        requestAnimationFrame(() => {
          Animated.timing(slideX, {
            toValue: 0,
            duration: WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_IN_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            finishAdvance();
          });
        });
      });
    };

    if (outroHoldTimeoutRef.current !== null) {
      clearTimeout(outroHoldTimeoutRef.current);
    }
    outroHoldTimeoutRef.current = setTimeout(() => {
      outroHoldTimeoutRef.current = null;
      runSlideOutThenCommit();
    }, WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS);
  }, [dispatch, finishAdvance, slideX]);

  const progressLabel = useMemo(
    () =>
      strings('wallet.home_onboarding_steps.progress_a11y', {
        current: stepIndex + 1,
        total: totalSteps,
      }),
    [stepIndex, totalSteps],
  );

  const progressFillWidth =
    progressTrackWidth > 0
      ? progressRatioAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, progressTrackWidth],
        })
      : progressRatioAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0],
        });

  if (!currentStep) {
    return null;
  }

  const primaryTestID = `${testID}-${WalletHomeOnboardingStepsSelectors.PRIMARY_BUTTON}`;
  const stepHero = WALLET_HOME_ONBOARDING_STEP_HERO[currentStep.kind];

  const heroContainerClassName = `h-52 w-full rounded-2xl overflow-hidden ${stepHero.heroBackgroundClassName}`;

  return (
    <Box
      paddingBottom={4}
      justifyContent={BoxJustifyContent.Center}
      flexDirection={BoxFlexDirection.Column}
      gap={4}
      testID={testID}
      twClassName="rounded-2xl overflow-hidden"
    >
      <Box flexDirection={BoxFlexDirection.Column} gap={4} twClassName="w-full">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          gap={2}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {strings('wallet.home_onboarding_steps.get_started_title')}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
          >
            {stepIndex + 1}/{totalSteps}
          </Text>
        </Box>

        <Box
          twClassName="h-2 w-full rounded-full bg-muted overflow-hidden"
          accessibilityLabel={progressLabel}
          testID={WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL}
          onLayout={(e) => {
            setProgressTrackWidth(e.nativeEvent.layout.width);
          }}
        >
          <Animated.View
            style={[
              tw.style('h-full rounded-full bg-success-default'),
              { width: progressFillWidth },
            ]}
          />
        </Box>
      </Box>

      <Animated.View
        style={[
          tw.style('w-full flex flex-col gap-4'),
          { transform: [{ translateX: slideX }] },
        ]}
      >
        <Box
          twClassName={heroContainerClassName}
          alignItems={BoxAlignItems.Stretch}
          justifyContent={BoxJustifyContent.Center}
          accessibilityRole="image"
          accessibilityLabel={titleForKind(currentStep.kind)}
          testID={`${testID}-hero-${currentStep.kind}`}
        >
          {!isE2E ? (
            <Rive
              key={`wallet-home-checklist-rive-${currentStep.kind}`}
              ref={checklistRiveRef}
              source={onboardChecklistV05Animation}
              artboardName={
                WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_ARTBOARD[currentStep.kind]
              }
              style={HERO_MEDIA_LAYOUT_STYLE}
              fit={Fit.Contain}
              alignment={Alignment.Center}
              autoplay
              stateMachineName={
                WALLET_HOME_ONBOARDING_CHECKLIST_RIVE_STATE_MACHINE
              }
              testID={`${testID}-hero-${currentStep.kind}-rive`}
            />
          ) : (
            <Image
              source={stepHero.image}
              style={HERO_MEDIA_LAYOUT_STYLE}
              resizeMode="contain"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          )}
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={2}
          alignItems={BoxAlignItems.Start}
          twClassName="w-full"
        >
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.TextDefault}
            twClassName="w-full text-left"
          >
            {titleForKind(currentStep.kind)}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
            twClassName="w-full text-left"
          >
            {subtitleForKind(currentStep.kind)}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={3}
          twClassName="w-full"
        >
          {currentStep.buttonLayout === 'full_width_primary' ? (
            <Button
              size={ButtonSize.Lg}
              onPress={goNextOrComplete}
              isFullWidth
              isDisabled={isStepTransitioning}
              testID={primaryTestID}
            >
              {primaryLabelForKind(currentStep.kind)}
            </Button>
          ) : (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
              twClassName="w-full"
            >
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                onPress={goNextOrComplete}
                twClassName="min-w-0 flex-1"
                isDisabled={isStepTransitioning}
                testID={WalletHomeOnboardingStepsSelectors.SKIP_BUTTON}
              >
                {strings('wallet.home_onboarding_steps.skip')}
              </Button>
              <Button
                size={ButtonSize.Lg}
                onPress={goNextOrComplete}
                twClassName="min-w-0 flex-1"
                isDisabled={isStepTransitioning}
                testID={primaryTestID}
              >
                {primaryLabelForKind(currentStep.kind)}
              </Button>
            </Box>
          )}
        </Box>
      </Animated.View>
    </Box>
  );
};

export default WalletHomeOnboardingSteps;
