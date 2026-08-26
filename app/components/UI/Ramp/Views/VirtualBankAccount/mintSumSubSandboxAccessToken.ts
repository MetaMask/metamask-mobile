import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { utf8ToBytes } from '@noble/hashes/utils';
import Logger from '../../../../../util/Logger';
import {
  SUMSUB_ACCESS_TOKEN,
  SUMSUB_SANDBOX_APP_TOKEN,
  SUMSUB_SANDBOX_LEVEL_NAME,
  SUMSUB_SANDBOX_SECRET_KEY,
  SUMSUB_SANDBOX_USER_ID,
} from './constants';

export const SUMSUB_API_BASE_URL = 'https://api.sumsub.com';

export const SUMSUB_SANDBOX_ACCESS_TOKEN_PATH = '/resources/accessTokens/sdk';

export const SUMSUB_SANDBOX_TOKEN_TTL_SECS = 600;

const SUMSUB_SANDBOX_MINT_TIMEOUT_MS = 15_000;

/**
 * Thrown when Dashboard Sandbox credentials are set but Sumsub rejects the
 * mint (HTTP error, missing token in the response, or abort).
 */
export class SumSubSandboxMintError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SumSubSandboxMintError';
  }
}

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const readNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  return value;
};

/**
 * Dashboard Sandbox mint is local `__DEV__` only. Production bundles inline
 * `__DEV__` as false. Jest may leave it undefined; treat that as allowed so
 * unit tests can exercise the signer.
 */
export const isSumSubSandboxMintAllowed = (): boolean =>
  typeof __DEV__ === 'undefined' || Boolean(__DEV__);

/**
 * Optional overrides for {@link mintSumSubSandboxAccessToken}. Production
 * callers omit this object. Tests pin time, inject `fetch`, and force the
 * `__DEV__` gate via `isMintAllowed`.
 */
export interface MintSumSubSandboxAccessTokenParams {
  nowSeconds?: number;
  fetchImpl?: typeof fetch;
  appToken?: string;
  secretKey?: string;
  levelName?: string;
  userId?: string;
  /**
   * Abort the mint after this many milliseconds. `0` skips the timer
   * (used by unit tests so Jest does not hold a 15s handle). Production
   * callers omit this.
   */
  timeoutMs?: number;
  /**
   * Test seam. Overrides {@link isSumSubSandboxMintAllowed}. Same-module
   * calls do not go through the export, so `jest.spyOn` cannot stub the
   * gate. Production callers omit this.
   */
  isMintAllowed?: boolean;
}

const hasSandboxMintCredentials = ({
  appToken = SUMSUB_SANDBOX_APP_TOKEN,
  secretKey = SUMSUB_SANDBOX_SECRET_KEY,
  levelName = SUMSUB_SANDBOX_LEVEL_NAME,
  isMintAllowed = isSumSubSandboxMintAllowed(),
}: Pick<
  MintSumSubSandboxAccessTokenParams,
  'appToken' | 'secretKey' | 'levelName' | 'isMintAllowed'
> = {}): boolean =>
  isMintAllowed && Boolean(appToken && secretKey && levelName);

/**
 * HMAC-SHA256 hex digest for a Sumsub App Token request.
 * Signs `timestamp + method + path + body` with the sandbox secret.
 */
export const signSumSubSandboxRequest = ({
  secretKey,
  timestampSeconds,
  method,
  path,
  body,
}: {
  secretKey: string;
  timestampSeconds: string;
  method: string;
  path: string;
  body: string;
}): string =>
  bytesToHex(
    hmac(
      sha256,
      utf8ToBytes(secretKey),
      utf8ToBytes(`${timestampSeconds}${method}${path}${body}`),
    ),
  );

/**
 * Mints a short-lived Sumsub applicant access token against Dashboard
 * Sandbox (`https://api.sumsub.com`, `sbx:` app tokens). This is not
 * `onTestEnv()` / `test-api.sumsub.com`, which is a different host.
 *
 * Returns `null` when mint is not allowed or credentials are unset so
 * teammates without a Dashboard login still build. Throws
 * {@link SumSubSandboxMintError} when credentials are set but Sumsub rejects
 * the request.
 */
export const mintSumSubSandboxAccessToken = async ({
  nowSeconds = Math.floor(Date.now() / 1000),
  fetchImpl = fetch,
  appToken = SUMSUB_SANDBOX_APP_TOKEN,
  secretKey = SUMSUB_SANDBOX_SECRET_KEY,
  levelName = SUMSUB_SANDBOX_LEVEL_NAME,
  userId = SUMSUB_SANDBOX_USER_ID,
  timeoutMs = SUMSUB_SANDBOX_MINT_TIMEOUT_MS,
  isMintAllowed = isSumSubSandboxMintAllowed(),
}: MintSumSubSandboxAccessTokenParams = {}): Promise<string | null> => {
  if (
    !hasSandboxMintCredentials({
      appToken,
      secretKey,
      levelName,
      isMintAllowed,
    })
  ) {
    return null;
  }

  const body = JSON.stringify({
    userId,
    levelName,
    ttlInSecs: SUMSUB_SANDBOX_TOKEN_TTL_SECS,
  });
  const timestampSeconds = String(nowSeconds);
  const signature = signSumSubSandboxRequest({
    secretKey,
    timestampSeconds,
    method: 'POST',
    path: SUMSUB_SANDBOX_ACCESS_TOKEN_PATH,
    body,
  });

  const abortController = new AbortController();
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          abortController.abort();
        }, timeoutMs)
      : undefined;

  try {
    const response = await fetchImpl(
      `${SUMSUB_API_BASE_URL}${SUMSUB_SANDBOX_ACCESS_TOKEN_PATH}`,
      {
        method: 'POST',
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-App-Token': appToken,
          'X-App-Access-Ts': timestampSeconds,
          'X-App-Access-Sig': signature,
        },
        body,
      },
    );

    const payload: unknown = await response.json().catch(() => null);
    const record =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>)
        : undefined;
    const token = readNonEmptyString(record?.token);

    if (!response.ok || !token) {
      const description =
        readNonEmptyString(record?.description) ??
        readNonEmptyString(record?.errorName) ??
        `HTTP ${response.status}`;
      throw new SumSubSandboxMintError(
        `Sumsub sandbox token mint failed: ${description}`,
      );
    }

    Logger.log('[Sumsub] minted sandbox applicant access token', {
      userId,
      levelName,
    });

    return token;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Prefers a freshly minted sandbox applicant token when Dashboard Sandbox
 * credentials are present. Falls back to `MM_SUMSUB_ACCESS_TOKEN`, then `''`.
 */
export const resolveSumSubAccessToken = async (
  params?: MintSumSubSandboxAccessTokenParams,
): Promise<string> => {
  const minted = await mintSumSubSandboxAccessToken(params);
  if (minted) {
    return minted;
  }

  return SUMSUB_ACCESS_TOKEN;
};
