import { sha256 } from '@noble/hashes/sha2';
import {
  array,
  enums,
  is,
  literal,
  object,
  optional,
  string,
  type,
  type Infer,
} from '@metamask/superstruct';

/** Covered components of a signed read, in signature order. */
export const READ_COMPONENTS = [
  '@method',
  '@authority',
  '@path',
  '@query',
  'authorization',
  'kalshi-device-request-id',
  'kalshi-device-key',
  'kalshi-device-key-salt',
] as const;

/** Covered components of a signed mutation: the read list, then the body. */
export const MUTATION_COMPONENTS = [
  ...READ_COMPONENTS,
  'content-digest',
  'content-type',
  'idempotency-key',
] as const;

export const VENUE_REQUEST_REFS = [
  'balance',
  'enrollment_current',
  'enrollment_intent',
  'link',
  'link_verify',
  'wallet_register',
] as const;

export type VenueRequestRef = (typeof VENUE_REQUEST_REFS)[number];

/**
 * One Kalshi call, built on the phone from its own inputs. `query` is the
 * raw query with no leading `?`. `body` is the exact POST bytes.
 */
export interface VenueRequest {
  ref: VenueRequestRef;
  method: 'GET' | 'POST';
  path: string;
  query: string;
  body?: string;
  idempotencyKey?: string;
}

const SigningInstructionStruct = object({
  ref: string(),
  method: enums(['GET', 'POST']),
  path: string(),
  query: string(),
  body: optional(string()),
  idempotencyKey: optional(string()),
  components: array(string()),
  contentDigest: optional(string()),
  contentType: optional(string()),
});

/** One entry of `requests` in a `428 venue_signature_required` body. */
export type SigningInstruction = Infer<typeof SigningInstructionStruct>;

const SignatureRequiredStruct = type({
  code: literal('venue_signature_required'),
  authority: string(),
  requests: array(SigningInstructionStruct),
});

export interface SignatureRequired {
  authority: string;
  requests: SigningInstruction[];
}

/** Parses a 428 body. Returns undefined for anything else. */
export const parseSignatureRequired = (
  value: unknown,
): SignatureRequired | undefined => {
  if (!is(value, SignatureRequiredStruct)) {
    return undefined;
  }
  return { authority: value.authority, requests: value.requests };
};

/** `Content-Digest` of the exact body bytes, standard base64. */
export const kalshiContentDigest = (body: string): string =>
  `sha-256=:${Buffer.from(sha256(new TextEncoder().encode(body))).toString(
    'base64',
  )}:`;

export const coveredComponents = (
  request: Pick<VenueRequest, 'method'>,
): readonly string[] =>
  request.method === 'GET' ? READ_COMPONENTS : MUTATION_COMPONENTS;
