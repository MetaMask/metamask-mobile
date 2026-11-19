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
  createPasswordlessRecoveryDependencies,
} from './engineBindings';
import {
  clearPasswordlessRecoveryHold,
  setPasswordlessRecoveryHold,
} from './passwordlessRecoveryHold';
import {
  fetchRecoverySecret,
  findRecoveryIdentifier,
  setLocalAndGlobalPassword,
} from './passwordlessSocialRecovery';

export type RestoreRecoveredVault = (
  password: string,
  secrets: SecretMetadata[],
) => Promise<void>;

/**
 * Passwordless social recovery for OAuthRehydration + ChoosePassword.
 *
 * {@link PasswordlessRecoveryService.recover} only consumes the held secret.
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
   * @param options.allowPasskey - When false, only social ID-token prove.
   * @returns Whether an identifier is ready for prefetch / recover-without-hold.
   */
  prepare = async (
    authConnection: string,
    options: { allowPasskey?: boolean } = {},
  ): Promise<boolean> => {
    this.#preparedIdentifier = null;
    const allowPasskey = options.allowPasskey ?? true;
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
      this.#preparedIdentifier = await findRecoveryIdentifier(
        createPasswordlessRecoveryDependencies(),
        {
          canProveSocialIdentifier: canProveSocial,
          allowPasskey,
        },
      );
      if (!this.#preparedIdentifier) {
        Logger.log('OAuthRehydration: passwordless recovery unavailable', {
          reason: 'no_recovery_identifier',
          authConnection,
          canProveSocial,
          allowPasskey,
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
   * Find identifier + prove to escrow, then stash the Recovery Secret for
   * ChoosePassword. After locked MFA use `{ allowPasskey: false }` so only a
   * social ID-token prove runs (MFA passkey cannot unlock Cubist).
   *
   * @param authConnection - Seedless social login provider.
   * @param options.allowPasskey - When false, skip passkey (no OS sheet).
   * @returns Whether the hold is ready for Create password submit.
   */
  prefetchForChoosePassword = async (
    authConnection: string,
    options: { allowPasskey?: boolean } = {},
  ): Promise<boolean> => {
    clearPasswordlessRecoveryHold();
    const ready = await this.prepare(authConnection, options);
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
      const recoverySecret = await fetchRecoverySecret(
        createPasswordlessRecoveryDependencies(),
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
   * Forgot-password submit: setLocalPassword, then resetPasswordWithVaultKeys.
   * No passkey and no social token. Does not read a Recovery Secret.
   *
   * @param newPassword - New wallet password. Never logged.
   * @param _restoreVault - Unused. Kept so ChoosePassword's call shape stays.
   */
  recover = async (
    newPassword: string,
    _restoreVault: RestoreRecoveredVault,
  ): Promise<void> => {
    this.#preparedIdentifier = null;
    clearPasswordlessRecoveryHold();
    await setLocalAndGlobalPassword(
      createPasswordlessRecoveryDependencies(),
      newPassword,
    );
  };
}

export default new PasswordlessRecoveryService();
