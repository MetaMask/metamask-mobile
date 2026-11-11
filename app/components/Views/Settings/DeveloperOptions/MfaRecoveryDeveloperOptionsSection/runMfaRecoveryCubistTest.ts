import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifier-auth-provider';
import { bytesToHex, sha256 } from '@metamask/utils';
import { createSiweIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifiers';
import { RECOVERY_SECRET_LENGTH } from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
  MfaRecoveryControllerError,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';

export {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';

export interface MfaRecoveryTestDependencies {
  controller: MfaRecoveryController;
  identifierRouter: RecoveryIdentifierRouter;
  address: string;
  randomBytes: (length: number) => Uint8Array;
  /** Starts the verification session recovery approvals require. */
  verifyMfa: () => Promise<void>;
  /** Returns the recovery identifiers Auth holds for the canonical profile. */
  getAuthIdentifiers: () => Promise<Identifier[]>;
}

export type MfaRecoveryTestStep =
  | 'verifying_mfa'
  | 'resuming_pending_operation'
  | 'signing_in'
  | 'requesting_oidc_token'
  | 'creating_cubist_session'
  | 'registering_recovery_secret'
  | 'authenticating_identifier'
  | 'reading_recovery_secret'
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

/** The identifiers a run reads and writes with. */
export interface MfaRecoveryRunIdentifiers {
  siweIdentifier: Identifier;
  /** The passkey Auth approved; proven with the platform passkey sheet. */
  passkeyIdentifier: Identifier;
}

/** Runs the same live registration/recovery round trip in the app or Node. */
export async function runMfaRecoveryCubistTest(
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
): Promise<MfaRecoveryTestResult> {
  const { controller, identifiers } = await prepareRecoveryRun(
    dependencies,
    onStep,
  );
  const newSecret = () =>
    new Uint8Array(dependencies.randomBytes(RECOVERY_SECRET_LENGTH));
  const readAndCompare = async (identifier: Identifier, secret: Uint8Array) => {
    const recovered = await readRecoverySecret(controller, identifier, onStep);
    return {
      epoch: recovered.epoch,
      matches: bytesToHex(recovered.recoverySecret) === bytesToHex(secret),
    };
  };

  // Only an existing Cubist registration is tested; nothing is registered here.
  const registeredIdentifier = await pickRegisteredIdentifier(
    controller,
    identifiers,
  );
  const recovered = await readRecoverySecret(
    controller,
    registeredIdentifier,
    onStep,
  );
  const originalSecret = new Uint8Array(recovered.recoverySecret);
  lastRegisteredSecret = new Uint8Array(originalSecret);

  // Test a new secret, then put the original back so the escrow keeps the
  // secret the other runs and recoveries expect.
  onStep('updating_recovery_secret');
  const testSecret = newSecret();
  await controller.updateRecoverySecret(
    registeredIdentifier,
    testSecret,
    recovered.epoch,
  );
  const afterUpdate = await readAndCompare(registeredIdentifier, testSecret);

  onStep('restoring_recovery_secret');
  await controller.updateRecoverySecret(
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
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
  identifierType: RecoveryReadIdentifierType = 'siwe',
  socialIdentifier?: Identifier,
): Promise<MfaRecoveryRecoverResult> {
  const { controller, identifiers } = await prepareRecoveryRun(
    dependencies,
    onStep,
  );
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
  const recovered = await readRecoverySecret(
    controller,
    readIdentifier,
    onStep,
  );
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

export async function prepareRecoveryRun(
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void,
): Promise<{
  controller: MfaRecoveryController;
  identifiers: MfaRecoveryRunIdentifiers;
}> {
  const { controller } = dependencies;
  if (!dependencies.address) {
    throw new MfaRecoveryControllerError(
      'The primary account is unavailable',
      'primary_account_unavailable',
    );
  }
  onStep('verifying_mfa');
  await dependencies.verifyMfa();
  if ((await controller.getPhase()) !== 'idle') {
    onStep('resuming_pending_operation');
    await controller.resume();
  }

  onStep('signing_in');
  onStep('requesting_oidc_token');
  onStep('creating_cubist_session');

  if (lastRegisteredAddress !== dependencies.address) {
    lastRegisteredSecret = undefined;
    lastRegisteredAddress = dependencies.address;
  }
  const authIdentifiers = await dependencies.getAuthIdentifiers();
  return {
    controller,
    identifiers: {
      // Auth only approves non-SIWE identifiers; SIWE is proven by the wallet
      // signature, so fall back to the primary account's identifier.
      siweIdentifier:
        authIdentifiers.find((identifier) => identifier.type === 'siwe') ??
        createSiweIdentifier(dependencies.address),
      passkeyIdentifier: findAuthIdentifier(authIdentifiers, 'passkey'),
    },
  };
}

/** Picks the identifier of the given type that Auth approved for this profile. */
function findAuthIdentifier(
  identifiers: readonly Identifier[],
  type: Identifier['type'],
): Identifier {
  const identifier = identifiers.find((candidate) => candidate.type === type);
  if (identifier === undefined) {
    throw new MfaRecoveryControllerError(
      `Auth has no approved ${type} identifier for this profile`,
      'identifier_not_approved',
    );
  }
  return identifier;
}

/** Authenticates the identifier and reads the Recovery Secret from the escrow. */
export async function readRecoverySecret(
  controller: MfaRecoveryController,
  identifier: Identifier,
  onStep: (step: MfaRecoveryTestStep) => void,
) {
  onStep('authenticating_identifier');
  const identifierSession = await controller.authenticateIdentifier(identifier);
  onStep('reading_recovery_secret');
  return await controller.getRecoverySecret(identifierSession);
}
