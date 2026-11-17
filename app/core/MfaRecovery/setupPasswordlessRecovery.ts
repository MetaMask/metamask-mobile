import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import type {
  MfaApproval,
  MfaApprovalIdentifier,
  RequestMfaApprovalRequest,
} from '@metamask/profile-sync-controller/sdk';
import type {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex } from '@metamask/utils';
import type { ToprfRecoveryConfig } from '../Engine/controllers/mfa-recovery-controller/config';
import { RECOVERY_SECRET_LENGTH } from '../Engine/controllers/mfa-recovery-controller/constants';
import { getMfaRecoveryErrorCode } from '../Engine/controllers/mfa-recovery-controller/errors';
import { withPasskeyVerifier } from '../Engine/controllers/mfa-recovery-controller/auth/passkey-identifier-auth-provider';
import { LinkSocialLoginError } from './linkSocialLogin';
import { redactForDisplay } from './redactForDisplay';

/** Operation named on the Auth approvals this setup requests. */
export const PASSWORDLESS_RECOVERY_SETUP_OPERATION =
  'wallet.passwordless_recovery_setup';

const SOCIAL_IDENTIFIER_ISSUERS: Readonly<Record<string, string>> = {
  google: 'https://accounts.google.com',
  apple: 'https://appleid.apple.com',
};

export type PasswordlessRecoverySetupMfa = Pick<
  MfaRecoveryController,
  | 'register'
  | 'abort'
  | 'getIdentifiers'
  | 'authenticateIdentifier'
  | 'getRecoverySecret'
>;

export type PasswordlessRecoverySetupSeedless = Pick<
  SeedlessOnboardingController,
  'authenticateForRecovery' | 'runMigrations' | 'migrateToEnvelope'
> & {
  state: Pick<
    SeedlessOnboardingControllerState,
    'envelope' | 'authConnection' | 'userId'
  >;
};

export interface PasswordlessRecoverySetupDependencies {
  mfaRecovery: PasswordlessRecoverySetupMfa;
  seedless: PasswordlessRecoverySetupSeedless;
  requestMfaApproval: (
    request: RequestMfaApprovalRequest,
  ) => Promise<MfaApproval>;
  /** Proves a factor so the approvals below are accepted. Wallet stays unlocked. */
  verifyMfa: () => Promise<void>;
  /**
   * Links the social login to the Auth profile when Auth does not list it yet.
   * Runs after `verifyMfa`, which provides the token linking needs.
   */
  linkSocialLogin: () => Promise<void>;
  toprf: ToprfRecoveryConfig;
  /** Audience Cubist accepts on the identifier approval. */
  cubistAuthAudience: string;
  randomBytes: (length: number) => Uint8Array;
}

export type PasswordlessRecoverySetupResult = 'already_enabled' | 'enabled';

/** A failed setup. Carries no token, secret, or password. */
export class PasswordlessRecoverySetupError extends Error {
  readonly code: string;

  /** Non-secret hint, such as which identifier kinds Auth approved. */
  readonly detail?: string;

  constructor(code: string, detail?: string) {
    super(`Passwordless recovery setup failed: ${code}`);
    this.name = 'PasswordlessRecoverySetupError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Prepares the unlocked social wallet so passwordless recovery can open it.
 *
 * Registers one recovery secret at Cubist for the enrolled passkey and the
 * social login, then seals the seed phrases so that secret can open them.
 * The current password still unlocks the wallet. Does nothing when the vault
 * is already sealed.
 *
 * @param dependencies - The setup's dependencies.
 * @returns Whether setup ran or the vault was already prepared.
 */
export async function setupPasswordlessRecovery(
  dependencies: PasswordlessRecoverySetupDependencies,
): Promise<PasswordlessRecoverySetupResult> {
  if (dependencies.seedless.state.envelope) {
    return 'already_enabled';
  }

  let recoverySecret = new Uint8Array(0);
  let stage = 'verifying_mfa';
  try {
    await dependencies.verifyMfa();
    stage = 'reading_identifiers';
    let approved = await readApprovedIdentifiers(dependencies);
    if (!findSocialIdentifier(approved, dependencies.seedless.state)) {
      stage = 'linking_social_login';
      await dependencies.linkSocialLogin();
      stage = 'reading_identifiers';
      approved = await readApprovedIdentifiers(dependencies);
    }
    const identifiers = selectApprovedIdentifiers(
      approved,
      dependencies.seedless.state,
    );
    // A failed attempt leaves an authorizing mutation. Drop it before retrying.
    stage = 'clearing_pending_setup';
    await dependencies.mfaRecovery.abort();
    stage = 'reading_escrow';
    const enrolled = await dependencies.mfaRecovery.getIdentifiers();
    if (enrolled.epoch > 0) {
      // A previous attempt already stored the secret. Registering again asks
      // for version 1, which Cubist rejects.
      stage = 'reading_registered_secret';
      const passkey = identifiers.find(
        (identifier) => identifier.type === 'passkey',
      );
      if (!passkey) {
        throw new PasswordlessRecoverySetupError('passkey_not_enrolled');
      }
      recoverySecret = await readRegisteredSecret(
        dependencies,
        withPasskeyVerifier(passkey),
      );
    } else {
      recoverySecret = new Uint8Array(
        dependencies.randomBytes(RECOVERY_SECRET_LENGTH),
      );
      stage = 'registering_recovery_secret';
      await dependencies.mfaRecovery.register(recoverySecret, identifiers);
    }
    stage = 'opening_recovery_session';
    await openRecoverySession(dependencies);
    stage = 'migrating_data';
    await dependencies.seedless.runMigrations();
    stage = 'sealing_vault';
    await dependencies.seedless.migrateToEnvelope({ recoverySecret });
    return 'enabled';
  } catch (error) {
    if (error instanceof PasswordlessRecoverySetupError) {
      throw error;
    }
    throw new PasswordlessRecoverySetupError(
      getMfaRecoveryErrorCode(error),
      error instanceof LinkSocialLoginError
        ? error.detail
        : describeFailure(stage, error),
    );
  } finally {
    recoverySecret.fill(0);
  }
}

/** Reads the secret a previous setup already stored at Cubist. */
async function readRegisteredSecret(
  { mfaRecovery }: PasswordlessRecoverySetupDependencies,
  passkey: Identifier,
): Promise<Uint8Array> {
  const session = await mfaRecovery.authenticateIdentifier(passkey);
  const { recoverySecret } = await mfaRecovery.getRecoverySecret(session);
  try {
    if (recoverySecret.length !== RECOVERY_SECRET_LENGTH) {
      throw new PasswordlessRecoverySetupError('recovery_secret_invalid');
    }
    return new Uint8Array(recoverySecret);
  } finally {
    recoverySecret.fill(0);
  }
}

/** Names the failed step and the error, with secrets removed. */
function describeFailure(stage: string, error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : '';
  return `${stage}; ${name}${message ? `: ${redactForDisplay(message)}` : ''}`;
}

/**
 * Uses Auth's identifiers unchanged. Adding fields, including a passkey
 * verifier, makes the recovery controller reject the mutation.
 */
function selectApprovedIdentifiers(
  approved: readonly MfaApprovalIdentifier[],
  state: Pick<SeedlessOnboardingControllerState, 'authConnection' | 'userId'>,
): Identifier[] {
  const passkey = approved.find((identifier) => identifier.type === 'passkey');
  if (!passkey) {
    throw new PasswordlessRecoverySetupError('passkey_not_enrolled');
  }
  const social = findSocialIdentifier(approved, state);
  if (!social) {
    throw new PasswordlessRecoverySetupError(
      'social_identifier_not_approved',
      approved.map(({ type, namespace }) => `${type}@${namespace}`).join(', '),
    );
  }
  return [passkey, social];
}

function findSocialIdentifier(
  approved: readonly MfaApprovalIdentifier[],
  state: Pick<SeedlessOnboardingControllerState, 'authConnection'>,
): MfaApprovalIdentifier | undefined {
  const namespace = state.authConnection
    ? SOCIAL_IDENTIFIER_ISSUERS[state.authConnection]
    : undefined;
  return approved.find(
    (identifier) =>
      identifier.type === 'social' && identifier.namespace === namespace,
  );
}

async function readApprovedIdentifiers({
  requestMfaApproval,
  cubistAuthAudience,
  randomBytes,
}: PasswordlessRecoverySetupDependencies): Promise<MfaApprovalIdentifier[]> {
  const { identifiers = [] } = await requestMfaApproval({
    requestHash: bytesToHex(randomBytes(32)),
    audiences: [cubistAuthAudience],
    requireVerification: true,
    includeIdentifiers: true,
    reason: { operation: PASSWORDLESS_RECOVERY_SETUP_OPERATION },
  });
  return identifiers;
}

async function openRecoverySession({
  requestMfaApproval,
  seedless,
  toprf,
  randomBytes,
}: PasswordlessRecoverySetupDependencies): Promise<void> {
  const { approval: aal2Token } = await requestMfaApproval({
    requestHash: bytesToHex(randomBytes(32)),
    audiences: [toprf.aal2Audience],
    requireVerification: true,
    includeIdentifiers: false,
    reason: { operation: PASSWORDLESS_RECOVERY_SETUP_OPERATION },
  });
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: toprf.authConnectionId,
    groupedAuthConnectionId: toprf.groupedAuthConnectionId,
  });
}
