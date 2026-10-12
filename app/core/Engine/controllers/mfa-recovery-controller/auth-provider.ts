import type {
  Identifier,
  RecoveryAuthProvider,
} from '@metamask/mfa-recovery-controller';
import { DEFAULT_TOKEN_API_HOST, TOKEN_API_KEY_HEADER } from './constants';
import { MfaRecoveryControllerError } from './errors';
import { getJwtSubject, hashIdentifiers } from './identifiers';

interface MpcTokenRecoveryAuthProviderOptions {
  getBearerToken: () => Promise<string>;
  apiKey: string;
  apiHost?: string;
}

/**
 * Mints request-bound recovery tokens through the MPC token service.
 *
 * The bearer token is resolved for every operation so the provider can live
 * with the Engine across authentication refreshes and account changes.
 */
export class MpcTokenRecoveryAuthProvider implements RecoveryAuthProvider {
  readonly #getBearerToken: () => Promise<string>;

  readonly #apiKey: string;

  readonly #apiHost: string;

  constructor({
    getBearerToken,
    apiKey,
    apiHost = DEFAULT_TOKEN_API_HOST,
  }: MpcTokenRecoveryAuthProviderOptions) {
    this.#getBearerToken = getBearerToken;
    this.#apiKey = apiKey;
    this.#apiHost = apiHost;
  }

  async getAccessToken(): Promise<string> {
    return await this.#mintToken();
  }

  async getAuthenticatedProfileId(): Promise<string> {
    return getJwtSubject(await this.#getBearerToken());
  }

  async authorizeRecoveryRequest(params: {
    requestHash: string;
    audiences: string[];
    requireTwoFactor?: boolean;
    identifiers?: Identifier[];
  }): Promise<string> {
    const identifiersHash =
      params.identifiers === undefined
        ? undefined
        : await hashIdentifiers(params.identifiers);

    return await this.#mintToken(
      {
        request_hash: params.requestHash,
        ...(params.requireTwoFactor ? { aal: 2 } : {}),
        ...(identifiersHash === undefined
          ? {}
          : { identifiers_hash: identifiersHash }),
      },
      params.audiences,
    );
  }

  async #mintToken(
    ext?: Record<string, unknown>,
    audiences?: string[],
  ): Promise<string> {
    if (!this.#apiKey.trim()) {
      throw new MfaRecoveryControllerError(
        'MFA_RECOVERY_DEV_API_KEY is not configured',
        'missing_configuration',
      );
    }

    const bearerToken = await this.#getBearerToken();
    const profileId = getJwtSubject(bearerToken);
    const response = await fetch(
      new URL('/token', `${this.#apiHost}/`).toString(),
      {
        method: 'POST',
        headers: {
          [TOKEN_API_KEY_HEADER]: this.#apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: profileId,
          ...(audiences === undefined ? {} : { aud: audiences }),
          ...(ext === undefined ? {} : { ext }),
        }),
      },
    );

    if (!response.ok) {
      throw new MfaRecoveryControllerError(
        `Failed to mint access token: HTTP ${response.status}`,
        'token_request_failed',
      );
    }

    const body: unknown = await response.json();
    if (!isRecord(body) || typeof body.token !== 'string') {
      throw new MfaRecoveryControllerError(
        'Token API returned an invalid access token response',
        'token_response_invalid',
      );
    }

    return body.token;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
