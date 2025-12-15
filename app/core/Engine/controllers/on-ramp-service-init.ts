import { ControllerInitFunction } from '../types';
import {
  OnRampService,
  OnRampServiceMessenger,
  OnRampEnvironment,
} from '@metamask/ramps-controller';

/**
 * Initialize the on-ramp service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const onRampServiceInit: ControllerInitFunction<
  OnRampService,
  OnRampServiceMessenger
> = ({ baseControllerMessenger }) => {
  const service = new OnRampService({
    messenger: baseControllerMessenger as unknown as OnRampServiceMessenger,
    environment: OnRampEnvironment.Staging,
    fetch,
  });

  return {
    controller: service,
  };
};
