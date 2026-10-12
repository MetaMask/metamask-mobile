import type {
  MfaRecoveryController,
  MfaRecoveryControllerState,
} from '@metamask/mfa-recovery-controller';
import { selectMfaRecoveryEnabled } from '../../../../selectors/featureFlagController/mfaRecovery';
import { isMfaRecoveryConfigured } from './config';
import { MfaRecoveryControllerError } from './errors';
import {
  createMfaRecoveryController,
  type CreateMfaRecoveryControllerOptions,
} from './create-mfa-recovery-controller';
import type { SignPersonalMessage } from './identifiers';
import type { MessengerClientInitFunction } from '../../types';
import type { MfaRecoveryControllerInitMessenger } from '../../messengers/mfa-recovery-controller-messenger';
import Logger from '../../../../util/Logger';

let identifierRouter: ReturnType<
  typeof createMfaRecoveryController
>['identifierRouter'];

/** Returns the Engine-scoped identifier router for test-only provider wiring. */
export function getMfaRecoveryIdentifierRouter() {
  if (!identifierRouter) {
    throw new MfaRecoveryControllerError(
      'MFA recovery controller is not initialized',
      'controller_unavailable',
    );
  }
  return identifierRouter;
}

/**
 * Initializes the persisted MFA recovery controller and its wallet providers.
 */
export const mfaRecoveryControllerInit: MessengerClientInitFunction<
  MfaRecoveryController,
  CreateMfaRecoveryControllerOptions['messenger'],
  MfaRecoveryControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const getAddress = (): string => {
    const { keyrings } = initMessenger.call('KeyringController:getState');
    return keyrings[0]?.accounts?.[0] ?? '';
  };
  const signPersonalMessage: SignPersonalMessage = async (params) =>
    await initMessenger.call('KeyringController:signPersonalMessage', params);
  const getBearerToken = async () =>
    await initMessenger.call('AuthenticationController:getBearerToken');
  const exportEncryptionKey = async () =>
    await initMessenger.call('KeyringController:exportEncryptionKey');
  const isEnabled = () =>
    selectMfaRecoveryEnabled.resultFunc(
      initMessenger.call('RemoteFeatureFlagController:getState')
        .remoteFeatureFlags,
    ) && isMfaRecoveryConfigured();

  const result = createMfaRecoveryController({
    messenger: controllerMessenger,
    state: persistedState.MfaRecoveryController as
      | Partial<MfaRecoveryControllerState>
      | undefined,
    getBearerToken,
    getAddress,
    signPersonalMessage,
    exportEncryptionKey,
    isEnabled,
  });
  identifierRouter = result.identifierRouter;

  const resumePendingOperation = async () => {
    try {
      if ((await result.controller.getPhase()) !== 'idle') {
        await result.controller.resume();
      }
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'mfa-recovery' },
        context: { name: 'mfa_recovery', data: { phase: 'resume' } },
      });
    }
  };

  initMessenger.subscribe('KeyringController:unlock', () => {
    void resumePendingOperation();
  });
  if (initMessenger.call('KeyringController:getState').isUnlocked) {
    void resumePendingOperation();
  }

  return { controller: result.controller };
};

export { isMfaRecoveryConfigured };
