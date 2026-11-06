import type { P256DevicePublicMaterial } from './p256DeviceKey';
import type { VenueAuthenticationProfile } from './venueAuthProfiles';

export const A2T_REQUEST_TIMEOUT_MS = 15_000;
export const A2T_READINESS_TIMEOUT_MS = 15_000;
export const A2T_READINESS_POLL_MS = 200;
export const A2T_REFRESH_MARGIN_SECONDS = 60;

export interface A2tSessionDependencies {
  profile: VenueAuthenticationProfile;
  /** Issuer base. Undefined when this build has no issuer. Issuance is skipped. */
  getIssuerUrl: () => string | undefined;
  getAccessToken: () => Promise<string>;
  /** Canonical MetaMask profile id for the primary SRP. */
  getCanonicalProfileId: () => string | undefined;
  /**
   * Key already held by the device-key owner, or null. Must not load or
   * create one: a flight that outlives a clear would bring plaintext back.
   */
  getDeviceKey: () => Promise<P256DevicePublicMaterial | null>;
  peekDeviceKey: () => P256DevicePublicMaterial | null;
  fetch: typeof fetch;
  /** Unix time in seconds. */
  now: () => number;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
}

interface ReadyA2t {
  accessToken: string;
  canonicalProfileId: string;
  device: P256DevicePublicMaterial;
}

interface CachedA2t {
  a2t: string;
  /** Local unix seconds: response arrival plus the issuer lifetime. */
  expiresAt: number;
  canonicalProfileId: string;
  devicePublicKey: string;
}

interface A2tIssued {
  a2t: string;
  expiresIn: number;
}

interface A2tTokenResponse {
  device_public_key: string;
  salt: string;
}

class A2tHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`A2T request failed with status ${status}`);
    this.name = 'A2tHttpError';
    this.status = status;
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

const parseIssued = (value: unknown): A2tIssued => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('A2T response was empty');
  }
  const body = value as {
    access_token?: unknown;
    expires_in?: unknown;
    token_type?: unknown;
  };
  if (
    typeof body.access_token !== 'string' ||
    body.access_token.length === 0 ||
    body.token_type !== 'bearer' ||
    typeof body.expires_in !== 'number' ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0
  ) {
    throw new Error('A2T response was malformed');
  }

  return { a2t: body.access_token, expiresIn: body.expires_in };
};

/** Accepts an opaque A2T for the lifetime returned by the issuer. */
const acceptIssued = (
  value: unknown,
  receivedAtSec: number,
): A2tIssued & { expiresAt: number } => {
  const issued = parseIssued(value);

  return {
    ...issued,
    expiresAt: receivedAtSec + issued.expiresIn,
  };
};

/**
 * One in-memory A2T session. `ensureA2T` waits until the MetaMask access
 * token and the device key are available, then posts both the public
 * key and the salt once. Concurrent callers share one flight. The token
 * stays here until shortly before `expires_in` elapses, measured from when
 * the response arrived. It is not written to Redux or component state.
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
   * Returns a cached A2T, or requests one from MetaMask Auth.
   * A build with no token URL resolves to undefined and does not start one.
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

    return this.#exchange(issuerUrl, ready, generation);
  }

  async #waitUntilReady(generation: number): Promise<ReadyA2t> {
    const deadline = this.#deps.nowMs() + A2T_READINESS_TIMEOUT_MS;
    let lastError: unknown;
    let accessToken = '';

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
        const loaded = await this.#deps.getDeviceKey();
        if (accessToken && canonicalProfileId && loaded) {
          return {
            accessToken,
            canonicalProfileId,
            device: loaded,
          };
        }
      } catch (error) {
        // Sign-in throws until it finishes. Keep polling until the deadline.
        lastError = error;
      }

      if (this.#deps.nowMs() + A2T_READINESS_POLL_MS > deadline) {
        throwNotReady();
      }
      await this.#deps.sleep(A2T_READINESS_POLL_MS);
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
    const payload = await this.#postToken(
      `${issuerUrl}${this.#deps.profile.a2t.tokenPath}`,
      ready.accessToken,
      {
        device_public_key: ready.device.publicKey,
        salt: ready.device.salt,
      },
    );
    this.#assertCurrent(generation);
    const issued = acceptIssued(payload, this.#deps.now());
    this.#cached = {
      a2t: issued.a2t,
      expiresAt: issued.expiresAt,
      canonicalProfileId: ready.canonicalProfileId,
      devicePublicKey: ready.device.publicKey,
    };
    return issued.a2t;
  }

  async #postToken(
    tokenUrl: string,
    accessToken: string,
    body: A2tTokenResponse,
  ): Promise<unknown> {
    const response = await this.#deps.fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(A2T_REQUEST_TIMEOUT_MS),
    });

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      throw new A2tHttpError(response.status);
    }
    return payload;
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
    if (cached.expiresAt - this.#deps.now() <= A2T_REFRESH_MARGIN_SECONDS) {
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
