import { MessengerClientInitFunction } from '../../types';
import {
  NeoBankService,
  NeoBankServiceMessenger,
} from '@metamask/ramps-controller';
import { getRampsContext, getRampsEnvironment } from './ramps-service-init';

/**
 * Initialize the neo-bank service (Ramp API `/neobank/*` proxy).
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const neoBankServiceInit: MessengerClientInitFunction<
  NeoBankService,
  NeoBankServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new NeoBankService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch,
  });

  return {
    controller: service,
  };
};
