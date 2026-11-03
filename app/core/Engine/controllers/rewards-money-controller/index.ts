import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';
import type { MessengerClientInitFunction } from '../../types';
import {
  RewardsMoneyController,
  defaultRewardsMoneyControllerState,
} from './RewardsMoneyController';
import type { RewardsMoneyControllerMessenger } from '../../messengers/rewards-money-controller-messenger';

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
  const rewardsMoneyControllerState =
    persistedState.RewardsMoneyController ?? defaultRewardsMoneyControllerState;

  const controller = new RewardsMoneyController({
    messenger: controllerMessenger,
    state: rewardsMoneyControllerState,
    isDisabled: () =>
      !selectBasicFunctionalityEnabled(getState()) ||
      !selectRewardsMoneyControllerEnabled(getState()),
  });

  return { controller };
};

export { RewardsMoneyController };
export type { RewardsMoneyControllerMessenger };
export {
  defaultRewardsMoneyControllerState,
  getRewardsMoneyControllerDefaultState,
} from './defaultState';
export type { RewardsMoneyControllerGetStateAction } from './types';
export type {
  RewardsMoneyControllerGetReferralMeAction,
  RewardsMoneyControllerGetReferralFunnelAction,
  RewardsMoneyControllerGetReferralCodesAction,
  RewardsMoneyControllerValidateReferralCodeAction,
  RewardsMoneyControllerRegisterRefereeAction,
  RewardsMoneyControllerGetEarningsSummaryAction,
  RewardsMoneyControllerGetEarningsLedgerAction,
  RewardsMoneyControllerGetClaimHistoryAction,
  RewardsMoneyControllerGetClaimByIdAction,
  RewardsMoneyControllerIsRewardsMoneyFeatureEnabledAction,
  RewardsMoneyControllerGetRewardsMoneyEnvUrlAction,
  RewardsMoneyControllerCanChangeRewardsMoneyEnvUrlAction,
  RewardsMoneyControllerGetDefaultRewardsMoneyEnvUrlAction,
  RewardsMoneyControllerSetRewardsMoneyEnvUrlAction,
} from './RewardsMoneyController-method-action-types';
