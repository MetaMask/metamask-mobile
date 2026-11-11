import {
  SecretType,
  type SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import {
  prepareRecoveryRun,
  readRecoverySecret,
  type MfaRecoveryTestDependencies,
  type MfaRecoveryTestStep,
} from './runMfaRecoveryCubistTest';

/** The seedless controller methods the full retrieval reads and writes. */
export type MfaRecoveryFullRetrievalSeedless = Pick<
  SeedlessOnboardingController,
  'authenticateForRecovery' | 'fetchAllSecretData' | 'recoverWithRecoverySecret'
>;

export interface MfaRecoveryFullRetrievalDependencies
  extends MfaRecoveryTestDependencies {
  /** Mints an approval for the TOPRF nodes; needs a verification session. */
  mintAal2Token: () => Promise<string>;
  seedless: MfaRecoveryFullRetrievalSeedless;
}

export type MfaRecoveryFullRetrievalStep =
  | MfaRecoveryTestStep
  | 'fetching_srps'
  | 'minting_aal2_token'
  | 'authenticating_aal2'
  | 'recovering_vault'
  | 'checking_srps';

export interface MfaRecoveryFullRetrievalResult {
  /** SRPs the vault held before the recovery. */
  expectedSrpCount: number;
  /** SRPs the seedless controller returned from the TOPRF nodes. */
  recoveredSrpCount: number;
  /** Pre-recovery SRPs found again in the recovered set. */
  matchedSrpCount: number;
  allSrpsRecovered: boolean;
}

/**
 * Fingerprints of the seed phrases in a secret data list. Only seed phrases
 * are compared: they are what the user needs back.
 */
async function srpFingerprints(
  items: readonly { type: SecretType; data: unknown }[],
): Promise<string[]> {
  const fingerprints: string[] = [];
  for (const item of items) {
    if (item.type === SecretType.Mnemonic) {
      const bytes =
        item.data instanceof Uint8Array
          ? item.data
          : stringToBytes(String(item.data));
      fingerprints.push(bytesToHex(await sha256(bytes)));
    }
  }
  return fingerprints;
}

/**
 * Full retrieval of the final bucket: reads the Recovery Secret from Cubist
 * with SIWE, recovers the vault from TOPRF with that secret, then checks that
 * every SRP the vault held before is back in the seedless controller.
 *
 * Recovering does not create a local vault or need a password. The recovered
 * vault keys stay in memory until a local password is set.
 */
export async function runMfaRecoveryFullRetrieval(
  dependencies: MfaRecoveryFullRetrievalDependencies,
  onStep: (step: MfaRecoveryFullRetrievalStep) => void = () => undefined,
): Promise<MfaRecoveryFullRetrievalResult> {
  const { controller, identifiers } = await prepareRecoveryRun(
    dependencies,
    onStep,
  );
  const { seedless } = dependencies;

  // 1) Cubist: the Recovery Secret, read with SIWE.
  const recovered = await readRecoverySecret(
    controller,
    identifiers.siweIdentifier,
    onStep,
  );
  const recoverySecret = new Uint8Array(recovered.recoverySecret);

  // 2) Snapshot the SRPs in the current vault, to compare against.
  onStep('fetching_srps');
  const expectedFingerprints = await srpFingerprints(
    await seedless.fetchAllSecretData(),
  );

  // 3) TOPRF: authenticate at aal2, then recover the vault with the secret.
  onStep('minting_aal2_token');
  const aal2Token = await dependencies.mintAal2Token();
  onStep('authenticating_aal2');
  await seedless.authenticateForRecovery({
    aal2Token,
    authConnectionId: TOPRF_RECOVERY_AUTH_CONNECTION_ID,
    groupedAuthConnectionId: TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
  });
  onStep('recovering_vault');
  // No password: the vault keys stay in memory until setLocalPassword runs.
  const recoveredItems = await seedless.recoverWithRecoverySecret({
    recoverySecret,
  });

  // 4) Every pre-recovery SRP should be back.
  onStep('checking_srps');
  const recoveredFingerprints = await srpFingerprints(recoveredItems);
  const matchedSrpCount = expectedFingerprints.filter((fingerprint) =>
    recoveredFingerprints.includes(fingerprint),
  ).length;

  onStep('completed');
  return {
    expectedSrpCount: expectedFingerprints.length,
    recoveredSrpCount: recoveredFingerprints.length,
    matchedSrpCount,
    allSrpsRecovered:
      expectedFingerprints.length > 0 &&
      matchedSrpCount === expectedFingerprints.length,
  };
}
