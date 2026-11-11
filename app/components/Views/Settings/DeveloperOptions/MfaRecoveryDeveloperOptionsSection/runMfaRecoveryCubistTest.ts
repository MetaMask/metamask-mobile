import type {
  Identifier,
  MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { RecoveryIdentifierRouter } from '../../../../../core/Engine/controllers/mfa-recovery-controller/auth/identifier-auth-provider';
import { bytesToHex, sha256 } from '@metamask/utils';
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
  const { siweIdentifier, passkeyIdentifier } = identifiers;
  const newSecret = () =>
    new Uint8Array(dependencies.randomBytes(RECOVERY_SECRET_LENGTH));
  const readAndCompare = async (identifier: Identifier, secret: Uint8Array) => {
    const recovered = await readRecoverySecret(controller, identifier, onStep);
    return {
      epoch: recovered.epoch,
      matches: bytesToHex(recovered.recoverySecret) === bytesToHex(secret),
    };
  };

  let secret: Uint8Array;
  let result: MfaRecoveryTestResult;
  // Prefer SIWE for mutations when recovery already exists — the platform
  // passkey may not match the enrolled one after a prior run or restart.
  let mutationIdentifier: Identifier = passkeyIdentifier;

  try {
    const recovered = await readRecoverySecret(
      controller,
      siweIdentifier,
      onStep,
    );
    secret = new Uint8Array(recovered.recoverySecret);
    lastRegisteredSecret = new Uint8Array(secret);
    result = { epoch: recovered.epoch, matches: true };
    mutationIdentifier = siweIdentifier;
  } catch {
    onStep('registering_recovery_secret');
    secret = newSecret();
    await controller.register(secret, [siweIdentifier, passkeyIdentifier]);
    lastRegisteredSecret = new Uint8Array(secret);
    result = await readAndCompare(siweIdentifier, secret);
  }

  if (result.matches) {
    // Test a new secret, then put the original back so the escrow keeps the
    // secret the other runs and recoveries expect.
    const originalSecret = secret;
    onStep('updating_recovery_secret');
    const testSecret = newSecret();
    await controller.updateRecoverySecret(
      mutationIdentifier,
      testSecret,
      result.epoch,
    );
    result = await readAndCompare(mutationIdentifier, testSecret);

    onStep('restoring_recovery_secret');
    await controller.updateRecoverySecret(
      mutationIdentifier,
      originalSecret,
      result.epoch,
    );
    secret = originalSecret;
    lastRegisteredSecret = new Uint8Array(originalSecret);
    result = await readAndCompare(mutationIdentifier, originalSecret);
  }
  onStep('completed');
  return result;
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
      siweIdentifier: findAuthIdentifier(authIdentifiers, 'siwe'),
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
