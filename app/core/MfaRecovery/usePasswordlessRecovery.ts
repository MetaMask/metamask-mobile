import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { SecretMetadata } from '@metamask/seedless-onboarding-controller';
import { selectMfaRecoveryEnabled } from '../../selectors/featureFlagController/mfaRecovery';
import { isMfaRecoveryConfigured } from '../Engine/controllers/mfa-recovery-controller/config';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryDependencies,
} from './engineBindings';
import {
  clearPasswordlessRecoveryHold,
  hasPasswordlessRecoveryHold,
  setPasswordlessRecoveryHold,
  takePasswordlessRecoveryHold,
} from './passwordlessRecoveryHold';
import {
  fetchRecoverySecret,
  findRecoveryIdentifier,
  PasswordlessRecoveryError,
  recoverWalletWithoutPassword,
} from './passwordlessSocialRecovery';
import Logger from '../../util/Logger';

export type RestoreRecoveredVault = (
  password: string,
  secrets: SecretMetadata[],
) => Promise<void>;

/**
 * Passwordless social recovery for rehydration + ChoosePassword.
 *
 * Escrow passkey runs in {@link prefetchForChoosePassword} (while AAL2 is
 * held, before Create password). ChoosePassword {@link recover} only consumes
 * the held secret — no passkey on that page.
 *
 * The Recovery Secret crosses screens via {@link setPasswordlessRecoveryHold}
 * (module scope): OAuthRehydration and ChoosePassword are separate hook instances.
 *
 * @param authConnection - The seedless social login provider.
 */
export function usePasswordlessRecovery(authConnection: string) {
  const isFlagEnabled = useSelector(selectMfaRecoveryEnabled);
  const identifierRef = useRef<Identifier | null>(null);

  const clear = useCallback(() => {
    identifierRef.current = null;
    clearPasswordlessRecoveryHold();
  }, []);

  // Drop an unused hold if this screen unmounts without handing off.
  useEffect(
    () => () => {
      // Do not clear the cross-screen hold here — ChoosePassword needs it.
      identifierRef.current = null;
    },
    [],
  );

  const prepare = useCallback(async (): Promise<boolean> => {
    identifierRef.current = null;
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
      identifierRef.current = await findRecoveryIdentifier(
        createPasswordlessRecoveryDependencies(),
        {
          canProveSocialIdentifier: canProveSocial,
        },
      );
      if (!identifierRef.current) {
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
    return identifierRef.current !== null;
  }, [authConnection, isFlagEnabled]);

  /**
   * Find identifier + escrow passkey, then stash the Recovery Secret for
   * ChoosePassword. Call while AAL2 is held, before navigating to Create password.
   *
   * @returns Whether the hold is ready for Create password submit.
   */
  const prefetchForChoosePassword = useCallback(async (): Promise<boolean> => {
    clearPasswordlessRecoveryHold();
    const ready = await prepare();
    const identifier = identifierRef.current;
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
  }, [prepare]);

  const hasPreparedSecret = useCallback(
    () => hasPasswordlessRecoveryHold(),
    [],
  );

  const recover = useCallback(
    async (newPassword: string, restoreVault: RestoreRecoveredVault) => {
      const held = takePasswordlessRecoveryHold();
      try {
        if (held) {
          await recoverWalletWithoutPassword(
            createPasswordlessRecoveryDependencies(),
            {
              identifier: held.identifier,
              newPassword,
              restoreVault,
              recoverySecret: held.recoverySecret,
            },
          );
          return;
        }

        const identifier = identifierRef.current;
        if (!identifier) {
          throw new Error('Passwordless recovery is not prepared');
        }
        await recoverWalletWithoutPassword(
          createPasswordlessRecoveryDependencies(),
          {
            identifier,
            newPassword,
            restoreVault,
          },
        );
      } catch (error) {
        // restoring_vault means resetPasswordWithVaultKeys already returned,
        // so the new password is global and the secret must not be reused.
        const passwordAlreadySet =
          error instanceof PasswordlessRecoveryError &&
          error.stage === 'restoring_vault';
        if (held && !passwordAlreadySet) {
          setPasswordlessRecoveryHold(held.identifier, held.recoverySecret);
        } else {
          held?.recoverySecret.fill(0);
        }
        throw error;
      }
    },
    [],
  );

  return {
    prepare,
    prefetchForChoosePassword,
    hasPreparedSecret,
    recover,
    clear,
  };
}
