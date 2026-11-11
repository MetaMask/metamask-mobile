/**
 * The signed venue profile document and its loader (ADR-0004).
 *
 * The app ships a signed document — `{payload, signature, keyId}` where the
 * payload is base64 JSON of a `SigningProfile` — bundled with the public keys
 * that verify it. The loader verifies the ES256 signature over the exact
 * payload STRING before decoding it, enforces the version floor and the DSL
 * capability, then exposes the profile's intents and payloads. This is the
 * mobile counterpart of predict-api's `venue-profile/` module; both sides
 * verify the same document. Remote delivery (mm-config-registry) is a later
 * phase and swaps the SOURCE, not this verifier.
 *
 * The demo trading profile is temporary (demo-only), like the onboarding
 * demo it complements: a future Universal KYC flow replaces both.
 */

import { p256 } from '@noble/curves/nist';
import { sha256 } from '@noble/hashes/sha2';

import profileDocument from './venue-profiles/kalshi-trading-1.json';
import type {
  BodyField,
  HttpRfc9421Payload,
  Intent,
  ReadPattern,
  Shape,
  SigningProfile,
  Source,
  Transform,
} from './signing/profileSchema';

export type {
  BodyField,
  HttpRfc9421Payload,
  Intent,
  ReadPattern,
  Shape,
  SigningProfile,
  Source,
  Transform,
};

/** The payload kinds the DSL renders. Only `http-rfc9421` renders today. */
export type RenderedPayloadKind = 'http-rfc9421';

/** The one trading intent set this build's profiles can declare. */
export type VenueIntentName = 'order.place' | 'account.activate';

/** Public keys that verify profile documents, PEM SPKI, as shipped. */
export interface ProfileKeys {
  readonly primary: string | undefined;
  readonly backup: string | undefined;
}

/** Where a profile document comes from. Remote sources slot in later. */
export interface ProfileSource {
  /** The raw document bytes as a string. */
  load(): Promise<string>;
}

/** The bundled copy of the document, imported at build time. */
export class BundledProfileSource implements ProfileSource {
  async load(): Promise<string> {
    return JSON.stringify(profileDocument);
  }
}

/** Verifies the bundled document and caches the parsed profile. */
export class BundledSigningProfile {
  readonly #source: ProfileSource;
  readonly #keys: ProfileKeys;
  readonly #minDslSupported: readonly string[];
  #cached: SigningProfile | undefined;
  #loading: Promise<SigningProfile> | undefined;

  constructor(options: {
    source: ProfileSource;
    keys: ProfileKeys;
    minDslSupported: readonly string[];
  }) {
    this.#source = options.source;
    this.#keys = options.keys;
    this.#minDslSupported = options.minDslSupported;
  }

  /**
   * The verified profile. Returns undefined when the document cannot be
   * verified (network sources may fail; the bundled one cannot in practice).
   * Callers treat an undefined profile as "signing unavailable".
   */
  async load(): Promise<SigningProfile | undefined> {
    this.#loading ??= this.#loadOnce().catch((error: unknown) => {
      this.#loading = undefined;
      throw error;
    });
    try {
      return await this.#loading;
    } catch {
      return undefined;
    }
  }

  /** Test seam: forget the memoized profile. */
  reset(): void {
    this.#cached = undefined;
    this.#loading = undefined;
  }

  async #loadOnce(): Promise<SigningProfile> {
    if (this.#cached) {
      return this.#cached;
    }
    const raw = await this.#source.load();
    const profile = await verifyProfileDocument({
      raw,
      keys: this.#keys,
      // The bundled document is the floor: no earlier version can follow.
      lastAcceptedVersion: 0,
      minDslSupported: this.#minDslSupported,
    });
    this.#cached = profile;
    return profile;
  }
}

/** The keys shipped with this build. Dev keys for the phase-1 demo. */
export const BUNDLED_PROFILE_PUBLIC_KEYS: ProfileKeys = {
  primary: `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEMjz9jplo7IU30Qi83rW74OK5NEsX
hnXINnuhOUW5u5+E/TxgbFa0ZGn/nhfVEJAlLK+XirT+Pmk6O5PWKcY/gQ==
-----END PUBLIC KEY-----`,
  backup: undefined,
};

export const SUPPORTED_DSL = ['dsl-1'] as const;

/** The one bundled profile. Remote sources replace the SOURCE, not this. */
export const bundledSigningProfile = new BundledSigningProfile({
  source: new BundledProfileSource(),
  keys: BUNDLED_PROFILE_PUBLIC_KEYS,
  minDslSupported: SUPPORTED_DSL,
});

/** Loads the bundled trading profile, verifying it on first use. */
export const loadVenueProfile = (): Promise<SigningProfile | undefined> =>
  bundledSigningProfile.load();

/** Test seam: forget the memoized profile. */
export const resetVenueProfile = (): void => {
  bundledSigningProfile.reset();
};

/**
 * The `Venue-Authorization` header name. Onboarding uses the same header
 * name with its own (temporary, demo-only) envelope version.
 */
export const VENUE_AUTHORIZATION_HEADER = 'Venue-Authorization';

/** Header naming the venue GET a signed read covers: `<path>` or
 * `<path>?<query>`, exactly the signed `@path` and `@query` bytes. */
export const VENUE_READ_HEADER = 'venue-read';

/** The longest raw query the phone signs. predict-api proposes nothing
 * longer. */
export const MAX_READ_QUERY_LENGTH = 2048;

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
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${source}$`, 'u');
}

/* ------------------------------------------------------------------ */
/* Document verification                                               */
/* ------------------------------------------------------------------ */

export const VENUE_PROFILE_DOCUMENT_MAX_BYTES = 64 * 1024;

export type ProfileDocumentError =
  | 'profile_document_malformed'
  | 'profile_document_bad_signature'
  | 'profile_document_unknown_key'
  | 'profile_document_invalid_payload'
  | 'profile_document_low_version';

export class ProfileDocumentValidationError extends Error {
  readonly code: ProfileDocumentError;

  constructor(code: ProfileDocumentError, detail?: string) {
    super(`Profile document rejected (${code})${detail ? `: ${detail}` : ''}.`);
    this.name = 'ProfileDocumentValidationError';
    this.code = code;
  }
}

interface ProfileDocument {
  payload: string;
  signature: string;
  keyId: string;
}

const parseDocument = (raw: string): ProfileDocument => {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ProfileDocumentValidationError(
      'profile_document_malformed',
      'not JSON',
    );
  }
  if (typeof json !== 'object' || json === null) {
    throw new ProfileDocumentValidationError('profile_document_malformed');
  }
  const record = json as Record<string, unknown>;
  const payload = record.payload;
  const signature = record.signature;
  const keyId = record.keyId;
  if (
    typeof payload !== 'string' ||
    payload.length === 0 ||
    typeof signature !== 'string' ||
    signature.length === 0 ||
    (keyId !== 'primary' && keyId !== 'backup')
  ) {
    throw new ProfileDocumentValidationError(
      'profile_document_malformed',
      'envelope fields missing',
    );
  }
  return { payload, signature, keyId };
};

/** Standard base64 → bytes. */
const fromBase64 = (value: string): Uint8Array => {
  const binary = Buffer.from(value, 'base64');
  return new Uint8Array(binary);
};

/**
 * PEM SPKI P-256 → the raw uncompressed point (0x04 ‖ X ‖ Y, 65 bytes).
 * Deterministic for P-256 SPKI: the point starts at a fixed DER offset.
 */
const pemToRawPoint = (pem: string): Uint8Array => {
  const body = pem
    .split('\n')
    .filter((line) => !line.includes('-----'))
    .join('');
  const der = fromBase64(body);
  // RFC 5480 SPKI for P-256: 23 bytes of algorithm identifier, the 0x03
  // BIT STRING tag, its 0x42 length, one unused-bit count byte, then the
  // 65-byte 0x04-uncompressed point (0x04 marker first). `POINT_START` is
  // the marker's own byte, where the returned point begins.
  const POINT_START = 26;
  if (
    der.length !== POINT_START + 65 ||
    der[POINT_START] !== 0x04 ||
    der[POINT_START - 1] !== 0x00 ||
    der[POINT_START - 2] !== 0x42 ||
    der[POINT_START - 3] !== 0x03 // BIT STRING tag
  ) {
    throw new ProfileDocumentValidationError(
      'profile_document_unknown_key',
      'not a P-256 SPKI point',
    );
  }
  return der.slice(POINT_START, POINT_START + 65);
};

const verifyDocumentSignature = (
  document: ProfileDocument,
  keys: ProfileKeys,
): void => {
  if (document.payload.length > VENUE_PROFILE_DOCUMENT_MAX_BYTES) {
    throw new ProfileDocumentValidationError(
      'profile_document_malformed',
      'payload too large',
    );
  }
  let rawSignature: Uint8Array;
  try {
    rawSignature = fromBase64(document.signature);
  } catch {
    throw new ProfileDocumentValidationError(
      'profile_document_bad_signature',
      'signature must be standard base64',
    );
  }
  if (rawSignature.length !== 64) {
    throw new ProfileDocumentValidationError(
      'profile_document_bad_signature',
      'signature must be 64 bytes raw r||s, standard base64',
    );
  }
  const payloadBytes = new TextEncoder().encode(document.payload);
  const digest = sha256(payloadBytes);
  const pem = document.keyId === 'primary' ? keys.primary : keys.backup;
  if (!pem) {
    throw new ProfileDocumentValidationError('profile_document_unknown_key');
  }
  let point: Uint8Array;
  try {
    point = pemToRawPoint(pem);
  } catch (error) {
    if (error instanceof ProfileDocumentValidationError) {
      throw error;
    }
    throw new ProfileDocumentValidationError('profile_document_unknown_key');
  }
  const r = rawSignature.slice(0, 32);
  const s = rawSignature.slice(32, 64);
  // Signers in the wild emit high-s; ECDSA accepts both (n - s just flips
  // the recovery y), and low-s is the wire norm. Normalize before verify.
  const toBig = (u: Uint8Array): bigint => {
    let hex = '';
    for (const byte of u) {
      hex += byte.toString(16).padStart(2, '0');
    }
    return BigInt(`0x${hex}`);
  };
  const signature = new p256.Signature(toBig(r), toBig(s));
  let ok: boolean;
  try {
    ok = p256.verify(
      signature.normalizeS().toCompactRawBytes(),
      digest,
      point,
      { lowS: true },
    );
  } catch {
    ok = false;
  }
  if (!ok) {
    throw new ProfileDocumentValidationError('profile_document_bad_signature');
  }
};

/**
 * Verifies the document and returns the profile. `lastAcceptedVersion`
 * enforces monotonicity (a remote profile may not roll back); the bundled
 * copy loads with 0.
 */
export async function verifyProfileDocument(input: {
  raw: string;
  keys: ProfileKeys;
  lastAcceptedVersion: number;
  minDslSupported: readonly string[];
}): Promise<SigningProfile> {
  const document = parseDocument(input.raw);
  verifyDocumentSignature(document, input.keys);
  let profileJson: unknown;
  try {
    profileJson = JSON.parse(
      Buffer.from(document.payload, 'base64').toString('utf8'),
    );
  } catch {
    throw new ProfileDocumentValidationError(
      'profile_document_invalid_payload',
      'payload is not base64 JSON',
    );
  }
  const parsed = validateSigningProfile(profileJson);
  if (!parsed) {
    throw new ProfileDocumentValidationError(
      'profile_document_invalid_payload',
    );
  }
  if (parsed.version < input.lastAcceptedVersion) {
    throw new ProfileDocumentValidationError(
      'profile_document_low_version',
      `version ${parsed.version} < accepted ${input.lastAcceptedVersion}`,
    );
  }
  if (!input.minDslSupported.includes(parsed.minDsl)) {
    throw new ProfileDocumentValidationError(
      'profile_document_invalid_payload',
      `minDsl ${parsed.minDsl} exceeds app capability`,
    );
  }
  return parsed;
}

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
        (entry): entry is string => typeof entry === 'string',
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
const KNOWN_INVARIANTS: readonly string[] = ['binary-limit-order-v1'];

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
          KNOWN_INVARIANTS.includes(entry.implementation) &&
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

function validateSigningProfile(value: unknown): SigningProfile | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const id = value.id;
  const version = value.version;
  const minDsl = value.minDsl;
  const venue = value.venue;
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
  // Intents: id, payloads (non-empty names), per-intent confirm.
  if (!Array.isArray(value.intents) || value.intents.length === 0) {
    return undefined;
  }
  for (const intent of value.intents) {
    if (
      !isRecord(intent) ||
      typeof intent.id !== 'string' ||
      intent.id.length === 0 ||
      !Array.isArray(intent.payloads) ||
      intent.payloads.length === 0 ||
      !intent.payloads.every(
        (name: unknown): name is string =>
          typeof name === 'string' && name.length > 0,
      ) ||
      !isRecord(intent.confirm) ||
      intent.confirm.kind !== 'per-intent' ||
      typeof intent.confirm.signLimit !== 'number' ||
      !Number.isSafeInteger(intent.confirm.signLimit) ||
      intent.confirm.signLimit < 1 ||
      (intent.invariant !== undefined &&
        !KNOWN_INVARIANTS.includes(intent.invariant as string))
    ) {
      return undefined;
    }
  }
  // Payloads: every named one present and valid.
  if (!isRecord(value.payloads)) {
    return undefined;
  }
  const named = value.intents.flatMap(
    (intent) => (intent as { payloads: string[] }).payloads,
  );
  for (const name of named) {
    if (!validatePayload(value.payloads[name])) {
      return undefined;
    }
  }
  // Reads: allow patterns and a path-length ceiling. Required: every
  // signer needs them.
  {
    if (!isRecord(value.reads) || !Array.isArray(value.reads.allow)) {
      return undefined;
    }
    for (const entry of value.reads.allow) {
      if (
        !isRecord(entry) ||
        entry.method !== 'GET' ||
        typeof entry.path !== 'string' ||
        !PATH_PATTERN.test(entry.path)
      ) {
        return undefined;
      }
    }
    if (
      typeof value.reads.maxPathLength !== 'number' ||
      value.reads.maxPathLength < 1
    ) {
      return undefined;
    }
  }
  // Implementation: the RFC 9421 parameters this build signs under.
  // Required: signing is impossible without it.
  {
    const impl = value.implementation;
    if (!isRecord(impl) || impl.id !== 'device-p256-rfc9421-v1') {
      return undefined;
    }
    const params = impl.params;
    if (
      !isRecord(params) ||
      typeof params.authority !== 'string' ||
      typeof params.label !== 'string' ||
      typeof params.tag !== 'string' ||
      typeof params.lifetimeSec !== 'number' ||
      typeof params.tokenScheme !== 'string' ||
      !isRecord(params.headers) ||
      typeof params.headers.requestId !== 'string' ||
      typeof params.headers.key !== 'string' ||
      typeof params.headers.salt !== 'string' ||
      typeof params.maxSignatures !== 'number'
    ) {
      return undefined;
    }
  }
  return value as unknown as SigningProfile;
}
