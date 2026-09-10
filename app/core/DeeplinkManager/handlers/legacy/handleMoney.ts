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
import type { DeeplinkIntent } from '../../types/DeeplinkIntent';

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

export const createMoneyDeeplinkIntent = (
  state: RootState = ReduxService.store.getState(),
): DeeplinkIntent => {
  const moneyAccountFlagStatus = getMoneyAccountFlagStatus(state);

  if (moneyAccountFlagStatus === MoneyAccountFlagStatus.Disabled) {
    return {
      target: {
        type: 'main-stack',
        routeName: Routes.MONEY.MODALS.DEEPLINK_MODAL,
        params: {
          title: strings('money.deeplink_modal.money_account_disabled.title'),
          description: strings(
            'money.deeplink_modal.money_account_disabled.description',
          ),
        },
      },
    };
  }

  if (moneyAccountFlagStatus === MoneyAccountFlagStatus.NotInRollout) {
    return {
      target: {
        type: 'main-stack',
        routeName: Routes.MONEY.MODALS.DEEPLINK_MODAL,
        params: {
          title: strings(
            'money.deeplink_modal.excluded_from_gradual_rollout.title',
          ),
          description: strings(
            'money.deeplink_modal.excluded_from_gradual_rollout.description',
          ),
        },
      },
    };
  }

  if (!selectIsMoneyAccountGeoEligible(state)) {
    return {
      target: {
        type: 'main-stack',
        routeName: Routes.MONEY.MODALS.ROOT,
        params: { screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET },
      },
    };
  }

  if (
    !selectMoneyOnboardingSeen(state) &&
    selectMoneyOnboardingStepperAnimationEnabled(state)
  ) {
    return {
      target: {
        type: 'main-stack',
        routeName: Routes.MONEY.ONBOARDING,
      },
    };
  }

  return {
    target: {
      type: 'home-tab',
      routeName: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    },
  };
};

export const handleMoney = () => {
  DevLogger.log('[handleMoney] Starting deeplink handling');

  try {
    const { target } = createMoneyDeeplinkIntent();
    if (target.type === 'home-tab') {
      NavigationService.navigation.navigate(
        Routes.HOME_TABS,
        {
          screen: target.routeName,
          params: target.params,
        },
        { pop: true },
      );
    } else if (target.params) {
      NavigationService.navigation.navigate(target.routeName, target.params);
    } else {
      NavigationService.navigation.navigate(target.routeName);
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
