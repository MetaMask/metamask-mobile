import { Platform } from 'react-native';
import { AuthConnection, AuthRefreshTokenResponse } from './OAuthInterface';
import { createLoginHandler } from './OAuthLoginHandlers';
import type {
  RefreshJWTToken,
  RenewRefreshToken,
  RevokeRefreshToken,
} from '@metamask/seedless-onboarding-controller/dist/types.d.cts';

export const AUTH_SERVER_RENEW_PATH = '/api/v2/oauth/renew_refresh_token';
export const AUTH_SERVER_REVOKE_PATH = '/api/v2/oauth/revoke';
export const AUTH_SERVER_TOKEN_PATH = '/api/v1/oauth/token';

interface AuthTokenHandlerInterface {
  refreshJWTToken: RefreshJWTToken;
  renewRefreshToken: RenewRefreshToken;
  revokeRefreshToken: RevokeRefreshToken;
}

class AuthTokenHandler implements AuthTokenHandlerInterface {
  /**
   * Refresh the JWT Token using the refresh token.
   *
   * @param params - The params from the login handler
   * @param params.connection - The connection type (Google, Apple, etc.)
   * @param params.refreshToken - The refresh token from the Web3Auth Authentication Server.
   * @returns The id token, access token, and metadata access token.
   */
  async refreshJWTToken(params: {
    connection: AuthConnection;
    refreshToken: string;
  }): Promise<{
    idTokens: string[];
    accessToken: string;
    metadataAccessToken: string;
  }> {
    const { connection, refreshToken } = params;
    const loginHandler = createLoginHandler(Platform.OS, connection);

    const requestData = {
      client_id: loginHandler.options.clientId,
      login_provider: connection,
      network: loginHandler.options.web3AuthNetwork,
      refresh_token: refreshToken,
      grant_type: 'refresh_token', // specify refresh token flow
    };

    const response = await fetch(
      `${loginHandler.options.authServerUrl}${AUTH_SERVER_TOKEN_PATH}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to refresh JWT token');
    }

    const refreshTokenData: AuthRefreshTokenResponse = await response.json();
    const idToken = refreshTokenData.id_token;

    if (
      !idToken ||
      !refreshTokenData.access_token ||
      !refreshTokenData.metadata_access_token
    ) {
      throw new Error(
        'Failed to refresh JWT token - respoond json ' +
          JSON.stringify(refreshTokenData),
      );
    }

    return {
      idTokens: [idToken],
      accessToken: refreshTokenData.access_token,
      metadataAccessToken: refreshTokenData.metadata_access_token,
    };
  }

  /**
   * Renew the refresh token.
   *
   * @param params - The params from the login handler
   * @param params.connection - The connection type (Google, Apple, etc.)
   * @param params.revokeToken - The revoke token from the Web3Auth Authentication Server.
   * @returns The new refresh token and revoke token.
   */
  async renewRefreshToken(params: {
    connection: AuthConnection;
    revokeToken: string;
  }) {
    const { connection, revokeToken } = params;
    const loginHandler = createLoginHandler(Platform.OS, connection);

    const requestData = {
      revoke_token: revokeToken,
    };

    const response = await fetch(
      `${loginHandler.options.authServerUrl}${AUTH_SERVER_RENEW_PATH}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to renew refresh token - ' + response.statusText);
    }

    const responseData = await response.json();

    const newRefreshToken = responseData.refresh_token;
    const newRevokeToken = responseData.revoke_token;

    if (!newRefreshToken || !newRevokeToken) {
      throw new Error('Failed to renew refresh token - ' + response.statusText);
    }

    return {
      newRefreshToken,
      newRevokeToken,
    };
  }

  /**
   * Revoke the refresh token.
   *
   * @param params - The params from the login handler
   * @param params.connection - The connection type (Google, Apple, etc.)
   * @param params.revokeToken - The revoke token from the Web3Auth Authentication Server.
   * @returns void
   */
  async revokeRefreshToken(params: {
    connection: AuthConnection;
    revokeToken: string;
  }) {
    const { connection, revokeToken } = params;
    const loginHandler = createLoginHandler(Platform.OS, connection);

    const requestData = {
      revoke_token: revokeToken,
    };

    const response = await fetch(
      `${loginHandler.options.authServerUrl}${AUTH_SERVER_REVOKE_PATH}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    );

    if (!response.ok) {
      throw new Error(
        'Failed to revoke refresh token - ' + response.statusText,
      );
    }
    return;
  }
}

export default new AuthTokenHandler();
