import {
  type Identifier,
  type MfaRecoveryController,
} from '@metamask/mfa-recovery-controller';
import { bytesToHex, sha256 } from '@metamask/utils';
import { RECOVERY_SECRET_LENGTH } from '../../../../../core/Engine/controllers/mfa-recovery-controller/constants';
import { RecoveryIdentifierRouter } from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifier-auth-provider';
import { createSiweIdentifier } from '../../../../../core/Engine/controllers/mfa-recovery-controller/identifiers';
import {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
  MfaRecoveryControllerError,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';
import { TestPasskeyIdentifierAuthProvider } from './mfaRecoveryTestProviders';

export {
  getMfaRecoveryErrorCode,
  getMfaRecoveryErrorDetail,
} from '../../../../../core/Engine/controllers/mfa-recovery-controller/errors';

const TEST_PROVIDER_BY_ROUTER = new WeakMap<
  RecoveryIdentifierRouter,
  TestIdentifierState
>();

interface TestIdentifierState {
  address: string;
  siweIdentifier: Identifier;
  passkeyProvider: TestPasskeyIdentifierAuthProvider;
}

export interface MfaRecoveryTestDependencies {
  controller: MfaRecoveryController;
  identifierRouter: RecoveryIdentifierRouter;
  address: string;
  randomBytes: (length: number) => Uint8Array;
}

export type MfaRecoveryTestStep =
  | 'resuming_pending_operation'
  | 'signing_in'
  | 'requesting_oidc_token'
  | 'creating_cubist_session'
  | 'registering_recovery_secret'
  | 'authenticating_identifier'
  | 'reading_recovery_secret'
  | 'updating_recovery_secret'
  | 'updating_identifiers'
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

interface TestIdentifierSet extends TestIdentifierState {
  passkeyIdentifier: Identifier;
  createPasskeyIdentifier: () => Identifier;
  setPasskeyIdentifier: (identifier: Identifier) => void;
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
  // Prefer SIWE for mutations when recovery already exists — the local passkey
  // may not match the enrolled one after a prior run or process restart.
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
    onStep('updating_recovery_secret');
    secret = newSecret();
    await controller.updateRecoverySecret(
      mutationIdentifier,
      secret,
      result.epoch,
    );
    lastRegisteredSecret = new Uint8Array(secret);
    result = await readAndCompare(mutationIdentifier, secret);
  }
  if (result.matches) {
    onStep('updating_identifiers');
    const replacementPasskey = identifiers.createPasskeyIdentifier();
    await controller.updateIdentifiers(
      siweIdentifier,
      [siweIdentifier, replacementPasskey],
      result.epoch,
    );
    identifiers.setPasskeyIdentifier(replacementPasskey);
    result = await readAndCompare(replacementPasskey, secret);
  }
  onStep('completed');
  return result;
}

/** Runs recovery without overwriting the previously registered secret. */
export async function runMfaRecoveryCubistRecover(
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
): Promise<MfaRecoveryRecoverResult> {
  const { controller, identifiers } = await prepareRecoveryRun(
    dependencies,
    onStep,
  );
  const recovered = await readRecoverySecret(
    controller,
    identifiers.siweIdentifier,
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

async function prepareRecoveryRun(
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void,
): Promise<{
  controller: MfaRecoveryController;
  identifiers: TestIdentifierSet;
}> {
  const { controller, identifierRouter } = dependencies;
  if (!dependencies.address) {
    throw new MfaRecoveryControllerError(
      'The primary account is unavailable',
      'primary_account_unavailable',
    );
  }
  if ((await controller.getPhase()) !== 'idle') {
    onStep('resuming_pending_operation');
    await controller.resume();
  }

  onStep('signing_in');
  onStep('requesting_oidc_token');
  onStep('creating_cubist_session');

  let state = TEST_PROVIDER_BY_ROUTER.get(identifierRouter);
  if (state?.address !== dependencies.address) {
    lastRegisteredSecret = undefined;
    const passkeyProvider = new TestPasskeyIdentifierAuthProvider();
    identifierRouter.registerProvider('passkey', passkeyProvider);
    state = {
      address: dependencies.address,
      siweIdentifier: createSiweIdentifier(dependencies.address),
      passkeyProvider,
    };
    TEST_PROVIDER_BY_ROUTER.set(identifierRouter, state);
  }
  const currentState = state;
  return {
    controller,
    identifiers: {
      ...currentState,
      passkeyIdentifier: currentState.passkeyProvider.passkeyIdentifier,
      createPasskeyIdentifier: () =>
        currentState.passkeyProvider.createPasskeyIdentifier(),
      setPasskeyIdentifier: (identifier) =>
        currentState.passkeyProvider.setPasskeyIdentifier(identifier),
    },
  };
}

async function readRecoverySecret(
  controller: MfaRecoveryController,
  siweIdentifier: Identifier,
  onStep: (step: MfaRecoveryTestStep) => void,
) {
  onStep('authenticating_identifier');
  const identifierSession =
    await controller.authenticateIdentifier(siweIdentifier);
  onStep('reading_recovery_secret');
  return await controller.getRecoverySecret(identifierSession);
}
