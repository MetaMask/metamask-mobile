import { MessengerClientInitFunction } from '../types';
import {
  MultichainRoutingService,
  type MultichainRoutingServiceMessenger,
} from '@metamask/snaps-controllers';
import { MultichainRoutingServiceInitMessenger } from '../messengers/multichain-routing-service-messenger';
import { SnapKeyring } from '@metamask/eth-snap-keyring';

/**
 * Initialize the multichain routing service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const multichainRoutingServiceInit: MessengerClientInitFunction<
  MultichainRoutingService,
  MultichainRoutingServiceMessenger,
  MultichainRoutingServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const withSnapKeyring = async <ReturnType>(
    operation: ({ keyring }: { keyring: SnapKeyring }) => Promise<ReturnType>,
  ) => {
    const keyring = await initMessenger.call(
      'SnapAccountService:getLegacySnapKeyring',
    );
    return operation({ keyring });
  };

  const controller = new MultichainRoutingService({
    messenger: controllerMessenger,

    withSnapKeyring,
  });

  return {
    controller,
  };
};
