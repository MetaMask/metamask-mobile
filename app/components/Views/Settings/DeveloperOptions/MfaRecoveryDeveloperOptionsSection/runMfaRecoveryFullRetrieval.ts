import {
  SecretType,
  type SeedlessOnboardingController,
} from '@metamask/seedless-onboarding-controller';
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import type { MfaRecoveryService } from '../../../../../core/MfaRecovery/services/mfa-recovery-service';

/** The seedless controller methods the full retrieval reads and writes. */
export type MfaRecoveryFullRetrievalSeedless = Pick<
  SeedlessOnboardingController,
  'fetchAllSecretData' | 'recoverWithRecoverySecret'
>;

export interface MfaRecoveryFullRetrievalDependencies {
  seedless: MfaRecoveryFullRetrievalSeedless;
  /** The identifier the user chose to prove the Recovery Secret read with. */
  identifierType: MfaRecoveryFullRetrievalIdentifierType;
}

export type MfaRecoveryFullRetrievalIdentifierType = 'siwe' | 'passkey';

export type MfaRecoveryFullRetrievalStep =
  | 'completed'
  | 'fetching_srps'
  | 'reading_recovery_secret'
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
 * Full retrieval of the final bucket on the unlocked wallet: snapshots the
 * SRPs, reads the Recovery Secret from Cubist with the chosen identifier,
 * opens the aal2 TOPRF recovery session on the wallet's seedless session,
 * recovers the vault with that secret, then checks that every SRP the vault
 * held before is back in the seedless controller.
 *
 * Recovering does not create a local vault or need a password. The recovered
 * vault keys stay in memory until a local password is set.
 */
export async function runMfaRecoveryFullRetrieval(
  service: MfaRecoveryService,
  { seedless, identifierType }: MfaRecoveryFullRetrievalDependencies,
  onStep: (step: MfaRecoveryFullRetrievalStep) => void = () => undefined,
): Promise<MfaRecoveryFullRetrievalResult> {
  const identifiers = await service.prepareRun();

  onStep('fetching_srps');
  const expectedFingerprints = await srpFingerprints(
    await seedless.fetchAllSecretData(),
  );

  onStep('reading_recovery_secret');
  const { recoverySecret } = await service.readRecoverySecret(
    identifierType === 'passkey'
      ? identifiers.passkeyIdentifier
      : identifiers.siweIdentifier,
  );

  let recoveredItems: Awaited<
    ReturnType<MfaRecoveryFullRetrievalSeedless['recoverWithRecoverySecret']>
  >;
  try {
    onStep('authenticating_aal2');
    await service.openRecoverySession();
    onStep('recovering_vault');
    recoveredItems = await seedless.recoverWithRecoverySecret({
      recoverySecret,
    });
  } finally {
    recoverySecret.fill(0);
  }

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
