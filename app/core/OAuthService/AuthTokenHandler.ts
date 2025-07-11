class AuthTokenHandler {
  private config?: {
    authServerUrl: string;
    authConnectionId: string;
    groupedAuthConnectionId?: string;
  };

  setAuthServerConfig(config: {
    authServerUrl: string;
    authConnectionId: string;
    groupedAuthConnectionId?: string;
  }) {
    this.config = config;
  }

  clearAuthServerConfig() {
    this.config = undefined;
  }

  async refreshJWTToken() {
    if (!this.config) {
      throw new Error('Auth server config not set');
    }
    const response = await fetch(`${this.config.authServerUrl}/refresh-jwt`, {
      method: 'POST',
      body: JSON.stringify({
        authConnectionId: this.config.authConnectionId,
        groupedAuthConnectionId: this.config.groupedAuthConnectionId,
      }),
    });
    return response.json();
  }

  async revokeRefreshToken() {
    if (!this.config) {
      throw new Error('Auth server config not set');
    }
    const response = await fetch(
      `${this.config.authServerUrl}/revoke-refresh-token`,
      {
        method: 'POST',
        body: JSON.stringify({
          authConnectionId: this.config.authConnectionId,
          groupedAuthConnectionId: this.config.groupedAuthConnectionId,
        }),
      },
    );
    return response.json();
  }
}

export default new AuthTokenHandler();
