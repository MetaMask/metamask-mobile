import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { SecretMetadata } from '@metamask/seedless-onboarding-controller';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import type { MfaRecoveryService } from './services/mfa-recovery-service';
import { redactForDisplay } from './redactForDisplay';

/** Operation named on the Auth approvals this flow requests. */
export const PASSWORDLESS_RECOVERY_OPERATION = 'wallet.passwordless_recovery';

/** Where a failed recovery stopped. */
export type PasswordlessRecoveryStage = 'recovering_secrets';

/** A failed passwordless recovery. Carries no token, secret, or password. */
export class PasswordlessRecoveryError extends Error {
  readonly stage: PasswordlessRecoveryStage;

  readonly code: string;

  /** The failed step, the error's name, and its message with secrets removed. */
  readonly detail: string;

  constructor(stage: PasswordlessRecoveryStage, cause: unknown, step?: string) {
    super(`Passwordless recovery failed at ${stage}`);
    this.name = 'PasswordlessRecoveryError';
    this.stage = stage;
    this.code = getMfaRecoveryErrorCode(cause);
    const name = cause instanceof Error ? cause.name : typeof cause;
    const message = cause instanceof Error ? cause.message : '';
    this.detail = `${step ?? stage}; ${name}${
      message ? `: ${redactForDisplay(message)}` : ''
    }`;
  }
}

/**
 * Recovers the social wallet's encryption key without its old password and
 * sets `localPassword` as the password that unlocks it on this device.
 *
 * Runs after the locked MFA verification. Reads the Recovery Secret (may
 * prompt passkey) while opening the TOPRF recovery session (held AAL2, no UI),
 * then recovers with it, creating the local vault under `localPassword`. No
 * local vault is created if recovery fails. The recovered SRPs and private
 * keys are zeroed and not returned; fetch them again with
 * `service.fetchSecretsWithCachedKey`. The global password is left unchanged.
 *
 * @param service - The recovery service for this flow.
 * @param params - The parameters.
 * @param params.identifier - From `service.findRecoveryIdentifier`.
 * @param params.localPassword - The new local password. Never logged.
 * @throws {PasswordlessRecoveryError} With the stage that failed.
 */
export async function recoverWithLocalPassword(
  service: MfaRecoveryService,
  {
    identifier,
    localPassword,
  }: { identifier: Identifier; localPassword: string },
): Promise<void> {
  let step = 'reading_secret';
  try {
    const [secretResult, sessionResult] = await Promise.allSettled([
      service
        .readRecoverySecret(identifier)
        .then((result) => result.recoverySecret),
      service.openRecoverySession(),
    ]);
    if (secretResult.status === 'rejected') {
      throw secretResult.reason;
    }
    const recoverySecret = secretResult.value;
    try {
      if (sessionResult.status === 'rejected') {
        step = 'opening_session';
        throw sessionResult.reason;
      }
      step = 'recovering_vault';
      zeroSecrets(
        await service.recoverWithRecoverySecret(recoverySecret, localPassword),
      );
    } finally {
      recoverySecret.fill(0);
    }
  } catch (error) {
    throw new PasswordlessRecoveryError('recovering_secrets', error, step);
  }
}

function zeroSecrets(secrets: SecretMetadata[]): void {
  for (const secret of secrets) {
    secret.data.fill(0);
  }
}
