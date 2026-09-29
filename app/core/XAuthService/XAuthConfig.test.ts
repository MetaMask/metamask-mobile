describe('XAuthConfig', () => {
  const ORIGINAL_ENV = process.env.MM_X_OAUTH_CLIENT_ID;

  afterEach(() => {
    process.env.MM_X_OAUTH_CLIENT_ID = ORIGINAL_ENV;
    jest.resetModules();
  });

  it('exposes the X authorization and token endpoints', async () => {
    const { X_AUTHORIZATION_ENDPOINT, X_TOKEN_ENDPOINT } = await import(
      './XAuthConfig'
    );

    expect(X_AUTHORIZATION_ENDPOINT).toBe('https://x.com/i/oauth2/authorize');
    expect(X_TOKEN_ENDPOINT).toBe('https://api.x.com/2/oauth2/token');
  });

  it('exposes the redirect URI and required scopes', async () => {
    const { X_REDIRECT_URI, X_OAUTH_SCOPES } = await import('./XAuthConfig');

    expect(X_REDIRECT_URI).toBe('metamask://x-oauth');
    expect(X_OAUTH_SCOPES).toEqual([
      'users.read',
      'tweet.read',
      'offline.access',
    ]);
  });

  it('getXClientId returns the configured client id', async () => {
    jest.resetModules();
    process.env.MM_X_OAUTH_CLIENT_ID = 'test-client-id';
    const { getXClientId } = await import('./XAuthConfig');

    expect(getXClientId()).toBe('test-client-id');
  });

  it('getXClientId throws when the client id is not configured', async () => {
    jest.resetModules();
    process.env.MM_X_OAUTH_CLIENT_ID = '';
    const { getXClientId } = await import('./XAuthConfig');

    expect(() => getXClientId()).toThrow('MM_X_OAUTH_CLIENT_ID is not set');
  });
});
