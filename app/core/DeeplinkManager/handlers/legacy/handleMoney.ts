/* eslint-disable jsdoc/check-indentation */
import { selectIsMoneyAccountGeoEligible } from '../../../../components/UI/Money/selectors/eligibility';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
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

export const handleMoney = () => {
  DevLogger.log('[handleMoney] Starting deeplink handling');

  try {
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
