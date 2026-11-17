import {
  SecretType,
  type SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import {
  TOPRF_RECOVERY_AUTH_CONNECTION_ID,
  TOPRF_RECOVERY_GROUPED_AUTH_CONNECTION_ID,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import type { MfaRecoveryService } from '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';

/** The seedless controller methods the full retrieval reads and writes. */
export type MfaRecoveryFullRetrievalSeedless = Pick<
  SeedlessOnboardingController,
  'authenticateForRecovery' | 'fetchAllSecretData' | 'recoverWithRecoverySecret'
>;

export interface MfaRecoveryFullRetrievalDependencies {
  seedless: MfaRecoveryFullRetrievalSeedless;
  /** The identifier the user chose to prove the Recovery Secret read with. */
  identifierType: MfaRecoveryFullRetrievalIdentifierType;
  /** Authenticates the seedless controller with the social login held in memory. */
  authenticateSeedless: () => Promise<void>;
}

export type MfaRecoveryFullRetrievalIdentifierType = 'siwe' | 'passkey';

export type MfaRecoveryFullRetrievalStep =
  | 'completed'
  | 'fetching_srps'
  | 'minting_aal2_token'
  | 'authenticating_seedless'
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
 * Full retrieval of the final bucket: snapshots the SRPs, mints one aal2 token,
 * reads the Recovery Secret from Cubist with the chosen identifier, authenticates
 * the seedless controller with the in-memory social login, recovers the vault from
 * TOPRF with the aal2 token and that secret, then checks that every SRP the vault
 * held before is back in the seedless controller.
 *
 * Recovering does not create a local vault or need a password. The recovered
 * vault keys stay in memory until a local password is set.
 */
export async function runMfaRecoveryFullRetrieval(
  service: MfaRecoveryService,
  dependencies: MfaRecoveryFullRetrievalDependencies,
  onStep: (step: MfaRecoveryFullRetrievalStep) => void = () => undefined,
): Promise<MfaRecoveryFullRetrievalResult> {
  const identifiers = await service.prepareRun();
  const { seedless } = dependencies;

  // 1) Snapshot the SRPs in the current vault, to compare against.
  onStep('fetching_srps');
  const expectedFingerprints = await srpFingerprints(
    await seedless.fetchAllSecretData(),
  );

  // 2) Mint the aal2 token once; the TOPRF steps below reuse it.
  onStep('minting_aal2_token');
  const aal2Token = await service.mintAal2Token();

  // 3) Cubist: the Recovery Secret, read with the identifier the user chose.
  const identifier =
    dependencies.identifierType === 'passkey'
      ? identifiers.passkeyIdentifier
      : identifiers.siweIdentifier;
  const recovered = await service.readRecoverySecret(identifier);
  const recoverySecret = new Uint8Array(recovered.recoverySecret);

  // 4) Seedless: the social session held in memory.
  onStep('authenticating_seedless');
  await dependencies.authenticateSeedless();

  // 5) TOPRF: authenticate at aal2, then recover the vault with the secret.
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
