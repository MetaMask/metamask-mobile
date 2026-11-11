import { extractPublicKey } from '@metamask/eth-sig-util';
import { bytesToHex, hexToBytes, sha256, stringToBytes } from '@metamask/utils';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import { MfaRecoveryControllerError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import type { SignPersonalMessage } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import {
  getMfaRecoveryStatus,
  type MfaRecoverySeedless,
  type MfaRecoveryStatus,
} from './runMfaRecoverySetup';

const PUBLIC_KEY_MESSAGE = 'MetaMask TOPRF recovery secret test v1';

export interface ToprfRecoverySecretTestDependencies {
  address: string;
  signPersonalMessage: SignPersonalMessage;
  seedless: MfaRecoverySeedless;
  mintAal2Token: () => Promise<string>;
}

export type ToprfRecoverySecretTestStep =
  | 'deriving_recovery_secret'
  | 'checking_recovery_status'
  | 'minting_aal2_token'
  | 'authenticating_aal2'
  | 'running_data_type_migration'
  | 'migrating_vault_to_envelope'
  | 'completed';

export interface ToprfRecoverySecretTestResult {
  before: MfaRecoveryStatus;
  after: MfaRecoveryStatus;
  shareExisted: boolean;
  fingerprint: string;
}

/**
 * Derives a constant test recovery secret from the public key of `address`:
 * SHA-256 of the key recovered from a personal signature. Anyone who knows the
 * public key can derive it, so it must only be used on throwaway accounts.
 */
export async function deriveTestRecoverySecret(
  address: string,
  signPersonalMessage: SignPersonalMessage,
): Promise<Uint8Array> {
  if (!address) {
    throw new MfaRecoveryControllerError(
      'The primary account is unavailable',
      'primary_account_unavailable',
    );
  }
  const data = bytesToHex(stringToBytes(PUBLIC_KEY_MESSAGE));
  const signature = await signPersonalMessage({ data, from: address });
  const publicKey = extractPublicKey({ data, signature });
  return await sha256(hexToBytes(publicKey));
}

/**
 * Runs the TOPRF half of ADR flow 1 without Cubist: authenticates at aal2,
 * then migrates the vault to envelope encryption with a constant test
 * recovery secret, which writes the recovery envelope to the TOPRF nodes.
 * Migration is a no-op once the vault is envelope-managed, so re-running only
 * re-checks the status.
 */
export async function runToprfRecoverySecretTest(
  dependencies: ToprfRecoverySecretTestDependencies,
  onStepCallback: (step: ToprfRecoverySecretTestStep) => void = () => undefined,
): Promise<ToprfRecoverySecretTestResult> {
  const { seedless } = dependencies;

  onStepCallback('deriving_recovery_secret');
  const recoverySecret = await deriveTestRecoverySecret(
    dependencies.address,
    dependencies.signPersonalMessage,
  );

  onStepCallback('minting_aal2_token');
  const aal2Token = await dependencies.mintAal2Token();

  onStepCallback('authenticating_aal2');
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
    groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
  });

  // hasRecoveryShare is only reported once an aal2 session exists.
  onStepCallback('checking_recovery_status');
  const before = getMfaRecoveryStatus(seedless.state);
  const shareExisted =
    seedless.state.recoverySession?.hasRecoveryShare === true;

  // migrateToEnvelope rejects vaults whose data types are not migrated yet.
  // runMigrations is a no-op once they are.
  onStepCallback('running_data_type_migration');
  await seedless.runMigrations();

  onStepCallback('migrating_vault_to_envelope');
  await seedless.migrateToEnvelope({ recoverySecret });

  onStepCallback('checking_recovery_status');
  const after = getMfaRecoveryStatus(seedless.state);

  onStepCallback('completed');
  return {
    before,
    after,
    shareExisted,
    fingerprint: bytesToHex(await sha256(recoverySecret)).slice(2, 10),
  };
}
