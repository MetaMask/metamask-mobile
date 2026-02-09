import Logger from '../../../../util/Logger';
import { CardError, CardErrorType, CardLocation } from '../types';
import { getDefaultBaanxApiBaseUrlForMetaMaskEnv } from './mapBaanxApiUrl';

// Constants
const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

type TokenHint = 'access_token' | 'refresh_token';

interface RevokeTokenOptions {
  /** The token to revoke */
  token: string;
  /** Type of token being revoked */
  tokenHint: TokenHint;
  /** The user's location (us or international) */
  location: CardLocation;
}

/**
 * Revokes a token via the Baanx OAuth2 revocation endpoint.
 *
 * Follows RFC 7009 for OAuth 2.0 Token Revocation.
 * Uses POST /v1/auth/oauth2/revoke with x-client-key header.
 *
 * @param options - Token revocation options
 * @returns A promise that resolves to true if revocation was successful
 * @throws {CardError} If the revocation request fails
 */
export const revokeCardOAuth2Token = async (
  options: RevokeTokenOptions,
): Promise<boolean> => {
  const { token, tokenHint, location } = options;

  const apiKey = process.env.MM_CARD_BAANX_API_CLIENT_KEY;
  const baseUrl =
    process.env.BAANX_API_URL ||
    getDefaultBaanxApiBaseUrlForMetaMaskEnv(process.env.METAMASK_ENVIRONMENT);

  if (!apiKey) {
    throw new CardError(
      CardErrorType.API_KEY_MISSING,
      'Card API key is not configured',
    );
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-us-env': String(location === 'us'),
    'x-client-key': apiKey,
  };

  const requestBody = {
    token,
    token_hint: tokenHint,
  };

  const url = `${baseUrl}/v1/auth/oauth2/revoke`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, DEFAULT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'omit',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      Logger.log(
        `[revokeCardOAuth2Token] Revocation failed for ${tokenHint} with status ${response.status}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    clearTimeout(timeoutId);

    // Log but don't throw - token revocation failures should not block logout
    Logger.error(error as Error, {
      tags: { feature: 'card', operation: 'revokeCardOAuth2Token' },
      context: {
        name: 'card_oauth2_revoke',
        data: { tokenHint, url },
      },
    });

    return false;
  }
};

/**
 * Revokes both access and refresh tokens via the OAuth2 revocation endpoint.
 *
 * Best-effort: if one revocation fails, the other is still attempted.
 * Local token cleanup should always happen after this call regardless of results.
 *
 * @param accessToken - The access token to revoke
 * @param refreshToken - The refresh token to revoke (optional)
 * @param location - The user's location
 */
export const revokeAllCardOAuth2Tokens = async (
  accessToken: string,
  refreshToken: string | undefined,
  location: CardLocation,
): Promise<void> => {
  const revocations: Promise<boolean>[] = [];

  // Revoke access token
  revocations.push(
    revokeCardOAuth2Token({
      token: accessToken,
      tokenHint: 'access_token',
      location,
    }),
  );

  // Revoke refresh token if present
  if (refreshToken) {
    revocations.push(
      revokeCardOAuth2Token({
        token: refreshToken,
        tokenHint: 'refresh_token',
        location,
      }),
    );
  }

  // Wait for all revocations (best-effort)
  await Promise.allSettled(revocations);
};
