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
  const { controllerMessenger, persistedState } = request;

  const rewardsControllerState =
    persistedState.RewardsController ?? defaultRewardsControllerState;

  const controller = new RewardsController({
    messenger: controllerMessenger,
    state: rewardsControllerState,
  });

  return { controller };
};

export { RewardsController };
export type { RewardsControllerMessenger };
