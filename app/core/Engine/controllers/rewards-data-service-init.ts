import { ControllerInitFunction } from '../types';
import {
  RewardsDataService,
  type RewardsDataServiceMessenger,
} from './rewards-controller/services';
import I18n from '../../../../locales/i18n';

/**
 * Initialize the rewards data service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized controller.
 */
export const rewardsDataServiceInit: ControllerInitFunction<
  RewardsDataService,
  RewardsDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new RewardsDataService({
    messenger: controllerMessenger,
    locale: I18n.locale,
    fetch,
  });

  return {
    controller,
  };
};
