import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { bytesToHex, sha256 } from '@metamask/utils';
import { MfaRecoveryControllerError } from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import type {
  MfaRecoveryRunIdentifiers,
  MfaRecoveryService,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/services/mfa-recovery-service';

export {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';

export type MfaRecoveryTestStep =
  | 'updating_recovery_secret'
  | 'restoring_recovery_secret'
  | 'completed';

export interface MfaRecoveryTestResult {
  epoch: number;
  matches: boolean;
}

export interface MfaRecoveryRecoverResult {
  epoch: number;
  matches: boolean | undefined;
  fingerprint: string;
}

let lastRegisteredSecret: Uint8Array | undefined;
let lastRegisteredAddress: string | undefined;

/** Prepares a run and forgets the secret registered for another account. */
async function prepareTestRun(
  service: MfaRecoveryService,
): Promise<MfaRecoveryRunIdentifiers> {
  const identifiers = await service.prepareRun();
  if (lastRegisteredAddress !== service.address) {
    lastRegisteredSecret = undefined;
    lastRegisteredAddress = service.address;
  }
  return identifiers;
}

/** Runs the live registration/recovery round trip against Cubist. */
export async function runMfaRecoveryCubistTest(
  service: MfaRecoveryService,
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
): Promise<MfaRecoveryTestResult> {
  const identifiers = await prepareTestRun(service);
  const { mfaRecoveryController } = service;
  const readAndCompare = async (identifier: Identifier, secret: Uint8Array) => {
    const recovered = await service.readRecoverySecret(identifier);
    return {
      epoch: recovered.epoch,
      matches: bytesToHex(recovered.recoverySecret) === bytesToHex(secret),
    };
  };

  // Only an existing Cubist registration is tested; nothing is registered here.
  const registeredIdentifier = await pickRegisteredIdentifier(
    mfaRecoveryController,
    identifiers,
  );
  const recovered = await service.readRecoverySecret(registeredIdentifier);
  const originalSecret = new Uint8Array(recovered.recoverySecret);
  lastRegisteredSecret = new Uint8Array(originalSecret);

  // Test a new secret, then put the original back so the escrow keeps the
  // secret the other runs and recoveries expect.
  onStep('updating_recovery_secret');
  const testSecret = service.createRecoverySecret();
  await mfaRecoveryController.updateRecoverySecret(
    registeredIdentifier,
    testSecret,
    recovered.epoch,
  );
  const afterUpdate = await readAndCompare(registeredIdentifier, testSecret);

  onStep('restoring_recovery_secret');
  await mfaRecoveryController.updateRecoverySecret(
    registeredIdentifier,
    originalSecret,
    afterUpdate.epoch,
  );
  lastRegisteredSecret = new Uint8Array(originalSecret);
  const result = await readAndCompare(registeredIdentifier, originalSecret);

  onStep('completed');
  return result;
}

/**
 * Picks the Auth-approved identifier that Cubist has enrolled, preferring
 * SIWE. Throws when Cubist has neither, or when the read fails.
 */
async function pickRegisteredIdentifier(
  controller: MfaRecoveryController,
  identifiers: MfaRecoveryRunIdentifiers,
): Promise<Identifier> {
  let enrolledTypes: readonly string[] = [];
  try {
    enrolledTypes = (await controller.getIdentifiers()).identifiers.map(
      (identifier) => identifier.type,
    );
  } catch {
    enrolledTypes = [];
  }
  if (enrolledTypes.includes('siwe')) {
    return identifiers.siweIdentifier;
  }
  if (enrolledTypes.includes('passkey')) {
    return identifiers.passkeyIdentifier;
  }
  throw new MfaRecoveryControllerError(
    'Cubist recovery is not set up',
    'recovery_not_registered',
  );
}

/** The identifier type used to authenticate a secret read. */
export type RecoveryReadIdentifierType = 'siwe' | 'passkey' | 'social';

/**
 * Runs recovery without overwriting the previously registered secret, proving
 * the read with the chosen identifier type. The social identifier comes from
 * seedless state, so the caller passes it in.
 */
export async function runMfaRecoveryCubistRecover(
  service: MfaRecoveryService,
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
  identifierType: RecoveryReadIdentifierType = 'siwe',
  socialIdentifier?: Identifier,
): Promise<MfaRecoveryRecoverResult> {
  const identifiers = await prepareTestRun(service);
  const readIdentifier = (() => {
    switch (identifierType) {
      case 'passkey':
        return identifiers.passkeyIdentifier;
      case 'social':
        if (socialIdentifier === undefined) {
          throw new MfaRecoveryControllerError(
            'Seedless onboarding has no social login',
            'social_login_unavailable',
          );
        }
        return socialIdentifier;
      default:
        return identifiers.siweIdentifier;
    }
  })();
  const recovered = await service.readRecoverySecret(readIdentifier);
  const matches =
    lastRegisteredSecret === undefined
      ? undefined
      : bytesToHex(recovered.recoverySecret) ===
        bytesToHex(lastRegisteredSecret);
  onStep('completed');
  return {
    epoch: recovered.epoch,
    matches,
    fingerprint: bytesToHex(await sha256(recovered.recoverySecret)).slice(
      2,
      10,
    ),
  };
}
