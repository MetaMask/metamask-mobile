import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import {
  selectBitcoinRewardsEnabledFlag,
  selectTronRewardsEnabledFlag,
  selectSnapshotsRewardsEnabledFlag,
} from '../../../../selectors/featureFlagController/rewards/rewardsEnabled';
import type { ControllerInitFunction } from '../../types';
import {
  RewardsController,
  RewardsControllerMessenger,
  defaultRewardsControllerState,
} from './RewardsController';

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
    isBitcoinOptinEnabled: () => selectBitcoinRewardsEnabledFlag(getState()),
    isTronOptinEnabled: () => selectTronRewardsEnabledFlag(getState()),
    isSnapshotsEnabled: () => selectSnapshotsRewardsEnabledFlag(getState()),
  });

  return { controller };
};

export { RewardsController };
export type { RewardsControllerMessenger };
