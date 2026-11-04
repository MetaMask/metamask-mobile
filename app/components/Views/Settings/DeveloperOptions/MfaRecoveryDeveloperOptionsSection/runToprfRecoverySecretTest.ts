import { extractPublicKey } from '@metamask/eth-sig-util';
import type {
  RecoveryStatus,
  SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex, hexToBytes, sha256, stringToBytes } from '@metamask/utils';
import Logger from '../../../../../util/Logger';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import { MfaRecoveryControllerError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import type { SignPersonalMessage } from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifiers';

const PUBLIC_KEY_MESSAGE = 'MetaMask TOPRF recovery secret test v1';

export interface ToprfRecoverySecretTestDependencies {
  address: string;
  signPersonalMessage: SignPersonalMessage;
  seedless: Pick<
    SeedlessOnboardingController,
    'getRecoveryStatus' | 'authenticateForRecovery' | 'storeRecoveryKeys'
  >;
  mintAal2Token: () => Promise<string>;
}

export type ToprfRecoverySecretTestStep =
  | 'deriving_recovery_secret'
  | 'checking_recovery_status'
  | 'minting_aal2_token'
  | 'authenticating_aal2'
  | 'storing_recovery_keys'
  | 'evaluating_recovery_keys'
  | 'completed';

export interface ToprfRecoverySecretTestResult {
  before: RecoveryStatus;
  after: RecoveryStatus;
  shareExisted: boolean;
  liveKeyMatches: boolean;
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
 * Runs the TOPRF half of ADR flow 1 without Cubist: stores the recovery
 * secret key share and recovery keys, then evaluates the share again with the
 * same secret.
 */
export async function runToprfRecoverySecretTest(
  dependencies: ToprfRecoverySecretTestDependencies,
  onStepCallback: (step: ToprfRecoverySecretTestStep) => void = () => undefined,
): Promise<ToprfRecoverySecretTestResult> {
  const { seedless } = dependencies;
  const debug = (message: string, data?: Record<string, unknown>) =>
    Logger.log('[TOPRF recovery test]', message, data ?? {});
  const onStep = (step: ToprfRecoverySecretTestStep) => {
    debug('step', { step });
    onStepCallback(step);
  };

  onStep('deriving_recovery_secret');
  const recoverySecret = await deriveTestRecoverySecret(
    dependencies.address,
    dependencies.signPersonalMessage,
  );

  onStep('minting_aal2_token');
  const aal2Token = await dependencies.mintAal2Token();

  onStep('authenticating_aal2');
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
    groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
  });
  debug('aal2 node auth tokens stored');

  // hasRecoveryShare is only reported once an aal2 session exists.
  onStep('checking_recovery_status');
  const before = await seedless.getRecoveryStatus();
  debug('status before', { ...before });
  const shareExisted = before.hasRecoveryShare === true;

  let liveKeyMatches = true;
  if (!shareExisted) {
    onStep('storing_recovery_keys');
    const stored = await seedless.storeRecoveryKeys({ recoverySecret });
    debug('store result', { liveKeyMatches: stored.liveKeyMatches });
    liveKeyMatches = stored.liveKeyMatches;
  }

  onStep('evaluating_recovery_keys');
  const evaluated = await seedless.storeRecoveryKeys({ recoverySecret });
  debug('evaluate result', { liveKeyMatches: evaluated.liveKeyMatches });
  liveKeyMatches = liveKeyMatches && evaluated.liveKeyMatches;

  onStep('checking_recovery_status');
  const after = await seedless.getRecoveryStatus();
  debug('status after', { ...after });

  onStep('completed');
  return {
    before: before.status,
    after: after.status,
    shareExisted,
    liveKeyMatches,
    fingerprint: bytesToHex(await sha256(recoverySecret)).slice(2, 10),
  };
}
