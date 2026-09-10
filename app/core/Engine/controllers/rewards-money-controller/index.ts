import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import type { MessengerClientInitFunction } from '../../types';
import {
  RewardsMoneyController,
  type RewardsMoneyControllerMessenger,
  defaultRewardsMoneyControllerState,
} from './RewardsMoneyController';

/**
 * Initialize the RewardsMoneyController.
 *
 * @param request - The request object.
 * @returns The RewardsMoneyController.
 */
export const rewardsMoneyControllerInit: MessengerClientInitFunction<
  RewardsMoneyController,
  RewardsMoneyControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState, getState } = request;

  const controller = new RewardsMoneyController({
    messenger: controllerMessenger,
    state:
      persistedState.RewardsMoneyController ??
      defaultRewardsMoneyControllerState,
    isDisabled: () => !selectBasicFunctionalityEnabled(getState()),
  });

  return { controller };
};

export { RewardsMoneyController };
export type { RewardsMoneyControllerMessenger };
export type {
  RewardsMoneyControllerGetStateAction,
  RewardsMoneyControllerState,
} from './types';
export type {
  RewardsMoneyControllerGetReferralMeAction,
  RewardsMoneyControllerGetEarningsSummaryAction,
  RewardsMoneyControllerGetEarningsLedgerAction,
  RewardsMoneyControllerInitiateClaimAction,
  RewardsMoneyControllerInvalidateRewardsMoneyCacheAction,
  RewardsMoneyControllerNotifyEarningsUpdatedAction,
  RewardsMoneyControllerResetStateAction,
} from './RewardsMoneyController-method-action-types';
