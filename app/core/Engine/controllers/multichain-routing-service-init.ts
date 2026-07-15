import { MessengerClientInitFunction } from '../types';
import {
  MultichainRoutingService,
  type MultichainRoutingServiceMessenger,
} from '@metamask/snaps-controllers';
import { MultichainRoutingServiceInitMessenger } from '../messengers/multichain-routing-service-messenger';
import { isSnapKeyring } from '@metamask/eth-snap-keyring/v2';
import type { Json } from '@metamask/utils';

type WithSnapKeyringFn = ConstructorParameters<
  typeof MultichainRoutingService
>[0]['withSnapKeyring'];

/**
 * Route a request through the Snap keyring that owns the requested account.
 *
 * @param initMessenger - The init messenger used to call KeyringController.
 * @param operation - The operation to run once a keyring is resolved.
 * @returns The result of the operation.
 */
export async function withSnapKeyring(
  initMessenger: MultichainRoutingServiceInitMessenger,
  operation: Parameters<WithSnapKeyringFn>[0],
): ReturnType<WithSnapKeyringFn> {
  return operation({
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
              // NOTE: The `id` field is required but not used in this context. The Snap keyring will
              // generate its own unique ID for the request.
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
}

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
  const controller = new MultichainRoutingService({
    messenger: controllerMessenger,
    withSnapKeyring: <Result>(...args: Parameters<WithSnapKeyringFn>) =>
      withSnapKeyring(initMessenger, ...args) as Promise<Result>,
  });

  return {
    controller,
  };
};
