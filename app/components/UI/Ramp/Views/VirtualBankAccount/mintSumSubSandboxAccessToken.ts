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

export const isSumSubSandboxMintAllowed = (): boolean =>
  typeof __DEV__ === 'undefined' || Boolean(__DEV__);

export interface MintSumSubSandboxAccessTokenParams {
  nowSeconds?: number;
  fetchImpl?: typeof fetch;
  appToken?: string;
  secretKey?: string;
  levelName?: string;
  userId?: string;
  timeoutMs?: number;
  isMintAllowed?: boolean;
}

const hasSandboxMintCredentials = (
  params?: Pick<
    MintSumSubSandboxAccessTokenParams,
    'appToken' | 'secretKey' | 'levelName' | 'isMintAllowed'
  >,
): boolean => {
  const appToken = params?.appToken ?? SUMSUB_SANDBOX_APP_TOKEN;
  const secretKey = params?.secretKey ?? SUMSUB_SANDBOX_SECRET_KEY;
  const levelName = params?.levelName ?? SUMSUB_SANDBOX_LEVEL_NAME;
  const isMintAllowed = params?.isMintAllowed ?? isSumSubSandboxMintAllowed();

  return isMintAllowed && Boolean(appToken && secretKey && levelName);
};

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

// Dashboard Sandbox (`sbx:` tokens) uses api.sumsub.com. Do not call onTestEnv().
export const mintSumSubSandboxAccessToken = async (
  params?: MintSumSubSandboxAccessTokenParams,
): Promise<string | null> => {
  if (!hasSandboxMintCredentials(params)) {
    return null;
  }

  const {
    nowSeconds = Math.floor(Date.now() / 1000),
    fetchImpl = fetch,
    appToken = SUMSUB_SANDBOX_APP_TOKEN,
    secretKey = SUMSUB_SANDBOX_SECRET_KEY,
    levelName = SUMSUB_SANDBOX_LEVEL_NAME,
    userId = SUMSUB_SANDBOX_USER_ID,
    timeoutMs = SUMSUB_SANDBOX_MINT_TIMEOUT_MS,
  } = params ?? {};

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

export const resolveSumSubAccessToken = async (
  params?: MintSumSubSandboxAccessTokenParams,
): Promise<string> => {
  const minted = await mintSumSubSandboxAccessToken(params);
  if (minted) {
    return minted;
  }

  return SUMSUB_ACCESS_TOKEN;
};
