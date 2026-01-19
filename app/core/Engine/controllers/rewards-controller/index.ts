import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import type { ControllerInitFunction } from '../../types';
import {
  RewardsController,
  RewardsControllerMessenger,
  defaultRewardsControllerState,
} from './RewardsController';
import { getFeatureFlagValue } from '../../../../selectors/featureFlagController/env';

/**
 * Initialize the RewardsController.
 *
 * @param request - The request object.
 * @returns The RewardsController.
 */
export const rewardsControllerInit: ControllerInitFunction<
  RewardsController,
  RewardsControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState } = request;
  const rewardsControllerState =
    persistedState.RewardsController ?? defaultRewardsControllerState;

  const controller = new RewardsController({
    messenger: controllerMessenger,
    state: rewardsControllerState,
    isDisabled: () => {
      const isEnabled = selectBasicFunctionalityEnabled(getState());
      return !isEnabled;
    },
    isBtcEnabled: () => {
      try {
        const remoteValue =
          controllerMessenger.call('RemoteFeatureFlagController:getState')
            ?.remoteFeatureFlags?.['rewards-bitcoin-enabled'] ?? false;
        return getFeatureFlagValue(
          process.env.MM_REWARDS_BITCOIN_ENABLED,
          Boolean(remoteValue),
        );
      } catch {
        // If RemoteFeatureFlagController is not available, fall back to env variable
        return getFeatureFlagValue(
          process.env.MM_REWARDS_BITCOIN_ENABLED,
          false,
        );
      }
    },
    isTronEnabled: () => {
      try {
        const remoteValue =
          controllerMessenger.call('RemoteFeatureFlagController:getState')
            ?.remoteFeatureFlags?.['rewards-tron-enabled'] ?? false;
        return getFeatureFlagValue(
          process.env.MM_REWARDS_TRON_ENABLED,
          Boolean(remoteValue),
        );
      } catch {
        // If RemoteFeatureFlagController is not available, fall back to env variable
        return getFeatureFlagValue(process.env.MM_REWARDS_TRON_ENABLED, false);
      }
    },
  });

  return { controller };
};

export { RewardsController };
export type { RewardsControllerMessenger };
