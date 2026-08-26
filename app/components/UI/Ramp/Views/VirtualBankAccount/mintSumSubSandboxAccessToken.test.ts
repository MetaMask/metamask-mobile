import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { utf8ToBytes } from '@noble/hashes/utils';
import {
  isSumSubSandboxMintAllowed,
  mintSumSubSandboxAccessToken,
  resolveSumSubAccessToken,
  signSumSubSandboxRequest,
  SUMSUB_API_BASE_URL,
  SUMSUB_SANDBOX_ACCESS_TOKEN_PATH,
  SUMSUB_SANDBOX_TOKEN_TTL_SECS,
} from './mintSumSubSandboxAccessToken';

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const SANDBOX_CREDS = {
  appToken: 'sbx:test-app-token',
  secretKey: 'test-secret-key',
  levelName: 'basic-kyc-level',
  userId: 'mm-mobile-vba-sandbox',
  isMintAllowed: true,
  timeoutMs: 0,
} as const;

const NOW_SECONDS = 1_700_000_000;

const createJsonResponse = ({
  ok,
  status,
  payload,
}: {
  ok: boolean;
  status: number;
  payload: Record<string, unknown>;
}) => ({
  ok,
  status,
  json: async () => payload,
});

describe('signSumSubSandboxRequest', () => {
  it('HMACs timestamp, method, path, and exact body bytes', () => {
    const timestampSeconds = '1607551635';
    const method = 'POST';
    const path = '/resources/accessTokens/sdk';
    const body =
      '{"userId":"johndoeID","levelName":"basic-kyc-level","ttlInSecs":600}';

    const signature = signSumSubSandboxRequest({
      secretKey: SANDBOX_CREDS.secretKey,
      timestampSeconds,
      method,
      path,
      body,
    });

    expect(signature).toBe(
      bytesToHex(
        hmac(
          sha256,
          utf8ToBytes(SANDBOX_CREDS.secretKey),
          utf8ToBytes(`${timestampSeconds}${method}${path}${body}`),
        ),
      ),
    );
  });
});

describe('mintSumSubSandboxAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it.each([
    {
      name: 'mint is not allowed',
      params: { ...SANDBOX_CREDS, isMintAllowed: false as const },
    },
    {
      name: 'sandbox credentials are missing',
      params: {
        isMintAllowed: true as const,
        appToken: '',
        secretKey: '',
        levelName: '',
      },
    },
  ])('returns null when $name', async ({ params }) => {
    const fetchImpl = jest.fn();

    const token = await mintSumSubSandboxAccessToken({
      fetchImpl,
      ...params,
    });

    expect(token).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts a signed sandbox mint request and returns the applicant token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        status: 200,
        payload: {
          token: '_act-sandbox',
          userId: SANDBOX_CREDS.userId,
        },
      }),
    );
    const expectedBody = JSON.stringify({
      userId: SANDBOX_CREDS.userId,
      levelName: SANDBOX_CREDS.levelName,
      ttlInSecs: SUMSUB_SANDBOX_TOKEN_TTL_SECS,
    });

    const token = await mintSumSubSandboxAccessToken({
      nowSeconds: NOW_SECONDS,
      fetchImpl,
      ...SANDBOX_CREDS,
    });

    expect(token).toBe('_act-sandbox');
    expect(fetchImpl).toHaveBeenCalledWith(
      `${SUMSUB_API_BASE_URL}${SUMSUB_SANDBOX_ACCESS_TOKEN_PATH}`,
      expect.objectContaining({
        method: 'POST',
        body: expectedBody,
        headers: expect.objectContaining({
          'X-App-Token': SANDBOX_CREDS.appToken,
          'X-App-Access-Ts': String(NOW_SECONDS),
          'X-App-Access-Sig': signSumSubSandboxRequest({
            secretKey: SANDBOX_CREDS.secretKey,
            timestampSeconds: String(NOW_SECONDS),
            method: 'POST',
            path: SUMSUB_SANDBOX_ACCESS_TOKEN_PATH,
            body: expectedBody,
          }),
        }),
      }),
    );
  });

  it('returns null when called with no sandbox env or overrides', async () => {
    const token = await mintSumSubSandboxAccessToken();

    expect(token).toBeNull();
  });

  it('evaluates the sandbox mint __DEV__ gate', () => {
    const allowed = isSumSubSandboxMintAllowed();

    expect(allowed).toBe(typeof __DEV__ === 'undefined' || Boolean(__DEV__));
  });

  it('binds the minted token to the default sandbox user id when none is given', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        status: 200,
        payload: { token: '_act-sandbox' },
      }),
    );

    const token = await mintSumSubSandboxAccessToken({
      nowSeconds: NOW_SECONDS,
      fetchImpl,
      appToken: SANDBOX_CREDS.appToken,
      secretKey: SANDBOX_CREDS.secretKey,
      levelName: SANDBOX_CREDS.levelName,
      isMintAllowed: true,
      timeoutMs: 0,
    });

    expect(token).toBe('_act-sandbox');
    expect(fetchImpl).toHaveBeenCalledWith(
      `${SUMSUB_API_BASE_URL}${SUMSUB_SANDBOX_ACCESS_TOKEN_PATH}`,
      expect.objectContaining({
        body: JSON.stringify({
          userId: 'mm-mobile-vba-sandbox',
          levelName: SANDBOX_CREDS.levelName,
          ttlInSecs: SUMSUB_SANDBOX_TOKEN_TTL_SECS,
        }),
      }),
    );
  });

  it.each([
    {
      name: 'Sumsub rejects the mint',
      response: createJsonResponse({
        ok: false,
        status: 401,
        payload: {
          description: 'Request signature mismatch',
          errorName: 'app-token-signature mismatch',
        },
      }),
      message: 'Sumsub sandbox token mint failed: Request signature mismatch',
    },
    {
      name: 'description is missing',
      response: createJsonResponse({
        ok: false,
        status: 401,
        payload: { errorName: 'app-token-signature mismatch' },
      }),
      message: 'Sumsub sandbox token mint failed: app-token-signature mismatch',
    },
    {
      name: 'Sumsub returns no error fields',
      response: createJsonResponse({
        ok: false,
        status: 500,
        payload: {},
      }),
      message: 'Sumsub sandbox token mint failed: HTTP 500',
    },
    {
      name: 'the mint response has no applicant token',
      response: createJsonResponse({
        ok: true,
        status: 200,
        payload: { userId: SANDBOX_CREDS.userId },
      }),
      message: 'Sumsub sandbox token mint failed: HTTP 200',
    },
    {
      name: 'the mint body is not JSON',
      response: {
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('invalid json');
        },
      },
      message: 'Sumsub sandbox token mint failed: HTTP 502',
    },
    {
      name: 'the mint body is not an object',
      response: {
        ok: false,
        status: 503,
        json: async () => 'upstream unavailable',
      },
      message: 'Sumsub sandbox token mint failed: HTTP 503',
    },
  ])('throws when $name', async ({ response, message }) => {
    const fetchImpl = jest.fn().mockResolvedValue(response);

    await expect(
      mintSumSubSandboxAccessToken({
        nowSeconds: NOW_SECONDS,
        fetchImpl,
        ...SANDBOX_CREDS,
      }),
    ).rejects.toThrow(message);
  });

  it('aborts the mint when the request exceeds the timeout', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('The operation was aborted'));
          });
        }),
    );

    const mintPromise = mintSumSubSandboxAccessToken({
      nowSeconds: NOW_SECONDS,
      fetchImpl,
      ...SANDBOX_CREDS,
      timeoutMs: 15_000,
    });

    await Promise.all([
      expect(mintPromise).rejects.toThrow('The operation was aborted'),
      jest.advanceTimersByTimeAsync(15_000),
    ]);
  });
});

describe('resolveSumSubAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the minted sandbox token when mint succeeds', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createJsonResponse({
        ok: true,
        status: 200,
        payload: { token: '_act-sandbox' },
      }),
    );

    const token = await resolveSumSubAccessToken({
      fetchImpl,
      ...SANDBOX_CREDS,
    });

    expect(token).toBe('_act-sandbox');
  });

  it('falls back to MM_SUMSUB_ACCESS_TOKEN when mint is not configured', async () => {
    const fetchImpl = jest.fn();

    const token = await resolveSumSubAccessToken({
      fetchImpl,
      isMintAllowed: true,
      appToken: '',
      secretKey: '',
      levelName: '',
    });

    expect(token).toBe('');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
