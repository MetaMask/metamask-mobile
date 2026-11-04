import type {
  RecoveryStatus,
  SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import {
  RECOVERY_SECRET_LENGTH,
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import {
  prepareRecoveryRun,
  type MfaRecoveryTestDependencies,
  type MfaRecoveryTestStep,
} from './runMfaRecoveryCubistTest';

export interface MfaRecoverySetupDependencies
  extends MfaRecoveryTestDependencies {
  /** Mints an approval for the TOPRF nodes; needs a verification session. */
  mintAal2Token: () => Promise<string>;
  seedless: Pick<
    SeedlessOnboardingController,
    'getRecoveryStatus' | 'authenticateForRecovery' | 'storeRecoveryKeys'
  >;
}

export type MfaRecoverySetupStep =
  | MfaRecoveryTestStep
  | 'checking_recovery_status'
  | 'minting_aal2_token'
  | 'authenticating_aal2'
  | 'storing_recovery_keys';

export interface MfaRecoverySetupResult {
  before: RecoveryStatus;
  after: RecoveryStatus;
}

/**
 * Runs ADR flow 1 against the live escrow and TOPRF nodes: registers a fresh
 * recovery secret with the escrow, then stores its TOPRF recovery keys.
 */
export async function runMfaRecoverySetup(
  dependencies: MfaRecoverySetupDependencies,
  onStep: (step: MfaRecoverySetupStep) => void = () => undefined,
): Promise<MfaRecoverySetupResult> {
  const { controller, identifiers } = await prepareRecoveryRun(
    dependencies,
    onStep,
  );
  const { siweIdentifier, passkeyIdentifier } = identifiers;
  const { seedless } = dependencies;

  onStep('minting_aal2_token');
  const aal2Token = await dependencies.mintAal2Token();

  onStep('authenticating_aal2');
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
    groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
  });

  onStep('checking_recovery_status');
  const before = await seedless.getRecoveryStatus();

  onStep('registering_recovery_secret');
  const recoverySecret = new Uint8Array(
    dependencies.randomBytes(RECOVERY_SECRET_LENGTH),
  );
  await controller.register(recoverySecret, [
    siweIdentifier,
    passkeyIdentifier,
  ]);

  onStep('storing_recovery_keys');
  await seedless.storeRecoveryKeys({ recoverySecret });

  onStep('checking_recovery_status');
  const after = await seedless.getRecoveryStatus();

  onStep('completed');
  return { before: before.status, after: after.status };
}
