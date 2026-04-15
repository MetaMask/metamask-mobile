import React, { useCallback, useEffect, useMemo } from 'react';
import { Image } from 'react-native';
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
import { lightTheme } from '@metamask/design-tokens';
import type { Theme } from '../../../util/theme/models';
import { useTheme } from '../../../util/theme';
import {
  WALLET_HOME_ONBOARDING_STEP_HERO,
  type WalletHomeOnboardingHeroAccent,
} from './walletHomeOnboardingStepHero';

type StepKind = 'fund' | 'trade' | 'notifications';

function heroAccentLightColor(
  colors: Theme['colors'] | undefined,
  accent: WalletHomeOnboardingHeroAccent,
) {
  const palette = colors ?? lightTheme.colors;
  switch (accent) {
    case 'accent03':
      return palette.accent03.light;
    case 'accent04':
      return palette.accent04.light;
    case 'accent02':
      return palette.accent02.light;
  }
}

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
  const theme = useTheme();
  const colors = theme.colors ?? lightTheme.colors;
  const dispatch = useDispatch();
  const walletHomeOnboardingStepsState = useSelector(
    selectWalletHomeOnboardingSteps,
  );
  const stepIndex = walletHomeOnboardingStepsState.stepIndex ?? 0;

  useEffect(() => {
    const max = Math.max(0, VISIBLE_STEPS.length - 1);
    if (stepIndex > max) {
      dispatch(setWalletHomeOnboardingStepsStep(max));
    }
  }, [dispatch, stepIndex]);

  const currentStep =
    VISIBLE_STEPS[Math.min(stepIndex, VISIBLE_STEPS.length - 1)];
  const totalSteps = VISIBLE_STEPS.length;
  const isLastStep = stepIndex >= totalSteps - 1;

  const goNextOrComplete = useCallback(() => {
    if (isLastStep) {
      dispatch(suppressWalletHomeOnboardingSteps('flow_completed'));
    } else {
      dispatch(setWalletHomeOnboardingStepsStep(stepIndex + 1));
    }
  }, [dispatch, isLastStep, stepIndex]);

  const progressLabel = useMemo(
    () =>
      strings('wallet.home_onboarding_steps.progress_a11y', {
        current: stepIndex + 1,
        total: totalSteps,
      }),
    [stepIndex, totalSteps],
  );

  if (!currentStep) {
    return null;
  }

  const progressRatio = (stepIndex + 1) / totalSteps;
  const primaryTestID = `${testID}-${WalletHomeOnboardingStepsSelectors.PRIMARY_BUTTON}`;
  const stepHero = WALLET_HOME_ONBOARDING_STEP_HERO[currentStep.kind];
  const stepHeroHeight = stepHero.heroHeight ?? 148;
  const stepHeroBackgroundColor = heroAccentLightColor(
    colors,
    stepHero.heroAccent,
  );

  return (
    <Box
      paddingBottom={4}
      justifyContent={BoxJustifyContent.Center}
      gap={4}
      testID={testID}
      twClassName="rounded-2xl"
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
          {stepIndex + 1}/{totalSteps}
        </Text>
      </Box>

      <Box
        twClassName="h-2 w-full rounded-full bg-muted overflow-hidden"
        accessibilityLabel={progressLabel}
        testID={WalletHomeOnboardingStepsSelectors.PROGRESS_LABEL}
      >
        <Box
          twClassName="h-full rounded-full bg-success-default"
          style={{ width: `${Math.min(100, progressRatio * 100)}%` }}
        />
      </Box>

      <Box
        twClassName="h-52 w-full rounded-2xl overflow-hidden"
        style={tw.style({ backgroundColor: stepHeroBackgroundColor })}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        accessibilityRole="image"
        accessibilityLabel={titleForKind(currentStep.kind)}
        testID={`${testID}-hero-${currentStep.kind}`}
      >
        <Image
          source={stepHero.image}
          style={tw.style({ height: stepHeroHeight, width: '100%' })}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
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
            onPress={goNextOrComplete}
            isFullWidth
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
              testID={WalletHomeOnboardingStepsSelectors.SKIP_BUTTON}
            >
              {strings('wallet.home_onboarding_steps.skip')}
            </Button>
            <Button
              size={ButtonSize.Lg}
              onPress={goNextOrComplete}
              twClassName="min-w-0 flex-1"
              testID={primaryTestID}
            >
              {primaryLabelForKind(currentStep.kind)}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default WalletHomeOnboardingSteps;
