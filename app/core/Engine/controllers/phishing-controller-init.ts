import { ControllerInitFunction } from '../types';
import { PhishingController } from '@metamask/phishing-controller';
import { PhishingControllerMessenger } from '../messengers/phishing-controller-messenger';
import { isProductSafetyDappScanningEnabled } from '../../../util/phishingDetection';

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
> = ({ controllerMessenger, getState }) => {
  const controller = new PhishingController({
    messenger: controllerMessenger,
  });

  if (!isProductSafetyDappScanningEnabled(getState())) {
    controller.maybeUpdateState();
  }

  return {
    controller,
  };
};
