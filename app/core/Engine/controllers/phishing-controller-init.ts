import { ControllerInitFunction } from '../types';
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
export const phishingControllerInit: ControllerInitFunction<
  PhishingController,
  PhishingControllerMessenger
> = ({ controllerMessenger }) => {
  const controller = new PhishingController({
    messenger: controllerMessenger,
  });

  return {
    controller,
  };
};
