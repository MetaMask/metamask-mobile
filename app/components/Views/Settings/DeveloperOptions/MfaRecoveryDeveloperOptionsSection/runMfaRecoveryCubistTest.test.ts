const mockAuth = {
  getAccessToken: jest.fn(),
  getUserProfile: jest.fn(),
  prepare: jest.fn(),
};
const mockJwtBearerAuth = jest.fn(() => mockAuth);
const mockProveOidcIdentity = jest.fn();
const mockCreateOidcSession = jest.fn();
const mockCreateClient = jest.fn();
const mockEnsureUserResponse = {
  ok: true,
  json: jest.fn(),
};
const mockFetch = jest.fn();
const mockSignPersonalMessage = jest.fn();
const mockRegister = jest.fn();
const mockAuthenticateIdentifier = jest.fn();
const mockGetRecoverySecret = jest.fn();
const mockCubistEscrowProvider = jest.fn(() => ({ id: 'cubist' }));
const mockMfaRecoveryController = {
  register: mockRegister,
  authenticateIdentifier: mockAuthenticateIdentifier,
  getRecoverySecret: mockGetRecoverySecret,
};
const mockMfaRecoveryControllerConstructor = jest.fn(
  () => mockMfaRecoveryController,
);
const mockCubistClient = { org: jest.fn() };
const mockCubistEnvironment = { SignerApiRoot: 'https://cubist.test' };

jest.doMock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        state: {
          keyrings: [{ accounts: ['0xabc'] }],
        },
        signPersonalMessage: mockSignPersonalMessage,
      },
    },
  },
}));

jest.doMock('@metamask/profile-sync-controller/sdk', () => ({
  AuthType: { SiWE: 'SiWE' },
  Env: { DEV: 'dev', PRD: 'prd' },
  JwtBearerAuth: mockJwtBearerAuth,
  Platform: { MOBILE: 'mobile' },
}));

jest.doMock('@cubist-labs/cubesigner-sdk', () => ({
  __esModule: true,
  CubeSignerClient: {
    createOidcSession: mockCreateOidcSession,
    proveOidcIdentity: mockProveOidcIdentity,
    create: mockCreateClient,
  },
  envs: { gamma: mockCubistEnvironment },
}));

jest.doMock('@metamask/mfa-recovery-controller', () => ({
  CubistEscrowProvider: mockCubistEscrowProvider,
  MfaRecoveryController: mockMfaRecoveryControllerConstructor,
}));

describe('runMfaRecoveryCubistTest', () => {
  let runMfaRecoveryCubistTest: (typeof import('./runMfaRecoveryCubistTest'))['runMfaRecoveryCubistTest'];
  let getMfaRecoveryErrorCode: (typeof import('./runMfaRecoveryCubistTest'))['getMfaRecoveryErrorCode'];
  const originalFetch = global.fetch;

  beforeAll(async () => {
    const runnerModule = await import('./runMfaRecoveryCubistTest');
    runMfaRecoveryCubistTest = runnerModule.runMfaRecoveryCubistTest;
    getMfaRecoveryErrorCode = runnerModule.getMfaRecoveryErrorCode;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as typeof fetch;
    mockAuth.getAccessToken.mockResolvedValue('auth-token');
    mockAuth.getUserProfile.mockResolvedValue({ profileId: 'profile-1' });
    mockProveOidcIdentity.mockResolvedValue({ proof: 'identity' });
    mockCreateOidcSession.mockResolvedValue({
      data: () => ({ token: 'session-token' }),
    });
    mockCreateClient.mockResolvedValue(mockCubistClient);
    mockEnsureUserResponse.json.mockResolvedValue({ status: 'created' });
    mockFetch.mockResolvedValue(mockEnsureUserResponse);
    mockSignPersonalMessage.mockResolvedValue('0xsignature');
    mockRegister.mockImplementation(
      async (recoverySecret: Uint8Array): Promise<void> => {
        mockGetRecoverySecret.mockResolvedValue({
          recoverySecret,
          epoch: 1,
        });
      },
    );
    mockAuthenticateIdentifier.mockResolvedValue('identifier-session');
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('runs SIWE login, provider registration, and recovery round trip', async () => {
    for (const [name, value] of Object.entries({
      MM_CUBIST_ENV: 'gamma',
      MM_CUBIST_ORG_ID: 'org-1',
      MM_CUBIST_WRAP_PUBLIC_KEY: '{"kty":"EC","crv":"P-256","x":"x","y":"y"}',
      MM_CUBIST_RECEIPT_PUBLIC_KEY:
        '{"kty":"EC","crv":"P-256","x":"x","y":"y"}',
      MM_CUBIST_SESSION_SCOPES: 'manage:*, sign:evm:*',
      MM_RECOVERY_REGISTRATION_URL: 'https://recovery-registration.test/',
    })) {
      process.env[name] = value;
    }

    const steps: string[] = [];

    const result = await runMfaRecoveryCubistTest((step) => {
      steps.push(step);
    });

    expect(result).toEqual({
      ensureUserStatus: 'created',
      epoch: 1,
      matches: true,
    });
    expect(steps).toEqual([
      'signing_in',
      'registering_cubist_user',
      'creating_cubist_session',
      'registering_recovery_secret',
      'authenticating_identifier',
      'reading_recovery_secret',
      'completed',
    ]);
    expect(mockJwtBearerAuth).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SiWE', platform: 'mobile' }),
      expect.objectContaining({ storage: expect.any(Object) }),
    );
    expect(mockProveOidcIdentity).toHaveBeenCalledWith(
      mockCubistEnvironment,
      'org-1',
      'auth-token',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://recovery-registration.test/v1/recovery/registration/ensure-user',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
    const request = mockFetch.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(request.body as string)).toEqual({
      providerVerifierId: 'cubist',
      providerRegistrationPayload: { proof: 'identity' },
    });
    expect(mockCreateOidcSession).toHaveBeenCalledWith(
      mockCubistEnvironment,
      'org-1',
      'auth-token',
      ['manage:*', 'sign:evm:*'],
    );
    expect(mockCubistEscrowProvider).toHaveBeenCalledWith({
      client: mockCubistClient,
      wrapPublicKey: '{"kty":"EC","crv":"P-256","x":"x","y":"y"}',
      receiptPublicKey: '{"kty":"EC","crv":"P-256","x":"x","y":"y"}',
    });
    expect(mockMfaRecoveryControllerConstructor).toHaveBeenCalledTimes(1);
    expect(mockRegister).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      expect.arrayContaining([
        expect.objectContaining({
          type: 'siwe',
          value: '0xabc',
        }),
      ]),
    );
    expect(mockAuthenticateIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'siwe', value: '0xabc' }),
    );
    expect(mockGetRecoverySecret).toHaveBeenCalledWith('identifier-session');
  });

  it('returns the controller error code for display', () => {
    expect(getMfaRecoveryErrorCode({ code: 'escrow_request_failed' })).toBe(
      'escrow_request_failed',
    );
    expect(
      getMfaRecoveryErrorCode({
        errorCode: 'SessionInvalidAuthToken',
        status: 403,
        message: 'invalid token',
      }),
    ).toBe('SessionInvalidAuthToken');
    expect(getMfaRecoveryErrorCode({ status: 401, message: 'nope' })).toBe(
      'http_401',
    );
    expect(getMfaRecoveryErrorCode(new Error('unknown'))).toBe('unknown_error');
  });
});
