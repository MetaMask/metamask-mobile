import { Messenger } from '@metamask/base-controller';
import { TransactionControllerStateChangeEvent } from '@metamask/transaction-controller';

type AllowedActions = never;

type AllowedEvents = TransactionControllerStateChangeEvent;

export type PhishingControllerMessenger = ReturnType<
  typeof getPhishingControllerMessenger
>;

/**
 * Get a messenger restricted to the actions and events that the
 * phishing controller is allowed to handle.
 *
 * @param messenger - The controller messenger to restrict.
 * @returns The restricted controller messenger.
 */
export function getPhishingControllerMessenger(
  messenger: Messenger<AllowedActions, AllowedEvents>,
) {
  return messenger.getRestricted({
    name: 'PhishingController',
    allowedActions: [],
    allowedEvents: ['TransactionController:stateChange'],
  });
}
