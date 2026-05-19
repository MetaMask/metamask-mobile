import {
  ActionConstraint,
  ActionHandler,
  EventConstraint,
  Messenger,
} from '@metamask/messenger';
import type {
  UIMessenger,
  UIMessengerActions,
  UIMessengerEvents,
} from '../../messengers/ui-messenger';

type DelegateeMessenger = Messenger<string, ActionConstraint, EventConstraint>;

interface DelegateArgs<
  Actions extends UIMessengerActions,
  Events extends UIMessengerEvents,
> {
  actions?: Actions['type'][];
  events?: Events['type'][];
  messenger: DelegateeMessenger;
}

/**
 * Create a UI messenger for testing with the specified action handlers.
 *
 * This creates a real Messenger instance with a fake namespace and registers
 * the provided action handlers on it.
 *
 * @param actionHandlers - A map of action type strings to handler functions.
 * @returns A messenger with the specified action handlers registered.
 * @example
 * ```typescript
 * const addNetwork = jest.fn().mockResolvedValue({ chainId: '0x1' });
 * const messenger = createMockUIMessenger({
 *   'NetworkController:addNetwork': addNetwork,
 * });
 * ```
 */
export function createMockUIMessenger<
  Actions extends UIMessengerActions = never,
  Events extends UIMessengerEvents = never,
>(actionHandlers?: {
  [Action in Actions as Action['type']]: Action['handler'];
}): UIMessenger {
  return {
    async delegate({ actions = [], messenger }: DelegateArgs<Actions, Events>) {
      for (const actionType of actions) {
        const handler = actionHandlers?.[actionType];
        if (!handler) {
          throw new Error(
            `No handler registered for action "${String(actionType)}".`,
          );
        }

        messenger._internalRegisterDelegatedActionHandler(
          actionType,
          handler as ActionHandler<ActionConstraint, Actions['type']>,
        );
      }

      // No background connection in tests — events are not subscribed to.
    },

    async revoke({ actions = [], messenger }: DelegateArgs<Actions, Events>) {
      for (const actionType of actions) {
        messenger._internalUnregisterDelegatedActionHandler(actionType);
      }
    },
  } as unknown as UIMessenger;
}
