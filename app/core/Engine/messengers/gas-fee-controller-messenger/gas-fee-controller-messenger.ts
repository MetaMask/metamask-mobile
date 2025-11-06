import type {
  GasFeeControllerActions,
  GasFeeControllerEvents,
} from '@metamask/gas-fee-controller';
import {
  NetworkControllerNetworkDidChangeEvent,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerGetEIP1559CompatibilityAction,
  NetworkControllerGetStateAction,
} from '@metamask/network-controller';
import { Messenger, RestrictedMessenger } from '@metamask/base-controller';

const name = 'GasFeeController';

type MessengerActions =
  | NetworkControllerGetEIP1559CompatibilityAction
  | NetworkControllerGetNetworkClientByIdAction
  | NetworkControllerGetStateAction
  | GasFeeControllerActions;

type MessengerEvents =
  | NetworkControllerNetworkDidChangeEvent
  | GasFeeControllerEvents;

// This is not exported from the gas-fee-controller package right now
export type GasFeeControllerMessenger = RestrictedMessenger<
  typeof name,
  MessengerActions,
  MessengerEvents,
  MessengerActions['type'],
  MessengerEvents['type']
>;

export function getGasFeeControllerMessenger(
  messenger: Messenger<MessengerActions, MessengerEvents>,
): GasFeeControllerMessenger {
  return messenger.getRestricted({
    name: 'GasFeeController',
    allowedActions: [
      'NetworkController:getEIP1559Compatibility',
      'NetworkController:getNetworkClientById',
      'NetworkController:getState',
    ],
    allowedEvents: ['NetworkController:networkDidChange'],
  });
}
