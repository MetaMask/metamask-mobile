import {
  NeoBankService,
  type NeoBankServiceMessenger,
} from '@metamask/ramps-controller';
import type { MessengerClientInitFunction } from '../../types';
import { getRampsContext, getRampsEnvironment } from './ramps-service-init';

/**
 * Initialize the neo-bank API service used by Money Account onboarding.
 *
 * @param request - The initialization request.
 * @param request.controllerMessenger - The service messenger.
 * @returns The initialized service.
 */
export const neoBankServiceInit: MessengerClientInitFunction<
  NeoBankService,
  NeoBankServiceMessenger
> = ({ controllerMessenger }) => ({
  controller: new NeoBankService({
    messenger: controllerMessenger,
    environment: getRampsEnvironment(),
    context: getRampsContext(),
    fetch,
  }),
});
