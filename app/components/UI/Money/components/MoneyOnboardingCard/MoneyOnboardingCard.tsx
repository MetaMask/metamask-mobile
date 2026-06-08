import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import moneyOnboardingStepperStep1 from '../../../../../images/money-onboarding-stepper-step-1.png';
import moneyOnboardingStepperStep2 from '../../../../../images/money-onboarding-stepper-step-2.png';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { useOnboardingStep, STEPPER_IDS } from '../../hooks/useOnboardingStep';
import StepperCard, {
  type StepperCardStep,
} from '../../../../../component-library/components-temp/StepperCard';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import {
  CardActions,
  CardEntryPoint,
  CardScreens,
  deriveCardState,
} from '../../../Card/util/metrics';
import { useSelector } from 'react-redux';
import { selectIsCardholder } from '../../../../../selectors/cardController';

// REMINDER: Must be updated when the number of steps is changed.
export const MONEY_ONBOARDING_TOTAL_STEPS = 2;

const MoneyOnboardingCard = () => {
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedCardStepViewRef = useRef(false);

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

  const {
    startLinkFlow,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isLinking,
  } = useMoneyAccountCardLinkage();
  const isCardholder = useSelector(selectIsCardholder);

  const isMoneyAccountFunded = Boolean(
    !isAggregatedBalanceLoading && tokenTotal?.isGreaterThan(0),
  );

  const cardState = deriveCardState({
    isCardholder,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
  });

  const handleRedirectToCryptoDeposit = useCallback(async () => {
    await initiateDeposit().catch(() => undefined);
  }, [initiateDeposit]);

  const handleCardCtaPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          screen: CardScreens.MONEY_HOME,
          entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
          action: CardActions.MONEY_ACCOUNT_ONBOARDING_CARD_PRIMARY_BUTTON,
          card_state: cardState,
        })
        .build(),
    );

    startLinkFlow({
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
      entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
    });
  }, [trackEvent, createEventBuilder, cardState, startLinkFlow]);

  const handleSkipPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          screen: CardScreens.MONEY_HOME,
          entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
          action: CardActions.MONEY_ACCOUNT_ONBOARDING_CARD_SKIP_BUTTON,
          card_state: cardState,
        })
        .build(),
    );

    incrementStep();
  }, [trackEvent, createEventBuilder, cardState, incrementStep]);

  const targetStepFromCompletion = useMemo(() => {
    // Step 1 completion is based on having a non-zero balance (after loading).
    const isStep1Complete = isMoneyAccountFunded;

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
    isMoneyAccountFunded,
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

  useEffect(() => {
    if (
      hasTrackedCardStepViewRef.current ||
      isAggregatedBalanceLoading ||
      !isOnboardingCardVisible ||
      !isVisibleAfterAutoSkip ||
      effectiveCurrentStep !== 1
    ) {
      return;
    }

    hasTrackedCardStepViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen: CardScreens.MONEY_HOME,
          entrypoint: CardEntryPoint.MONEY_HOME_ONBOARDING_CARD,
          card_state: cardState,
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    effectiveCurrentStep,
    isAggregatedBalanceLoading,
    isOnboardingCardVisible,
    isVisibleAfterAutoSkip,
    cardState,
  ]);

  // REMINDER: Update MONEY_ONBOARDING_TOTAL_STEPS when steps are added or removed.
  const steps = useMemo((): StepperCardStep[] => {
    if (!isOnboardingCardVisible || !isVisibleAfterAutoSkip) return [];

    const step1: StepperCardStep = {
      title: strings('money.onboarding.step_1.title'),
      description: strings('money.onboarding.step_1.description'),
      primaryCta: {
        text: strings('money.onboarding.step_1.cta'),
        onPress: handleRedirectToCryptoDeposit,
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
              onPress: handleCardCtaPress,
              disabled: isLinking,
            },
            secondaryCta: {
              text: strings(
                'money.onboarding.step_2.unlinked_card_account.cta_secondary',
              ),
              onPress: handleSkipPress,
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
              onPress: handleCardCtaPress,
              disabled: isLinking,
            },
            secondaryCta: {
              text: strings(
                'money.onboarding.step_2.no_card_account.cta_secondary',
              ),
              onPress: handleSkipPress,
            },
            image: moneyOnboardingStepperStep2,
          };

    return [step1, step2];
  }, [
    isOnboardingCardVisible,
    isVisibleAfterAutoSkip,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isLinking,
    handleRedirectToCryptoDeposit,
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
