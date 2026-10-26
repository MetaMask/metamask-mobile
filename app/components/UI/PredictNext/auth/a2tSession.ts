import {
  kalshiDeviceKeyCommitment,
  KalshiDeviceKeyUnavailableError,
  type KalshiDevicePublicMaterial,
} from './kalshiDeviceKey';

/** Refresh this many seconds before `exp`, matching the issuer PoC. */
const A2T_REFRESH_MARGIN_SEC = 60;

const READY_TIMEOUT_MS = 15_000;
const READY_POLL_MS = 200;
const CHALLENGE_ATTEMPTS = 2;

const SRP_MESSAGE = /^metamask:[^\s:]+:[^\s:]+(?::(?:primary|secondary))?$/u;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface A2tSessionDependencies {
  /** Undefined when this build has no issuer URL. Issuance is skipped. */
  getIssuerUrl: () => string | undefined;
  getAccessToken: () => Promise<string>;
  /** Canonical MetaMask profile id for the primary SRP. */
  getCanonicalProfileId: () => string | undefined;
  /** SRP login identifier: the message-signing public key. */
  getSrpIdentifier: () => Promise<string>;
  signSrpMessage: (message: string) => Promise<string>;
  getDeviceKey: () => Promise<KalshiDevicePublicMaterial | null>;
  peekDeviceKey: () => KalshiDevicePublicMaterial | null;
  signDeviceProof: (message: Uint8Array) => Promise<Uint8Array>;
  fetch: typeof fetch;
  /** Unix time in seconds. */
  now: () => number;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
}

interface ReadyA2t {
  accessToken: string;
  canonicalProfileId: string;
  srpIdentifier: string;
  device: KalshiDevicePublicMaterial;
}

interface CachedA2t {
  a2t: string;
  /** Local unix seconds: arrival time plus the issuer lifetime `exp - iat`. */
  expiresAt: number;
  profileId: string;
  canonicalProfileId: string;
  devicePublicKey: string;
}

interface A2tChallenge {
  challengeId: string;
  srpMessage: string;
  expiresIn: number;
}

interface A2tIssued {
  a2t: string;
  exp: number;
  profileId: string;
}

class A2tHttpError extends Error {
  readonly status: number;
  readonly bodyMessage: string;

  constructor(status: number, bodyMessage: string) {
    super(bodyMessage || `A2T request failed with status ${status}`);
    this.name = 'A2tHttpError';
    this.status = status;
    this.bodyMessage = bodyMessage;
  }
}

class A2tChallengeExpiredError extends Error {
  constructor() {
    super('unknown or expired challenge');
    this.name = 'A2tChallengeExpiredError';
  }
}

export class A2tSessionClearedError extends Error {
  constructor() {
    super('A2T session was cleared');
    this.name = 'A2tSessionClearedError';
  }
}

/** True when `clear()` cancelled the issuance this error came from. */
export const isA2tSessionCleared = (error: unknown): boolean =>
  error instanceof A2tSessionClearedError;

/** Device proof of possession. The issuer verifies this exact UTF-8 string. */
export const a2tPopMessage = (
  challengeId: string,
  devicePublicKey: string,
  salt: string,
): Uint8Array =>
  new TextEncoder().encode(
    `kalshi-a2t-request-v1\n${challengeId}\n${devicePublicKey}\n${salt}`,
  );

const isExpiredChallenge = (error: unknown): boolean =>
  error instanceof A2tChallengeExpiredError;

const parseChallenge = (
  value: unknown,
  srpIdentifier: string,
): A2tChallenge => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('A2T challenge response was empty');
  }
  const body = value as {
    challengeId?: unknown;
    srpMessage?: unknown;
    expiresIn?: unknown;
  };
  if (
    typeof body.challengeId !== 'string' ||
    !UUID.test(body.challengeId) ||
    typeof body.srpMessage !== 'string' ||
    !SRP_MESSAGE.test(body.srpMessage) ||
    typeof body.expiresIn !== 'number' ||
    body.expiresIn <= 0
  ) {
    throw new Error('A2T challenge response was malformed');
  }

  const identifier = body.srpMessage.split(':')[2];
  if (identifier !== srpIdentifier) {
    throw new Error('A2T challenge message does not match the SRP identifier');
  }

  return {
    challengeId: body.challengeId,
    srpMessage: body.srpMessage,
    expiresIn: body.expiresIn,
  };
};

const parseIssued = (value: unknown): A2tIssued => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('A2T response was empty');
  }
  const body = value as { a2t?: unknown; exp?: unknown; profileId?: unknown };
  if (
    typeof body.a2t !== 'string' ||
    body.a2t.length === 0 ||
    typeof body.exp !== 'number' ||
    typeof body.profileId !== 'string' ||
    body.profileId.length === 0
  ) {
    throw new Error('A2T response was malformed');
  }
  return { a2t: body.a2t, exp: body.exp, profileId: body.profileId };
};

const messageFromBody = (value: unknown): string => {
  if (typeof value !== 'object' || value === null || !('message' in value)) {
    return '';
  }
  const { message } = value as { message: unknown };
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(', ');
  }
  return '';
};

const fromBase64Url = (value: string): string => {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(
    padded.replace(/-/g, '+').replace(/_/g, '/'),
    'base64',
  ).toString('utf8');
};

const readJwtObject = (
  part: string | undefined,
): Record<string, unknown> | undefined => {
  if (!part) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(part));
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const readString = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key];
  return typeof value === 'string' ? value : undefined;
};

const readNumber = (
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = record?.[key];
  return typeof value === 'number' ? value : undefined;
};

/**
 * Accepts an issuance only when it is the profile and device key we asked
 * for, and only for the issuer's own lifetime. `exp` is an absolute time on
 * the issuer clock, so the cache uses `receivedAt + (exp - iat)`.
 */
const acceptIssued = (
  value: unknown,
  ready: ReadyA2t,
  receivedAtSec: number,
): A2tIssued & { expiresAt: number } => {
  const issued = parseIssued(value);
  if (issued.profileId !== ready.canonicalProfileId) {
    throw new Error('A2T profile does not match the requested profile');
  }

  const claims = readJwtObject(issued.a2t.split('.')[1]);
  const exp = readNumber(claims, 'exp');
  const iat = readNumber(claims, 'iat');
  const lifetime =
    exp !== undefined && iat !== undefined ? exp - iat : Number.NaN;
  if (exp !== issued.exp || !Number.isFinite(lifetime) || lifetime <= 0) {
    throw new Error('A2T expiry does not match the token');
  }

  const nonce = readString(claims, 'nonce');
  const commitment = kalshiDeviceKeyCommitment(
    ready.device.publicRaw,
    ready.device.saltRaw,
  );
  if (nonce !== commitment) {
    throw new Error('A2T nonce does not match the device key');
  }

  return {
    ...issued,
    expiresAt: receivedAtSec + lifetime,
  };
};

const bytesToBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]+$/u, '');

/**
 * One in-memory A2T session. `ensureA2T` waits until the MetaMask access
 * token, the SRP identifier, and the Kalshi device key are all available,
 * then runs the issuer challenge. Concurrent callers share one flight.
 * The token stays here until shortly before the issuer lifetime
 * (`exp - iat`) elapses, measured from when the response arrived. It is
 * not written to Redux or component state.
 */
export class A2tSession {
  readonly #deps: A2tSessionDependencies;
  #cached: CachedA2t | null = null;
  #inflight: Promise<string | undefined> | null = null;
  #generation = 0;

  constructor(deps: A2tSessionDependencies) {
    this.#deps = deps;
  }

  /**
   * Returns a cached A2T, or runs challenge and issuance once.
   * A challenge the issuer has already expired starts the whole flow again.
   * A build with no issuer URL resolves to undefined and does not start one.
   */
  ensureA2T(): Promise<string | undefined> {
    const fresh = this.#readFresh(
      this.#deps.getCanonicalProfileId(),
      this.#deps.peekDeviceKey()?.publicKey,
    );
    if (fresh) {
      return Promise.resolve(fresh);
    }

    if (!this.#inflight) {
      const generation = this.#generation;
      const run = this.#issue(generation).finally(() => {
        if (this.#inflight === run) {
          this.#inflight = null;
        }
      });
      this.#inflight = run;
    }

    return this.#inflight;
  }

  /** Drops the cached A2T and any flight still in progress. */
  clear(): void {
    this.#generation += 1;
    this.#cached = null;
    this.#inflight = null;
  }

  async #issue(generation: number): Promise<string | undefined> {
    this.#assertCurrent(generation);
    const issuerUrl = this.#deps.getIssuerUrl();
    if (!issuerUrl) {
      return undefined;
    }

    const loadedDevice = await this.#deps.getDeviceKey();
    const fresh = this.#readFresh(
      this.#deps.getCanonicalProfileId(),
      loadedDevice?.publicKey,
    );
    if (fresh) {
      return fresh;
    }

    const ready = await this.#waitUntilReady(generation);
    const readyFresh = this.#readFresh(
      ready.canonicalProfileId,
      ready.device.publicKey,
    );
    if (readyFresh) {
      return readyFresh;
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < CHALLENGE_ATTEMPTS; attempt += 1) {
      try {
        return await this.#exchange(issuerUrl, ready, generation);
      } catch (error) {
        lastError = error;
        if (
          isA2tSessionCleared(error) ||
          !isExpiredChallenge(error) ||
          attempt === CHALLENGE_ATTEMPTS - 1
        ) {
          throw error;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('A2T challenge expired');
  }

  async #waitUntilReady(generation: number): Promise<ReadyA2t> {
    const deadline = this.#deps.nowMs() + READY_TIMEOUT_MS;
    let lastError: unknown;
    let accessToken = '';
    let srpIdentifier = '';

    while (this.#deps.nowMs() <= deadline) {
      this.#assertCurrent(generation);
      try {
        if (!accessToken) {
          accessToken = (await this.#deps.getAccessToken()).trim();
        }
        const canonicalProfileId = this.#deps.getCanonicalProfileId();
        if (!srpIdentifier) {
          srpIdentifier = (await this.#deps.getSrpIdentifier()).trim();
        }
        const loaded = await this.#deps.getDeviceKey();
        if (accessToken && canonicalProfileId && srpIdentifier && loaded) {
          return {
            accessToken,
            canonicalProfileId,
            srpIdentifier,
            device: loaded,
          };
        }
      } catch (error) {
        // Sign-in throws until it finishes. Keep polling until the deadline.
        lastError = error;
      }

      if (this.#deps.nowMs() + READY_POLL_MS > deadline) {
        break;
      }
      await this.#deps.sleep(READY_POLL_MS);
    }

    this.#assertCurrent(generation);
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('A2T prerequisites were not ready');
  }

  async #exchange(
    issuerUrl: string,
    ready: ReadyA2t,
    generation: number,
  ): Promise<string> {
    this.#assertCurrent(generation);
    const challenge = await this.#postJson<unknown>(
      issuerUrl,
      '/venues/kalshi/a2t/challenge',
      ready.accessToken,
      {
        srpIdentifier: ready.srpIdentifier,
        devicePublicKey: ready.device.publicKey,
        salt: ready.device.salt,
      },
    );
    const parsed = parseChallenge(challenge, ready.srpIdentifier);
    const receivedAt = this.#deps.now();
    const srpSignature = await this.#deps.signSrpMessage(parsed.srpMessage);
    const proof = a2tPopMessage(
      parsed.challengeId,
      ready.device.publicKey,
      ready.device.salt,
    );
    const devicePop = bytesToBase64Url(
      await this.#signDeviceProof(proof, ready.device.publicKey, generation),
    );
    if (this.#deps.now() >= receivedAt + parsed.expiresIn) {
      throw new A2tChallengeExpiredError();
    }

    this.#assertCurrent(generation);
    const payload = await this.#postJson<unknown>(
      issuerUrl,
      '/venues/kalshi/a2t',
      ready.accessToken,
      {
        challengeId: parsed.challengeId,
        srpSignature,
        devicePop,
      },
    );
    const issued = acceptIssued(payload, ready, this.#deps.now());
    this.#assertCurrent(generation);
    this.#cached = {
      a2t: issued.a2t,
      expiresAt: issued.expiresAt,
      profileId: issued.profileId,
      canonicalProfileId: ready.canonicalProfileId,
      devicePublicKey: ready.device.publicKey,
    };
    return issued.a2t;
  }

  /**
   * One reload when the key was cleared while the SRP signature was in
   * flight. A lock or a disabled venue still fails: `getDeviceKey` returns
   * null, and a different key cannot sign this challenge.
   */
  async #signDeviceProof(
    proof: Uint8Array,
    publicKey: string,
    generation: number,
  ): Promise<Uint8Array> {
    try {
      return await this.#deps.signDeviceProof(proof);
    } catch (error) {
      if (!(error instanceof KalshiDeviceKeyUnavailableError)) {
        throw error;
      }
      const reloaded = await this.#deps.getDeviceKey();
      this.#assertCurrent(generation);
      if (!reloaded || reloaded.publicKey !== publicKey) {
        throw error;
      }
      return await this.#deps.signDeviceProof(proof);
    }
  }

  async #postJson<T>(
    issuerUrl: string,
    path: string,
    accessToken: string,
    body: unknown,
  ): Promise<T> {
    const response = await this.#deps.fetch(`${issuerUrl}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const bodyMessage = messageFromBody(payload);
      if (
        response.status === 401 &&
        bodyMessage.toLowerCase().includes('unknown or expired challenge')
      ) {
        throw new A2tChallengeExpiredError();
      }
      throw new A2tHttpError(response.status, bodyMessage);
    }
    return payload as T;
  }

  #readFresh(
    canonicalProfileId: string | undefined,
    devicePublicKey: string | undefined,
  ): string | undefined {
    const cached = this.#cached;
    if (!cached || !canonicalProfileId || !devicePublicKey) {
      return undefined;
    }
    if (
      cached.canonicalProfileId !== canonicalProfileId ||
      cached.devicePublicKey !== devicePublicKey
    ) {
      return undefined;
    }
    if (cached.expiresAt - this.#deps.now() <= A2T_REFRESH_MARGIN_SEC) {
      return undefined;
    }
    return cached.a2t;
  }

  #assertCurrent(generation: number): void {
    if (generation !== this.#generation) {
      throw new A2tSessionClearedError();
    }
  }
}
