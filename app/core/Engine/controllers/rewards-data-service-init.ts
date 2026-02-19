import { ControllerInitFunction } from '../types';
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
export const rewardsDataServiceInit: ControllerInitFunction<
  RewardsDataService,
  RewardsDataServiceMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new RewardsDataService({
    messenger: controllerMessenger,
    locale: I18n.locale,
    fetch,
  });

  // Restore persisted UAT backend preference from RewardsController state
  const rewardsState = persistedState?.RewardsController as
    | Partial<RewardsControllerState>
    | undefined;
  if (rewardsState?.useUatBackend) {
    controller.setUseUatBackend(true);
  }

  return {
    controller,
  };
};
