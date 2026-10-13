import { recoverPersonalSignature } from '@metamask/eth-sig-util';
import {
  createTestWallet,
  main,
} from './run-mfa-recovery-cubist-test';
import { runMfaRecoveryCubistTest } from '../app/components/Views/Settings/DeveloperOptions/MfaRecoveryDeveloperOptionsSection/runMfaRecoveryCubistTest';

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock(
  '../app/components/Views/Settings/DeveloperOptions/MfaRecoveryDeveloperOptionsSection/runMfaRecoveryCubistTest',
  () => ({
    runMfaRecoveryCubistTest: jest.fn(),
    getMfaRecoveryErrorCode: (error: { code?: string }) =>
      error.code ?? 'unknown_error',
  }),
);

jest.mock(
  '../app/core/Engine/controllers/mfa-recovery-controller/create-mfa-recovery-controller',
  () => ({
    createMfaRecoveryController: jest.fn(() => ({
      controller: {},
      identifierRouter: {},
    })),
  }),
);

const mockCreateMfaRecoveryController = jest.mocked(
  (
    jest.requireMock(
      '../app/core/Engine/controllers/mfa-recovery-controller/create-mfa-recovery-controller',
    ) as {
      createMfaRecoveryController: jest.Mock;
    }
  ).createMfaRecoveryController,
);

// Public, disposable fixture only. Never fund this wallet.
const TEST_PRIVATE_KEY = `${'0'.repeat(63)}1`;
const TEST_ADDRESS = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf';

describe('createTestWallet', () => {
  it.each([undefined, '', 'not-a-key', '0'.repeat(64)])(
    'rejects missing, malformed, or zero private keys (%s)',
    (key) => {
      const createWallet = () => createTestWallet(key);

      expect(createWallet).toThrow();
    },
  );

  it('derives the test address and signs a recoverable personal message', async () => {
    const wallet = createTestWallet(`0x${TEST_PRIVATE_KEY}`);
    const data = '0x68656c6c6f';

    const signature = await wallet.signPersonalMessage({
      data,
      from: wallet.address,
    });

    expect(wallet.address).toBe(TEST_ADDRESS);
    expect(recoverPersonalSignature({ data, signature })).toBe(
      TEST_ADDRESS.toLowerCase(),
    );
  });

  it('rejects requests to sign for another address', async () => {
    const wallet = createTestWallet(TEST_PRIVATE_KEY);

    const signature = wallet.signPersonalMessage({
      data: '0x00',
      from: '0xabc',
    });

    await expect(signature).rejects.toMatchObject({
      code: 'test_signer_mismatch',
    });
  });

  it('generates a recovery secret with the requested byte length', () => {
    const wallet = createTestWallet(TEST_PRIVATE_KEY);

    const secret = wallet.randomBytes(32);

    expect(secret).toBeInstanceOf(Uint8Array);
    expect(secret).toHaveLength(32);
  });
});

describe('direct Auth API authentication', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockLogin(
    token = 'test-assertion',
    hydraToken = 'hydra-access-token',
  ) {
    return jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ nonce: 'test-nonce' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token,
          profile: { profile_id: 'canonical-profile' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: hydraToken }),
      } as Response);
  }

  it('exchanges the Auth API login assertion for a Hydra token', async () => {
    const fetchMock = mockLogin();
    const wallet = createTestWallet(TEST_PRIVATE_KEY, { tokenSource: 'auth-api' });

    const session = await wallet.getAuthSession?.();

    expect(session).toStrictEqual({
      accessToken: 'hydra-access-token',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0].toString()).toContain('/api/v2/nonce?identifier=');
    expect(fetchMock.mock.calls[1][0]).toContain('/api/v2/srp/login');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { 'X-MetaMask-Profile-Pairing': 'enabled' },
    });
    const request = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(request.raw_message).toMatch(/^metamask:test-nonce:0x04/u);
    expect(request.signature).toMatch(/^0x[0-9a-f]{128}$/u);
  });

  it('does not log the assertion by default', async () => {
    mockLogin();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const wallet = createTestWallet(TEST_PRIVATE_KEY, { tokenSource: 'auth-api' });

    await wallet.getAuthSession?.();

    expect(log).not.toHaveBeenCalled();
  });

  it('logs the raw assertion when explicitly enabled', async () => {
    mockLogin();
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wallet = createTestWallet(TEST_PRIVATE_KEY, {
      tokenSource: 'auth-api',
      logAuthApiToken: true,
    });

    await wallet.getAuthSession?.();

    expect(log).toHaveBeenCalledWith('Auth API JWT assertion:', 'test-assertion');
  });

  it('prints human-readable JWT header and payload when logging is enabled', async () => {
    const header = { alg: 'RS256', kid: 'test-key' };
    const payload = { iss: 'http://localhost:8080/api/v2', sub: 'test-profile', exp: 1790847460 };
    const token = [header, payload]
      .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
      .join('.') + '.test-signature';
    mockLogin(token);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const wallet = createTestWallet(TEST_PRIVATE_KEY, {
      tokenSource: 'auth-api',
      logAuthApiToken: true,
    });

    await wallet.getAuthSession?.();

    expect(log).toHaveBeenCalledWith(
      'Auth API JWT decoded (inspection only; signature not verified):\n' +
        JSON.stringify({ header, payload }, null, 2),
    );
  });

  it('rejects a failed login without returning a bearer token', async () => {
    mockLogin().mockReset()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ nonce: 'test-nonce' }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 401 } as Response);
    const wallet = createTestWallet(TEST_PRIVATE_KEY, { tokenSource: 'auth-api' });

    const login = wallet.getAuthSession?.();

    await expect(login).rejects.toMatchObject({ code: 'auth_login_failed' });
  });
});

describe('headless MFA recovery command', () => {
  const mockRun = jest.mocked(runMfaRecoveryCubistTest);
  const originalKey = process.env.MM_MFA_RECOVERY_TEST_PRIVATE_KEY;
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMfaRecoveryController.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.MM_MFA_RECOVERY_TEST_PRIVATE_KEY = TEST_PRIVATE_KEY;
    process.exitCode = 0;
    mockRun.mockResolvedValue({
      epoch: 1,
      matches: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalKey === undefined) {
      delete process.env.MM_MFA_RECOVERY_TEST_PRIVATE_KEY;
    } else {
      process.env.MM_MFA_RECOVERY_TEST_PRIVATE_KEY = originalKey;
    }
    process.exitCode = originalExitCode;
  });

  it('runs the shared flow and reports a matching secret', async () => {
    await main();

    expect(mockRun).toHaveBeenCalledWith(
      expect.objectContaining({ address: TEST_ADDRESS }),
      expect.any(Function),
    );
    expect(mockCreateMfaRecoveryController).toHaveBeenCalledWith(
      expect.objectContaining({
        getAddress: expect.any(Function),
        getBearerToken: expect.any(Function),
        pendingOperationEncryptor: expect.any(Object),
      }),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('secret matches: yes'),
    );
    expect(process.exitCode).toBe(0);
  });

  it('sets a failing exit code when the secret differs', async () => {
    mockRun.mockResolvedValue({
      epoch: 2,
      matches: false,
    });

    await main();

    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('recovery_secret_mismatch'),
    );
  });

  it('reports the failing step without printing backend credentials', async () => {
    mockRun.mockImplementation(async (_wallet, onStep) => {
      onStep?.('creating_cubist_session');
      throw { code: 'session_failed', message: 'sensitive-token' };
    });

    await main();

    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      'Recovery test failed: session_failed (step: creating_cubist_session).',
    );
    expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toContain(
      'sensitive-token',
    );
  });

  it('reports Cubist failure when an Error has no string message', async () => {
    const error = new Error();
    Object.defineProperty(error, 'message', { value: undefined });
    mockRun.mockImplementation(async (_wallet, onStep) => {
      onStep?.('creating_cubist_session');
      throw error;
    });

    await main();

    expect(process.exitCode).toBe(1);
    expect(console.error).toHaveBeenCalledWith(
      'Recovery test failed: unknown_error (step: creating_cubist_session, type: Error).',
    );
  });

  it('prints only structured Cubist diagnostics without credentials', async () => {
    const details = {
      status: 403,
      errorCode: 'OidcIssuerNotAllowed',
      operation: 'oidcAuth',
      requestId: 'test-request-id',
      statusText: 'Forbidden',
    };
    mockRun.mockImplementation(async (_wallet, onStep) => {
      onStep?.('creating_cubist_session');
      throw Object.assign(new Error('sensitive-token'), details, {
        url: 'https://example.test/?token=sensitive-token',
        headers: { Authorization: 'Bearer sensitive-token' },
      });
    });

    await main();

    expect(console.error).toHaveBeenCalledWith(
      'Cubist error details:',
      JSON.stringify(details, null, 2),
    );
    expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toContain(
      'sensitive-token',
    );
    expect(process.exitCode).toBe(1);
  });

  it('omits malformed Cubist diagnostic fields', async () => {
    mockRun.mockImplementation(async (_wallet, onStep) => {
      onStep?.('creating_cubist_session');
      throw {
        status: 403,
        errorCode: { token: 'sensitive-token' },
        operation: undefined,
        requestId: 'x'.repeat(129),
        statusText: 'Forbidden\nAuthorization: secret',
      };
    });

    await main();

    expect(console.error).toHaveBeenCalledWith(
      'Cubist error details:',
      JSON.stringify({ status: 403 }, null, 2),
    );
  });

  it('rejects missing test keys before making backend requests', async () => {
    delete process.env.MM_MFA_RECOVERY_TEST_PRIVATE_KEY;

    await main();

    expect(mockRun).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
