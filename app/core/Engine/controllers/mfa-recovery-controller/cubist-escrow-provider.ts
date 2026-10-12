import { CubeSignerClient, envs } from '@cubist-labs/cubesigner-sdk';
import {
  CubistEscrowProvider,
  type AuthControllerToken,
  type EcPublicJwk,
  type IdentifierAuthorization,
  type Mutation,
  type MutationPayload,
  type MutationReceipt,
  type RecoveryAuthProvider,
  type RecoveryEscrowProvider,
} from '@metamask/mfa-recovery-controller';
import { DEFAULT_REGISTRATION_URL } from './constants';
import {
  getCubistConfig,
  readEnvironmentVariable,
  type CubistConfig,
} from './config';
import { MfaRecoveryControllerError } from './errors';

interface LazyCubistEscrowProviderOptions {
  authProvider: RecoveryAuthProvider & {
    getAccessToken: () => Promise<string>;
  };
  isEnabled: () => boolean;
  getConfig?: () => CubistConfig;
}

interface OidcTokenResponse {
  idToken: string;
  expiresAt: number;
}

type GetRecoverySecretResponse = Awaited<
  ReturnType<RecoveryEscrowProvider['getSecret']>
>;
type PoPChallenge = Awaited<
  ReturnType<RecoveryEscrowProvider['generateChallenge']>
>;

/**
 * Creates a CubeSigner session only when the recovery feature is used.
 */
export class LazyCubistEscrowProvider implements RecoveryEscrowProvider {
  readonly id = 'cubist';

  readonly authAudience = 'cubist';

  #wrapPublicKey =
    readEnvironmentVariable('MM_CUBIST_WRAP_PUBLIC_KEY')?.trim() ?? '';

  #provider: CubistEscrowProvider | undefined;

  #profileId: string | undefined;

  #expiresAt = 0;

  readonly #authProvider: LazyCubistEscrowProviderOptions['authProvider'];

  readonly #isEnabled: () => boolean;

  readonly #getConfig: () => CubistConfig;

  constructor({
    authProvider,
    isEnabled,
    getConfig = getCubistConfig,
  }: LazyCubistEscrowProviderOptions) {
    this.#authProvider = authProvider;
    this.#isEnabled = isEnabled;
    this.#getConfig = getConfig;
  }

  get wrapPublicKey(): string {
    return this.#wrapPublicKey;
  }

  async isAvailable(): Promise<boolean> {
    return await (await this.#getProvider()).isAvailable();
  }

  async generateChallenge(): Promise<PoPChallenge> {
    return await (await this.#getProvider()).generateChallenge();
  }

  async getSecret(
    authorization: IdentifierAuthorization,
    requestId: string,
    pkE: EcPublicJwk,
  ): Promise<GetRecoverySecretResponse> {
    return await (
      await this.#getProvider()
    ).getSecret(authorization, requestId, pkE);
  }

  async applyMutation(
    mutation: Mutation,
    authControllerToken: AuthControllerToken,
    identifierAuthorization: IdentifierAuthorization | null,
    payload: MutationPayload,
  ): Promise<MutationReceipt> {
    return await (
      await this.#getProvider()
    ).applyMutation(
      mutation,
      authControllerToken,
      identifierAuthorization,
      payload,
    );
  }

  verifyReceipt(
    receipt: MutationReceipt,
    mutation: Mutation,
    expectedEscrowId: string,
  ): boolean {
    if (!this.#provider) {
      throw new MfaRecoveryControllerError(
        'Cubist escrow session has not been created',
        'escrow_session_unavailable',
      );
    }
    return this.#provider.verifyReceipt(receipt, mutation, expectedEscrowId);
  }

  async #getProvider(): Promise<CubistEscrowProvider> {
    if (!this.#isEnabled()) {
      throw new MfaRecoveryControllerError(
        'MFA recovery is disabled',
        'feature_disabled',
      );
    }

    const config = this.#getConfig();
    const profileId = await this.#authProvider.getAuthenticatedProfileId();
    if (
      this.#provider &&
      this.#profileId === profileId &&
      this.#expiresAt > Math.floor(Date.now() / 1000)
    ) {
      return this.#provider;
    }

    const oidcToken = await requestOidcToken(
      config,
      await this.#authProvider.getAccessToken(),
    );
    const sessionResponse = await CubeSignerClient.createOidcSession(
      envs[config.environment],
      config.orgId,
      oidcToken.idToken,
      config.scopes,
    );
    const client = await CubeSignerClient.create(sessionResponse.data());

    this.#wrapPublicKey = config.wrapPublicKey;
    this.#provider = new CubistEscrowProvider({
      client,
      wrapPublicKey: config.wrapPublicKey,
      receiptPublicKey: config.receiptPublicKey,
    });
    this.#profileId = profileId;
    this.#expiresAt = oidcToken.expiresAt;
    return this.#provider;
  }
}

/** Requests an OIDC token authorized by the MPC token service. */
export async function requestOidcToken(
  config: Pick<CubistConfig, 'registrationUrl'>,
  accessToken: string,
): Promise<OidcTokenResponse> {
  const response = await fetch(
    new URL(
      '/v1/recovery/registration/oidc-token',
      `${config.registrationUrl ?? DEFAULT_REGISTRATION_URL}/`,
    ).toString(),
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new MfaRecoveryControllerError(
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
    throw new MfaRecoveryControllerError(
      'Recovery registration returned an invalid OIDC token',
      'registration_response_invalid',
    );
  }
  if (body.expiresAt <= Math.floor(Date.now() / 1000)) {
    throw new MfaRecoveryControllerError(
      'Recovery registration returned an expired OIDC token',
      'registration_token_expired',
    );
  }
  return { idToken: body.idToken, expiresAt: body.expiresAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
