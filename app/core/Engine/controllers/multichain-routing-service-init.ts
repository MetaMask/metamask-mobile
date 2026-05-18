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
> = ({ controllerMessenger, getMessengerClient }) => {
  const snapAccountService = getMessengerClient('SnapAccountService');

  const getSnapKeyring = async (): Promise<SnapKeyring> =>
    (await snapAccountService.getLegacySnapKeyring()) as SnapKeyring;

  const withSnapKeyring = async (
    operation: ({ keyring }: { keyring: unknown }) => void,
  ) => {
    const keyring = await getSnapKeyring();
    return operation({ keyring });
  };

  const controller = new MultichainRoutingService({
    messenger: controllerMessenger,

    // @ts-expect-error: Type for `withSnapKeyring` is different.
    withSnapKeyring,
  });

  return {
    controller,
  };
};
