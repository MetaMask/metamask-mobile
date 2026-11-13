import { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';
import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { SecretMetadata } from '@metamask/seedless-onboarding-controller';
import { selectMfaRecoveryEnabled } from '../../../selectors/featureFlagController/mfaRecovery';
import { isMfaRecoveryConfigured } from '../../../core/Engine/controllers/mfa-recovery-controller/config';
import { getMfaRecoveryErrorCode } from '../../../core/Engine/controllers/mfa-recovery-controller/errors';
import {
  canProveSocialIdentifier,
  createPasswordlessRecoveryDependencies,
} from '../../../core/MfaRecovery/engineBindings';
import {
  findRecoveryIdentifier,
  recoverWalletWithoutPassword,
} from '../../../core/MfaRecovery/passwordlessSocialRecovery';
import Logger from '../../../util/Logger';

export type RestoreRecoveredVault = (
  password: string,
  secrets: SecretMetadata[],
) => Promise<void>;

/**
 * Passwordless social recovery for the rehydration screen, run after the
 * locked MFA verification.
 *
 * @param authConnection - The seedless social login provider.
 * @returns `prepare` resolves whether recovery can run for this wallet;
 * `recover` runs it with the new password.
 */
export function usePasswordlessRecovery(authConnection: string) {
  const isFlagEnabled = useSelector(selectMfaRecoveryEnabled);
  const identifierRef = useRef<Identifier | null>(null);

  const prepare = useCallback(async (): Promise<boolean> => {
    identifierRef.current = null;
    if (!isFlagEnabled || !isMfaRecoveryConfigured()) {
      return false;
    }
    try {
      identifierRef.current = await findRecoveryIdentifier(
        createPasswordlessRecoveryDependencies(),
        {
          canProveSocialIdentifier: canProveSocialIdentifier(
            Platform.OS,
            authConnection,
          ),
        },
      );
    } catch (error) {
      Logger.log('OAuthRehydration: passwordless recovery unavailable', {
        code: getMfaRecoveryErrorCode(error),
      });
    }
    return identifierRef.current !== null;
  }, [authConnection, isFlagEnabled]);

  const recover = useCallback(
    async (newPassword: string, restoreVault: RestoreRecoveredVault) => {
      const identifier = identifierRef.current;
      if (!identifier) {
        throw new Error('Passwordless recovery is not prepared');
      }
      await recoverWalletWithoutPassword(
        createPasswordlessRecoveryDependencies(),
        { identifier, newPassword, restoreVault },
      );
    },
    [],
  );

  return { prepare, recover };
}
