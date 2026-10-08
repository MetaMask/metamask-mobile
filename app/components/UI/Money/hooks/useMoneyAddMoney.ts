import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import { MoneyPostOnboardingRedirectType } from '../types/navigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import Logger from '../../../../util/Logger';
import {
  BOTTOM_SHEET_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../constants/moneyEvents';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import type { MoneyButtonClickedInputProperties } from '../types/moneyEvents.types';

interface UseMoneyAddMoneyOptions {
  buttonLabelKey?: string;
  logTag?: string;
  trackButtonClicked: (properties: MoneyButtonClickedInputProperties) => void;
}

export function useMoneyAddMoney({
  buttonLabelKey = 'money.balance_card.add',
  logTag = '[MoneyBalanceCard]',
  trackButtonClicked,
}: UseMoneyAddMoneyOptions) {
  const navigation = useNavigation<AppNavigationProp>();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );
  const isMoneyAccountGeoEligible = useSelector(
    selectIsMoneyAccountGeoEligible,
  );

  const navigateToGeoBlockSheet = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
  }, [navigation]);

  const handleAddPress = useCallback(async () => {
    const redirectedToGeoBlock = !isMoneyAccountGeoEligible;
    const redirectedToOnboarding =
      !redirectedToGeoBlock && !hasSeenMoneyOnboarding && isOnboardingEnabled;

    trackButtonClicked({
      button_type: MONEY_BUTTON_TYPES.TEXT,
      button_intent: redirectedToOnboarding
        ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
        : MONEY_BUTTON_INTENTS.ADD_MONEY,
      label_key: buttonLabelKey,
      redirect_target: redirectedToGeoBlock
        ? BOTTOM_SHEET_NAMES.MONEY_GEO_BLOCK_SHEET
        : redirectedToOnboarding
          ? SCREEN_NAMES.MONEY_ONBOARDING
          : SCREEN_NAMES.MONEY_DEPOSIT,
    });

    if (redirectedToGeoBlock) {
      navigateToGeoBlockSheet();
      return;
    }

    if (redirectedToOnboarding) {
      navigation.navigate(Routes.MONEY.ONBOARDING, {
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      });
      return;
    }

    try {
      await initiateDeposit();
    } catch (error) {
      Logger.error(error as Error, {
        message: `${logTag} Failed to initiate deposit`,
      });
    }
  }, [
    buttonLabelKey,
    hasSeenMoneyOnboarding,
    initiateDeposit,
    isMoneyAccountGeoEligible,
    isOnboardingEnabled,
    logTag,
    navigateToGeoBlockSheet,
    navigation,
    trackButtonClicked,
  ]);

  return { handleAddPress };
}
