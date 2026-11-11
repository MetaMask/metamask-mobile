import type { Identifier } from '@metamask/mfa-recovery-controller';
import type {
  SeedlessOnboardingController,
  SeedlessOnboardingControllerState,
} from '@metamask/seedless-onboarding-controller';
import {
  RECOVERY_SECRET_LENGTH,
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import { MfaRecoveryControllerError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import { createSocialIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import {
  prepareRecoveryRun,
  type MfaRecoveryTestDependencies,
  type MfaRecoveryTestStep,
} from './runMfaRecoveryCubistTest';

export interface MfaRecoverySetupDependencies
  extends MfaRecoveryTestDependencies {
  /** Mints an approval for the TOPRF nodes; needs a verification session. */
  mintAal2Token: () => Promise<string>;
  /** Returns the recovery identifiers Auth holds for the canonical profile. */
  getAuthIdentifiers: () => Promise<Identifier[]>;
  seedless: MfaRecoverySeedless;
}

/** The seedless controller methods and state the recovery flows read. */
export type MfaRecoverySeedless = Pick<
  SeedlessOnboardingController,
  'authenticateForRecovery' | 'migrateToEnvelope' | 'runMigrations'
> & {
  state: Pick<
    SeedlessOnboardingControllerState,
    'envelope' | 'recoverySession' | 'authConnection' | 'userId'
  >;
};

export type MfaRecoverySetupStep =
  | MfaRecoveryTestStep
  | 'checking_recovery_status'
  | 'minting_aal2_token'
  | 'authenticating_aal2'
  | 'running_data_type_migration'
  | 'migrating_vault_to_envelope';

/** Recovery is set up once the vault is envelope-managed. */
export type MfaRecoveryStatus = 'Enabled' | 'NotEnabled';

export interface MfaRecoverySetupResult {
  before: MfaRecoveryStatus;
  after: MfaRecoveryStatus;
}

/** Derives the recovery status from the seedless controller state. */
export function getMfaRecoveryStatus(
  state: Pick<SeedlessOnboardingControllerState, 'envelope'>,
): MfaRecoveryStatus {
  return state.envelope === undefined ? 'NotEnabled' : 'Enabled';
}

/** The pair of identifier types to register. */
export type MfaRecoveryIdentifierCombination =
  | 'siwe_passkey'
  | 'siwe_social'
  | 'passkey_social';

const COMBINATION_TYPES: Record<
  MfaRecoveryIdentifierCombination,
  readonly ['siwe' | 'passkey', 'passkey' | 'social']
> = {
  siwe_passkey: ['siwe', 'passkey'],
  siwe_social: ['siwe', 'social'],
  passkey_social: ['passkey', 'social'],
};

/**
 * Returns the identifiers to register for a combination. SIWE is the primary
 * account's identifier and social is the seedless login's; neither is checked
 * against Auth's approved identifiers. The passkey comes from Auth as-is.
 *
 * @throws If Auth approved no passkey, or social is requested without a login.
 */
export function getRegistrationIdentifiers(
  authIdentifiers: readonly Identifier[],
  siweIdentifier: Identifier,
  combination: MfaRecoveryIdentifierCombination,
  getSocialIdentifier: () => Identifier,
): Identifier[] {
  return COMBINATION_TYPES[combination].map((type) => {
    if (type === 'siwe') {
      return siweIdentifier;
    }
    if (type === 'social') {
      return getSocialIdentifier();
    }
    const approved = authIdentifiers.find(
      (identifier) => identifier.type === type,
    );
    if (approved === undefined) {
      throw new MfaRecoveryControllerError(
        `Auth has no approved ${type} identifier for this profile`,
        'identifier_not_approved',
      );
    }
    return approved;
  });
}

/**
 * Runs ADR flow 1 against the live escrow and TOPRF nodes: registers a fresh
 * recovery secret with the escrow, authenticates at aal2, then migrates the
 * vault to envelope encryption with that secret.
 */
export async function runMfaRecoverySetup(
  dependencies: MfaRecoverySetupDependencies,
  onStep: (step: MfaRecoverySetupStep) => void = () => undefined,
  combination: MfaRecoveryIdentifierCombination = 'siwe_passkey',
): Promise<MfaRecoverySetupResult> {
  const { controller, identifiers } = await prepareRecoveryRun(
    dependencies,
    onStep,
  );
  const { seedless } = dependencies;

  onStep('checking_recovery_status');
  const before = getMfaRecoveryStatus(seedless.state);

  onStep('registering_recovery_secret');
  const registrationIdentifiers = getRegistrationIdentifiers(
    await dependencies.getAuthIdentifiers(),
    identifiers.siweIdentifier,
    combination,
    () => createSocialIdentifier(seedless.state),
  );
  const recoverySecret = new Uint8Array(
    dependencies.randomBytes(RECOVERY_SECRET_LENGTH),
  );
  await controller.register(recoverySecret, registrationIdentifiers);

  onStep('minting_aal2_token');
  const aal2Token = await dependencies.mintAal2Token();

  onStep('authenticating_aal2');
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
    groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
  });

  // migrateToEnvelope rejects vaults whose data types are not migrated yet.
  // runMigrations is a no-op once they are.
  onStep('running_data_type_migration');
  await seedless.runMigrations();

  onStep('migrating_vault_to_envelope');
  await seedless.migrateToEnvelope({ recoverySecret });

  onStep('checking_recovery_status');
  const after = getMfaRecoveryStatus(seedless.state);

  onStep('completed');
  return { before, after };
}
