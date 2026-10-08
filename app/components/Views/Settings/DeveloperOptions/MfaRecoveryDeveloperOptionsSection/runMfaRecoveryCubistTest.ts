import {
  CubeSignerClient,
  envs,
  type Environment,
  type Scope,
} from '@cubist-labs/cubesigner-sdk';
import {
  AuthType,
  JwtBearerAuth,
  Platform,
  type LoginResponse,
} from '@metamask/profile-sync-controller/sdk';
import {
  CubistEscrowProvider,
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
import { bytesToHex, sha256, stringToBytes } from '@metamask/utils';
import { authEnv } from '../../../../../core/apiEnv';
import {
  TestIdentifierAuthProvider,
  StubAuthProvider,
  passthroughEncryptor,
} from './mfaRecoveryTestProviders';

const DEFAULT_REGISTRATION_URL =
  'https://recovery-registration.dev-api.cx.metamask.io';
const DEFAULT_SESSION_SCOPES: Scope[] = ['manage:*'];
const RECOVERY_SECRET_LENGTH = 32;

export interface MfaRecoveryTestDependencies {
  address: string;
  signPersonalMessage: (params: {
    data: string;
    from: string;
  }) => Promise<string>;
  randomBytes: (length: number) => Uint8Array;
  getAuthSession?: () => Promise<AuthSession>;
}

interface AuthSession {
  accessToken: string;
}

export type MfaRecoveryTestStep =
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

interface CubistConfig {
  environment: Environment;
  orgId: string;
  wrapPublicKey: string;
  receiptPublicKey: string;
  scopes: Scope[];
  registrationUrl: string;
  mpcApiKey: string;
}

type RootMessenger = Messenger<
  MockAnyNamespace,
  MessengerActions<MfaRecoveryControllerMessenger>,
  MessengerEvents<MfaRecoveryControllerMessenger>
>;

let lastRegisteredSecret: Uint8Array | undefined;
let testIdentifiers: TestIdentifierAuthProvider | undefined;

/** Error raised by the developer-only recovery flow. */
export class MfaRecoveryTestError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'MfaRecoveryTestError';
    this.code = code;
  }
}

/** Returns a stable error code without exposing tokens or secrets. */
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

/** Returns short diagnostic detail for the developer UI. */
export function getMfaRecoveryErrorDetail(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }
  const parts: string[] = [];
  if (typeof error.message === 'string' && error.message.trim().length > 0) {
    parts.push(error.message.trim());
  }
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

/** Runs the same live registration/recovery round trip in the app or Node. */
export async function runMfaRecoveryCubistTest(
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void = () => undefined,
): Promise<MfaRecoveryTestResult> {
  const { controller, identifiers } = await createRecoveryContext(
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

  onStep('registering_recovery_secret');
  let secret = newSecret();
  await controller.register(secret, [siweIdentifier, passkeyIdentifier]);
  lastRegisteredSecret = new Uint8Array(secret);
  let result = await readAndCompare(siweIdentifier, secret);

  if (result.matches) {
    onStep('updating_recovery_secret');
    secret = newSecret();
    await controller.updateRecoverySecret(
      passkeyIdentifier,
      secret,
      result.epoch,
    );
    lastRegisteredSecret = new Uint8Array(secret);
    result = await readAndCompare(passkeyIdentifier, secret);
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
  const context = await createRecoveryContext(dependencies, onStep);
  const recovered = await readRecoverySecret(
    context.controller,
    context.identifiers.siweIdentifier,
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
  dependencies: MfaRecoveryTestDependencies,
  onStep: (step: MfaRecoveryTestStep) => void,
) {
  const config = getCubistConfig();
  const { address, signPersonalMessage } = dependencies;
  if (!address) {
    throw new MfaRecoveryTestError(
      'The primary account is unavailable',
      'primary_account_unavailable',
    );
  }

  onStep('signing_in');
  const session = await (dependencies.getAuthSession?.() ??
    signInWithSiwe(dependencies));
  const { accessToken } = session;
  const authProvider = new StubAuthProvider({
    accessToken,
    apiKey: config.mpcApiKey,
  });

  const accessToken1 = await authProvider.getAccessToken();
  onStep('requesting_oidc_token');
  const idToken = await requestOidcToken(config, accessToken1);
  onStep('creating_cubist_session');
  const sessionResponse = await CubeSignerClient.createOidcSession(
    envs[config.environment],
    config.orgId,
    idToken,
    config.scopes,
  );
  const client = await CubeSignerClient.create(sessionResponse.data());
  const escrow = new CubistEscrowProvider({
    client,
    wrapPublicKey: config.wrapPublicKey,
    receiptPublicKey: config.receiptPublicKey,
  });
  escrow.isAvailable = async () => {
    try {
      await client.apiClient.userGet();
      return true;
    } catch {
      return false;
    }
  };
  const identifiers = getTestIdentifiers(address, signPersonalMessage);
  const controller = new MfaRecoveryController({
    messenger: getControllerMessenger(),
    authProvider,
    identifierAuthProvider: identifiers,
    escrows: [escrow],
    pendingOperationEncryptor: passthroughEncryptor,
  });
  return { controller, identifiers };
}

async function signInWithSiwe({
  address,
  signPersonalMessage,
}: MfaRecoveryTestDependencies) {
  let loginResponse: LoginResponse | null = null;
  const auth = new JwtBearerAuth(
    { env: authEnv(), platform: Platform.MOBILE, type: AuthType.SiWE },
    {
      storage: {
        async getLoginResponse(): Promise<LoginResponse | null> {
          return loginResponse;
        },
        async setLoginResponse(value: LoginResponse): Promise<void> {
          loginResponse = value;
        },
      },
    },
  );
  auth.prepare({
    address,
    chainId: 1,
    domain: 'metamask.io',
    signMessage: async (message) =>
      await signPersonalMessage({
        data: bytesToHex(stringToBytes(message)),
        from: address,
      }),
  });
  const accessToken = await auth.getAccessToken();
  return { accessToken };
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

async function requestOidcToken(
  config: CubistConfig,
  accessToken: string,
): Promise<string> {
  const response = await fetch(
    new URL(
      '/v1/recovery/registration/oidc-token',
      `${config.registrationUrl}/`,
    ).toString(),
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new MfaRecoveryTestError(
      `Recovery registration failed with HTTP ${response.status}`,
      'registration_request_failed',
    );
  }
  const body: unknown = await response.json();
  if (
    !isRecord(body) ||
    typeof body.idToken !== 'string' ||
    body.idToken.trim().length === 0 ||
    typeof body.expiresAt !== 'number' ||
    !Number.isFinite(body.expiresAt)
  ) {
    throw new MfaRecoveryTestError(
      'Recovery registration returned an invalid OIDC token',
      'registration_response_invalid',
    );
  }
  if (body.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new MfaRecoveryTestError(
      'Recovery registration returned an expired OIDC token',
      'registration_token_expired',
    );
  }
  return body.idToken;
}

function getCubistConfig(): CubistConfig {
  const environment = readEnvironmentVariable('MM_CUBIST_ENV') ?? 'gamma';
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
    mpcApiKey: getRequiredConfig('MFA_RECOVERY_DEV_API_KEY'),
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
  | 'MM_RECOVERY_REGISTRATION_URL'
  | 'MFA_RECOVERY_DEV_API_KEY';

// Keep static accesses so Babel can inline environment variables in Hermes.
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
    case 'MFA_RECOVERY_DEV_API_KEY':
      return process.env.MFA_RECOVERY_DEV_API_KEY;
    default:
      return undefined;
  }
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

function getTestIdentifiers(
  address: string,
  signPersonalMessage: MfaRecoveryTestDependencies['signPersonalMessage'],
): TestIdentifierAuthProvider {
  if (testIdentifiers?.address === address) {
    return testIdentifiers;
  }
  testIdentifiers = new TestIdentifierAuthProvider(
    address,
    signPersonalMessage,
  );
  return testIdentifiers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
