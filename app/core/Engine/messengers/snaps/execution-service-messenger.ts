import {
  Messenger,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import { ExecutionServiceMessenger } from '@metamask/snaps-controllers';
import { RootMessenger } from '../../types';

/**
 * Get a messenger for the execution service. This is scoped to the
 * actions and events that the execution service is allowed to handle.
 *
 * @param rootMessenger - The root messenger.
 * @returns The ExecutionServiceMessenger.
 */
export function getExecutionServiceMessenger(
  rootMessenger: RootMessenger<
    MessengerActions<ExecutionServiceMessenger>,
    MessengerEvents<ExecutionServiceMessenger>
  >,
): ExecutionServiceMessenger {
  const messenger: ExecutionServiceMessenger = new Messenger({
    namespace: 'ExecutionService',
    parent: rootMessenger,
  });

  return messenger;
}
