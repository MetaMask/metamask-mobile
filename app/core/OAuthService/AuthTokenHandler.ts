import { Platform } from 'react-native';
import { AuthConnection } from './OAuthInterface';
import { createLoginHandler } from './OAuthLoginHandlers';

const AUTH_SERVER_REVOKE_PATH = '/api/v1/oauth/revoke';
const AUTH_SERVER_TOKEN_PATH = '/api/v1/oauth/token';

class AuthTokenHandler {
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

    const refreshTokenData = await response.json();
    const idToken = refreshTokenData.id_token;

    return {
      idTokens: [idToken],
      accessToken: refreshTokenData.access_token,
      metadataAccessToken: refreshTokenData.metadata_access_token,
    };
  }

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
      throw new Error('Failed to revoke refresh token');
    }

    const responseData = await response.json();
    return {
      newRefreshToken: responseData.refresh_token,
      newRevokeToken: responseData.revoke_token,
    };
  }
}

export default new AuthTokenHandler();
