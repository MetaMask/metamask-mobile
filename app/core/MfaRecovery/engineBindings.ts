import Engine from '../Engine';
import {
  MfaRecoveryService,
  type MfaRecoveryServiceMessenger,
  type MfaRecoveryServiceOptions,
} from './services/mfa-recovery-service';
import { getMfaRecoveryServiceMessenger } from '../Engine/messengers/mfa-recovery-controller-messenger';
import { PASSWORDLESS_RECOVERY_OPERATION } from './passwordlessSocialRecovery';

/**
 * Delegation registers the messenger on the root for good, so build it once
 * per Engine messenger instead of once per run.
 */
let serviceMessenger:
  | { root: unknown; messenger: MfaRecoveryServiceMessenger }
  | undefined;

function getServiceMessenger(): MfaRecoveryServiceMessenger {
  const root = Engine.controllerMessenger;
  if (serviceMessenger?.root !== root) {
    serviceMessenger = {
      root,
      messenger: getMfaRecoveryServiceMessenger(
        root as unknown as Parameters<typeof getMfaRecoveryServiceMessenger>[0],
      ),
    };
  }
  return serviceMessenger.messenger;
}

/**
 * Builds a recovery service for one run of a flow, wired to the Engine
 * controllers.
 *
 * @param options - How the run proves the user.
 * @returns The service.
 */
export function createMfaRecoveryService(
  options: Omit<MfaRecoveryServiceOptions, 'messenger'>,
): MfaRecoveryService {
  return new MfaRecoveryService({
    ...options,
    messenger: getServiceMessenger(),
  });
}

/**
 * Builds the service the locked passwordless recovery flow runs on. The user
 * verifies before recovery starts, so the service must not prompt again.
 */
export function createPasswordlessRecoveryService(): MfaRecoveryService {
  return createMfaRecoveryService({
    verifyMfa: async () => undefined,
    approvalOperation: PASSWORDLESS_RECOVERY_OPERATION,
  });
}

/**
 * Whether the social provider can sign in again with a caller nonce on this
 * platform. Android Apple and Telegram sign in through the auth server, which
 * does not return the provider's ID token.
 *
 * @param platform - `Platform.OS`.
 * @param authConnection - The seedless social login provider.
 * @returns Whether a social identifier can be proven.
 */
export function canProveSocialIdentifier(
  platform: string,
  authConnection: string | undefined,
): boolean {
  if (authConnection === 'google') {
    return platform === 'ios' || platform === 'android';
  }
  if (authConnection === 'apple') {
    return platform === 'ios';
  }
  return false;
}
