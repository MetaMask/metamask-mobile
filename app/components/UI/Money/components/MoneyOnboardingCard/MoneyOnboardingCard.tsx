import React, { useCallback, useEffect, useMemo } from 'react';
import { Box } from '@metamask/design-system-react-native';
import moneyOnboardingStepperStep1 from '../../../../../images/money-onboarding-stepper-step-1.png';
import moneyOnboardingStepperStep2 from '../../../../../images/money-onboarding-stepper-step-2.png';
import { strings } from '../../../../../../locales/i18n';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { BigNumber } from 'bignumber.js';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { selectIsCardholder } from '../../../../../selectors/cardController';
import useMoneyAccountCardLinkage from '../../../Card/hooks/useMoneyAccountCardLinkage';
import { useMoneyOnboardingStep } from '../../hooks/useMoneyOnboardingStep';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import StepperCard, {
  type StepperCardStep,
} from '../../../../../component-library/components-temp/StepperCard';

// REMINDER: Must be updated when the number of steps is changed.
export const MONEY_ONBOARDING_TOTAL_STEPS = 2;

const MoneyOnboardingCard = () => {
  const navigation = useNavigation();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const { currentStep, incrementStep } = useMoneyOnboardingStep();

  const isOnboardingCardVisible = currentStep < MONEY_ONBOARDING_TOTAL_STEPS;

  const { apyPercent } = useMoneyAccountBalance();

  const { tokens } = useMusdConversionTokens();

  const isCardholder = useSelector(selectIsCardholder);

  // Note: moneyAccountCardToken is null if the card is not linked.
  const { moneyAccountCardToken, canLink, openLinkCardSheet } =
    useMoneyAccountCardLinkage();

  const conversionTokensFiatTotal = useMemo(
    () =>
      tokens.reduce(
        (acc, token) => acc.plus(new BigNumber(token.fiat?.balance ?? 0)),
        new BigNumber(0),
      ),
    [tokens],
  );

  const conversionTokensFiatTotalFormatted = moneyFormatFiat(
    conversionTokensFiatTotal,
    currentCurrency,
  );

  const { tokenBalanceAggregated: musdTokenBalanceAcrossChains } =
    useMusdBalance();

  const handleAddPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  }, [navigation]);

  const handleApyInfoPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.APY_INFO_SHEET,
      params: { apy: apyPercent },
    });
  }, [navigation, apyPercent]);

  const handleLinkCardPress = useCallback(() => {
    if (isCardholder && canLink) {
      openLinkCardSheet();
      return;
    }
    navigation.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
    });
  }, [isCardholder, canLink, openLinkCardSheet, navigation]);

  const handleSkipPress = useCallback(() => {
    incrementStep();
  }, [incrementStep]);

  const getStep1Content = useCallback((): StepperCardStep => {
    const aggregatedMusdBalanceBN = new BigNumber(musdTokenBalanceAcrossChains);

    // Case 1: Has crypto but no mUSD
    if (
      !conversionTokensFiatTotal.isZero() &&
      aggregatedMusdBalanceBN.isZero()
    ) {
      return {
        title: strings('money.onboarding.step_1.title'),
        description: strings(
          'money.onboarding.step_1.description_has_crypto_no_musd',
          {
            cryptoAmountFiatFormatted: conversionTokensFiatTotalFormatted,
          },
        ),
        onDescriptionTooltipPress: handleApyInfoPress,
        primaryCta: {
          text: strings('money.onboarding.step_1.cta'),
          onPress: handleAddPress,
        },
        image: moneyOnboardingStepperStep1,
      };
    }

    // Case 2: Has mUSD
    if (!aggregatedMusdBalanceBN.isZero()) {
      return {
        title: strings('money.onboarding.step_1.title'),
        description: strings('money.onboarding.step_1.description_has_musd', {
          musdTokenAmountFormatted: new BigNumber(
            musdTokenBalanceAcrossChains,
          ).toFixed(2),
        }),
        onDescriptionTooltipPress: handleApyInfoPress,
        primaryCta: {
          text: strings('money.onboarding.step_1.cta'),
          onPress: handleAddPress,
        },
        image: moneyOnboardingStepperStep1,
      };
    }

    // Default case: No crypto or mUSD balance
    return {
      title: strings('money.onboarding.step_1.title'),
      description: strings(
        'money.onboarding.step_1.description_no_crypto_no_musd',
      ),
      primaryCta: {
        text: strings('money.onboarding.step_1.cta'),
        onPress: handleAddPress,
      },
      image: moneyOnboardingStepperStep1,
    };
  }, [
    conversionTokensFiatTotal,
    conversionTokensFiatTotalFormatted,
    handleAddPress,
    handleApyInfoPress,
    musdTokenBalanceAcrossChains,
  ]);

  const handleGetCardPress = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const getStep2Content = useCallback((): StepperCardStep => {
    // Case 1: Has card but not linked
    if (isCardholder && !moneyAccountCardToken) {
      return {
        title: strings('money.onboarding.step_2.unlinked_card_account.title'),
        description: strings(
          'money.onboarding.step_2.unlinked_card_account.description',
        ),
        primaryCta: {
          text: strings(
            'money.onboarding.step_2.unlinked_card_account.cta_primary',
          ),
          onPress: handleLinkCardPress,
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
    // Default case: No card account
    return {
      title: strings('money.onboarding.step_2.no_card_account.title'),
      description: strings(
        'money.onboarding.step_2.no_card_account.description',
      ),
      primaryCta: {
        text: strings('money.onboarding.step_2.no_card_account.cta_primary'),
        onPress: handleGetCardPress,
      },
      secondaryCta: {
        text: strings('money.onboarding.step_2.no_card_account.cta_secondary'),
        onPress: handleSkipPress,
      },
      image: moneyOnboardingStepperStep2,
    };
  }, [
    handleGetCardPress,
    handleLinkCardPress,
    handleSkipPress,
    isCardholder,
    moneyAccountCardToken,
  ]);

  /**
   * Auto-skip step 2 ("Get/Link your MetaMask Card") when the user is already
   * a cardholder AND has a linked card token
   */
  useEffect(() => {
    if (currentStep === 1 && isCardholder && !!moneyAccountCardToken) {
      incrementStep();
    }
  }, [currentStep, incrementStep, isCardholder, moneyAccountCardToken]);

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
