import { MessengerClientInitFunction } from '../types';
import {
  PhishingDataService,
  type PhishingDataServiceMessenger,
} from '@metamask/phishing-controller';

/**
 * Initialize the phishing data service, which performs all network requests
 * on behalf of the phishing controller. The service is initialized eagerly so
 * that its persisted query cache is rehydrated during startup.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const phishingDataServiceInit: MessengerClientInitFunction<
  PhishingDataService,
  PhishingDataServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new PhishingDataService({
    messenger: controllerMessenger,
  });

  controller.init();

  return {
    controller,
  };
};
