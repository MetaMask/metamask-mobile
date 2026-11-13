import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import type {
  MfaApproval,
  RequestMfaApprovalRequest,
} from '@metamask/profile-sync-controller/sdk';
import type {
  SecretMetadata,
  SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex } from '@metamask/utils';
import {
  isProvablePasskeyIdentifier,
  withPasskeyVerifier,
} from '../Engine/controllers/mfa-recovery-controller/auth/passkey-identifier-auth-provider';
import type { ToprfRecoveryConfig } from '../Engine/controllers/mfa-recovery-controller/config';
import { RECOVERY_SECRET_LENGTH } from '../Engine/controllers/mfa-recovery-controller/constants';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import { redactForDisplay } from './redactForDisplay';

/** Operation named on the Auth approvals this flow requests. */
export const PASSWORDLESS_RECOVERY_OPERATION = 'wallet.passwordless_recovery';

export type PasswordlessRecoveryMfa = Pick<
  MfaRecoveryController,
  'getIdentifiers' | 'authenticateIdentifier' | 'getRecoverySecret'
>;

export type PasswordlessRecoverySeedless = Pick<
  SeedlessOnboardingController,
  | 'authenticateForRecovery'
  | 'recoverWithRecoverySecret'
  | 'setLocalPassword'
  | 'resetPasswordWithVaultKeys'
>;

export interface PasswordlessRecoveryDependencies {
  mfaRecovery: PasswordlessRecoveryMfa;
  seedless: PasswordlessRecoverySeedless;
  /** Auth approval; locked, it proves the factor verified before recovery. */
  requestMfaApproval: (
    request: RequestMfaApprovalRequest,
  ) => Promise<MfaApproval>;
  toprf: ToprfRecoveryConfig;
  randomBytes: (length: number) => Uint8Array;
}

export interface FindRecoveryIdentifierOptions {
  /** Whether the social provider can issue a nonce-bound ID token. */
  canProveSocialIdentifier: boolean;
}

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

const sameIdentifier = (a: Identifier, b: Identifier): boolean =>
  a.type === b.type && a.namespace === b.namespace && a.value === b.value;

/**
 * Picks the identifier to read the Recovery Secret with: an enrolled passkey
 * Auth approved, else the enrolled social login when it can be proven.
 *
 * @param dependencies - The flow's dependencies.
 * @param options - What the wallet can prove.
 * @returns The identifier, or `null` when recovery is not set up for one.
 */
export async function findRecoveryIdentifier(
  { mfaRecovery }: Pick<PasswordlessRecoveryDependencies, 'mfaRecovery'>,
  { canProveSocialIdentifier }: FindRecoveryIdentifierOptions,
): Promise<Identifier | null> {
  const { identifiers, authIdentifiers } = await mfaRecovery.getIdentifiers();
  // Auth's copy carries the verifier (RP ID, credential ID) the proof needs.
  const approved = identifiers.flatMap((enrolled) => {
    const authIdentifier = authIdentifiers.find((candidate) =>
      sameIdentifier(candidate, enrolled),
    );
    return authIdentifier ? [authIdentifier] : [];
  });

  const passkey = approved
    .map(withPasskeyVerifier)
    .find(isProvablePasskeyIdentifier);
  if (passkey) {
    return passkey;
  }
  if (canProveSocialIdentifier) {
    return approved.find((identifier) => identifier.type === 'social') ?? null;
  }
  return null;
}

/**
 * Recovers the social wallet without its old password and makes
 * `newPassword` the wallet password.
 *
 * Runs after the locked MFA verification. In parallel, it mints the aal2
 * token and opens the TOPRF recovery session, and proves `identifier` to the
 * escrow to read the Recovery Secret. It then recovers the vault keys with
 * the secret, creates the local seedless vault under `newPassword`, makes it
 * the global password, and finally creates the keyring vault.
 *
 * @param dependencies - The flow's dependencies.
 * @param params - The parameters.
 * @param params.identifier - From {@link findRecoveryIdentifier}.
 * @param params.newPassword - The new wallet password. Never logged.
 * @param params.restoreVault - Creates the keyring vault from the secrets.
 * @throws {PasswordlessRecoveryError} With the stage that failed.
 */
export async function recoverWalletWithoutPassword(
  dependencies: PasswordlessRecoveryDependencies,
  {
    identifier,
    newPassword,
    restoreVault,
  }: {
    identifier: Identifier;
    newPassword: string;
    restoreVault: (
      password: string,
      secrets: SecretMetadata[],
    ) => Promise<void>;
  },
): Promise<void> {
  const { seedless } = dependencies;

  let secrets: SecretMetadata[];
  let step = 'reading_secret';
  try {
    const [secretResult, sessionResult] = await Promise.allSettled([
      readRecoverySecret(dependencies, identifier),
      openRecoverySession(dependencies),
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

async function readRecoverySecret(
  { mfaRecovery }: PasswordlessRecoveryDependencies,
  identifier: Identifier,
): Promise<Uint8Array> {
  const session = await mfaRecovery.authenticateIdentifier(identifier);
  const { recoverySecret } = await mfaRecovery.getRecoverySecret(session);
  try {
    if (recoverySecret.length !== RECOVERY_SECRET_LENGTH) {
      throw new Error('Escrow returned a Recovery Secret of the wrong length');
    }
    return new Uint8Array(recoverySecret);
  } finally {
    recoverySecret.fill(0);
  }
}

async function openRecoverySession({
  requestMfaApproval,
  seedless,
  toprf,
  randomBytes,
}: PasswordlessRecoveryDependencies): Promise<void> {
  const { approval: aal2Token } = await requestMfaApproval({
    requestHash: bytesToHex(randomBytes(32)),
    audiences: [toprf.aal2Audience],
    requireVerification: true,
    includeIdentifiers: false,
    reason: { operation: PASSWORDLESS_RECOVERY_OPERATION },
  });
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: toprf.authConnectionId,
    groupedAuthConnectionId: toprf.groupedAuthConnectionId,
  });
}
