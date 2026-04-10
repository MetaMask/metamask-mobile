import { MessengerClientInitFunction } from '../types';
import {
  PhishingController,
  type PhishingControllerMessenger,
} from '@metamask/phishing-controller';

/**
 * Initialize the phishing controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const phishingControllerInit: MessengerClientInitFunction<
  PhishingController,
  PhishingControllerMessenger
> = ({ controllerMessenger }) => {
  const messengerClient = new PhishingController({
    messenger: controllerMessenger,
  });

  return {
    messengerClient,
  };
};
