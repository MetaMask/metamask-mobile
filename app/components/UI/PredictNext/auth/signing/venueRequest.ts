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

/**
 * One venue call as predict-api will send it, after the signing policy
 * accepted it. `ref` names the profile operation. `query` is the raw query
 * with no leading `?`. `body` is the exact POST bytes.
 */
export interface VenueRequest {
  ref: string;
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

/** `Content-Digest` (RFC 9530) of the exact body bytes, standard base64. */
export const contentDigest = (body: string): string =>
  `sha-256=:${Buffer.from(sha256(new TextEncoder().encode(body))).toString(
    'base64',
  )}:`;
