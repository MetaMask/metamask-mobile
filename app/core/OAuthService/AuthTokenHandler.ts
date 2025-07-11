import { Platform } from 'react-native';
import { AuthConnection } from './OAuthInterface';
import { createLoginHandler } from './OAuthLoginHandlers';

class AuthTokenHandler {
  protected readonly AUTH_SERVER_TOKEN_PATH = '/api/v1/oauth/token';

  protected readonly AUTH_SERVER_REVOKE_PATH = '/api/v1/oauth/revoke';

  async refreshJWTToken(params: {
    connection: AuthConnection;
    refreshToken: string;
  }) {
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
      `${loginHandler.options.authServerUrl}${this.AUTH_SERVER_TOKEN_PATH}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    );

    return response.json();
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
      `${loginHandler.options.authServerUrl}${this.AUTH_SERVER_REVOKE_PATH}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      },
    );

    return response.json();
  }
}

export default new AuthTokenHandler();
