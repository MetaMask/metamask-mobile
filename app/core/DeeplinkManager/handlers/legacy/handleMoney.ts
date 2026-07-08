import { selectIsMoneyAccountGeoEligible } from '../../../../components/UI/Money/selectors/eligibility';
import { selectMoneyEnableMoneyAccountFlag } from '../../../../components/UI/Money/selectors/featureFlags';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import ReduxService from '../../../redux';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { DeepLinkModalLinkType } from '../../types/deepLink.types';
import handleDeepLinkModalDisplay from './handleDeepLinkModalDisplay';

export const handleMoney = () => {
  DevLogger.log('[handleMoney] Starting deeplink handling');

  try {
    const state = ReduxService.store.getState();
    const isMoneyAccountGeoEligible = selectIsMoneyAccountGeoEligible(state);
    const isMoneyAccountEnabled = selectMoneyEnableMoneyAccountFlag(state);
    const hasSeenMoneyOnboarding = selectMoneyOnboardingSeen(state);
    const isOnboardingEnabled =
      selectMoneyOnboardingStepperAnimationEnabled(state);

    if (!isMoneyAccountEnabled) {
      handleDeepLinkModalDisplay({
        linkType: DeepLinkModalLinkType.UNSUPPORTED,
        onBack: () => {
          NavigationService.navigation.navigate(Routes.WALLET.HOME);
        },
      });
      return;
    }

    if (!isMoneyAccountGeoEligible) {
      NavigationService.navigation.navigate(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
      });
      return;
    }

    if (!hasSeenMoneyOnboarding && isOnboardingEnabled) {
      NavigationService.navigation.navigate(Routes.MONEY.ONBOARDING);
      return;
    }
    NavigationService.navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  } catch (error) {
    DevLogger.log('[handleMoney] Failed to handle deeplink:', error);
    Logger.error(error as Error, '[handleMoney] Error handling money deeplink');
    try {
      NavigationService.navigation.navigate(Routes.WALLET.HOME);
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleMoney] Failed to navigate to fallback screen',
      );
    }
  }
};
