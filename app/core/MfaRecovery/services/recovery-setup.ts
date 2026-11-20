import type { Identifier } from '@metamask/mfa-recovery-controller';
import type {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
} from '@metamask/seedless-onboarding-controller';
import { SOCIAL_IDENTIFIER_ISSUERS } from '../../Engine/controllers/mfa-recovery-controller/auth/identifiers';
import { MfaRecoveryControllerError } from '../../Engine/controllers/mfa-recovery-controller/errors';
import { isSameIdentifier } from './recovery-identifiers';

/** The seedless controller methods and state the recovery flows read. */
export type MfaRecoverySeedless = Pick<
  SeedlessOnboardingController,
  | 'authenticateForRecovery'
  | 'migrateToEnvelope'
  | 'runMigrations'
  | 'getAccessToken'
  | 'recoverWithRecoverySecret'
  | 'resetPasswordWithVaultKeys'
> & {
  state: Pick<
    SeedlessOnboardingControllerState,
    | 'envelope'
    | 'recoverySession'
    | 'authConnection'
    | 'userId'
    | 'vault'
    | 'socialLoginEmail'
  >;
};

/** Recovery is set up once the vault is envelope-managed. */
export type MfaRecoveryStatus = 'Enabled' | 'NotEnabled';

export type MfaRecoverySetupResult = 'already_enabled' | 'enabled';

/** Derives the recovery status from the seedless controller state. */
export function getMfaRecoveryStatus(
  state: Pick<SeedlessOnboardingControllerState, 'envelope'>,
): MfaRecoveryStatus {
  return state.envelope === undefined ? 'NotEnabled' : 'Enabled';
}

/**
 * Picks Auth's social identifier for the seedless social login, matched by
 * the login's OIDC issuer.
 */
export function findSocialIdentifier(
  authIdentifiers: readonly Identifier[],
  seedlessState: { authConnection?: string },
): Identifier | undefined {
  const namespace = seedlessState.authConnection
    ? SOCIAL_IDENTIFIER_ISSUERS[seedlessState.authConnection]
    : undefined;
  return authIdentifiers.find(
    (identifier) =>
      identifier.type === 'social' && identifier.namespace === namespace,
  );
}

/**
 * Returns the identifiers to register: SIWE, Auth's social identifier for the
 * seedless login, then `identifiers`, skipping any already in the list.
 *
 * @throws If Auth approved no social identifier for the seedless login.
 */
export function getRegistrationIdentifiers(
  authIdentifiers: readonly Identifier[],
  siweIdentifier: Identifier,
  identifiers: readonly Identifier[],
  seedlessState: { authConnection?: string },
): Identifier[] {
  const socialIdentifier = findSocialIdentifier(authIdentifiers, seedlessState);
  if (socialIdentifier === undefined) {
    const approved = authIdentifiers
      .map(({ type, namespace }) => `${type}@${namespace}`)
      .join(', ');
    throw new MfaRecoveryControllerError(
      `Auth has no approved social identifier for this login (approved: ${
        approved || 'none'
      })`,
      'social_identifier_not_approved',
    );
  }
  return [siweIdentifier, socialIdentifier, ...identifiers].filter(
    (identifier, index, all) =>
      all.findIndex((other) => isSameIdentifier(other, identifier)) === index,
  );
}
