const mockAuth = {
  getAccessToken: jest.fn(),
  prepare: jest.fn(),
};
const mockJwtBearerAuth = jest.fn(() => mockAuth);
const mockCreateOidcSession = jest.fn();
const mockCreateClient = jest.fn();
const mockUserGet = jest.fn();
const mockFetch = jest.fn();
const mockSignPersonalMessage = jest.fn();
const mockRegister = jest.fn();
const mockUpdateRecoverySecret = jest.fn();
const mockUpdateIdentifiers = jest.fn();
const mockAuthenticateIdentifier = jest.fn();
const mockGetRecoverySecret = jest.fn();
const mockCubistEscrowProvider = jest.fn(() => ({
  id: 'cubist',
  authAudience: 'cubist',
  isAvailable: jest.fn(),
}));
const mockStubAuthProvider = jest.fn(
  ({ accessToken }: { accessToken: string }) => ({
    getAccessToken: jest.fn().mockResolvedValue(accessToken),
    getAuthenticatedProfileId: jest.fn(),
    authorizeRecoveryRequest: jest.fn(),
  }),
);
const mockMfaRecoveryControllerConstructor = jest.fn(
  (_options: { authProvider: unknown }) => ({
    register: mockRegister,
    updateRecoverySecret: mockUpdateRecoverySecret,
    updateIdentifiers: mockUpdateIdentifiers,
    authenticateIdentifier: mockAuthenticateIdentifier,
    getRecoverySecret: mockGetRecoverySecret,
  }),
);
interface TestIdentifier {
  type: string;
  namespace: string;
  value: string;
  verifier: unknown;
}

interface MockControllerOptions {
  identifierAuthProvider: {
    getKeyBoundIdentifierToken: (params: {
      identifier: TestIdentifier;
      proofPublicKey: string;
      requestHash: string;
    }) => Promise<unknown>;
  };
}

const mockCubistEnvironment = { SignerApiRoot: 'https://cubist.test' };
const testDependencies = {
  address: '0xabc',
  signPersonalMessage: mockSignPersonalMessage,
  randomBytes: jest.fn((length: number) => new Uint8Array(length).fill(42)),
};
let currentRecoverySecret = Uint8Array.from([1, 2, 3]);
let currentRecoveryEpoch = 1;

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
    CubistEscrowProvider: mockCubistEscrowProvider,
  }),
  { virtual: true },
);
jest.doMock('./mfaRecoveryTestProviders', () => ({
  ...jest.requireActual('./mfaRecoveryTestProviders'),
  StubAuthProvider: mockStubAuthProvider,
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
      MFA_RECOVERY_DEV_API_KEY: 'mpc-api-key',
    });
    mockAuth.getAccessToken.mockResolvedValue('profile-token');
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
    mockUserGet.mockResolvedValue({});
    mockCreateClient.mockResolvedValue({
      apiClient: { userGet: mockUserGet },
    });
    mockSignPersonalMessage.mockResolvedValue('0xsignature');
    mockAuthenticateIdentifier.mockResolvedValue('identifier-session');
    currentRecoverySecret = Uint8Array.from([1, 2, 3]);
    currentRecoveryEpoch = 1;
    mockGetRecoverySecret.mockImplementation(async () => ({
      recoverySecret: new Uint8Array(currentRecoverySecret),
      epoch: currentRecoveryEpoch,
    }));
    mockRegister.mockImplementation(async (recoverySecret: Uint8Array) => {
      currentRecoverySecret = new Uint8Array(recoverySecret);
      currentRecoveryEpoch = 1;
    });
    mockUpdateRecoverySecret.mockImplementation(
      async (
        _identifier: unknown,
        recoverySecret: Uint8Array,
        _expectedEpoch: number,
      ) => {
        currentRecoverySecret = new Uint8Array(recoverySecret);
        currentRecoveryEpoch = 2;
      },
    );
    mockUpdateIdentifiers.mockImplementation(
      async (
        _identifier: unknown,
        _identifiers: unknown[],
        _expectedEpoch: number,
      ) => {
        currentRecoveryEpoch = 3;
      },
    );
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

    expect(result).toEqual({ epoch: 3, matches: true });
    expect(steps).toEqual([
      'signing_in',
      'requesting_oidc_token',
      'creating_cubist_session',
      'registering_recovery_secret',
      'authenticating_identifier',
      'reading_recovery_secret',
      'updating_recovery_secret',
      'authenticating_identifier',
      'reading_recovery_secret',
      'updating_identifiers',
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
    expect(mockRegister).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.arrayContaining([
        expect.objectContaining({ type: 'siwe', value: '0xabc' }),
        expect.objectContaining({ type: 'passkey' }),
      ]),
    );
  });

  it('reuses the rotated passkey across full test runs', async () => {
    await runner.runMfaRecoveryCubistTest(testDependencies);
    await runner.runMfaRecoveryCubistTest(testDependencies);

    const firstRegistration = mockRegister.mock.calls[0]?.[1] as
      | TestIdentifier[]
      | undefined;
    const firstUpdateIdentifiers = mockUpdateIdentifiers.mock.calls[0]?.[1] as
      | TestIdentifier[]
      | undefined;
    const secondRegistration = mockRegister.mock.calls[1]?.[1] as
      | TestIdentifier[]
      | undefined;
    const firstRegisteredPasskey = firstRegistration?.find(
      ({ type }) => type === 'passkey',
    );
    const replacementPasskey = firstUpdateIdentifiers?.find(
      ({ type }) => type === 'passkey',
    );
    const secondRegisteredPasskey = secondRegistration?.find(
      ({ type }) => type === 'passkey',
    );

    if (
      firstRegisteredPasskey === undefined ||
      replacementPasskey === undefined ||
      secondRegisteredPasskey === undefined
    ) {
      throw new Error('Expected passkey identifiers in recovery calls');
    }

    expect(mockUpdateRecoverySecret.mock.calls[0]?.[0]).toBe(
      firstRegisteredPasskey,
    );
    expect(secondRegisteredPasskey.value).toBe(replacementPasskey.value);
  });

  it('reuses the SIWE provider for the same account across recovery contexts', async () => {
    const firstSigner = jest.fn().mockResolvedValue('0xfirst-signature');
    const secondSigner = jest.fn().mockResolvedValue('0xsecond-signature');
    const getAuthSession = jest.fn().mockResolvedValue({
      accessToken: 'app-token',
    });

    await runner.runMfaRecoveryCubistTest({
      ...testDependencies,
      getAuthSession,
      signPersonalMessage: firstSigner,
    });
    await runner.runMfaRecoveryCubistTest({
      ...testDependencies,
      getAuthSession,
      signPersonalMessage: secondSigner,
    });

    const firstRegistration = mockRegister.mock.calls[0]?.[1] as
      | TestIdentifier[]
      | undefined;
    const siweIdentifier = firstRegistration?.find(
      ({ type }) => type === 'siwe',
    );
    const secondControllerOptions = mockMfaRecoveryControllerConstructor.mock
      .calls[1]?.[0] as unknown as MockControllerOptions | undefined;

    if (siweIdentifier === undefined || secondControllerOptions === undefined) {
      throw new Error('Expected the second recovery context');
    }

    await secondControllerOptions.identifierAuthProvider.getKeyBoundIdentifierToken(
      {
        identifier: siweIdentifier,
        proofPublicKey: '{"kty":"EC"}',
        requestHash: '0xrequest',
      },
    );

    expect(firstSigner).toHaveBeenCalledTimes(1);
    expect(secondSigner).not.toHaveBeenCalled();
  });

  it('constructs and wires the MPC provider without a step-up dependency', async () => {
    const getAuthSession = jest.fn().mockResolvedValue({
      accessToken: 'app-token',
    });

    await runner.runMfaRecoveryCubistTest({
      ...testDependencies,
      getAuthSession,
    });

    expect(mockStubAuthProvider).toHaveBeenCalledWith({
      accessToken: 'app-token',
      apiKey: 'mpc-api-key',
    });
    const controllerOptions =
      mockMfaRecoveryControllerConstructor.mock.calls[0][0];
    expect(controllerOptions.authProvider).toBe(
      mockStubAuthProvider.mock.results[0]?.value,
    );
    expect(controllerOptions).not.toHaveProperty('stepUp');
  });

  it('checks Cubist availability through the authenticated user endpoint', async () => {
    const getAuthSession = jest.fn().mockResolvedValue({
      accessToken: 'app-token',
    });

    await runner.runMfaRecoveryCubistTest({
      ...testDependencies,
      getAuthSession,
    });

    const escrow = mockCubistEscrowProvider.mock.results[0]?.value as {
      isAvailable: () => Promise<boolean>;
    };

    await escrow.isAvailable();

    expect(mockUserGet).toHaveBeenCalledTimes(1);
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

  it('requires the MPC API key without exposing its value', async () => {
    delete process.env.MFA_RECOVERY_DEV_API_KEY;

    const result = runner.runMfaRecoveryCubistTest(testDependencies);

    await expect(result).rejects.toMatchObject({
      code: 'missing_configuration',
      message: 'MFA_RECOVERY_DEV_API_KEY is not configured',
    });
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
      json: async () => ({
        idToken: 'token',
        expiresAt: Math.floor(Date.now() / 1000) - 1,
      }),
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
