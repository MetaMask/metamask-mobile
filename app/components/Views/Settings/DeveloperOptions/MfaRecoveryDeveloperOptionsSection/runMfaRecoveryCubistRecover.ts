import type { Identifier } from '@metamask/mfa-recovery-controller';
import { bytesToHex, sha256 } from '@metamask/utils';
import { MfaRecoveryControllerError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import type { MfaRecoveryService } from '../../../../../core/MfaRecovery/services/mfa-recovery-service';

export { getMfaRecoveryErrorCode } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';

/** The identifier type used to authenticate a Recovery Secret read. */
export type RecoveryReadIdentifierType = 'siwe' | 'passkey' | 'social';

export type MfaRecoveryRecoverStep = 'reading_recovery_secret' | 'completed';

export interface MfaRecoveryRecoverResult {
  epoch: number;
  /** First bytes of the secret's SHA-256, to compare reads across identifiers. */
  fingerprint: string;
}

const FINGERPRINT_HEX_LENGTH = 8;
const HEX_PREFIX_LENGTH = 2;

/**
 * Reads the Recovery Secret from Cubist with the chosen identifier without
 * writing anything. Returns the epoch and a short fingerprint, never the
 * secret itself, which is zeroed before returning.
 *
 * @param service - The recovery service for this run.
 * @param onStep - Called as the run advances.
 * @param identifierType - The identifier type that proves the read.
 * @param socialIdentifier - Auth's social identifier, required for `social`.
 * @returns The epoch and fingerprint of the secret that was read.
 */
export async function runMfaRecoveryCubistRecover(
  service: MfaRecoveryService,
  onStep: (step: MfaRecoveryRecoverStep) => void = () => undefined,
  identifierType: RecoveryReadIdentifierType = 'siwe',
  socialIdentifier?: Identifier,
): Promise<MfaRecoveryRecoverResult> {
  const identifiers = await service.prepareRun();
  const readIdentifier = ((): Identifier => {
    switch (identifierType) {
      case 'passkey':
        return identifiers.passkeyIdentifier;
      case 'social':
        if (socialIdentifier === undefined) {
          throw new MfaRecoveryControllerError(
            'Auth has no approved social identifier for this login',
            'social_login_unavailable',
          );
        }
        return socialIdentifier;
      default:
        return identifiers.siweIdentifier;
    }
  })();

  onStep('reading_recovery_secret');
  const { epoch, recoverySecret } =
    await service.readRecoverySecret(readIdentifier);
  try {
    const fingerprint = bytesToHex(await sha256(recoverySecret)).slice(
      HEX_PREFIX_LENGTH,
      HEX_PREFIX_LENGTH + FINGERPRINT_HEX_LENGTH,
    );
    onStep('completed');
    return { epoch, fingerprint };
  } finally {
    recoverySecret.fill(0);
  }
}
