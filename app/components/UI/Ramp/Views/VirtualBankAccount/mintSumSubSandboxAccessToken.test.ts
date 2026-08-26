import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { utf8ToBytes } from '@noble/hashes/utils';
import {
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
    jest.resetAllMocks();
  });

  it('returns null when mint is not allowed', async () => {
    const fetchImpl = jest.fn();

    const token = await mintSumSubSandboxAccessToken({
      fetchImpl,
      ...SANDBOX_CREDS,
      isMintAllowed: false,
    });

    expect(token).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns null when sandbox credentials are missing', async () => {
    const fetchImpl = jest.fn();

    const token = await mintSumSubSandboxAccessToken({
      fetchImpl,
      isMintAllowed: true,
      appToken: '',
      secretKey: '',
      levelName: '',
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

  it('throws when Sumsub rejects the mint', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      createJsonResponse({
        ok: false,
        status: 401,
        payload: {
          description: 'Request signature mismatch',
          errorName: 'app-token-signature mismatch',
        },
      }),
    );

    await expect(
      mintSumSubSandboxAccessToken({
        nowSeconds: NOW_SECONDS,
        fetchImpl,
        ...SANDBOX_CREDS,
      }),
    ).rejects.toThrow(
      'Sumsub sandbox token mint failed: Request signature mismatch',
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
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
