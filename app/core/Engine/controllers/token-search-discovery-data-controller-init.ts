import { ControllerInitFunction } from '../types';
import {
  TokenSearchDiscoveryDataController,
  type TokenSearchDiscoveryDataControllerMessenger,
} from '@metamask/assets-controllers';

/**
 * Initialize the token search discovery data controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenSearchDiscoveryDataControllerInit: ControllerInitFunction<
  TokenSearchDiscoveryDataController,
  TokenSearchDiscoveryDataControllerMessenger
> = ({ controllerMessenger, codefiTokenApiV2 }) => {
  const controller = new TokenSearchDiscoveryDataController({
    messenger: controllerMessenger,
    tokenPricesService: codefiTokenApiV2,
  });

  return {
    controller,
  };
};
