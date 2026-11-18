import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MessengerActions,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  getMfaRecoveryServiceMessenger,
  MFA_RECOVERY_SERVICE_ACTIONS,
} from '../../Engine/messengers/mfa-recovery-controller-messenger';
import type { MfaRecoveryServiceMessenger } from './mfa-recovery-service';

/** Fake controllers keyed by controller name, as tests mock `Engine.context`. */
export type MfaRecoveryServiceTestControllers = Record<string, unknown>;

/**
 * Builds a service messenger whose actions forward to fake controllers.
 * `getControllers` is read on every call, so tests can swap fakes between
 * calls. `<Controller>:getState` returns the fake's `state`.
 *
 * @param getControllers - Returns the fake controllers.
 * @returns The service messenger.
 */
export function createMfaRecoveryServiceTestMessenger(
  getControllers: () => MfaRecoveryServiceTestControllers,
): MfaRecoveryServiceMessenger {
  const rootMessenger = new Messenger<
    MockAnyNamespace,
    MessengerActions<MfaRecoveryServiceMessenger>,
    never
  >({ namespace: MOCK_ANY_NAMESPACE });

  for (const actionType of MFA_RECOVERY_SERVICE_ACTIONS) {
    const [controllerName, method] = actionType.split(':');
    const handler = (...args: unknown[]) => {
      const controller = getControllers()[controllerName] as Record<
        string,
        unknown
      >;
      if (method === 'getState') {
        return controller.state;
      }
      return (controller[method] as (...params: unknown[]) => unknown)(...args);
    };
    rootMessenger.registerActionHandler(actionType, handler as never);
  }

  return getMfaRecoveryServiceMessenger(rootMessenger);
}
