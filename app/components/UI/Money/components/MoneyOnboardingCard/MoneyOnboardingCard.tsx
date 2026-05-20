import React, { useCallback, useEffect, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import moneyOnboardingStepperStep1 from '../../../../../images/money-onboarding-stepper-step-1.png';
import moneyOnboardingStepperStep2 from '../../../../../images/money-onboarding-stepper-step-2.png';
import { strings } from '../../../../../../locales/i18n';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { selectIsMoneyAccountDelegatedForCard } from '../../../../../selectors/cardController';
import useMoneyAccountCardLinkage from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { useMoneyOnboardingStep } from '../../hooks/useMoneyOnboardingStep';
import StepperCard, {
  type StepperCardStep,
} from '../../../../../component-library/components-temp/StepperCard';
import { useMoneyAccountDeposit } from '../../hooks/useMoneyAccount';

// REMINDER: Must be updated when the number of steps is changed.
export const MONEY_ONBOARDING_TOTAL_STEPS = 2;

const MoneyOnboardingCard = () => {
  const { currentStep, incrementStep } = useMoneyOnboardingStep();

  const isOnboardingCardVisible = currentStep < MONEY_ONBOARDING_TOTAL_STEPS;

  const { initiateDeposit } = useMoneyAccountDeposit();

  const isCardLinkedToMoneyAccount = useSelector(
    selectIsMoneyAccountDelegatedForCard,
  );

  const { startLinkFlow, isCardAuthenticated } = useMoneyAccountCardLinkage();

  const handleRedirectToCryptoDeposit = useCallback(() => {
    initiateDeposit().catch(() => undefined);
  }, [initiateDeposit]);

  const handleCardCtaPress = useCallback(() => {
    startLinkFlow({
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [startLinkFlow]);

  const handleSkipPress = useCallback(() => {
    incrementStep();
  }, [incrementStep]);

  const getStep1Content = useCallback(
    (): StepperCardStep => ({
      title: strings('money.onboarding.step_1.title'),
      description: strings('money.onboarding.step_1.description'),
      primaryCta: {
        text: strings('money.onboarding.step_1.cta'),
        onPress: handleRedirectToCryptoDeposit,
      },
      image: moneyOnboardingStepperStep1,
    }),
    [handleRedirectToCryptoDeposit],
  );

  const getStep2Content = useCallback((): StepperCardStep => {
    // Case 1: Has MetaMask card but not linked to Money account yet.
    if (isCardAuthenticated && !isCardLinkedToMoneyAccount) {
      return {
        title: strings('money.onboarding.step_2.unlinked_card_account.title'),
        description: strings(
          'money.onboarding.step_2.unlinked_card_account.description',
        ),
        primaryCta: {
          text: strings(
            'money.onboarding.step_2.unlinked_card_account.cta_primary',
          ),
          onPress: handleCardCtaPress,
        },
        secondaryCta: {
          text: strings(
            'money.onboarding.step_2.unlinked_card_account.cta_secondary',
          ),
          onPress: handleSkipPress,
        },
        image: moneyOnboardingStepperStep2,
      };
    }

    // Case 2: No MetaMask card yet.
    return {
      title: strings('money.onboarding.step_2.no_card_account.title'),
      description: strings(
        'money.onboarding.step_2.no_card_account.description',
      ),
      primaryCta: {
        text: strings('money.onboarding.step_2.no_card_account.cta_primary'),
        onPress: handleCardCtaPress,
      },
      secondaryCta: {
        text: strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        onPress: handleSkipPress,
      },
      image: moneyOnboardingStepperStep2,
    };
  }, [
    handleCardCtaPress,
    handleSkipPress,
    isCardLinkedToMoneyAccount,
    isCardAuthenticated,
  ]);

  /**
   * Auto-skip step 2 ("Get/Link your MetaMask Card") when the user is already
   * a cardholder AND has linked the card to the money account
   */
  useEffect(() => {
    if (
      currentStep === 1 &&
      isCardAuthenticated &&
      isCardLinkedToMoneyAccount
    ) {
      incrementStep();
    }
  }, [
    currentStep,
    incrementStep,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
  ]);

  // REMINDER: To update MONEY_ONBOARDING_TOTAL_STEPS when the number of steps is changed.
  const steps = useMemo(() => {
    if (!isOnboardingCardVisible) return [];
    return [getStep1Content(), getStep2Content()];
  }, [isOnboardingCardVisible, getStep1Content, getStep2Content]);

  if (!isOnboardingCardVisible) {
    return null;
  }

  return (
    <Box twClassName="pb-4 mx-4 my-3">
      <StepperCard
        steps={steps}
        currentStep={currentStep}
        testID="money-onboarding-card"
      />
    </Box>
  );
};

export default MoneyOnboardingCard;
