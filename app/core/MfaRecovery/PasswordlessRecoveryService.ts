import { Platform } from 'react-native';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { SecretMetadata } from '@metamask/seedless-onboarding-controller';
import { selectMfaRecoveryEnabled } from '../../selectors/featureFlagController/mfaRecovery';
import Logger from '../../util/Logger';
import { isMfaRecoveryConfigured } from '../Engine/controllers/mfa-recovery-controller/config';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import ReduxService from '../redux';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryService,
} from './engineBindings';
import {
  clearPasswordlessRecoveryHold,
  setPasswordlessRecoveryHold,
  takePasswordlessRecoveryHold,
} from './passwordlessRecoveryHold';
import { recoverWalletWithoutPassword } from './passwordlessSocialRecovery';

export type RestoreRecoveredVault = (
  password: string,
  secrets: SecretMetadata[],
) => Promise<void>;

/**
 * Passwordless social recovery for OAuthRehydration + ChoosePassword.
 *
 * Escrow passkey runs in {@link PasswordlessRecoveryService.prefetchForChoosePassword}
 * (while AAL2 is held, before Create password). ChoosePassword
 * {@link PasswordlessRecoveryService.recover} only consumes the held secret —
 * no passkey on that page.
 *
 * Cross-screen Recovery Secret: {@link setPasswordlessRecoveryHold} (module scope).
 * Feature flag: {@link ReduxService.store} + {@link selectMfaRecoveryEnabled}.
 */
class PasswordlessRecoveryService {
  #preparedIdentifier: Identifier | null = null;

  clear = (): void => {
    this.#preparedIdentifier = null;
    clearPasswordlessRecoveryHold();
  };

  /**
   * Resolve a recovery identifier when the MFA recovery flag is on and configured.
   *
   * @param authConnection - Seedless social login provider.
   * @returns Whether an identifier is ready for prefetch / recover-without-hold.
   */
  prepare = async (authConnection: string): Promise<boolean> => {
    this.#preparedIdentifier = null;
    const state = ReduxService.store.getState();
    const isFlagEnabled = selectMfaRecoveryEnabled(state);
    const configured = isMfaRecoveryConfigured();
    if (!isFlagEnabled || !configured) {
      Logger.log('OAuthRehydration: passwordless recovery unavailable', {
        reason: !isFlagEnabled ? 'flag_off' : 'not_configured',
      });
      return false;
    }
    try {
      const canProveSocial = canProveSocialIdentifier(
        Platform.OS,
        authConnection,
      );
      this.#preparedIdentifier =
        await createPasswordlessRecoveryService().findRecoveryIdentifier({
          canProveSocialIdentifier: canProveSocial,
        });
      if (!this.#preparedIdentifier) {
        Logger.log('OAuthRehydration: passwordless recovery unavailable', {
          reason: 'no_recovery_identifier',
          authConnection,
          canProveSocial,
          platform: Platform.OS,
        });
      }
    } catch (error) {
      Logger.log('OAuthRehydration: passwordless recovery unavailable', {
        reason: 'find_identifier_failed',
        code: getMfaRecoveryErrorCode(error),
      });
    }
    return this.#preparedIdentifier !== null;
  };

  /**
   * Find identifier + escrow passkey, then stash the Recovery Secret for
   * ChoosePassword. Call while AAL2 is held, before navigating to Create password.
   *
   * @param authConnection - Seedless social login provider.
   * @returns Whether the hold is ready for Create password submit.
   */
  prefetchForChoosePassword = async (
    authConnection: string,
  ): Promise<boolean> => {
    clearPasswordlessRecoveryHold();
    const ready = await this.prepare(authConnection);
    const identifier = this.#preparedIdentifier;
    if (!ready || !identifier) {
      Logger.log('OAuthRehydration: recovery secret prefetch skipped', {
        reason: 'prepare_not_ready',
        identifierType: identifier?.type ?? null,
      });
      return false;
    }
    try {
      Logger.log('OAuthRehydration: recovery secret prefetch start', {
        identifierType: identifier.type,
      });
      const { recoverySecret } =
        await createPasswordlessRecoveryService().readRecoverySecret(
          identifier,
        );
      setPasswordlessRecoveryHold(identifier, recoverySecret);
      Logger.log('OAuthRehydration: recovery secret prefetch ok', {
        identifierType: identifier.type,
      });
      return true;
    } catch (error) {
      clearPasswordlessRecoveryHold();
      Logger.log('OAuthRehydration: recovery secret prefetch failed', {
        code: getMfaRecoveryErrorCode(error),
        message: error instanceof Error ? error.message : String(error),
        identifierType: identifier.type,
      });
      return false;
    }
  };

  /**
   * Create local + global password from the held Recovery Secret (preferred),
   * or from a prior {@link prepare} on this service when no hold exists.
   *
   * @param newPassword - New wallet password. Never logged.
   * @param restoreVault - Creates the keyring vault from recovered secrets.
   */
  recover = async (
    newPassword: string,
    restoreVault: RestoreRecoveredVault,
  ): Promise<void> => {
    const held = takePasswordlessRecoveryHold();
    if (held) {
      this.#preparedIdentifier = null;
      await recoverWalletWithoutPassword(createPasswordlessRecoveryService(), {
        identifier: held.identifier,
        newPassword,
        restoreVault,
        recoverySecret: held.recoverySecret,
      });
      return;
    }

    const identifier = this.#preparedIdentifier;
    if (!identifier) {
      throw new Error('Passwordless recovery is not prepared');
    }
    await recoverWalletWithoutPassword(createPasswordlessRecoveryService(), {
      identifier,
      newPassword,
      restoreVault,
    });
  };
}

export default new PasswordlessRecoveryService();
