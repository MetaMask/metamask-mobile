import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Box } from '@metamask/design-system-react-native';
import moneyOnboardingStepperStep1 from '../../../../../images/money-onboarding-stepper-step-1.png';
import moneyOnboardingStepperStep2 from '../../../../../images/money-onboarding-stepper-step-2.png';
import { strings } from '../../../../../../locales/i18n';
import { useMoneyAccountCardLinkage } from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { MONEY_HOME_CARD_ORIGIN } from '../../../Card/hooks/useCardPostAuthRedirect';
import { useOnboardingStep, STEPPER_IDS } from '../../hooks/useOnboardingStep';
import { isPositiveNumber } from '../../utils/number';
import StepperCard, {
  type StepperCardStep,
} from '../../../../../component-library/components-temp/StepperCard';
import MoneyNextBestActionParallax, {
  PARALLAX_ARTBOARD_CARD,
  PARALLAX_ARTBOARD_FUND,
} from '../MoneyNextBestActionParallax';
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
import {
  selectIsCardholder,
  selectCardHomeDataStatus,
} from '../../../../../selectors/cardController';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import {
  COMPONENT_NAMES,
  MONEY_ONBOARDING_STEP_ACTIONS,
  SCREEN_NAMES,
  BOTTOM_SHEET_NAMES,
} from '../../constants/moneyEvents';
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
  const { tokenTotal, isBalanceLoading, apyPercent } = useMoneyAccountBalance();
  const showApy = isPositiveNumber(apyPercent);
  const { trackOnboardingEvent } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.MONEY_HOME,
    component_name: COMPONENT_NAMES.MONEY_ONBOARDING_CARD,
  });

  const {
    startLinkFlow,
    isCardAuthenticated,
    isCardVerified,
    isCardLinkedToMoneyAccount,
    isLinking,
    isResidencyBlocked,
  } = useMoneyAccountCardLinkage();
  const isCardholder = useSelector(selectIsCardholder);
  const cardHomeDataStatus = useSelector(selectCardHomeDataStatus);

  const isMoneyAccountFunded = Boolean(
    !isBalanceLoading && tokenTotal?.isGreaterThan(0),
  );
  const isCardAnalyticsReady =
    cardHomeDataStatus === 'success' || cardHomeDataStatus === 'error';

  const cardState = deriveCardState({
    isCardholder,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
  });

  const isCardStepBlocked = isResidencyBlocked && !isCardLinkedToMoneyAccount;

  const shouldShowLinkCardAction =
    !isCardStepBlocked &&
    (isCardholder ||
      (isCardAuthenticated && isCardVerified && !isCardLinkedToMoneyAccount));

  const handleRedirectToCryptoDeposit = useCallback(async () => {
    await initiateDeposit().catch(() => undefined);
  }, [initiateDeposit]);

  const handleCardCtaPress = useCallback(
    (stepTitleEn: string) => {
      const baseProperties = {
        step: currentStep + 1, // Use 1-based index for event tracking to match total_steps count.
        step_title: stepTitleEn,
        total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
      } as const;

      if (shouldShowLinkCardAction) {
        trackOnboardingEvent({
          ...baseProperties,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.LINK_CARD,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_LINK_SHEET,
        });
      } else {
        trackOnboardingEvent({
          ...baseProperties,
          step_action: MONEY_ONBOARDING_STEP_ACTIONS.GET_CARD,
          redirect_target: BOTTOM_SHEET_NAMES.CARD_AUTH_SHEET,
        });
      }

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

      startLinkFlow(MONEY_HOME_CARD_ORIGIN);
    },
    [
      currentStep,
      shouldShowLinkCardAction,
      startLinkFlow,
      trackOnboardingEvent,
      trackEvent,
      createEventBuilder,
      cardState,
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
    },
    [
      currentStep,
      incrementStep,
      trackOnboardingEvent,
      trackEvent,
      createEventBuilder,
      cardState,
    ],
  );

  const targetStepFromCompletion = useMemo(() => {
    // Step 1 completion is based on having a non-zero balance (after loading).
    const isStep1Complete = isMoneyAccountFunded;

    // Step 2 completion can be evaluated if either:
    // - persisted progress is already at step index ≥ 1 (auto-advanced on a
    //   previous session, or balance has since dropped back to zero), or
    // - step 1 is complete right now (immediately advance funded users).
    const canEvaluateStep2 = currentStep >= 1 || isStep1Complete;
    const isStep2Complete =
      canEvaluateStep2 &&
      ((isCardAuthenticated && isCardLinkedToMoneyAccount) ||
        isCardStepBlocked);

    if (isStep2Complete) return 2;
    if (isStep1Complete) return 1;
    return 0;
  }, [
    currentStep,
    isMoneyAccountFunded,
    isCardAuthenticated,
    isCardLinkedToMoneyAccount,
    isCardStepBlocked,
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
      isBalanceLoading ||
      !isCardAnalyticsReady ||
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
    isBalanceLoading,
    isCardAnalyticsReady,
    isOnboardingCardVisible,
    isVisibleAfterAutoSkip,
    cardState,
  ]);

  const handleStep1CtaPressed = useCallback(() => {
    trackOnboardingEvent({
      step: currentStep + 1, // Use 1-based index for event tracking to match total_steps count.
      step_title: strings('money.onboarding.step_1.title_no_apy', {
        locale: 'en',
      }),
      total_steps: MONEY_ONBOARDING_TOTAL_STEPS,
      step_action: MONEY_ONBOARDING_STEP_ACTIONS.DEPOSIT_INITIATED,
      redirect_target: SCREEN_NAMES.MONEY_DEPOSIT,
    });
    handleRedirectToCryptoDeposit();
  }, [currentStep, handleRedirectToCryptoDeposit, trackOnboardingEvent]);

  // REMINDER: Update MONEY_ONBOARDING_TOTAL_STEPS when steps are added or removed.
  const steps = useMemo((): StepperCardStep[] => {
    if (!isOnboardingCardVisible || !isVisibleAfterAutoSkip) return [];

    const step1: StepperCardStep = {
      title: showApy
        ? strings('money.onboarding.step_1.title', { apy: apyPercent })
        : strings('money.onboarding.step_1.title_no_apy'),
      description: showApy
        ? strings('money.onboarding.step_1.description', { apy: apyPercent })
        : strings('money.onboarding.step_1.description_no_apy'),
      primaryCta: {
        text: strings('money.onboarding.step_1.cta'),
        onPress: handleStep1CtaPressed,
      },
      image: moneyOnboardingStepperStep1,
      media: (
        <MoneyNextBestActionParallax
          artboardName={PARALLAX_ARTBOARD_FUND}
          fallbackImage={moneyOnboardingStepperStep1}
        />
      ),
    };

    const cardStepMedia = (
      <MoneyNextBestActionParallax
        artboardName={PARALLAX_ARTBOARD_CARD}
        fallbackImage={moneyOnboardingStepperStep2}
      />
    );

    // Case 1: Cardholder, or authenticated with a card not yet linked.
    const step2: StepperCardStep = shouldShowLinkCardAction
      ? {
          title: strings('money.onboarding.step_2.unlinked_card_account.title'),
          description: strings(
            'money.onboarding.step_2.unlinked_card_account.description',
          ),
          primaryCta: {
            text: strings(
              'money.onboarding.step_2.unlinked_card_account.cta_primary',
            ),
            onPress: () =>
              handleCardCtaPress(
                strings('money.onboarding.step_2.unlinked_card_account.title', {
                  locale: 'en',
                }),
              ),
            disabled: isLinking,
          },
          secondaryCta: {
            text: strings(
              'money.onboarding.step_2.unlinked_card_account.cta_secondary',
            ),
            onPress: () =>
              handleSkipPress(
                strings('money.onboarding.step_2.unlinked_card_account.title', {
                  locale: 'en',
                }),
              ),
          },
          image: moneyOnboardingStepperStep2,
          media: cardStepMedia,
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
          media: cardStepMedia,
        };

    return [step1, step2];
  }, [
    isOnboardingCardVisible,
    isVisibleAfterAutoSkip,
    showApy,
    apyPercent,
    handleStep1CtaPressed,
    shouldShowLinkCardAction,
    isLinking,
    handleCardCtaPress,
    handleSkipPress,
  ]);

  if (isBalanceLoading || !isOnboardingCardVisible || !isVisibleAfterAutoSkip) {
    return null;
  }

  return (
    <Box twClassName="mx-4 mt-2">
      <StepperCard
        steps={steps}
        currentStep={effectiveCurrentStep}
        testID="money-onboarding-card"
      />
    </Box>
  );
};

export default MoneyOnboardingCard;
