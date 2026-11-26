/**
 * Venue profile resolution (ADR-0005).
 *
 * predict-api names the target version. Profile bytes and revocations come
 * from the configured registry. Resolution uses only validated downloads
 * and the persisted cache; a fresh install must acquire a profile remotely.
 *
 * Nothing here verifies a signature. The registry delivery path is the trust
 * boundary, and the build ceiling (`venueProfileCeiling.ts`) limits what any
 * delivered profile can make this binary sign. The SHA-256 of the exact bytes
 * used travels in `Venue-Authorization.service` so predict-api can compare it
 * with its own registry copy.
 * The persisted version floor advances only after predict-api accepts a signed
 * mutation, not when a higher registry profile is downloaded or selected.
 */

import { sha256 } from '@noble/hashes/sha2';

import packageJSON from '../../../../../package.json';
import Logger from '../../../../util/Logger';
import { applyVenueProfileCeiling } from './venueProfileCeiling';
import { VENUE_PROFILE_ID } from './venueProfileContract';
import { RemoteVenueProfileClient } from './RemoteVenueProfileClient';
import { getVenueProfileRegistryUrl } from './venueProfileRegistryUrl';
import { getApiEnv } from '../../../../core/apiEnv';
import {
  getPredictApiUrl,
  resolvePredictCluster,
} from '../config/predictClusterUrls';
import { PredictApiReadClient } from '../adapters/remote/PredictApiReadClient';
import type { PredictVenueId } from '../types';
import { VenueProfileStore } from './venueProfileStore';

export {
  SUPPORTED_DSL,
  VENUE_PROFILE_ID,
  type VenueIntentName,
} from './venueProfileContract';
export type {
  BodyField,
  HttpRfc9421Payload,
  Intent,
  ReadPattern,
  Shape,
  SigningProfile,
  Source,
  Transform,
} from './signing/profileSchema';

import type { SigningProfile } from './signing/profileSchema';

/** The payload kinds the DSL renders. Only `http-rfc9421` renders today. */
export type RenderedPayloadKind = 'http-rfc9421';

/** How often the registry is consulted while PredictNext is used. */
export const VENUE_PROFILE_REFRESH_MS = 15 * 60 * 1000;

/** Total budget for acquiring a target, revocations and profile bytes. */
export const VENUE_PROFILE_ACQUISITION_TIMEOUT_MS = 10_000;

/** Aborts `run` and gives up after `ms`; a callee that ignores its signal
 * still cannot hold the caller open. */
const withDeadline = async <Value>(
  run: (signal: AbortSignal) => Promise<Value>,
  ms: number,
): Promise<Value> =>
  new Promise<Value>((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('venue_profile_deadline_exceeded'));
    }, ms);
    run(controller.signal).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/** The `Venue-Authorization` header name. Onboarding uses the same header
 * name with its own (temporary, demo-only) envelope version. */
export const VENUE_AUTHORIZATION_HEADER = 'Venue-Authorization';

/** Header naming the venue GET a signed read covers: `<path>` or
 * `<path>?<query>`, exactly the signed `@path` and `@query` bytes. */
export const VENUE_READ_HEADER = 'venue-read';

/** The longest raw query the phone signs. predict-api proposes nothing
 * longer. */
export const MAX_READ_QUERY_LENGTH = 2048;

/** One resolved profile and the hash of the bytes it came from. */
export interface VenueProfileSnapshot {
  readonly profile: SigningProfile;
  readonly version: number;
  /** base64url SHA-256 over the exact raw profile bytes. */
  readonly sha256: string;
}

/**
 * The RFC 9421 covered components for one request, from the profile's
 * implementation. The phone and predict-api agree on this list.
 */
export const coveredComponents = (
  profile: SigningProfile,
  method: string,
): readonly string[] => {
  const { headers } = profile.implementation.params;
  const read = [
    '@method',
    '@authority',
    '@path',
    '@query',
    'authorization',
    headers.requestId,
    headers.key,
    headers.salt,
  ];
  return method === 'GET'
    ? read
    : [...read, 'content-digest', 'content-type', 'idempotency-key'];
};

/** RFC 3986 path and query characters only: nothing that could break a
 * line of the RFC 9421 signing base, and no fragment. */
const URI_SAFE = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/%?]*$/u;

/**
 * L1 read check: the phone signs a server-proposed GET only if it matches
 * `reads.allow` — method plus a path pattern where a `{param}` segment
 * matches exactly one non-empty path segment — the path stays within
 * `maxPathLength`, the query within `MAX_READ_QUERY_LENGTH`, and both are
 * plain URI characters. Decoded segments cannot be `.` or `..`, contain
 * separators, or retain escapes that another decoder could reinterpret.
 * The server runs the same check before it proposes or relays, so the two
 * sides agree on what is signable.
 */
export const readAllowed = (
  profile: SigningProfile,
  proposed: { method: string; path: string; query: string },
): boolean => {
  if (proposed.method !== 'GET') {
    return false;
  }
  if (
    proposed.path.length > profile.reads.maxPathLength ||
    proposed.query.length > MAX_READ_QUERY_LENGTH ||
    !URI_SAFE.test(proposed.path) ||
    !URI_SAFE.test(proposed.query) ||
    proposed.path.includes('?') ||
    proposed.query.includes('?') ||
    proposed.path.split('/').some((segment) => {
      try {
        const decoded = decodeURIComponent(segment);
        return (
          decoded === '.' ||
          decoded === '..' ||
          !URI_SAFE.test(decoded) ||
          /[/%?]/u.test(decoded)
        );
      } catch {
        return true;
      }
    })
  ) {
    return false;
  }
  return profile.reads.allow.some((entry) => {
    if (entry.method !== proposed.method) {
      return false;
    }
    return patternToRegExp(entry.path).test(proposed.path);
  });
};

function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        return '[^/]+';
      }
      // Regex metacharacters in literal segments stay literal.
      return segment.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    })
    .join('/');
  return new RegExp(`^${source}$`, 'u');
}

/* ------------------------------------------------------------------ */
/* Revocations and hashing                                              */
/* ------------------------------------------------------------------ */

export type VenueProfileRefusal =
  | 'revoked_malformed'
  | 'profile_malformed'
  | 'profile_revoked'
  | 'profile_below_floor'
  | 'profile_ceiling';

/** base64url SHA-256 over the raw profile bytes, unpadded. */
export const venueProfileSha256 = (raw: string): string => {
  let encoded = Buffer.from(sha256(new TextEncoder().encode(raw)))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_');
  while (encoded.endsWith('=')) {
    encoded = encoded.slice(0, -1);
  }
  return encoded;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseRevoked = (raw: string): ReadonlySet<number> | undefined => {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isRecord(value) ||
      value.id !== VENUE_PROFILE_ID ||
      Object.keys(value).some(
        (key) => key !== 'id' && key !== 'revokedVersions',
      ) ||
      !Array.isArray(value.revokedVersions) ||
      !value.revokedVersions.every(
        (version: unknown): version is number =>
          typeof version === 'number' &&
          Number.isSafeInteger(version) &&
          version > 0,
      ) ||
      new Set(value.revokedVersions).size !== value.revokedVersions.length
    ) {
      return undefined;
    }
    return new Set(value.revokedVersions);
  } catch {
    return undefined;
  }
};

/* ------------------------------------------------------------------ */
/* Payload validation                                                  */
/* ------------------------------------------------------------------ */

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const validateShape = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'opaque':
      return typeof value.maxLength === 'number' && value.maxLength > 0;
    case 'decimal':
      return (
        typeof value.scale === 'number' &&
        value.scale > 0 &&
        (value.min === undefined || typeof value.min === 'string') &&
        (value.max === undefined || typeof value.max === 'string')
      );
    case 'int':
      return (
        (value.min === undefined || typeof value.min === 'number') &&
        (value.max === undefined || typeof value.max === 'number')
      );
    case 'oneOf':
      return Array.isArray(value.values) && value.values.every(isScalar);
    case 'time':
      return (
        (value.unit === 's' || value.unit === 'ms') &&
        typeof value.maxAgeSec === 'number' &&
        typeof value.maxAheadSec === 'number'
      );
    case 'uuid-v4':
      return true;
    case 'array':
      return (
        validateShape(value.of) &&
        typeof value.maxItems === 'number' &&
        value.maxItems > 0
      );
    default:
      return false;
  }
};

const validateSource = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  if ('const' in value) {
    return (
      isScalar(value.const) ||
      (Array.isArray(value.const) && value.const.every(isScalar))
    );
  }
  if ('input' in value) {
    return (
      typeof value.input === 'string' &&
      value.input.length > 0 &&
      (value.shape === undefined || validateShape(value.shape)) &&
      (value.transform === undefined ||
        ['trim', 'decimal-fixed-2', 'decimal-fixed-4'].includes(
          value.transform as string,
        ))
    );
  }
  if ('map' in value) {
    return (
      isRecord(value.map) &&
      Array.isArray(value.map.inputs) &&
      value.map.inputs.every(
        (name: unknown): name is string => typeof name === 'string',
      ) &&
      value.map.inputs.length > 0 &&
      isRecord(value.map.table) &&
      Object.values(value.map.table).every(
        (entry): entry is string | boolean =>
          typeof entry === 'string' || typeof entry === 'boolean',
      )
    );
  }
  if ('value' in value) {
    return (
      typeof value.value === 'string' &&
      value.value.length > 0 &&
      (value.shape === undefined || validateShape(value.shape))
    );
  }
  return false;
};

/** The invariants this build implements (`profileTemplates.ts`). Declared
 * ahead of the validators that read it: trusting a profile's invariant list
 * is what makes an unknown one a load-time refusal rather than a signing-time
 * surprise. */
const KNOWN_INVARIANTS: Record<string, true> = {
  'binary-limit-order-v1': true,
};

const PATH_PATTERN = /^\/[a-z0-9/{}_-]+$/iu;

const validateHttpRfc9421Payload = (
  value: Record<string, unknown>,
): boolean => {
  if (
    (value.method !== 'GET' && value.method !== 'POST') ||
    typeof value.path !== 'string' ||
    !PATH_PATTERN.test(value.path)
  ) {
    return false;
  }
  if (
    value.pathParams !== undefined &&
    (!isRecord(value.pathParams) ||
      !Object.values(value.pathParams).every(validateSource))
  ) {
    return false;
  }
  if (
    value.query !== undefined &&
    (!Array.isArray(value.query) ||
      !value.query.every(
        (entry: unknown) =>
          isRecord(entry) &&
          typeof entry.key === 'string' &&
          entry.key.length > 0 &&
          validateSource(entry.value) &&
          (entry.optional === undefined || typeof entry.optional === 'boolean'),
      ))
  ) {
    return false;
  }
  if (value.body !== undefined) {
    if (
      !isRecord(value.body) ||
      !Array.isArray(value.body.json) ||
      value.body.json.length === 0 ||
      !value.body.json.every(
        (field: unknown) =>
          isRecord(field) &&
          typeof field.key === 'string' &&
          field.key.length > 0 &&
          validateSource(field.value),
      ) ||
      typeof value.body.maxBytes !== 'number' ||
      value.body.maxBytes <= 0
    ) {
      return false;
    }
  }
  if (
    value.idempotencyKey !== undefined &&
    !validateSource(value.idempotencyKey)
  ) {
    return false;
  }
  // Invariants are code in this build: an unknown one is refused at load,
  // never at signing time.
  if (
    value.invariants !== undefined &&
    (!Array.isArray(value.invariants) ||
      !value.invariants.every(
        (entry: unknown) =>
          isRecord(entry) &&
          typeof entry.implementation === 'string' &&
          KNOWN_INVARIANTS[entry.implementation] === true &&
          (entry.params === undefined || isRecord(entry.params)),
      ))
  ) {
    return false;
  }
  return true;
};

const validatePayload = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'http-rfc9421':
      return validateHttpRfc9421Payload(value);
    // Declared, opaque to this renderer: the DSL refuses to use one.
    case 'eip712':
    case 'evm-calls':
      return true;
    default:
      return false;
  }
};

/** One intent: a non-empty id, non-empty payload names, and a per-intent
 * confirm whose sign limit is a positive safe integer. */
const validateIntent = (intent: unknown): boolean =>
  isRecord(intent) &&
  typeof intent.id === 'string' &&
  intent.id.length > 0 &&
  Array.isArray(intent.payloads) &&
  intent.payloads.length > 0 &&
  intent.payloads.every(
    (name: unknown): name is string =>
      typeof name === 'string' && name.length > 0,
  ) &&
  isRecord(intent.confirm) &&
  intent.confirm.kind === 'per-intent' &&
  typeof intent.confirm.signLimit === 'number' &&
  Number.isSafeInteger(intent.confirm.signLimit) &&
  intent.confirm.signLimit >= 1 &&
  (intent.invariant === undefined ||
    KNOWN_INVARIANTS[intent.invariant as string] === true);

/** Reads: allow patterns and a path-length ceiling. Every signer needs them. */
const validateReads = (reads: unknown): boolean => {
  if (!isRecord(reads) || !Array.isArray(reads.allow)) {
    return false;
  }
  const allowValid = reads.allow.every(
    (entry: unknown) =>
      isRecord(entry) &&
      entry.method === 'GET' &&
      typeof entry.path === 'string' &&
      PATH_PATTERN.test(entry.path),
  );
  return (
    allowValid &&
    typeof reads.maxPathLength === 'number' &&
    reads.maxPathLength >= 1
  );
};

/** The RFC 9421 parameters this build signs under. Signing is impossible
 * without them, so a profile lacking them is refused at load. */
const validateImplementation = (implementation: unknown): boolean => {
  if (
    !isRecord(implementation) ||
    implementation.id !== 'device-p256-rfc9421-v1'
  ) {
    return false;
  }
  const params = implementation.params;
  if (!isRecord(params) || !isRecord(params.headers)) {
    return false;
  }
  const { headers } = params;
  return (
    typeof params.authority === 'string' &&
    typeof params.label === 'string' &&
    typeof params.tag === 'string' &&
    typeof params.lifetimeSec === 'number' &&
    typeof params.tokenScheme === 'string' &&
    typeof headers.requestId === 'string' &&
    typeof headers.key === 'string' &&
    typeof headers.salt === 'string' &&
    typeof params.maxSignatures === 'number'
  );
};

/** Structural validation of one profile body. Unknown top-level keys are
 * ignored: the registry may add fields this build does not read. */
export function validateSigningProfile(
  value: unknown,
): SigningProfile | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const { id, version, minDsl, venue, intents, payloads } = value;
  if (
    typeof id !== 'string' ||
    id.length === 0 ||
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 1 ||
    typeof minDsl !== 'string' ||
    typeof venue !== 'string'
  ) {
    return undefined;
  }
  if (
    !Array.isArray(intents) ||
    intents.length === 0 ||
    !intents.every(validateIntent)
  ) {
    return undefined;
  }
  // Payloads: every named one present and valid.
  if (!isRecord(payloads)) {
    return undefined;
  }
  const named = (intents as { payloads: string[] }[]).flatMap(
    (intent) => intent.payloads,
  );
  if (!named.every((name) => validatePayload(payloads[name]))) {
    return undefined;
  }
  if (
    !validateReads(value.reads) ||
    !validateImplementation(value.implementation)
  ) {
    return undefined;
  }
  return value as unknown as SigningProfile;
}

/* ------------------------------------------------------------------ */
/* Resolver                                                            */
/* ------------------------------------------------------------------ */

interface LoadedProfile {
  readonly profile: SigningProfile;
  readonly raw: string;
  readonly sha256: string;
}

export type VenueProfileLog = (
  message: string,
  detail?: string | number,
) => void;

export interface VenueProfileResolverOptions {
  profileId?: string;
  client?: RemoteVenueProfileClient;
  store?: VenueProfileStore;
  getSigningProfile?: (options?: {
    signal?: AbortSignal;
  }) => Promise<{ id: string; version: number }>;
  now?: () => number;
  log?: VenueProfileLog;
}

/**
 * Resolves and pins one profile snapshot, and owns the persisted floor.
 *
 * `resolve()` never touches the network. `ensure()` uses the cache first,
 * then shares a bounded refresh when no profile is admitted. `refresh()`
 * asks predict-api for the target, fetches revocations with `If-None-Match`,
 * and downloads the target only when validated bytes are not held.
 */
export class VenueProfileResolver {
  readonly #profileId: string;
  readonly #client: RemoteVenueProfileClient | undefined;
  readonly #store: VenueProfileStore | undefined;
  readonly #getSigningProfile: VenueProfileResolverOptions['getSigningProfile'];
  readonly #now: () => number;
  readonly #log: VenueProfileLog;

  #loading: Promise<void> | undefined;
  #refreshing: Promise<boolean> | undefined;
  #loaded = false;
  #targetVersion: number | undefined;
  #revoked: ReadonlySet<number> | undefined;
  #revokedRaw: string | undefined;
  #etag: string | undefined;
  #fetchedAt: number | undefined;
  #floor = 0;
  #documents = new Map<number, LoadedProfile>();
  #snapshot: VenueProfileSnapshot | undefined;
  #unavailableTarget: number | undefined;
  #unavailableLogged = false;

  constructor({
    profileId = VENUE_PROFILE_ID,
    client,
    store,
    getSigningProfile,
    now = Date.now,
    log = (message, detail) => Logger.log(message, detail),
  }: VenueProfileResolverOptions = {}) {
    this.#profileId = profileId;
    this.#client = client;
    this.#store = store;
    this.#getSigningProfile = getSigningProfile;
    this.#now = now;
    this.#log = log;
  }

  /** The current downloaded snapshot. Never blocks on network. */
  async resolve(): Promise<VenueProfileSnapshot | undefined> {
    await this.#load();
    return this.#pick();
  }

  /** Acquires a missing snapshot without extending the cold-start budget. */
  async ensure(): Promise<VenueProfileSnapshot | undefined> {
    try {
      return await withDeadline(async (signal) => {
        const snapshot = await this.resolve();
        if (snapshot || !this.#client || !this.#getSigningProfile) {
          return snapshot;
        }
        if (signal.aborted) {
          return undefined;
        }
        await this.refresh();
        return signal.aborted ? undefined : this.#pick();
      }, VENUE_PROFILE_ACQUISITION_TIMEOUT_MS);
    } catch {
      return undefined;
    }
  }

  /** Checks the captured bytes against current revocations and floor. */
  isSnapshotEligible(snapshot: VenueProfileSnapshot): boolean {
    const document = this.#documents.get(snapshot.version);
    return (
      this.#loaded &&
      this.#revoked !== undefined &&
      snapshot.version >= this.#floor &&
      !this.#revoked.has(snapshot.version) &&
      document?.profile === snapshot.profile &&
      document.sha256 === snapshot.sha256
    );
  }

  /** Whether a fetch is due, by the 15-minute cadence. */
  isRefreshDue(): boolean {
    return (
      this.#fetchedAt === undefined ||
      this.#now() - this.#fetchedAt >= VENUE_PROFILE_REFRESH_MS
    );
  }

  /**
   * Reports changes to the admitted version/hash, including admission/removal.
   * Failures preserve downloaded bytes. Concurrent callers share one refresh,
   * so answers cannot land out of order.
   */
  async refresh(): Promise<boolean> {
    if (!this.#client || !this.#getSigningProfile) {
      return false;
    }
    this.#refreshing ??= (async () => {
      let before = this.#snapshot;
      try {
        await withDeadline(async (signal) => {
          await this.#load();
          before = this.#pick();
          await this.#refreshOnce(signal);
        }, VENUE_PROFILE_ACQUISITION_TIMEOUT_MS);
      } catch {
        this.#log('PredictNext: venue profile refresh timed out');
      }
      const after = this.#pick();
      return (
        before?.version !== after?.version || before?.sha256 !== after?.sha256
      );
    })().finally(() => {
      this.#refreshing = undefined;
    });
    return this.#refreshing;
  }

  async #refreshOnce(signal: AbortSignal): Promise<void> {
    await this.#load();
    if (signal.aborted) {
      return;
    }
    const getSigningProfile = this.#getSigningProfile;
    if (getSigningProfile) {
      try {
        const target = await getSigningProfile({ signal });
        if (signal.aborted) {
          return;
        }
        if (
          target.id === this.#profileId &&
          Number.isSafeInteger(target.version) &&
          target.version > 0 &&
          target.version < this.#floor
        ) {
          // An older answer, for example from a pod not yet redeployed. The
          // phone never moves back, so it keeps the target it has.
          this.#log(
            'PredictNext: venue profile refused',
            'profile_below_floor',
          );
        } else if (
          target.id === this.#profileId &&
          Number.isSafeInteger(target.version) &&
          target.version > 0
        ) {
          this.#targetVersion = target.version;
        } else {
          this.#log('PredictNext: venue profile refused', 'profile_malformed');
        }
      } catch {
        this.#log('PredictNext: venue profile target fetch failed');
      }
      if (signal.aborted) {
        return;
      }
    }
    if (this.#client) {
      try {
        const result = await this.#client.fetchRevoked({
          id: this.#profileId,
          etag: this.#etag,
          signal,
        });
        if (signal.aborted) {
          return;
        }
        if (result.status === 'modified') {
          const next = parseRevoked(result.raw);
          if (
            next &&
            (!this.#revoked ||
              [...this.#revoked].every((version) => next.has(version)))
          ) {
            this.#revoked = next;
            this.#revokedRaw = result.raw;
            this.#etag = result.etag;
          } else {
            this.#log(
              'PredictNext: venue profile refused',
              'revoked_malformed',
            );
          }
        } else if (this.#revoked) {
          this.#etag = result.etag ?? this.#etag;
        }
      } catch {
        this.#log('PredictNext: venue profile revocations fetch failed');
      }
      if (signal.aborted) {
        return;
      }
      if (
        this.#targetVersion !== undefined &&
        this.#targetVersion >= this.#floor &&
        this.#revoked !== undefined &&
        !this.#revoked.has(this.#targetVersion)
      ) {
        await this.#fetchVersion(this.#targetVersion, signal);
      }
    }
    if (signal.aborted) {
      return;
    }
    this.#fetchedAt = this.#now();
    this.#pick();
    await this.#persist();
  }

  /** One refetch after predict-api answered a profile code. */
  async refreshAfterRefusal(): Promise<boolean> {
    this.#fetchedAt = undefined;
    return this.refresh();
  }

  /** Only an accepted signed mutation confirms the persisted version floor. */
  async confirmVenueProfileVersion(version: number): Promise<void> {
    await this.#load();
    await this.#raiseFloor(version);
  }

  /** Test seam: forget in-memory state, keep the persisted cache. */
  reset(): void {
    this.#loading = undefined;
    this.#refreshing = undefined;
    this.#loaded = false;
    this.#targetVersion = undefined;
    this.#revoked = undefined;
    this.#revokedRaw = undefined;
    this.#etag = undefined;
    this.#fetchedAt = undefined;
    this.#floor = 0;
    this.#documents = new Map();
    this.#snapshot = undefined;
    this.#unavailableTarget = undefined;
    this.#unavailableLogged = false;
  }

  async #load(): Promise<void> {
    this.#loading ??= this.#loadOnce().catch((error: unknown) => {
      this.#loading = undefined;
      throw error;
    });
    await this.#loading;
  }

  async #loadOnce(): Promise<void> {
    if (this.#loaded) {
      return;
    }
    const persisted = await this.#store?.load();
    if (persisted) {
      this.#floor = persisted.floor;
      this.#fetchedAt = persisted.fetchedAt;
      for (const [version, raw] of Object.entries(persisted.profiles)) {
        const numeric = Number(version);
        if (Number.isSafeInteger(numeric) && numeric >= 1) {
          const parsed = this.#parse(raw, numeric);
          if ('reason' in parsed) {
            this.#log('PredictNext: venue profile refused', parsed.reason);
          } else {
            this.#documents.set(numeric, parsed);
          }
        }
      }
      this.#targetVersion = persisted.targetVersion;
      if (persisted.revokedRaw) {
        const revoked = parseRevoked(persisted.revokedRaw);
        if (revoked) {
          this.#revoked = revoked;
          this.#revokedRaw = persisted.revokedRaw;
          this.#etag = persisted.revokedEtag;
        }
      }
    }
    this.#loaded = true;
    this.#pick();
  }

  async #fetchVersion(version: number, signal: AbortSignal): Promise<void> {
    if (!this.#client || this.#documents.has(version)) {
      return;
    }
    try {
      const raw = await this.#client.fetchProfile({
        id: this.#profileId,
        version,
        signal,
      });
      if (signal.aborted) {
        return;
      }
      const parsed = this.#parse(raw, version);
      if ('reason' in parsed) {
        this.#log('PredictNext: venue profile refused', parsed.reason);
        return;
      }
      this.#documents.set(version, parsed);
    } catch (error) {
      this.#log(
        'PredictNext: venue profile fetch failed',
        error instanceof Error ? error.name : 'unknown',
      );
    }
  }

  #parse(
    raw: string,
    expectedVersion: number,
  ): LoadedProfile | { reason: VenueProfileRefusal } {
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      return { reason: 'profile_malformed' };
    }
    const profile = validateSigningProfile(value);
    if (
      profile?.version !== expectedVersion ||
      profile.id !== this.#profileId
    ) {
      return { reason: 'profile_malformed' };
    }
    const ceiling = applyVenueProfileCeiling(profile);
    if (!ceiling.ok) {
      return { reason: 'profile_ceiling' };
    }
    return { profile, raw, sha256: venueProfileSha256(raw) };
  }

  #pick(): VenueProfileSnapshot | undefined {
    const target = this.#targetVersion;
    if (!this.#revoked) {
      this.#snapshot = undefined;
      return undefined;
    }
    // The floor is also the last successfully used version across restarts.
    // A target below it (only possible from an older cache) is skipped by
    // the floor check below, never used.
    const candidates = [
      target,
      this.#snapshot?.version ?? (this.#floor || undefined),
    ];
    for (const version of candidates) {
      if (
        version === undefined ||
        version < this.#floor ||
        this.#revoked.has(version)
      ) {
        continue;
      }
      const parsed = this.#documents.get(version);
      if (parsed === undefined) {
        continue;
      }
      this.#snapshot = {
        profile: parsed.profile,
        version,
        sha256: parsed.sha256,
      };
      return this.#snapshot;
    }
    this.#snapshot = undefined;
    if (!this.#unavailableLogged || this.#unavailableTarget !== target) {
      this.#unavailableLogged = true;
      this.#unavailableTarget = target;
      this.#log('PredictNext: venue profile unavailable', target);
    }
    return undefined;
  }

  async #raiseFloor(version: number): Promise<void> {
    if (!Number.isSafeInteger(version) || version <= this.#floor) {
      return;
    }
    this.#floor = version;
    await this.#persist();
  }

  async #persist(): Promise<void> {
    if (!this.#store) {
      return;
    }
    const profiles: Record<string, string> = {};
    for (const [version, document] of this.#documents) {
      profiles[String(version)] = document.raw;
    }
    await this.#store.save({
      ...(this.#targetVersion !== undefined
        ? { targetVersion: this.#targetVersion }
        : {}),
      ...(this.#revokedRaw !== undefined
        ? { revokedRaw: this.#revokedRaw }
        : {}),
      ...(this.#etag ? { revokedEtag: this.#etag } : {}),
      profiles,
      floor: this.#floor,
      ...(this.#fetchedAt !== undefined ? { fetchedAt: this.#fetchedAt } : {}),
    });
  }
}

/* ------------------------------------------------------------------ */
/* App-wide instance                                                   */
/* ------------------------------------------------------------------ */

let defaultResolver: VenueProfileResolver | undefined;
let activeResolver: VenueProfileResolver | undefined;

const getDefaultResolver = (): VenueProfileResolver => {
  if (!defaultResolver) {
    const registryUrl = getVenueProfileRegistryUrl();
    const environment = resolvePredictCluster({
      rawApiEnv: process.env.MM_API_ENV,
      apiEnv: getApiEnv(),
      isDevelopment: __DEV__,
    });
    // A local API override uses its own registry target and must not raise the
    // persisted official floor, so keep its cache in memory only.
    const storageEnvironment =
      environment !== undefined && !process.env.MM_PREDICT_API_URL
        ? environment
        : undefined;
    defaultResolver = new VenueProfileResolver({
      getSigningProfile: registryUrl
        ? async (options) =>
            new PredictApiReadClient({
              baseUrl: getPredictApiUrl(),
              clientVersion: packageJSON.version,
              getBearerToken: async () => undefined,
              fetch: globalThis.fetch.bind(globalThis),
            }).getSigningProfile('kalshi' as PredictVenueId, {
              signal: options?.signal,
            })
        : undefined,
      client: registryUrl
        ? new RemoteVenueProfileClient({
            baseUrl: registryUrl,
            clientVersion: packageJSON.version,
            fetch: globalThis.fetch.bind(globalThis),
          })
        : undefined,
      store: storageEnvironment
        ? new VenueProfileStore({
            environment: storageEnvironment,
            profileId: VENUE_PROFILE_ID,
            registryUrl,
          })
        : undefined,
    });
  }
  return defaultResolver;
};

const getResolver = (): VenueProfileResolver =>
  activeResolver ?? getDefaultResolver();

/** The resolved profile snapshot, or undefined when nothing is admitted. */
export const resolveVenueProfile = async (): Promise<
  VenueProfileSnapshot | undefined
> => getResolver().resolve();

/** Uses cached downloads first, then acquires a missing profile once. */
export const ensureVenueProfile = async (): Promise<
  VenueProfileSnapshot | undefined
> => getResolver().ensure();

/** Synchronous signing guard for a previously captured snapshot. */
export const isVenueProfileSnapshotEligible = (
  snapshot: VenueProfileSnapshot,
): boolean => getResolver().isSnapshotEligible(snapshot);

/** The resolved profile. Callers that need the hash use
 * `resolveVenueProfile()` and pin that object. */
export const loadVenueProfile = async (): Promise<SigningProfile | undefined> =>
  (await getResolver().resolve())?.profile;

/** Fetches the registry unless the 15-minute cadence says it is not due. */
export const refreshVenueProfile = async (force = false): Promise<void> => {
  const resolver = getResolver();
  if (!force && !resolver.isRefreshDue()) {
    return;
  }
  await resolver.refresh();
};

/** One refetch after predict-api answers `venue_profile_*`. */
export const refreshVenueProfileAfterRefusal = async (): Promise<boolean> =>
  getResolver().refreshAfterRefusal();

/** Records the profile version accepted for a signed mutation. */
export const confirmVenueProfileVersion = async (
  version: number,
): Promise<void> => getResolver().confirmVenueProfileVersion(version);

/** Test seam: forget the memoized snapshot. */
export const resetVenueProfile = (): void => {
  getResolver().reset();
};

/** Test seam: replace the app-wide resolver. */
export const setVenueProfileResolverForTesting = (
  resolver: VenueProfileResolver | undefined,
): void => {
  activeResolver = resolver;
};
