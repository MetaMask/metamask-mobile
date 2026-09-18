import { MessengerClientInitFunction } from '../types';
import {
  RewardsMoneyDataService,
  type RewardsMoneyDataServiceMessenger,
} from './rewards-money-controller/services';
import I18n from '../../../../locales/i18n';
import type { RewardsMoneyControllerState } from './rewards-money-controller/types';

/**
 * Initialize the Rewards Money data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.persistedState - The full persisted state for all controllers.
 * @returns The initialized controller.
 */
export const rewardsMoneyDataServiceInit: MessengerClientInitFunction<
  RewardsMoneyDataService,
  RewardsMoneyDataServiceMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new RewardsMoneyDataService({
    messenger: controllerMessenger,
    locale: I18n.locale,
    fetch,
    getBearerToken: () =>
      controllerMessenger.call('AuthenticationController:getBearerToken'),
  });

  // Restore persisted env override from RewardsMoneyController state
  const rewardsMoneyState = persistedState?.RewardsMoneyController as
    | Partial<RewardsMoneyControllerState>
    | undefined;
  if (rewardsMoneyState?.rewardsMoneyEnvUrl) {
    controller.setRewardsMoneyEnvUrl(rewardsMoneyState.rewardsMoneyEnvUrl);
  }

  return {
    controller,
  };
};
