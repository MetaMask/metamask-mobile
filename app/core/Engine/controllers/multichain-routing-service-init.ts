import { MessengerClientInitFunction } from '../types';
import {
  MultichainRoutingService,
  type MultichainRoutingServiceMessenger,
} from '@metamask/snaps-controllers';
import { MultichainRoutingServiceInitMessenger } from '../messengers/multichain-routing-service-messenger';
import { isSnapKeyring } from '@metamask/eth-snap-keyring/v2';
import type { Json } from '@metamask/utils';

/**
 * Initialize the multichain routing service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The init messenger used to look up the
 * per-snap v2 Snap keyring that owns the request's account.
 * @returns The initialized controller.
 */
export const multichainRoutingServiceInit: MessengerClientInitFunction<
  MultichainRoutingService,
  MultichainRoutingServiceMessenger,
  MultichainRoutingServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const withSnapKeyring: ConstructorParameters<
    typeof MultichainRoutingService
  >[0]['withSnapKeyring'] = async (operation) =>
    operation({
      keyring: {
        submitRequest: async (request): Promise<Json> =>
          initMessenger.call(
            'KeyringController:withKeyringV2',
            {
              filter: (keyring) =>
                isSnapKeyring(keyring) && keyring.hasAccount(request.account),
            },
            async ({ keyring }) => {
              if (!isSnapKeyring(keyring)) {
                throw new Error('Expected v2 Snap keyring');
              }
              return keyring.submitRequest({
                id: '',
                origin: request.origin,
                scope: request.scope,
                account: request.account,
                request: {
                  method: request.method,
                  params: request.params,
                },
              });
            },
          ) as Promise<Json>,
      },
    });

  const controller = new MultichainRoutingService({
    messenger: controllerMessenger,
    withSnapKeyring,
  });

  return {
    controller,
  };
};
