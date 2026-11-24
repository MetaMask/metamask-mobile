import type { KeyringControllerState } from '@metamask/keyring-controller';
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

export const TEST_PRIMARY_ENTROPY_SOURCE_ID = 'primary-hd-keyring-id';

type KeyringOperation = (args: { keyring: { seed: Uint8Array } }) => unknown;

/** A fake `KeyringController` for the SIWE signer. */
export interface TestKeyringController {
  state: Pick<KeyringControllerState, 'isUnlocked' | 'keyrings'>;
  withKeyringV2Unsafe: jest.Mock<
    Promise<unknown>,
    [{ id: string }, KeyringOperation]
  >;
}

/**
 * Builds a fake `KeyringController` whose primary HD keyring holds `seed`,
 * for the SIWE signer to derive its key from.
 *
 * @param options - Options.
 * @param options.seed - The primary HD keyring seed.
 * @param options.isUnlocked - Whether the keyring is unlocked.
 * @returns The fake controller.
 */
export function createTestKeyringController({
  seed = new Uint8Array(64).fill(1),
  isUnlocked = true,
}: { seed?: Uint8Array; isUnlocked?: boolean } = {}): TestKeyringController {
  return {
    state: {
      isUnlocked,
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: ['0x1111111111111111111111111111111111111111'],
          metadata: { id: TEST_PRIMARY_ENTROPY_SOURCE_ID, name: '' },
        },
      ],
    },
    withKeyringV2Unsafe: jest.fn(
      async (_selector: { id: string }, operation: KeyringOperation) =>
        await operation({ keyring: { seed } }),
    ),
  };
}

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
