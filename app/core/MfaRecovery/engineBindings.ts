import Engine from '../Engine';
import { getMfaRecoveryServiceMessenger } from '../Engine/messengers/mfa-recovery-controller-messenger';
import {
  MfaRecoveryService,
  type MfaRecoveryServiceMessenger,
  type MfaRecoveryServiceOptions,
} from './services/mfa-recovery-service';

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
