import { createProjectLogger } from '@metamask/utils';
import type {
  ControllerMessenger,
  MessengerClientsByName,
  ControllerMessengerCallback,
  MessengerClientName,
  MessengerClientsToInitialize,
  InitMessengerClientsFunction,
  MessengerClientInitRequest,
  MessengerClientInitFunction,
} from '../types';
import { MESSENGER_FACTORIES } from '../messengers';

const log = createProjectLogger('messenger-client-init');

type BaseMessengerClientInitRequest = MessengerClientInitRequest<
  ControllerMessenger,
  ControllerMessenger | void
>;

type InitFunction<Name extends MessengerClientsToInitialize> =
  MessengerClientInitFunction<
    MessengerClientsByName[Name],
    ReturnType<(typeof MESSENGER_FACTORIES)[Name]['getMessenger']>,
    ReturnType<(typeof MESSENGER_FACTORIES)[Name]['getInitMessenger']>
  >;

/**
 * Initializes the messenger clients in the engine in a modular way.
 *
 * @param options - Options bag.
 * @param options.baseControllerMessenger - Unrestricted base controller messenger.
 * @param options.initFunctions - Map of init functions keyed by messenger client name.
 * @param options.getGlobalChainId - Get settled chain id in the engine.
 * @param options.getState - Get the root state of the engine.
 * @param options.persistedState - The full persisted state for all messenger clients.
 * @returns The initialized messenger clients and associated data.
 */
export const initMessengerClients: InitMessengerClientsFunction = ({
  baseControllerMessenger,
  initFunctions,
  ...initRequest
}) => {
  log('Initializing messenger clients', Object.keys(initFunctions).length);

  let partialMessengerClientsByName: Partial<MessengerClientsByName> = {};

  // Used by other messenger clients to get dependent messenger clients
  const getController = <Name extends MessengerClientName>(
    name: Name,
  ): MessengerClientsByName[Name] =>
    getMessengerClientOrThrow({
      controller: partialMessengerClientsByName?.[name],
      name,
    });

  for (const [key, messengerClientInitFunction] of Object.entries(
    initFunctions,
  )) {
    const messengerClientName = key as MessengerClientsToInitialize;

    const initFunction = messengerClientInitFunction as InitFunction<
      typeof messengerClientName
    >;

    // Get the messenger for the messenger client
    const messengerCallbacks = MESSENGER_FACTORIES[messengerClientName];

    const controllerMessengerCallback =
      messengerCallbacks.getMessenger as ControllerMessengerCallback;

    const initMessengerCallback =
      messengerCallbacks?.getInitMessenger as ControllerMessengerCallback;

    const controllerMessenger = controllerMessengerCallback(
      baseControllerMessenger,
    );

    const initMessenger = initMessengerCallback?.(baseControllerMessenger);

    const finalInitRequest: BaseMessengerClientInitRequest = {
      controllerMessenger,
      getController,
      initMessenger,
      ...initRequest,
    };

    // Initialize the messenger client
    const { controller } = initFunction(finalInitRequest);

    // Add the messenger client to the map
    partialMessengerClientsByName = {
      ...partialMessengerClientsByName,
      [messengerClientName]: controller,
    };

    log('Initialized messenger client', messengerClientName);
  }

  return {
    messengerClientsByName:
      partialMessengerClientsByName as MessengerClientsByName,
  };
};

/**
 * Gets a messenger client from the existing messenger clients by name.
 * Throws an error if the messenger client is not found.
 *
 * @param options - Options containing the messenger client and name.
 * @param options.controller - The messenger client to get.
 * @param options.name - The name of the messenger client.
 * @returns The messenger client.
 */
export function getMessengerClientOrThrow<Name extends MessengerClientName>({
  controller,
  name,
}: {
  controller: Partial<MessengerClientsByName>[Name];
  name: Name;
}): MessengerClientsByName[Name] {
  if (!controller) {
    throw new Error(
      `Messenger client requested before it was initialized: ${name}`,
    );
  }

  return controller;
}
