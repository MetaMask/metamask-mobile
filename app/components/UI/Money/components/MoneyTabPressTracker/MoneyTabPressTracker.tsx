import { useEffect } from 'react';
import {
  COMPONENT_NAMES,
  MONEY_BUTTON_INTENTS,
  MONEY_BUTTON_TYPES,
  SCREEN_NAMES,
} from '../../constants/moneyEvents';
import { LABEL_BY_TAB_BAR_ICON_KEY } from '../../../../../component-library/components/Navigation/TabBar/TabBar.constants';
import { TabBarIconKey } from '../../../../../component-library/components/Navigation/TabBar/TabBar.types';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';
import { selectMoneyOnboardingSeen } from '../../../../../reducers/user';
import { useSelector } from 'react-redux';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../../selectors/featureFlagController/moneyAccount';

/**
 * Renders nothing — exists purely to host the Money analytics hook chain so it
 * is only mounted when the Money account feature flag is enabled. It publishes
 * `trackButtonClicked` to the provided ref so the Money tab's press callback
 * (defined in HomeTabs) can fire the event without HomeTabs itself depending on
 * `useMoneyAnalytics` for every user.
 */

interface MoneyTabPressTrackerProps {
  onRegister: (fn: (() => void) | null) => void;
}

const MoneyTabPressTracker = ({ onRegister }: MoneyTabPressTrackerProps) => {
  const { trackButtonClicked } = useMoneyAnalytics({
    component_name: COMPONENT_NAMES.MONEY_HOME_TAB,
  });

  const hasSeenMoneyOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );

  useEffect(() => {
    onRegister(() => {
      let redirectTarget: SCREEN_NAMES;
      let buttonIntent: MONEY_BUTTON_INTENTS;

      if (hasSeenMoneyOnboarding || !isOnboardingEnabled) {
        redirectTarget = SCREEN_NAMES.MONEY_HOME;
        buttonIntent = MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME;
      } else {
        redirectTarget = SCREEN_NAMES.MONEY_ONBOARDING;
        buttonIntent = MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING;
      }

      const labelKey = LABEL_BY_TAB_BAR_ICON_KEY[TabBarIconKey.Money];
      trackButtonClicked({
        button_type: MONEY_BUTTON_TYPES.TEXT,
        button_intent: buttonIntent,
        label_key: labelKey,
        redirect_target: redirectTarget,
      });
    });
    return () => {
      onRegister(null);
    };
  }, [
    trackButtonClicked,
    onRegister,
    hasSeenMoneyOnboarding,
    isOnboardingEnabled,
  ]);

  return null;
};

export default MoneyTabPressTracker;
