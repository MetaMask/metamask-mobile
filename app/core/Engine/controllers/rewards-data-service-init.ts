import { MessengerClientInitFunction } from '../types';
import {
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-controller/services';
import I18n from '../../../../locales/i18n';
import type { RewardsControllerState } from './rewards-controller/types';

/**
 * Initialize the rewards data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.persistedState - The full persisted state for all controllers.
 * @returns The initialized controller.
 */
export const rewardsDataServiceInit: MessengerClientInitFunction<
  RewardsDataService,
  RewardsDataServiceMessenger
> = ({ controllerMessenger, persistedState }) => {
  const messengerClient = new RewardsDataService({
    messenger: controllerMessenger,
    locale: I18n.locale,
    fetch,
  });

  // Restore persisted env override from RewardsController state
  const rewardsState = persistedState?.RewardsController as
    | Partial<RewardsControllerState>
    | undefined;
  if (rewardsState?.rewardsEnvUrl) {
    messengerClient.setRewardsEnvUrl(rewardsState.rewardsEnvUrl);
  }

  return {
    messengerClient,
  };
};
