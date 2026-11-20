/**
 * Venue profile resolution (ADR-0005).
 *
 * The profile used to be a signed document bundled with the app. It is now
 * readable JSON served by mm-config-registry through the client-config host
 * that matches this build's Predict cluster. The app resolves one snapshot
 * per operation from: fresh remote → persisted cache → bundled byte copy.
 *
 * Nothing here verifies a signature. The registry delivery path is the trust
 * boundary, and the build ceiling (`venueProfileCeiling.ts`) limits what any
 * delivered profile can make this binary sign. The SHA-256 of the exact bytes
 * used travels in `Venue-Authorization.service` so predict-api can compare it
 * with its own registry copy.
 */

import { sha256 } from '@noble/hashes/sha2';

import packageJSON from '../../../../../package.json';
import Logger from '../../../../util/Logger';
import { applyVenueProfileCeiling } from './venueProfileCeiling';
import {
  SUPPORTED_DSL,
  VENUE_PROFILE_ID,
  type VenueIntentName,
} from './venueProfileContract';
import { RemoteVenueProfileClient } from './RemoteVenueProfileClient';
import {
  BUNDLED_POLICY_RAW,
  BUNDLED_V2_RAW,
  BUNDLED_V3_RAW,
} from './venue-profiles/kalshi-demo-signing.raw';
import {
  getVenueProfileRegistryEnvironment,
  getVenueProfileRegistryUrl,
} from './venueProfileRegistryUrl';
import {
  VenueProfileStore,
  type PersistedVenueProfiles,
} from './venueProfileStore';

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
/* Policy and hashing                                                  */
/* ------------------------------------------------------------------ */

export interface VenueProfilePolicy {
  readonly id: string;
  readonly currentVersion: number;
  readonly revokedVersions: readonly number[];
}

export type VenueProfileRefusal =
  | 'policy_malformed'
  | 'profile_malformed'
  | 'profile_low_version'
  | 'profile_revoked'
  | 'profile_below_floor'
  | 'profile_ceiling';

/** base64url SHA-256 over the raw profile bytes, unpadded. */
export const venueProfileSha256 = (raw: string): string =>
  Buffer.from(sha256(new TextEncoder().encode(raw)))
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/[=]+$/u, '');

const parsePolicy = (raw: string): VenueProfilePolicy | undefined => {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    record.id !== VENUE_PROFILE_ID ||
    typeof record.currentVersion !== 'number' ||
    !Number.isSafeInteger(record.currentVersion) ||
    record.currentVersion < 1 ||
    !Array.isArray(record.revokedVersions) ||
    !record.revokedVersions.every(
      (entry): entry is number =>
        typeof entry === 'number' && Number.isSafeInteger(entry) && entry >= 1,
    )
  ) {
    return undefined;
  }
  return {
    id: record.id,
    currentVersion: record.currentVersion,
    revokedVersions: [...record.revokedVersions],
  };
};

/** Accepts a policy only if it cannot roll back what this device admitted. */
const admitsPolicy = (
  next: VenueProfilePolicy,
  previous: VenueProfilePolicy | undefined,
  floor: number,
): boolean => {
  if (next.currentVersion < floor) {
    return false;
  }
  if (!previous) {
    return true;
  }
  if (next.currentVersion < previous.currentVersion) {
    return false;
  }
  return previous.revokedVersions.every((version) =>
    next.revokedVersions.includes(version),
  );
};

/* ------------------------------------------------------------------ */
/* Payload validation                                                  */
/* ------------------------------------------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
  bundledPolicyRaw?: string;
  bundledProfiles?: Readonly<Record<number, string>>;
  now?: () => number;
  log?: VenueProfileLog;
}

const BUNDLED_PROFILES: Readonly<Record<number, string>> = {
  2: BUNDLED_V2_RAW,
  3: BUNDLED_V3_RAW,
};

/**
 * Resolves and pins one profile snapshot, and owns the persisted floor.
 *
 * `resolve()` never touches the network: entry points call `refresh()` in the
 * background, so a screen always gets an answer immediately. `refresh()`
 * fetches the policy with `If-None-Match`, and one profile body only when the
 * policy names a version this device has no bytes for. A refused copy never
 * replaces a previously admitted one.
 */
export class VenueProfileResolver {
  readonly #profileId: string;
  readonly #client: RemoteVenueProfileClient | undefined;
  readonly #store: VenueProfileStore | undefined;
  readonly #bundledPolicyRaw: string;
  readonly #bundledProfiles: Readonly<Record<number, string>>;
  readonly #now: () => number;
  readonly #log: VenueProfileLog;

  #loading: Promise<void> | undefined;
  #loaded = false;
  #policy: VenueProfilePolicy | undefined;
  #etag: string | undefined;
  #fetchedAt: number | undefined;
  #floor = 0;
  #documents = new Map<number, string>();
  #snapshot: VenueProfileSnapshot | undefined;
  #persisted: PersistedVenueProfiles | undefined;

  constructor({
    profileId = VENUE_PROFILE_ID,
    client,
    store,
    bundledPolicyRaw = BUNDLED_POLICY_RAW,
    bundledProfiles = BUNDLED_PROFILES,
    now = Date.now,
    log = (message, detail) => Logger.log(message, detail),
  }: VenueProfileResolverOptions = {}) {
    this.#profileId = profileId;
    this.#client = client;
    this.#store = store;
    this.#bundledPolicyRaw = bundledPolicyRaw;
    this.#bundledProfiles = bundledProfiles;
    this.#now = now;
    this.#log = log;
  }

  /** The current snapshot, from cache or bundle. Never blocks on network. */
  async resolve(): Promise<VenueProfileSnapshot | undefined> {
    await this.#load();
    return this.#pick();
  }

  /** Whether a fetch is due, by the 15-minute cadence. */
  isRefreshDue(): boolean {
    return (
      this.#fetchedAt === undefined ||
      this.#now() - this.#fetchedAt >= VENUE_PROFILE_REFRESH_MS
    );
  }

  /** Fetches the policy and (when new) one profile. Failures keep state. */
  async refresh(): Promise<void> {
    await this.#load();
    if (!this.#client || !this.#store) {
      return;
    }
    try {
      const result = await this.#client.fetchPolicy({
        id: this.#profileId,
        etag: this.#etag,
      });
      if (result.status === 'modified') {
        const next = parsePolicy(result.raw);
        if (!next || !admitsPolicy(next, this.#policy, this.#floor)) {
          this.#log('PredictNext: venue profile policy refused');
          return;
        }
        const versionChanged =
          next.currentVersion !== this.#policy?.currentVersion;
        this.#policy = next;
        this.#etag = result.etag ?? this.#etag;
        if (versionChanged) {
          await this.#fetchVersion(next.currentVersion);
        }
      } else {
        this.#etag = result.etag ?? this.#etag;
      }
      this.#fetchedAt = this.#now();
      await this.#persist();
    } catch (error) {
      this.#log(
        'PredictNext: venue profile refresh failed',
        error instanceof Error ? error.name : 'unknown',
      );
      return;
    }
    this.#pick();
  }

  /** One refetch after predict-api answered a profile code, then retry. */
  async refreshAfterRefusal(): Promise<void> {
    this.#fetchedAt = undefined;
    await this.refresh();
  }

  /** Test seam: forget in-memory state, keep the persisted cache. */
  reset(): void {
    this.#loading = undefined;
    this.#loaded = false;
    this.#policy = undefined;
    this.#etag = undefined;
    this.#fetchedAt = undefined;
    this.#floor = 0;
    this.#documents = new Map();
    this.#snapshot = undefined;
    this.#persisted = undefined;
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
    for (const [version, raw] of Object.entries(this.#bundledProfiles)) {
      this.#documents.set(Number(version), raw);
    }
    this.#policy = parsePolicy(this.#bundledPolicyRaw);
    this.#persisted = await this.#store?.load();
    const persisted = this.#persisted;
    if (persisted) {
      this.#floor = persisted.floor;
      this.#etag = persisted.policyEtag;
      this.#fetchedAt = persisted.fetchedAt;
      for (const [version, raw] of Object.entries(persisted.profiles)) {
        const numeric = Number(version);
        if (Number.isSafeInteger(numeric) && numeric >= 1) {
          this.#documents.set(numeric, raw);
        }
      }
      if (persisted.policyRaw) {
        const policy = parsePolicy(persisted.policyRaw);
        if (policy && admitsPolicy(policy, this.#policy, this.#floor)) {
          this.#policy = policy;
        }
      }
    }
    this.#loaded = true;
    this.#pick();
  }

  async #fetchVersion(version: number): Promise<void> {
    if (!this.#client || this.#documents.has(version)) {
      return;
    }
    try {
      const raw = await this.#client.fetchProfile({
        id: this.#profileId,
        version,
      });
      const parsed = this.#parse(raw, version);
      if ('reason' in parsed) {
        this.#log('PredictNext: venue profile refused', parsed.reason);
        return;
      }
      this.#documents.set(version, raw);
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
    if (!profile || profile.version !== expectedVersion) {
      return { reason: 'profile_malformed' };
    }
    const ceiling = applyVenueProfileCeiling(profile);
    if (!ceiling.ok) {
      return { reason: 'profile_ceiling' };
    }
    return { profile, raw, sha256: venueProfileSha256(raw) };
  }

  #pick(): VenueProfileSnapshot | undefined {
    const policy = this.#policy;
    if (!policy) {
      if (this.#snapshot) {
        return this.#snapshot;
      }
      this.#log(
        'PredictNext: venue profile policy refused',
        'policy_malformed',
      );
      return undefined;
    }
    if (policy.revokedVersions.includes(policy.currentVersion)) {
      this.#log('PredictNext: venue profile revoked', policy.currentVersion);
    }
    const candidates = [...this.#documents.keys()]
      .filter(
        (version) =>
          version <= policy.currentVersion &&
          version >= this.#floor &&
          !policy.revokedVersions.includes(version),
      )
      .sort((left, right) => right - left);

    for (const version of candidates) {
      const raw = this.#documents.get(version);
      if (raw === undefined) {
        continue;
      }
      const parsed = this.#parse(raw, version);
      if ('reason' in parsed) {
        this.#log('PredictNext: venue profile refused', parsed.reason);
        continue;
      }
      this.#snapshot = {
        profile: parsed.profile,
        version,
        sha256: parsed.sha256,
      };
      this.#raiseFloor(parsed.profile.version);
      return this.#snapshot;
    }
    this.#snapshot = undefined;
    this.#log('PredictNext: venue profile unavailable', policy.currentVersion);
    return undefined;
  }

  #raiseFloor(version: number): void {
    if (version <= this.#floor) {
      return;
    }
    this.#floor = version;
    if (this.#store) {
      void this.#persist();
    }
  }

  async #persist(): Promise<void> {
    if (!this.#store) {
      return;
    }
    const profiles: Record<string, string> = {};
    for (const [version, raw] of this.#documents) {
      profiles[String(version)] = raw;
    }
    await this.#store.save({
      ...(this.#policy ? { policyRaw: JSON.stringify(this.#policy) } : {}),
      ...(this.#etag ? { policyEtag: this.#etag } : {}),
      profiles,
      floor: this.#floor,
      ...(this.#fetchedAt !== undefined ? { fetchedAt: this.#fetchedAt } : {}),
    });
  }
}

/* ------------------------------------------------------------------ */
/* App-wide instance                                                   */
/* ------------------------------------------------------------------ */

const registryUrl = getVenueProfileRegistryUrl();
const environment = getVenueProfileRegistryEnvironment();

const defaultResolver = new VenueProfileResolver({
  client: registryUrl
    ? new RemoteVenueProfileClient({
        baseUrl: registryUrl,
        clientVersion: packageJSON.version,
      })
    : undefined,
  store: environment
    ? new VenueProfileStore({ environment, profileId: VENUE_PROFILE_ID })
    : undefined,
});

let activeResolver = defaultResolver;

/** The resolved profile snapshot, or undefined when nothing is admitted. */
export const resolveVenueProfile = (): Promise<
  VenueProfileSnapshot | undefined
> => activeResolver.resolve();

/** The resolved profile. Callers that need the hash use
 * `resolveVenueProfile()` and pin that object. */
export const loadVenueProfile = async (): Promise<SigningProfile | undefined> =>
  (await activeResolver.resolve())?.profile;

/** Fetches the registry unless the 15-minute cadence says it is not due. */
export const refreshVenueProfile = async (force = false): Promise<void> => {
  if (!force && !activeResolver.isRefreshDue()) {
    return;
  }
  await activeResolver.refresh();
};

/** One refetch after predict-api answers `venue_profile_*`. */
export const refreshVenueProfileAfterRefusal = (): Promise<void> =>
  activeResolver.refreshAfterRefusal();

/** Test seam: forget the memoized snapshot. */
export const resetVenueProfile = (): void => {
  activeResolver.reset();
};

/** Test seam: replace the app-wide resolver. */
export const setVenueProfileResolverForTesting = (
  resolver: VenueProfileResolver | undefined,
): void => {
  activeResolver = resolver ?? defaultResolver;
};
