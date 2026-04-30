import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  View,
} from 'react-native';
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
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_OUT_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_IN_MS,
  WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_OUT_MS,
  WALLET_HOME_POST_ONBOARDING_FADE_OUT_MS,
  walletHomeOnboardingChecklistSlideDownExitDistancePx,
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

/** Progress segments: step 1 → 25%, 2 → 50%, 3 → 75%; 100% runs on completion before exit. */
const WALLET_HOME_PROGRESS_DENOMINATOR = VISIBLE_STEPS.length + 1;

function walletHomeProgressRatioForStep(stepIndex: number): number {
  return (stepIndex + 1) / WALLET_HOME_PROGRESS_DENOMINATOR;
}

export interface WalletHomeOnboardingStepsProps {
  testID?: string;
  /**
   * When true, show the first-step shell with a loading hero and disabled primary until
   * aggregated balance / empty-state is resolved (in-flow users reopening the app).
   */
  isAwaitingBalance?: boolean;
  /**
   * When set, the last step awaits this handler after the checklist fade before unlocking advance.
   */
  onCoordinatedFlowExit?: () => Promise<void>;
  /** Pauses checklist Rive while the Wallet parent finishes the coordinated exit handoff. */
  suspendRiveForCurtain?: boolean;
  /** Trade step: invoked when user taps Primary (before advancing). Skip does not call this. */
  onTradePrimaryPress?: () => void;
  /** Notifications step: invoked when user taps Primary (before advancing). Skip does not call this. */
  onNotificationsPrimaryPress?: () => void;
}

/**
 * Multi-step onboarding flow for newly onboarded users with zero aggregated balance.
 * Primary on trade/notifications runs optional commit handlers (e.g. navigate) then advances;
 * Skip advances only.
 * Step 1 (fund) has no Skip — users must use Add to continue.
 */
const WalletHomeOnboardingSteps: React.FC<WalletHomeOnboardingStepsProps> = ({
  testID = WalletHomeOnboardingStepsSelectors.CONTAINER,
  isAwaitingBalance = false,
  onCoordinatedFlowExit,
  suspendRiveForCurtain = false,
  onTradePrimaryPress,
  onNotificationsPrimaryPress,
}) => {
  const tw = useTailwind();
  const checklistRiveRef = useRef<RiveRef>(null);
  const prevSuspendRiveForCurtainRef = useRef(false);
  const checklistFadeOpacity = useRef(new Animated.Value(1)).current;
  const dispatch = useDispatch();
  const walletHomeOnboardingStepsState = useSelector(
    selectWalletHomeOnboardingSteps,
  );
  const stepIndex = walletHomeOnboardingStepsState.stepIndex ?? 0;
  const displayStepIndex = isAwaitingBalance ? 0 : stepIndex;
  /** Capped index for progress + hero; matches `VISIBLE_STEPS[…]` bounds before Redux clamps persisted step. */
  const visualStepIndexForProgress = Math.min(
    displayStepIndex,
    VISIBLE_STEPS.length - 1,
  );

  const slideX = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(0)).current;
  const progressRatioAnim = useRef(
    new Animated.Value(
      walletHomeProgressRatioForStep(visualStepIndexForProgress),
    ),
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
  /** Kept in sync with `stepIndex` + `isAwaitingBalance` so Primary commit matches `goNextOrComplete` ref reads. */
  const currentStepKindRef = useRef<StepKind>(
    VISIBLE_STEPS[visualStepIndexForProgress].kind,
  );
  useEffect(() => {
    stepIndexRef.current = stepIndex;
    isLastStepRef.current = stepIndex >= VISIBLE_STEPS.length - 1;
    const displayIdx = isAwaitingBalance ? 0 : stepIndex;
    const cappedVisual = Math.min(displayIdx, VISIBLE_STEPS.length - 1);
    currentStepKindRef.current = VISIBLE_STEPS[cappedVisual].kind;
  }, [stepIndex, isAwaitingBalance]);

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
    if (isE2E) {
      return;
    }
    if (suspendRiveForCurtain) {
      checklistRiveRef.current?.pause();
    } else if (prevSuspendRiveForCurtainRef.current) {
      checklistRiveRef.current?.play();
    }
    prevSuspendRiveForCurtainRef.current = suspendRiveForCurtain;
  }, [suspendRiveForCurtain]);

  useEffect(() => {
    const max = Math.max(0, VISIBLE_STEPS.length - 1);
    if (stepIndex > max) {
      dispatch(setWalletHomeOnboardingStepsStep(max));
    }
  }, [dispatch, stepIndex]);

  const totalSteps = VISIBLE_STEPS.length;
  const currentStep = VISIBLE_STEPS[visualStepIndexForProgress];

  useEffect(() => {
    const target = walletHomeProgressRatioForStep(visualStepIndexForProgress);
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
  }, [progressRatioAnim, visualStepIndexForProgress]);

  const finishAdvance = useCallback(() => {
    advanceLockRef.current = false;
    setIsStepTransitioning(false);
  }, []);

  const goNextOrComplete = useCallback(() => {
    if (isAwaitingBalance) {
      return;
    }
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

    const useCoordinatedLastExit = Boolean(onCoordinatedFlowExit && fromIsLast);

    const runSlideOutThenCommit = () => {
      if (fromIsLast) {
        if (onCoordinatedFlowExit) {
          Animated.timing(checklistFadeOpacity, {
            toValue: 0,
            duration: isE2E ? 0 : WALLET_HOME_POST_ONBOARDING_FADE_OUT_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!finished) {
              checklistFadeOpacity.setValue(1);
              finishAdvance();
              return;
            }
            onCoordinatedFlowExit()
              .then(() => finishAdvance())
              .catch(() => finishAdvance());
          });
          return;
        }
        Animated.timing(slideY, {
          toValue: walletHomeOnboardingChecklistSlideDownExitDistancePx(
            Dimensions.get('window').height,
          ),
          duration: isE2E
            ? 0
            : WALLET_HOME_ONBOARDING_CHECKLIST_SLIDE_DOWN_OUT_MS,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished) {
            slideY.setValue(0);
            finishAdvance();
            return;
          }
          dispatch(suppressWalletHomeOnboardingSteps('flow_completed'));
          finishAdvance();
        });
        return;
      }

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

    const scheduleOutroHoldThenSlide = () => {
      if (!useCoordinatedLastExit) {
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
      }

      if (outroHoldTimeoutRef.current !== null) {
        clearTimeout(outroHoldTimeoutRef.current);
      }
      const outroHoldMs = useCoordinatedLastExit
        ? 0
        : WALLET_HOME_ONBOARDING_CHECKLIST_OUTRO_HOLD_MS;
      outroHoldTimeoutRef.current = setTimeout(() => {
        outroHoldTimeoutRef.current = null;
        runSlideOutThenCommit();
      }, outroHoldMs);
    };

    if (fromIsLast) {
      Animated.timing(progressRatioAnim, {
        toValue: 1,
        duration: isE2E ? 0 : WALLET_HOME_ONBOARDING_CHECKLIST_PROGRESS_BAR_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) {
          finishAdvance();
          return;
        }
        scheduleOutroHoldThenSlide();
      });
      return;
    }

    scheduleOutroHoldThenSlide();
  }, [
    dispatch,
    finishAdvance,
    isAwaitingBalance,
    onCoordinatedFlowExit,
    progressRatioAnim,
    slideX,
    slideY,
    checklistFadeOpacity,
  ]);

  const handlePrimaryPress = useCallback(() => {
    const kind = currentStepKindRef.current;
    if (kind === 'trade' && onTradePrimaryPress) {
      onTradePrimaryPress();
    } else if (kind === 'notifications' && onNotificationsPrimaryPress) {
      onNotificationsPrimaryPress();
    }
    goNextOrComplete();
  }, [goNextOrComplete, onNotificationsPrimaryPress, onTradePrimaryPress]);

  const progressLabel = useMemo(
    () =>
      strings('wallet.home_onboarding_steps.progress_a11y', {
        current: displayStepIndex + 1,
        total: totalSteps,
      }),
    [displayStepIndex, totalSteps],
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

  const heroContainerClassName =
    'relative h-52 w-full rounded-2xl overflow-hidden';

  /** Last step with coordinated Wallet exit — no inner slide (fade happens before parent completes). */
  const useStaticStepBody =
    Boolean(onCoordinatedFlowExit) && stepIndex >= VISIBLE_STEPS.length - 1;

  const renderChecklistStepBody = () => (
    <>
      <Box
        twClassName={heroContainerClassName}
        alignItems={BoxAlignItems.Stretch}
        justifyContent={BoxJustifyContent.Center}
        accessibilityRole="image"
        accessibilityLabel={titleForKind(currentStep.kind)}
        testID={`${testID}-hero-${currentStep.kind}`}
      >
        <View
          pointerEvents="none"
          style={tw.style('absolute inset-0 z-0 overflow-hidden rounded-2xl')}
        >
          <Image
            source={stepHero.image}
            style={tw.style('h-full w-full')}
            resizeMode="cover"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        </View>
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="relative z-10 flex-1 w-full min-h-0 self-stretch"
        >
          {isAwaitingBalance ? (
            <ActivityIndicator
              size="large"
              accessibilityLabel={strings(
                'wallet.home_onboarding_steps.balance_loading_a11y',
              )}
              testID={`${testID}-hero-awaiting-balance`}
            />
          ) : !isE2E ? (
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
          ) : null}
        </Box>
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

      <Box flexDirection={BoxFlexDirection.Column} gap={3} twClassName="w-full">
        {currentStep.buttonLayout === 'full_width_primary' ? (
          <Button
            size={ButtonSize.Lg}
            onPress={handlePrimaryPress}
            isFullWidth
            isDisabled={isStepTransitioning || isAwaitingBalance}
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
              isDisabled={isStepTransitioning || isAwaitingBalance}
              testID={WalletHomeOnboardingStepsSelectors.SKIP_BUTTON}
            >
              {strings('wallet.home_onboarding_steps.skip')}
            </Button>
            <Button
              size={ButtonSize.Lg}
              onPress={handlePrimaryPress}
              twClassName="min-w-0 flex-1"
              isDisabled={isStepTransitioning || isAwaitingBalance}
              testID={primaryTestID}
            >
              {primaryLabelForKind(currentStep.kind)}
            </Button>
          </Box>
        )}
      </Box>
    </>
  );

  return (
    <Animated.View
      style={[tw.style('w-full'), { opacity: checklistFadeOpacity }]}
    >
      <Box
        paddingBottom={4}
        justifyContent={BoxJustifyContent.Center}
        flexDirection={BoxFlexDirection.Column}
        gap={4}
        testID={testID}
        twClassName="rounded-2xl overflow-hidden"
      >
        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={4}
          twClassName="w-full"
        >
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
              {displayStepIndex + 1}/{totalSteps}
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

        {useStaticStepBody ? (
          <View style={tw.style('w-full flex flex-col gap-4')}>
            {renderChecklistStepBody()}
          </View>
        ) : (
          <Animated.View
            style={[
              tw.style('w-full flex flex-col gap-4'),
              { transform: [{ translateX: slideX }, { translateY: slideY }] },
            ]}
          >
            {renderChecklistStepBody()}
          </Animated.View>
        )}
      </Box>
    </Animated.View>
  );
};

export default WalletHomeOnboardingSteps;
