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
  /**
   * When false, never pick a passkey (no OS passkey sheet). Use after locked
   * MFA so escrow is fetched only via social ID-token prove.
   */
  allowPasskey?: boolean;
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
 * Picks the identifier to read the Recovery Secret with.
 *
 * Prefer social when it can be proven (fresh nonce-bound OIDC token; often
 * via Android Google autoSelect). Passkey is optional — MFA passkey cannot
 * be reused for Cubist, so post-MFA fetch sets
 * {@link FindRecoveryIdentifierOptions.allowPasskey} false.
 *
 * @param dependencies - The flow's dependencies.
 * @param options - What the wallet can prove.
 * @returns The identifier, or `null` when recovery is not set up for one.
 */
export async function findRecoveryIdentifier(
  { mfaRecovery }: Pick<PasswordlessRecoveryDependencies, 'mfaRecovery'>,
  {
    canProveSocialIdentifier,
    allowPasskey = true,
  }: FindRecoveryIdentifierOptions,
): Promise<Identifier | null> {
  const { identifiers, authIdentifiers } = await mfaRecovery.getIdentifiers();
  // Auth's copy carries the verifier (RP ID, credential ID) the proof needs.
  const approved = identifiers.flatMap((enrolled) => {
    const authIdentifier = authIdentifiers.find((candidate) =>
      sameIdentifier(candidate, enrolled),
    );
    return authIdentifier ? [authIdentifier] : [];
  });

  // Social first: after Google/Apple rehydration, ACM/browser may reuse the
  // session (Android autoSelect). Avoids a second passkey after MFA.
  if (canProveSocialIdentifier) {
    const social =
      approved.find((identifier) => identifier.type === 'social') ?? null;
    if (social) {
      return social;
    }
  }

  if (!allowPasskey) {
    return null;
  }

  const passkey = approved
    .map(withPasskeyVerifier)
    .find(isProvablePasskeyIdentifier);
  return passkey ?? null;
}

/**
 * Proves `identifier` to escrow and returns the Recovery Secret.
 * May show a passkey / social sheet — call before Create password UI so submit
 * does not prompt again. Caller owns the returned bytes and must zero them.
 *
 * @param dependencies - The flow's dependencies.
 * @param identifier - From {@link findRecoveryIdentifier}.
 * @returns Recovery secret bytes (length {@link RECOVERY_SECRET_LENGTH}).
 */
export async function fetchRecoverySecret(
  dependencies: PasswordlessRecoveryDependencies,
  identifier: Identifier,
): Promise<Uint8Array> {
  return await readRecoverySecret(dependencies, identifier);
}

/**
 * Sets a new local password, then the global password, with no escrow prove.
 *
 * Opens the TOPRF recovery session from the held AAL2 token (no UI), then
 * calls {@link SeedlessOnboardingController.setLocalPassword} and
 * {@link SeedlessOnboardingController.resetPasswordWithVaultKeys}.
 * `setLocalPassword` throws `RecoveryRequired` unless
 * `recoverWithRecoverySecret` has already left vault keys in memory.
 *
 * @param dependencies - The flow's dependencies.
 * @param newPassword - The new wallet password. Never logged.
 */
export async function setLocalAndGlobalPassword(
  dependencies: PasswordlessRecoveryDependencies,
  newPassword: string,
): Promise<void> {
  let step = 'opening_session';
  try {
    await openRecoverySession(dependencies);
    step = 'setting_local_password';
    await dependencies.seedless.setLocalPassword({ password: newPassword });
    step = 'resetting_global_password';
    await dependencies.seedless.resetPasswordWithVaultKeys({ newPassword });
  } catch (error) {
    const stage = step === 'opening_session' ? 'recovering_secrets' : 'setting_password';
    throw new PasswordlessRecoveryError(stage, error, step);
  }
}

/**
 * Recovers the social wallet without its old password and makes
 * `newPassword` the wallet password.
 *
 * Runs after the locked MFA verification. Opens the TOPRF recovery session
 * (held AAL2, no UI) and uses a Recovery Secret that was already fetched.
 * Does not prove to escrow. Then sets the local password and the global
 * password, and restores the keyring vault.
 *
 * @param dependencies - The flow's dependencies.
 * @param params - The parameters.
 * @param params.identifier - From {@link findRecoveryIdentifier}.
 * @param params.newPassword - The new wallet password. Never logged.
 * @param params.restoreVault - Creates the keyring vault from the secrets.
 * @param params.recoverySecret - Secret from {@link fetchRecoverySecret}.
 * @throws {PasswordlessRecoveryError} With the stage that failed.
 */
export async function recoverWalletWithoutPassword(
  dependencies: PasswordlessRecoveryDependencies,
  {
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
    recoverySecret: Uint8Array;
  },
): Promise<void> {
  const { seedless } = dependencies;

  let secrets: SecretMetadata[];
  let step = 'reading_secret';
  try {
    const secretPromise = Promise.resolve(prefetchedRecoverySecret);
    const [secretResult, sessionResult] = await Promise.allSettled([
      secretPromise,
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
