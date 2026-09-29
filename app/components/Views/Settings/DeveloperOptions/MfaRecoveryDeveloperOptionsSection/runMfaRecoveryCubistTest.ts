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
import { bytesToHex, stringToBytes } from '@metamask/utils';
import QuickCrypto from 'react-native-quick-crypto';
import Engine from '../../../../../core/Engine';
import { authEnv } from '../../../../../core/devApiEnv';
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
  if (!isRecord(error) || typeof error.message !== 'string') {
    return undefined;
  }
  const message = error.message.trim();
  if (message.length === 0 || message.length > 300) {
    return undefined;
  }
  return message;
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
  const config = getCubistConfig();
  const address = getPrimaryAddress();

  onStep('signing_in');
  let loginResponse: LoginResponse | null = null;
  const auth = new JwtBearerAuth(
    {
      env: authEnv(),
      platform: Platform.MOBILE,
      type: AuthType.SiWE,
    },
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
      await Engine.context.KeyringController.signPersonalMessage({
        data: bytesToHex(stringToBytes(message)),
        from: address,
      }),
  });
  const accessToken = await auth.getAccessToken();
  const profile = await auth.getUserProfile();

  onStep('registering_cubist_user');
  const providerRegistrationPayload = await CubeSignerClient.proveOidcIdentity(
    envs[config.environment],
    config.orgId,
    accessToken,
  );
  const ensureUserStatus = await ensureCubistUser(
    config,
    accessToken,
    providerRegistrationPayload,
  );

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
  const stubIdentifier = createStubIdentifier(address);
  const controller = new MfaRecoveryController({
    messenger: getControllerMessenger(),
    authProvider: new StubAuthProvider(profile.profileId),
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

  onStep('registering_recovery_secret');
  const recoverySecret = new Uint8Array(
    QuickCrypto.randomBytes(RECOVERY_SECRET_LENGTH),
  );
  await controller.register(recoverySecret, [siweIdentifier, stubIdentifier]);

  onStep('authenticating_identifier');
  const identifierSession =
    await controller.authenticateIdentifier(siweIdentifier);

  onStep('reading_recovery_secret');
  const recovered = await controller.getRecoverySecret(identifierSession);
  const matches =
    bytesToHex(recovered.recoverySecret) === bytesToHex(recoverySecret);

  onStep('completed');
  return {
    ensureUserStatus,
    epoch: recovered.epoch,
    matches,
  };
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
    throw new MfaRecoveryTestError(
      `Recovery registration failed with HTTP ${response.status}`,
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

function getPrimaryAddress(): string {
  const address =
    Engine.context.KeyringController.state.keyrings[0]?.accounts?.[0];
  if (typeof address !== 'string' || address.length === 0) {
    throw new MfaRecoveryTestError(
      'The primary account is unavailable',
      'primary_account_unavailable',
    );
  }
  return address;
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
