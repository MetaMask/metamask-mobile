import { sha256 } from '@noble/hashes/sha2';

/**
 * Direct signer for the Kalshi onboarding routes (no request templates).
 * Each onboarding operation signs its ONE fixed upstream request; the
 * `Venue-Authorization` header keeps the {v:2, signingProfileId, step,
 * credential, values, signatures[]} shape of the first merged envelope
 * generation, with this profile's pinned covered components, header names
 * and signature label.
 */

/** Version of the `Venue-Authorization` envelope. */
export const VENUE_AUTHORIZATION_VERSION = 2;

/** Header that carries the signatures. The same name for every venue. */
export const VENUE_AUTHORIZATION_HEADER = 'Venue-Authorization';

/** What Kalshi demo verifies, even though predict-api sends to
 * `external-api.demo.kalshi.co`. */
const DEMO_AUTHORITY = 'demo-api.kalshi.co';
const SIGNATURE_LABEL = 'kalshi';
const SIGNATURE_TAG = 'kalshi-device-request-v1';
const SIGNATURE_LIFETIME_SEC = 60;
const TOKEN_SCHEME = 'Kalshi-A2T';
/** Signing profile id the onboarding envelope reports. */
export const KALSHI_ONBOARDING_SIGNING_PROFILE_ID = 'kalshi-demo-signing-v1';
const REQUEST_ID_HEADER = 'kalshi-device-request-id';
const KEY_HEADER = 'kalshi-device-key';
const SALT_HEADER = 'kalshi-device-key-salt';

const READ_COMPONENTS = [
  '@method',
  '@authority',
  '@path',
  '@query',
  'authorization',
  REQUEST_ID_HEADER,
  KEY_HEADER,
  SALT_HEADER,
] as const;

const MUTATION_COMPONENTS = [
  ...READ_COMPONENTS,
  'content-digest',
  'content-type',
  'idempotency-key',
] as const;

/** One entry of `signatures` in the `Venue-Authorization` envelope. */
export interface OnboardingDeviceSignature {
  requestId: string;
  signatureInput: string;
  signature: string;
}

/** Phone-owned values for one signing pass. */
export interface OnboardingSigningContext {
  a2t: string;
  /** Device public key, unpadded base64url. */
  deviceKey: string;
  /** Device salt, unpadded base64url. */
  salt: string;
}

export interface OnboardingSignerDependencies {
  sign: (message: Uint8Array) => Promise<Uint8Array>;
  requestId: () => string;
  /** Unix time in seconds. */
  now: () => number;
}

/** `Content-Digest` (RFC 9530) of the exact body bytes, standard base64. */
export const onboardingContentDigest = (body: string): string =>
  `sha-256=:${Buffer.from(sha256(new TextEncoder().encode(body))).toString(
    'base64',
  )}:`;

export interface OnboardingSignedRequest {
  /** The request method. GET signs no body components. */
  method: 'GET' | 'POST';
  /** Upstream request path, starting with `/`. */
  path: string;
  /** Upstream query, without the leading `?`. Empty for none. */
  query: string;
  /** Exact body bytes; the empty string for GET. */
  body: string;
  idempotencyKey?: string;
}

const COMPONENTS_BY_METHOD = {
  GET: READ_COMPONENTS,
  POST: MUTATION_COMPONENTS,
} as const;

export const onboardingSignatureParams = (
  request: OnboardingSignedRequest,
  requestId: string,
  created: number,
): string =>
  `(${COMPONENTS_BY_METHOD[request.method]
    .map((component) => `"${component}"`)
    .join(' ')});created=${created};expires=${
    created + SIGNATURE_LIFETIME_SEC
  };nonce="${requestId}";tag="${SIGNATURE_TAG}"`;

/**
 * RFC 9421 signing base for one fixed onboarding request. The phone builds
 * every line from the request it is about to send, the pinned profile values
 * and its own session. It never signs a base it did not build.
 */
export const onboardingSigningBase = (input: {
  request: OnboardingSignedRequest;
  context: OnboardingSigningContext;
  requestId: string;
  signatureParams: string;
}): string => {
  const { request, context } = input;
  const values = new Map<string, string>([
    ['@method', request.method],
    ['@authority', DEMO_AUTHORITY],
    ['@path', request.path],
    ['@query', `?${request.query}`],
    ['authorization', `${TOKEN_SCHEME} ${context.a2t}`],
    [REQUEST_ID_HEADER, input.requestId],
    [KEY_HEADER, context.deviceKey],
    [SALT_HEADER, context.salt],
    ['content-digest', onboardingContentDigest(request.body)],
    // Onboarding bodies are JSON or empty.
    ['content-type', 'application/json'],
  ]);
  if (request.idempotencyKey !== undefined) {
    values.set('idempotency-key', request.idempotencyKey);
  }
  const lines = COMPONENTS_BY_METHOD[request.method].map((component) => {
    const value = values.get(component);
    if (value === undefined) {
      throw new Error(`no value for ${component}`);
    }
    return `"${component}": ${value}`;
  });
  lines.push(`"@signature-params": ${input.signatureParams}`);
  return lines.join('\n');
};

/** Signs one fixed onboarding request into one envelope entry. */
export const signOnboardingRequest = async (
  request: OnboardingSignedRequest,
  context: OnboardingSigningContext,
  deps: OnboardingSignerDependencies,
): Promise<OnboardingDeviceSignature> => {
  const requestId = deps.requestId();
  const params = onboardingSignatureParams(request, requestId, deps.now());
  const base = onboardingSigningBase({
    request,
    context,
    requestId,
    signatureParams: params,
  });
  const raw = await deps.sign(new TextEncoder().encode(base));
  return {
    requestId,
    signatureInput: `${SIGNATURE_LABEL}=${params}`,
    signature: `${SIGNATURE_LABEL}=:${Buffer.from(raw).toString('base64')}:`,
  };
};

/**
 * `Venue-Authorization` header value: unpadded base64url of the JSON
 * envelope `{ v, signingProfileId, step, credential, values, signatures }`.
 */
export const buildOnboardingVenueAuthorization = (input: {
  step: string;
  context: OnboardingSigningContext;
  values?: Record<string, string | number | boolean>;
  signatures: readonly OnboardingDeviceSignature[];
}): string => {
  const json = JSON.stringify({
    v: VENUE_AUTHORIZATION_VERSION,
    signingProfileId: KALSHI_ONBOARDING_SIGNING_PROFILE_ID,
    step: input.step,
    credential: {
      a2t: input.context.a2t,
      deviceKey: input.context.deviceKey,
      salt: input.context.salt,
    },
    values: input.values ?? {},
    signatures: input.signatures,
  });
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};
