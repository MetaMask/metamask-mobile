import {
  P256DeviceKeyUnavailableError,
  type P256DevicePublicMaterial,
} from './p256DeviceKey';
import type { VenueAuthenticationProfile } from './venueAuthProfiles';

const SRP_MESSAGE = /^metamask:[^\s:]+:[^\s:]+(?::(?:primary|secondary))?$/u;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface A2tSessionDependencies {
  profile: VenueAuthenticationProfile;
  /** Undefined when this build has no issuer URL. Issuance is skipped. */
  getIssuerUrl: () => string | undefined;
  getAccessToken: () => Promise<string>;
  /** Canonical MetaMask profile id for the primary SRP. */
  getCanonicalProfileId: () => string | undefined;
  /** SRP login identifier: the message-signing public key. */
  getSrpIdentifier: () => Promise<string>;
  signSrpMessage: (message: string) => Promise<string>;
  /**
   * Key already held by the device-key owner, or null. Must not load or
   * create one: a flight that outlives a clear would bring plaintext back.
   */
  getDeviceKey: () => Promise<P256DevicePublicMaterial | null>;
  peekDeviceKey: () => P256DevicePublicMaterial | null;
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
  device: P256DevicePublicMaterial;
}

interface CachedA2t {
  a2t: string;
  /** Local unix seconds: response arrival plus the issuer lifetime. */
  expiresAt: number;
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
  expiresIn: number;
}

class A2tHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`A2T request failed with status ${status}`);
    this.name = 'A2tHttpError';
    this.status = status;
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
  profile: VenueAuthenticationProfile,
  challengeId: string,
  devicePublicKey: string,
  salt: string,
): Uint8Array =>
  new TextEncoder().encode(
    `${profile.a2t.proofMessagePrefix}\n${challengeId}\n${devicePublicKey}\n${salt}`,
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

const parseIssued = (value: unknown, receivedAtSec: number): A2tIssued => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('A2T response was empty');
  }
  const body = value as {
    a2t?: unknown;
    expiresIn?: unknown;
    exp?: unknown;
  };
  if (typeof body.a2t !== 'string' || body.a2t.length === 0) {
    throw new Error('A2T response was malformed');
  }

  const expiresIn =
    typeof body.expiresIn === 'number'
      ? body.expiresIn
      : typeof body.exp === 'number'
        ? body.exp - receivedAtSec
        : Number.NaN;
  if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error('A2T response lifetime was malformed');
  }

  return { a2t: body.a2t, expiresIn };
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

/** Accepts an opaque A2T for the lifetime returned by the issuer. */
const acceptIssued = (
  value: unknown,
  receivedAtSec: number,
): A2tIssued & { expiresAt: number } => {
  const issued = parseIssued(value, receivedAtSec);

  return {
    ...issued,
    expiresAt: receivedAtSec + issued.expiresIn,
  };
};

const bytesToBase64Url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

/**
 * One in-memory A2T session. `ensureA2T` waits until the MetaMask access
 * token, the SRP identifier, and the Kalshi device key are all available,
 * then runs the issuer challenge. Concurrent callers share one flight.
 * The token stays here until shortly before the issuer-provided lifetime
 * elapses, measured from when the response arrived. It is not written to
 * Redux or component state.
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

    const attemptExchange = async (attempt: number): Promise<string> => {
      try {
        return await this.#exchange(issuerUrl, ready, generation);
      } catch (error) {
        if (
          isA2tSessionCleared(error) ||
          !isExpiredChallenge(error) ||
          attempt === this.#deps.profile.a2t.challengeAttempts - 1
        ) {
          throw error;
        }
        return attemptExchange(attempt + 1);
      }
    };

    return attemptExchange(0);
  }

  async #waitUntilReady(generation: number): Promise<ReadyA2t> {
    const deadline =
      this.#deps.nowMs() + this.#deps.profile.a2t.readinessTimeoutMs;
    let lastError: unknown;
    let accessToken = '';
    let srpIdentifier = '';

    const throwNotReady = (): never => {
      this.#assertCurrent(generation);
      if (lastError instanceof Error) {
        throw lastError;
      }
      throw new Error('A2T prerequisites were not ready');
    };

    const poll = async (): Promise<ReadyA2t> => {
      if (this.#deps.nowMs() > deadline) {
        throwNotReady();
      }

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

      if (
        this.#deps.nowMs() + this.#deps.profile.a2t.readinessPollMs >
        deadline
      ) {
        throwNotReady();
      }
      await this.#deps.sleep(this.#deps.profile.a2t.readinessPollMs);
      return poll();
    };

    return poll();
  }

  async #exchange(
    issuerUrl: string,
    ready: ReadyA2t,
    generation: number,
  ): Promise<string> {
    this.#assertCurrent(generation);
    const challenge = await this.#postJson<unknown>(
      issuerUrl,
      this.#deps.profile.a2t.challengePath,
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
      this.#deps.profile,
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
      this.#deps.profile.a2t.issuancePath,
      ready.accessToken,
      {
        challengeId: parsed.challengeId,
        srpSignature,
        devicePop,
      },
    );
    const issued = acceptIssued(payload, this.#deps.now());
    this.#assertCurrent(generation);
    this.#cached = {
      a2t: issued.a2t,
      expiresAt: issued.expiresAt,
      canonicalProfileId: ready.canonicalProfileId,
      devicePublicKey: ready.device.publicKey,
    };
    return issued.a2t;
  }

  /**
   * One retry when the key was cleared while the SRP signature was in flight
   * and its owner has since reloaded it. A lock, a disabled venue, or leaving
   * the stack still fails: `getDeviceKey` returns null, and a different key
   * cannot sign this challenge.
   */
  async #signDeviceProof(
    proof: Uint8Array,
    publicKey: string,
    generation: number,
  ): Promise<Uint8Array> {
    try {
      return await this.#deps.signDeviceProof(proof);
    } catch (error) {
      if (!(error instanceof P256DeviceKeyUnavailableError)) {
        throw error;
      }
      const reloaded = await this.#deps.getDeviceKey();
      this.#assertCurrent(generation);
      if (reloaded?.publicKey !== publicKey) {
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
      signal: AbortSignal.timeout(this.#deps.profile.a2t.requestTimeoutMs),
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
      throw new A2tHttpError(response.status);
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
    if (
      cached.expiresAt - this.#deps.now() <=
      this.#deps.profile.a2t.refreshMarginSeconds
    ) {
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
