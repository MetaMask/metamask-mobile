const mockAuth = {
  getAccessToken: jest.fn(),
  getUserProfile: jest.fn(),
  prepare: jest.fn(),
};
const mockJwtBearerAuth = jest.fn(() => mockAuth);
const mockCreateOidcSession = jest.fn();
const mockCreateClient = jest.fn();
const mockFetch = jest.fn();
const mockSignPersonalMessage = jest.fn();
const mockRegister = jest.fn();
const mockAuthenticateIdentifier = jest.fn();
const mockGetRecoverySecret = jest.fn();
const mockCubistEscrowProvider = jest.fn(() => ({ id: 'cubist' }));
const mockMfaRecoveryControllerConstructor = jest.fn(() => ({
  register: mockRegister,
  authenticateIdentifier: mockAuthenticateIdentifier,
  getRecoverySecret: mockGetRecoverySecret,
}));
const mockCubistEnvironment = { SignerApiRoot: 'https://cubist.test' };
const testDependencies = {
  address: '0xabc',
  signPersonalMessage: mockSignPersonalMessage,
  randomBytes: jest.fn((length: number) => new Uint8Array(length).fill(42)),
};

jest.doMock('@metamask/profile-sync-controller/sdk', () => ({
  AuthType: { SiWE: 'SiWE' },
  Env: { DEV: 'dev', PRD: 'prd' },
  JwtBearerAuth: mockJwtBearerAuth,
  Platform: { MOBILE: 'mobile' },
}));
jest.doMock(
  '@cubist-labs/cubesigner-sdk',
  () => ({
    CubeSignerClient: {
      createOidcSession: mockCreateOidcSession,
      create: mockCreateClient,
    },
    envs: { gamma: mockCubistEnvironment },
  }),
  { virtual: true },
);
jest.doMock(
  '@metamask/mfa-recovery-controller',
  () => ({
    MfaRecoveryController: mockMfaRecoveryControllerConstructor,
  }),
  { virtual: true },
);
jest.doMock('./CubistEscrowProvider', () => ({
  CubistEscrowProvider: mockCubistEscrowProvider,
}));

describe('Cubist recovery runner', () => {
  let runner: typeof import('./runMfaRecoveryCubistTest');
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    runner = await import('./runMfaRecoveryCubistTest');
    global.fetch = mockFetch as typeof fetch;
    Object.assign(process.env, {
      MM_CUBIST_ENV: 'gamma',
      MM_CUBIST_ORG_ID: 'org-1',
      MM_CUBIST_WRAP_PUBLIC_KEY: '{"kty":"EC"}',
      MM_CUBIST_RECEIPT_PUBLIC_KEY: '{"kty":"EC"}',
      MM_CUBIST_SESSION_SCOPES: 'manage:*',
      MM_RECOVERY_REGISTRATION_URL: 'https://recovery-registration.test/',
    });
    mockAuth.getAccessToken.mockResolvedValue('profile-token');
    mockAuth.getUserProfile.mockResolvedValue({ profileId: 'profile-1' });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        idToken: 'recovery-oidc-token',
        expiresAt: Math.floor(Date.now() / 1000) + 300,
      }),
    });
    mockCreateOidcSession.mockResolvedValue({
      data: () => ({ token: 'session-token' }),
    });
    mockCreateClient.mockResolvedValue({});
    mockSignPersonalMessage.mockResolvedValue('0xsignature');
    mockAuthenticateIdentifier.mockResolvedValue('identifier-session');
    mockGetRecoverySecret.mockResolvedValue({
      recoverySecret: Uint8Array.from([1, 2, 3]),
      epoch: 1,
    });
    mockRegister.mockImplementation(async (recoverySecret: Uint8Array) => {
      mockGetRecoverySecret.mockResolvedValue({ recoverySecret, epoch: 1 });
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
  });

  it('exchanges the profile JWT for an OIDC token and uses it for the Cubist session', async () => {
    const steps: string[] = [];

    const result = await runner.runMfaRecoveryCubistTest(
      testDependencies,
      (step) => steps.push(step),
    );

    expect(result).toEqual({ epoch: 1, matches: true });
    expect(steps).toEqual([
      'signing_in',
      'requesting_oidc_token',
      'creating_cubist_session',
      'registering_recovery_secret',
      'authenticating_identifier',
      'reading_recovery_secret',
      'completed',
    ]);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://recovery-registration.test/v1/recovery/registration/oidc-token',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer profile-token' },
      },
    );
    expect(mockCreateOidcSession).toHaveBeenCalledWith(
      mockCubistEnvironment,
      'org-1',
      'recovery-oidc-token',
      ['manage:*'],
    );
    expect(testDependencies.randomBytes).toHaveBeenCalledWith(32);
    expect(mockRegister).toHaveBeenCalledWith(expect.any(Uint8Array), [
      expect.objectContaining({ type: 'siwe', value: '0xabc' }),
    ]);
  });

  it('signs SIWE login messages using the injected wallet', async () => {
    await runner.runMfaRecoveryCubistTest(testDependencies);
    const prepared = mockAuth.prepare.mock.calls[0][0] as {
      signMessage: (message: string) => Promise<string>;
    };

    await prepared.signMessage('hello');

    expect(mockSignPersonalMessage).toHaveBeenCalledWith({
      from: '0xabc',
      data: '0x68656c6c6f',
    });
  });

  it('reuses the app authentication session rather than signing in again', async () => {
    const getAuthSession = jest.fn().mockResolvedValue({
      accessToken: 'app-token',
      profileId: 'app-profile',
    });

    await runner.runMfaRecoveryCubistTest({
      ...testDependencies,
      getAuthSession,
    });

    expect(mockJwtBearerAuth).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { Authorization: 'Bearer app-token' },
      }),
    );
  });

  it('requests an OIDC token for recovery without registering a new secret', async () => {
    const result = await runner.runMfaRecoveryCubistRecover(testDependencies);

    expect(result.matches).toBeUndefined();
    expect(result.fingerprint).toMatch(/^[0-9a-f]{8}$/u);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('compares recovery with the last registered secret', async () => {
    await runner.runMfaRecoveryCubistTest(testDependencies);

    const result = await runner.runMfaRecoveryCubistRecover(testDependencies);

    expect(result.matches).toBe(true);
  });

  it('stops before session creation when registration returns HTTP 401', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });

    const result = runner.runMfaRecoveryCubistTest(testDependencies);

    await expect(result).rejects.toMatchObject({
      code: 'registration_request_failed',
    });
    expect(mockCreateOidcSession).not.toHaveBeenCalled();
  });

  it.each([
    { idToken: '', expiresAt: 9999999999 },
    { status: 'created' },
    { idToken: 'token', expiresAt: '9999999999' },
  ])('rejects a malformed OIDC response (%j)', async (body) => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => body });

    const result = runner.runMfaRecoveryCubistTest(testDependencies);

    await expect(result).rejects.toMatchObject({
      code: 'registration_response_invalid',
    });
    expect(mockCreateOidcSession).not.toHaveBeenCalled();
  });

  it('rejects expired OIDC tokens before creating a session', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ idToken: 'token', expiresAt: 1 }),
    });

    const result = runner.runMfaRecoveryCubistTest(testDependencies);

    await expect(result).rejects.toMatchObject({
      code: 'registration_token_expired',
    });
  });

  it('returns Cubist error codes for display', () => {
    const code = runner.getMfaRecoveryErrorCode({
      errorCode: 'SessionInvalidAuthToken',
      status: 403,
    });

    expect(code).toBe('SessionInvalidAuthToken');
  });
});
