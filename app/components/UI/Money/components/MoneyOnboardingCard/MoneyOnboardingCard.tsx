import React, { useCallback, useEffect, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import moneyOnboardingStepperStep1 from '../../../../../images/money-onboarding-stepper-step-1.png';
import moneyOnboardingStepperStep2 from '../../../../../images/money-onboarding-stepper-step-2.png';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { MONEY_HOME_CARD_ORIGIN } from '../../../Card/hooks/useCardPostAuthRedirect';
import { useOnboardingStep, STEPPER_IDS } from '../../hooks/useOnboardingStep';
import StepperCard, {
  type StepperCardStep,
} from '../../../../../component-library/components-temp/StepperCard';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_EVENT_TYPES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  REDIRECT_TARGETS,
  SCREEN_NAMES,
  BOTTOM_SHEET_NAMES,
} from '../../constants/moneyEvents';

// REMINDER: Must be updated when the number of steps is changed.
export const MONEY_ONBOARDING_TOTAL_STEPS = 2;

const MoneyOnboardingCard = () => {
  const {
    currentStep,
    incrementStep,
    isVisible: isOnboardingCardVisible,
  } = useOnboardingStep({
    stepperId: STEPPER_IDS.MONEY,
    totalSteps: MONEY_ONBOARDING_TOTAL_STEPS,
  });

  const { initiateDeposit } = useMoneyAccountDeposit();
  const { tokenTotal, isAggregatedBalanceLoading } = useMoneyAccountBalance();
  const { trackOnboardingEvent } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: COMPONENT_NAMES.MONEY_ONBOARDING_CARD,
  });

  const {
    startLinkFlow,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isLinking,
  } = useMoneyAccountCardLinkage();

  const handleRedirectToCryptoDeposit = useCallback(async () => {
    await initiateDeposit().catch(() => undefined);
  }, [initiateDeposit]);

  const handleCardCtaPress = useCallback(
    (stepTitleEn: string) => {
      const baseProperties = {
        type: MONEY_ONBOARDING_EVENT_TYPES.STEP_BUTTON_CLICKED,
        step: currentStep + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitleEn,
        total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
      } as const;

      if (isCardAuthenticated && !isCardLinkedToMoneyAccount) {
        trackOnboardingEvent({
          ...baseProperties,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.LINK_CARD,
          redirect_target_type: REDIRECT_TARGETS.BOTTOM_SHEET,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_LINK_SHEET,
        });
      } else {
        trackOnboardingEvent({
          ...baseProperties,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.GET_CARD,
          redirect_target_type: REDIRECT_TARGETS.BOTTOM_SHEET,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_AUTH_SHEET,
        });
      }

      startLinkFlow(MONEY_HOME_CARD_ORIGIN);
    },
    [
      currentStep,
      isCardAuthenticated,
      isCardLinkedToMoneyAccount,
      startLinkFlow,
      trackOnboardingEvent,
    ],
  );

  const handleSkipPress = useCallback(
    /** English (non-localized) step title. */
    (stepTitleEn: string) => {
      trackOnboardingEvent({
        step: currentStep + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitleEn,
        total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
        step_action: MONEY_ONBOARDING_STEP_ACTIONS.SKIPPED,
      });

      incrementStep();
    },
    [currentStep, incrementStep, trackOnboardingEvent],
  );

  const targetStepFromCompletion = useMemo(() => {
    // Step 1 completion is based on having a non-zero balance (after loading).
    const isStep1Complete = Boolean(
      !isAggregatedBalanceLoading && tokenTotal?.isGreaterThan(0),
    );

    // Step 2 completion can be evaluated if either:
    // - persisted progress is already at step index ≥ 1 (auto-advanced on a
    //   previous session, or balance has since dropped back to zero), or
    // - step 1 is complete right now (immediately advance funded users).
    const canEvaluateStep2 = currentStep >= 1 || isStep1Complete;
    const isStep2Complete =
      canEvaluateStep2 && isCardAuthenticated && isCardLinkedToMoneyAccount;

    if (isStep2Complete) return 2;
    if (isStep1Complete) return 1;
    return 0;
  }, [
    currentStep,
    isAggregatedBalanceLoading,
    tokenTotal,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
  ]);

  // Prevent a flash of earlier steps by rendering the computed step immediately,
  // while still persisting progress back to Redux via incremental updates.
  const effectiveCurrentStep = Math.max(currentStep, targetStepFromCompletion);
  const isVisibleAfterAutoSkip =
    effectiveCurrentStep < MONEY_ONBOARDING_TOTAL_STEPS;

  useEffect(() => {
    if (currentStep < targetStepFromCompletion) {
      incrementStep();
    }
  }, [currentStep, targetStepFromCompletion, incrementStep]);

  const handleStep1CtaPressed = useCallback(() => {
    trackOnboardingEvent({
      step: currentStep + 1, // Use 1-based index for event tracking to match total_steps count.
      step_title: strings('money.onboarding.step_1.title', { locale: 'en' }),
      total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
      step_action: MONEY_ONBOARDING_STEP_ACTIONS.DEPOSIT_INITIATED,
      redirect_target_type: REDIRECT_TARGETS.SCREEN,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });
    handleRedirectToCryptoDeposit();
  }, [currentStep, handleRedirectToCryptoDeposit, trackOnboardingEvent]);

  // REMINDER: Update MONEY_ONBOARDING_TOTAL_STEPS when steps are added or removed.
  const steps = useMemo((): StepperCardStep[] => {
    if (!isOnboardingCardVisible || !isVisibleAfterAutoSkip) return [];

    const step1: StepperCardStep = {
      title: strings('money.onboarding.step_1.title'),
      description: strings('money.onboarding.step_1.description'),
      primaryCta: {
        text: strings('money.onboarding.step_1.cta'),
        onPress: handleStep1CtaPressed,
      },
      image: moneyOnboardingStepperStep1,
    };

    // Case 1: Has MetaMask card but not linked to Money account yet.
    const step2: StepperCardStep =
      isCardAuthenticated && !isCardLinkedToMoneyAccount
        ? {
            title: strings(
              'money.onboarding.step_2.unlinked_card_account.title',
            ),
            description: strings(
              'money.onboarding.step_2.unlinked_card_account.description',
            ),
            primaryCta: {
              text: strings(
                'money.onboarding.step_2.unlinked_card_account.cta_primary',
              ),
              onPress: () =>
                handleCardCtaPress(
                  strings(
                    'money.onboarding.step_2.unlinked_card_account.title',
                    {
                      locale: 'en',
                    },
                  ),
                ),
              disabled: isLinking,
            },
            secondaryCta: {
              text: strings(
                'money.onboarding.step_2.unlinked_card_account.cta_secondary',
              ),
              onPress: () =>
                handleSkipPress(
                  strings(
                    'money.onboarding.step_2.unlinked_card_account.title',
                    { locale: 'en' },
                  ),
                ),
            },
            image: moneyOnboardingStepperStep2,
          }
        : // No MetaMask card yet.
          {
            title: strings('money.onboarding.step_2.no_card_account.title'),
            description: strings(
              'money.onboarding.step_2.no_card_account.description',
            ),
            primaryCta: {
              text: strings(
                'money.onboarding.step_2.no_card_account.cta_primary',
              ),
              onPress: () =>
                handleCardCtaPress(
                  strings('money.onboarding.step_2.no_card_account.title', {
                    locale: 'en',
                  }),
                ),
              disabled: isLinking,
            },
            secondaryCta: {
              text: strings(
                'money.onboarding.step_2.no_card_account.cta_secondary',
              ),
              onPress: () =>
                handleSkipPress(
                  strings('money.onboarding.step_2.no_card_account.title', {
                    locale: 'en',
                  }),
                ),
            },
            image: moneyOnboardingStepperStep2,
          };

    return [step1, step2];
  }, [
    isOnboardingCardVisible,
    isVisibleAfterAutoSkip,
    handleStep1CtaPressed,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isLinking,
    handleCardCtaPress,
    handleSkipPress,
  ]);

  if (
    isAggregatedBalanceLoading ||
    !isOnboardingCardVisible ||
    !isVisibleAfterAutoSkip
  ) {
    return null;
  }

  return (
    <Box twClassName="pb-4 mx-4 mt-3">
      <StepperCard
        steps={steps}
        currentStep={effectiveCurrentStep}
        testID="money-onboarding-card"
      />
    </Box>
  );
};

export default MoneyOnboardingCard;
