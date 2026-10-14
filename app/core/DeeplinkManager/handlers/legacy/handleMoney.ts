/* eslint-disable jsdoc/check-indentation */
import { selectIsMoneyAccountGeoEligible } from '../../../../components/UI/Money/selectors/eligibility';
import Routes from '../../../../constants/navigation/Routes';
import { getVbaEligibility } from '../../../../components/UI/Ramp/Views/VirtualBankAccount/hooks/useVbaEligibility';
import { VbaOnboardingRoutes } from '../../../../components/UI/Ramp/Views/VirtualBankAccount/routes';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user';
import {
  isVbaGeoBypassEnabled,
  selectMoneyMovementBrazilNeobankEnabled,
  selectMoneyOnboardingStepperAnimationEnabled,
} from '../../../../selectors/featureFlagController/moneyAccount';
import {
  selectGeolocationLocation,
  selectGeolocationStatus,
} from '../../../../selectors/geolocationController';
import Logger from '../../../../util/Logger';
import NavigationService from '../../../NavigationService';
import ReduxService from '../../../redux';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import {
  hasMinimumRequiredVersion,
  isVersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import {
  selectRawRemoteFeatureFlags,
  selectRemoteFeatureFlags,
} from '../../../../selectors/featureFlagController';
import { RootState } from '../../../../reducers';
import { MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME } from '../../../../lib/Money/feature-flags';
import { strings } from '../../../../../locales/i18n';

enum MoneyAccountFlagStatus {
  Enabled = 'enabled',
  Disabled = 'disabled',
  NotInRollout = 'not_in_rollout',
}

/**
 * We use 2 shapes for feature flags:
 *
 * Type 1: Standard flags.
 * {
 *   enabled: boolean,
 *   minimumVersion: string
 * }
 *
 * Type 2: Gradual rollout flags.
 * [
 *   {
 *     scope: {
 *       type: string,
 *       value: number,
 *     },
 *     thresholdName: string,
 *     thresholdVersion: number,
 *     value: {
 *       enabled: boolean,
 *       minimumVersion: string,
 *     },
 *   },
 *   {
 *     scope: {
 *       type: string,
 *       value: number,
 *     },
 *     thresholdName: string,
 *     thresholdVersion: number,
 *     value: {
 *       enabled: boolean,
 *       minimumVersion: string,
 *     },
 *   },
 * ]
 */
const getMoneyAccountFlagStatus = (
  state: RootState,
): MoneyAccountFlagStatus => {
  // Raw flag contains gradual rollout config shape.
  const rawFlag =
    selectRawRemoteFeatureFlags(state)?.[MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME];

  // Resolved flag respects basic-functionality gating, local overrides, and rollout cohort resolution.
  const resolvedFlag =
    selectRemoteFeatureFlags(state)?.[MONEY_ENABLE_MONEY_ACCOUNT_FLAG_NAME];

  if (!Array.isArray(rawFlag)) {
    // Standard flags must use the resolved selector to match Money stack registration.
    return validatedVersionGatedFeatureFlag(resolvedFlag)
      ? MoneyAccountFlagStatus.Enabled
      : MoneyAccountFlagStatus.Disabled;
  }

  // Array → active gradual rollout; resolvedFlag is the selected cohort's value
  if (!isVersionGatedFeatureFlag(resolvedFlag)) {
    Logger.error(
      new Error('Malformed money account rollout flag value'),
      '[handleMoney] getMoneyAccountFlagStatus received an invalid resolved rollout flag',
    );
    return MoneyAccountFlagStatus.Disabled;
  }

  if (!resolvedFlag.enabled) {
    return MoneyAccountFlagStatus.NotInRollout; // in the "disabled" cohort
  }

  // In the "enabled" cohort, but still version-gated
  return hasMinimumRequiredVersion(resolvedFlag.minimumVersion)
    ? MoneyAccountFlagStatus.Enabled
    : MoneyAccountFlagStatus.Disabled;
};

const navigateToDeeplinkModal = (title: string, description: string) =>
  NavigationService.navigation.navigate(Routes.MONEY.MODALS.DEEPLINK_MODAL, {
    title,
    description,
  });

/** `screen` value that opens the user's money account (Pix details or the next onboarding step). */
export const MONEY_ACCOUNT_SCREEN = 'account';

// Same gate as the Add money sheet's bank account row (`useVbaEligibility`).
const isVbaEligible = (state: RootState): boolean =>
  getVbaEligibility({
    isFlagEnabled: selectMoneyMovementBrazilNeobankEnabled(state),
    location: selectGeolocationLocation(state),
    geolocationStatus: selectGeolocationStatus(state),
    isDevBypassEnabled: isVbaGeoBypassEnabled(),
  }).isEligible;

/**
 * Handles the /money universal link.
 *
 * Supported URL formats:
 * - https://link.metamask.io/money → Money home
 * - https://link.metamask.io/money?screen=account → Money home, then the
 *   money account flow. Its loading screen hydrates and routes to the account
 *   details, or to the next onboarding step if the account is not ready yet.
 *   Users who are not VBA eligible stay on Money home.
 *
 * Unknown `screen` values open Money home, so older links keep working.
 *
 * @param params - The params object
 * @param params.moneyPath - The remainder of the URL after the action (e.g.
 * '?screen=account')
 */
export const handleMoney = ({ moneyPath }: { moneyPath?: string } = {}) => {
  DevLogger.log('[handleMoney] Starting deeplink handling');

  try {
    const urlParams = new URLSearchParams(
      moneyPath?.includes('?') ? moneyPath.split('?')[1] : '',
    );
    const state = ReduxService.store.getState();
    const isMoneyAccountGeoEligible = selectIsMoneyAccountGeoEligible(state);
    const hasSeenMoneyOnboarding = selectMoneyOnboardingSeen(state);
    const isOnboardingEnabled =
      selectMoneyOnboardingStepperAnimationEnabled(state);

    const moneyAccountFlagStatus = getMoneyAccountFlagStatus(state);

    if (moneyAccountFlagStatus === MoneyAccountFlagStatus.Disabled) {
      navigateToDeeplinkModal(
        strings('money.deeplink_modal.money_account_disabled.title'),
        strings('money.deeplink_modal.money_account_disabled.description'),
      );
      return;
    }

    // User not part of gradual rollout cohort yet.
    if (moneyAccountFlagStatus === MoneyAccountFlagStatus.NotInRollout) {
      navigateToDeeplinkModal(
        strings('money.deeplink_modal.excluded_from_gradual_rollout.title'),
        strings(
          'money.deeplink_modal.excluded_from_gradual_rollout.description',
        ),
      );
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

    NavigationService.navigation.navigate(
      Routes.HOME_TABS,
      {
        screen: Routes.MONEY.ROOT,
        params: { screen: Routes.MONEY.HOME },
      },
      { pop: true },
    );

    if (
      urlParams.get('screen') === MONEY_ACCOUNT_SCREEN &&
      isVbaEligible(state)
    ) {
      // Same entry as Add money > bank account: Money home stays underneath,
      // so back returns there.
      NavigationService.navigation.navigate(Routes.RAMP.VBA_ONBOARDING, {
        screen: VbaOnboardingRoutes.LOADING,
      });
    }
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
