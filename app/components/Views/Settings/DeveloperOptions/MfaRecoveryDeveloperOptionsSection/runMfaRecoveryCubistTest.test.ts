const mockGetBearerToken = jest.fn();
const mockGetSessionProfile = jest.fn();
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
const CHECKSUMMED_ADDRESS = '0x68757d15a4d8d1421c17003512AFce15D3f3FaDa';

jest.doMock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        state: {
          keyrings: [
            { accounts: ['0x68757d15a4d8d1421c17003512afce15d3f3fada'] },
          ],
        },
        signPersonalMessage: mockSignPersonalMessage,
      },
      AuthenticationController: {
        getBearerToken: mockGetBearerToken,
        getSessionProfile: mockGetSessionProfile,
      },
    },
  },
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
  MfaRecoveryController: mockMfaRecoveryControllerConstructor,
}));

jest.doMock('./CubistEscrowProvider', () => ({
  CubistEscrowProvider: mockCubistEscrowProvider,
}));

describe('runMfaRecoveryCubistTest', () => {
  let runMfaRecoveryCubistTest: (typeof import('./runMfaRecoveryCubistTest'))['runMfaRecoveryCubistTest'];
  let runMfaRecoveryCubistRecover: (typeof import('./runMfaRecoveryCubistTest'))['runMfaRecoveryCubistRecover'];
  let getMfaRecoveryErrorCode: (typeof import('./runMfaRecoveryCubistTest'))['getMfaRecoveryErrorCode'];
  const originalFetch = global.fetch;

  beforeEach(async () => {
    jest.resetModules();
    const runnerModule = await import('./runMfaRecoveryCubistTest');
    runMfaRecoveryCubistTest = runnerModule.runMfaRecoveryCubistTest;
    runMfaRecoveryCubistRecover = runnerModule.runMfaRecoveryCubistRecover;
    getMfaRecoveryErrorCode = runnerModule.getMfaRecoveryErrorCode;

    jest.clearAllMocks();
    global.fetch = mockFetch as typeof fetch;
    for (const [name, value] of Object.entries({
      MM_CUBIST_ENV: 'gamma',
      MM_CUBIST_ORG_ID: 'org-1',
      MM_CUBIST_WRAP_PUBLIC_KEY: '{"kty":"EC","crv":"P-256","x":"x","y":"y"}',
      MM_CUBIST_RECEIPT_PUBLIC_KEY:
        '{"kty":"EC","crv":"P-256","x":"x","y":"y"}',
      MM_CUBIST_SESSION_SCOPES: 'manage:*, sign:evm:*',
      MM_RECOVERY_REGISTRATION_URL:
        'https://recovery-registration.dev-api.test/',
    })) {
      process.env[name] = value;
    }
    mockGetBearerToken.mockResolvedValue('auth-token');
    mockGetSessionProfile.mockResolvedValue({ profileId: 'profile-1' });
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
    mockGetRecoverySecret.mockResolvedValue({
      recoverySecret: Uint8Array.from([1, 2, 3]),
      epoch: 1,
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('recovers the secret without registering and returns a fingerprint', async () => {
    const steps: string[] = [];

    const result = await runMfaRecoveryCubistRecover((step) => {
      steps.push(step);
    });

    expect(result.matches).toBeUndefined();
    expect(result.epoch).toBe(1);
    expect(result.fingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(steps).toEqual([
      'signing_in',
      'creating_cubist_session',
      'authenticating_identifier',
      'reading_recovery_secret',
      'completed',
    ]);
    expect(mockProveOidcIdentity).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRegister).not.toHaveBeenCalled();
    expect(mockGetRecoverySecret).toHaveBeenCalledWith('identifier-session');
  });

  it('runs SIWE login, provider registration, and recovery round trip', async () => {
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
    expect(mockGetBearerToken).toHaveBeenCalledTimes(1);
    expect(mockGetSessionProfile).toHaveBeenCalledTimes(1);
    expect(mockProveOidcIdentity).toHaveBeenCalledWith(
      mockCubistEnvironment,
      'org-1',
      'auth-token',
    );
    expect(mockFetch).toHaveBeenCalledWith(
      'https://recovery-registration.dev-api.test/v1/recovery/registration/ensure-user',
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
          value: CHECKSUMMED_ADDRESS,
        }),
      ]),
    );
    expect(mockAuthenticateIdentifier).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'siwe', value: CHECKSUMMED_ADDRESS }),
    );
    expect(mockGetRecoverySecret).toHaveBeenCalledWith('identifier-session');
  });

  it('compares the recovered secret with the last registered secret', async () => {
    await runMfaRecoveryCubistTest();

    const result = await runMfaRecoveryCubistRecover();

    expect(result.matches).toBe(true);
    expect(result.epoch).toBe(1);
    expect(result.fingerprint).toMatch(/^[0-9a-f]{8}$/);
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
