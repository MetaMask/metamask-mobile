import type { Identifier } from '@metamask/mfa-recovery-controller';
import type { SecretMetadata } from '@metamask/seedless-onboarding-controller';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import type {
  FindRecoveryIdentifierOptions,
  MfaRecoveryService,
} from '../Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';
import { redactForDisplay } from './redactForDisplay';

export type { FindRecoveryIdentifierOptions };

/** Operation named on the Auth approvals this flow requests. */
export const PASSWORDLESS_RECOVERY_OPERATION = 'wallet.passwordless_recovery';

/**
 * Where a failed recovery stopped. From `restoring_vault` on, the new
 * password is already the wallet's global password.
 */
export type PasswordlessRecoveryStage =
  | 'recovering_secrets'
  | 'setting_password'
  | 'restoring_vault';

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
 * Picks the identifier to read the Recovery Secret with: an enrolled passkey
 * Auth approved, else the enrolled social login when it can be proven.
 *
 * @param service - The recovery service for this flow.
 * @param options - What the wallet can prove.
 * @returns The identifier, or `null` when recovery is not set up for one.
 */
export async function findRecoveryIdentifier(
  service: MfaRecoveryService,
  options: FindRecoveryIdentifierOptions,
): Promise<Identifier | null> {
  return await service.findRecoveryIdentifier(options);
}

/**
 * Proves `identifier` to escrow and returns the Recovery Secret.
 * May show a passkey / social sheet — call before Create password UI so submit
 * does not prompt again. Caller owns the returned bytes and must zero them.
 *
 * @param service - The recovery service for this flow.
 * @param identifier - From {@link findRecoveryIdentifier}.
 * @returns Recovery secret bytes (length `RECOVERY_SECRET_LENGTH`).
 */
export async function fetchRecoverySecret(
  service: MfaRecoveryService,
  identifier: Identifier,
): Promise<Uint8Array> {
  return (await service.readRecoverySecret(identifier)).recoverySecret;
}

/**
 * Recovers the social wallet without its old password and makes
 * `newPassword` the wallet password.
 *
 * Runs after the locked MFA verification. Opens the TOPRF recovery session
 * (held AAL2, no UI) and uses the Recovery Secret — either prefetched via
 * {@link fetchRecoverySecret} or read here (may prompt passkey). Then sets
 * the local/global password and restores the keyring vault.
 *
 * @param service - The recovery service for this flow.
 * @param params - The parameters.
 * @param params.identifier - From {@link findRecoveryIdentifier}.
 * @param params.newPassword - The new wallet password. Never logged.
 * @param params.restoreVault - Creates the keyring vault from the secrets.
 * @param params.recoverySecret - Optional secret from {@link fetchRecoverySecret}
 * so Create password submit skips the escrow passkey sheet.
 * @throws {PasswordlessRecoveryError} With the stage that failed.
 */
export async function recoverWalletWithoutPassword(
  service: MfaRecoveryService,
  {
    identifier,
    newPassword,
    restoreVault,
    recoverySecret: prefetchedRecoverySecret,
  }: {
    identifier: Identifier;
    newPassword: string;
    restoreVault: (
      password: string,
      secrets: SecretMetadata[],
    ) => Promise<void>;
    recoverySecret?: Uint8Array;
  },
): Promise<void> {
  const { seedlessOnboardingController: seedless } = service;

  let secrets: SecretMetadata[];
  let step = 'reading_secret';
  try {
    const secretPromise = prefetchedRecoverySecret
      ? Promise.resolve(prefetchedRecoverySecret)
      : fetchRecoverySecret(service, identifier);
    const [secretResult, sessionResult] = await Promise.allSettled([
      secretPromise,
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
      secrets = await seedless.recoverWithRecoverySecret({ recoverySecret });
    } finally {
      recoverySecret.fill(0);
    }
  } catch (error) {
    throw new PasswordlessRecoveryError('recovering_secrets', error, step);
  }

  try {
    step = 'setting_local_password';
    await seedless.setLocalPassword({ password: newPassword });
    step = 'resetting_global_password';
    await seedless.resetPasswordWithVaultKeys({ newPassword });
  } catch (error) {
    throw new PasswordlessRecoveryError('setting_password', error, step);
  }

  try {
    await restoreVault(newPassword, secrets);
  } catch (error) {
    throw new PasswordlessRecoveryError('restoring_vault', error);
  }
}
