import {
  CubeSignerClient,
  envs,
  type Environment,
  type Scope,
} from '@cubist-labs/cubesigner-sdk';
import {
  MfaRecoveryController,
  type Identifier,
  type MfaRecoveryControllerMessenger,
} from '@metamask/mfa-recovery-controller';
import {
  MOCK_ANY_NAMESPACE,
  Messenger,
  type MessengerActions,
  type MessengerEvents,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { bytesToHex, sha256 } from '@metamask/utils';
import QuickCrypto from 'react-native-quick-crypto';
import Engine from '../../../../../core/Engine';
import { toChecksumAddress } from '../../../../../util/address';
import { CubistEscrowProvider } from './CubistEscrowProvider';
import {
  StubAuthProvider,
  SiweIdentifierAuthProvider,
  passthroughEncryptor,
} from './mfaRecoveryTestProviders';

const DEFAULT_REGISTRATION_URL =
  'https://recovery-registration.dev-api.cx.metamask.io';
const DEFAULT_CUBIST_ENVIRONMENT: Environment = 'gamma';
const DEFAULT_SESSION_SCOPES: Scope[] = ['manage:*'];
const RECOVERY_SECRET_LENGTH = 32;

export type MfaRecoveryTestStep =
  | 'signing_in'
  | 'registering_cubist_user'
  | 'creating_cubist_session'
  | 'registering_recovery_secret'
  | 'authenticating_identifier'
  | 'reading_recovery_secret'
  | 'completed';

export interface MfaRecoveryTestResult {
  ensureUserStatus: 'created' | 'exists';
  epoch: number;
  matches: boolean;
}

export interface MfaRecoveryRecoverResult {
  epoch: number;
  matches: boolean | undefined;
  fingerprint: string;
}

interface CubistConfig {
  environment: Environment;
  orgId: string;
  wrapPublicKey: string;
  receiptPublicKey: string;
  scopes: Scope[];
  registrationUrl: string;
}

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MfaRecoveryControllerMessenger>,
  MessengerEvents<MfaRecoveryControllerMessenger>
>;

interface RecoveryContext {
  config: CubistConfig;
  accessToken: string;
  controller: MfaRecoveryController;
  siweIdentifier: Identifier;
  ensureUserStatus?: 'created' | 'exists';
}

type RecoveryContextPreparation = (
  config: CubistConfig,
  accessToken: string,
) => Promise<'created' | 'exists' | undefined>;

let lastRegisteredSecret: Uint8Array | undefined;

/**
 * Error raised by the developer-only recovery flow before a controller error
 * is available.
 */
export class MfaRecoveryTestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MfaRecoveryTestError';
    this.code = code;
  }
}

/**
 * Returns a safe code for displaying a recovery test failure.
 *
 * Controller errors use `code`. Cubist `ErrResponse` uses `errorCode` and
 * `status` instead, so those are mapped here rather than collapsing to
 * `unknown_error`.
 *
 * @param error - Failure from the recovery flow.
 * @returns Stable error code, without exposing tokens or secrets.
 */
export function getMfaRecoveryErrorCode(error: unknown): string {
  if (!isRecord(error)) {
    return 'unknown_error';
  }
  if (typeof error.code === 'string' && error.code.length > 0) {
    return error.code;
  }
  if (typeof error.errorCode === 'string' && error.errorCode.length > 0) {
    return error.errorCode;
  }
  if (typeof error.status === 'number') {
    return `http_${error.status}`;
  }
  return 'unknown_error';
}

/**
 * Returns a short, non-secret description of a recovery test failure.
 *
 * @param error - Failure from the recovery flow.
 * @returns Server or exception message, when one is safe to show.
 */
export function getMfaRecoveryErrorDetail(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const parts: string[] = [];
  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    parts.push(error.message.trim());
  }
  // Cubist `ErrResponse` fields; the body is often empty on 4xx so these are
  // the only way to tell which endpoint rejected the request.
  if (typeof error.statusText === 'string' && error.statusText.length > 0) {
    parts.push(error.statusText);
  }
  if (typeof error.errorCode === 'string') {
    parts.push(`errorCode=${error.errorCode}`);
  }
  if (typeof error.requestId === 'string') {
    parts.push(`requestId=${error.requestId}`);
  }
  if (typeof error.url === 'string') {
    parts.push(error.url);
  }
  const detail = parts.join(' | ');
  return detail.length === 0 ? undefined : detail.slice(0, 400);
}

/**
 * Runs the live Cubist MFA recovery round trip from Developer Options.
 *
 * @param onStep - Optional progress callback.
 * @returns Registration status and recovery verification result.
 */
export async function runMfaRecoveryCubistTest(
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
): Promise<MfaRecoveryTestResult> {
  const context = await createRecoveryContext(
    onStep,
    async (config, accessToken) => {
      onStep('registering_cubist_user');
      const providerRegistrationPayload =
        await CubeSignerClient.proveOidcIdentity(
          envs[config.environment],
          config.orgId,
          accessToken,
        );

      return await ensureCubistUser(
        config,
        accessToken,
        providerRegistrationPayload,
      );
    },
  );
  if (context.ensureUserStatus === undefined) {
    throw new MfaRecoveryTestError(
      'Recovery registration did not return a user status',
      'registration_response_invalid',
    );
  }

  onStep('registering_recovery_secret');
  const recoverySecret = new Uint8Array(
    QuickCrypto.randomBytes(RECOVERY_SECRET_LENGTH),
  );
  await context.controller.register(recoverySecret, [context.siweIdentifier]);
  lastRegisteredSecret = new Uint8Array(recoverySecret);

  const recovered = await readRecoverySecret(
    context.controller,
    context.siweIdentifier,
    onStep,
  );
  const matches =
    bytesToHex(recovered.recoverySecret) === bytesToHex(recoverySecret);

  onStep('completed');
  return {
    ensureUserStatus: context.ensureUserStatus,
    epoch: recovered.epoch,
    matches,
  };
}

/**
 * Runs only the recovery half of the live Cubist MFA flow.
 *
 * @param onStep - Optional progress callback.
 * @returns Recovery verification result and a non-secret fingerprint.
 */
export async function runMfaRecoveryCubistRecover(
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
): Promise<MfaRecoveryRecoverResult> {
  const context = await createRecoveryContext(onStep);
  const recovered = await readRecoverySecret(
    context.controller,
    context.siweIdentifier,
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

async function createRecoveryContext(
  onStep: (step: MfaRecoveryTestStep) => void,
  prepareSession?: RecoveryContextPreparation,
): Promise<RecoveryContext> {
  const config = getCubistConfig();
  const address = getPrimaryAddress();

  // Reuse the app's SRP session (same `AuthType.SRP` JwtBearerAuth the rest of
  // the app uses) instead of a separate SIWE login.
  onStep('signing_in');
  const { AuthenticationController } = Engine.context;
  const accessToken = await AuthenticationController.getBearerToken();
  const profile = await AuthenticationController.getSessionProfile();
  const ensureUserStatus = await prepareSession?.(config, accessToken);

  onStep('creating_cubist_session');
  const sessionResponse = await CubeSignerClient.createOidcSession(
    envs[config.environment],
    config.orgId,
    accessToken,
    config.scopes,
  );
  const client = await CubeSignerClient.create(sessionResponse.data());
  const escrow = new CubistEscrowProvider({
    client,
    wrapPublicKey: config.wrapPublicKey,
    receiptPublicKey: config.receiptPublicKey,
  });

  const siweIdentifier = createSiweIdentifier(address);
  const controller = new MfaRecoveryController({
    messenger: getControllerMessenger(),
    authProvider: new StubAuthProvider(profile.profileId, accessToken),
    identifierAuthProvider: new SiweIdentifierAuthProvider(
      address,
      async ({ data, from }) =>
        await Engine.context.KeyringController.signPersonalMessage({
          data,
          from,
        }),
    ),
    escrows: [escrow],
    pendingOperationEncryptor: passthroughEncryptor,
  });

  return {
    config,
    accessToken,
    controller,
    siweIdentifier,
    ensureUserStatus,
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

async function ensureCubistUser(
  config: CubistConfig,
  accessToken: string,
  providerRegistrationPayload: unknown,
): Promise<'created' | 'exists'> {
  const response = await fetch(
    new URL(
      '/v1/recovery/registration/ensure-user',
      `${config.registrationUrl}/`,
    ).toString(),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        providerVerifierId: 'cubist',
        providerRegistrationPayload,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new MfaRecoveryTestError(
      `Recovery registration failed with HTTP ${response.status} ${body.slice(0, 200)}`.trim(),
      'registration_request_failed',
    );
  }

  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    (body.status !== 'created' && body.status !== 'exists')
  ) {
    throw new MfaRecoveryTestError(
      'Recovery registration returned an invalid status',
      'registration_response_invalid',
    );
  }
  return body.status;
}

function getCubistConfig(): CubistConfig {
  const environment =
    readEnvironmentVariable('MM_CUBIST_ENV') ?? DEFAULT_CUBIST_ENVIRONMENT;
  if (
    environment !== 'beta' &&
    environment !== 'gamma' &&
    environment !== 'prod'
  ) {
    throw new MfaRecoveryTestError(
      'MM_CUBIST_ENV must be beta, gamma, or prod',
      'invalid_configuration',
    );
  }

  return {
    environment,
    orgId: getRequiredConfig('MM_CUBIST_ORG_ID'),
    wrapPublicKey: getRequiredConfig('MM_CUBIST_WRAP_PUBLIC_KEY'),
    receiptPublicKey: getRequiredConfig('MM_CUBIST_RECEIPT_PUBLIC_KEY'),
    scopes: parseScopes(readEnvironmentVariable('MM_CUBIST_SESSION_SCOPES')),
    registrationUrl:
      readEnvironmentVariable('MM_RECOVERY_REGISTRATION_URL') ??
      DEFAULT_REGISTRATION_URL,
  };
}

function getRequiredConfig(name: EnvironmentVariableName): string {
  const value = readEnvironmentVariable(name)?.trim();
  if (!value) {
    throw new MfaRecoveryTestError(
      `${name} is not configured`,
      'missing_configuration',
    );
  }
  return value;
}

function parseScopes(value: string | undefined): Scope[] {
  if (value === undefined) {
    return [...DEFAULT_SESSION_SCOPES];
  }
  const scopes = value
    .split(',')
    .map((scope) => scope.trim())
    .filter(Boolean);
  if (scopes.length === 0) {
    throw new MfaRecoveryTestError(
      'MM_CUBIST_SESSION_SCOPES must not be empty',
      'invalid_configuration',
    );
  }
  return scopes;
}

type EnvironmentVariableName =
  | 'MM_CUBIST_ENV'
  | 'MM_CUBIST_ORG_ID'
  | 'MM_CUBIST_WRAP_PUBLIC_KEY'
  | 'MM_CUBIST_RECEIPT_PUBLIC_KEY'
  | 'MM_CUBIST_SESSION_SCOPES'
  | 'MM_RECOVERY_REGISTRATION_URL';

// `babel-plugin-transform-inline-environment-variables` only inlines static
// `process.env.NAME` accesses at bundle time; a computed `process.env[name]`
// is left as-is and is always `undefined` in the Hermes runtime. Each variable
// must therefore be spelled out literally here.
function readEnvironmentVariable(
  name: EnvironmentVariableName,
): string | undefined {
  switch (name) {
    case 'MM_CUBIST_ENV':
      return process.env.MM_CUBIST_ENV;
    case 'MM_CUBIST_ORG_ID':
      return process.env.MM_CUBIST_ORG_ID;
    case 'MM_CUBIST_WRAP_PUBLIC_KEY':
      return process.env.MM_CUBIST_WRAP_PUBLIC_KEY;
    case 'MM_CUBIST_RECEIPT_PUBLIC_KEY':
      return process.env.MM_CUBIST_RECEIPT_PUBLIC_KEY;
    case 'MM_CUBIST_SESSION_SCOPES':
      return process.env.MM_CUBIST_SESSION_SCOPES;
    case 'MM_RECOVERY_REGISTRATION_URL':
      return process.env.MM_RECOVERY_REGISTRATION_URL;
    default:
      return undefined;
  }
}

// Keyring state stores lowercase addresses, but `SiweMessage` rewrites the
// address to EIP-55 before signing. The auth nonce must be requested with the
// same checksummed form or the login endpoint rejects the signature.
function getPrimaryAddress(): string {
  const address =
    Engine.context.KeyringController.state.keyrings[0]?.accounts?.[0];
  if (typeof address !== 'string' || address.length === 0) {
    throw new MfaRecoveryTestError(
      'The primary account is unavailable',
      'primary_account_unavailable',
    );
  }
  return toChecksumAddress(address);
}

function getControllerMessenger(): MfaRecoveryControllerMessenger {
  const rootMessenger: RootMessenger = new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });
  return new Messenger({
    namespace: 'MfaRecoveryController',
    parent: rootMessenger,
  });
}

function createSiweIdentifier(address: string): Identifier {
  return {
    type: 'siwe',
    namespace: 'eip155:1',
    value: address,
    verifier: { address },
  };
}

function createStubIdentifier(address: string): Identifier {
  return {
    type: 'passkey',
    namespace: 'metamask.io',
    value: `dev-stub-${address}`,
    verifier: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
