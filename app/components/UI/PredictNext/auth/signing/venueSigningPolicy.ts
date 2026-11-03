import {
  coveredComponents,
  type VenueOperationRule,
  type VenueSigningProfile,
} from '../venueSigningProfiles';
import {
  contentDigest,
  type SignatureRequired,
  type SigningInstruction,
  type VenueRequest,
} from './venueRequest';

/**
 * What the user asked for, from the phone's own state. predict-api's echo
 * of it is never the reference.
 */
export interface VenueSigningIntent {
  /** Profile operations this call may be signed for. */
  readonly operations: readonly string[];
  /** Values the user typed or confirmed. Bound body fields must equal them. */
  readonly inputs?: Readonly<Record<string, string>>;
  /** Chosen by the phone. Every signed mutation must carry it. */
  readonly idempotencyKey?: string;
}

export type VenueSigningPolicyRule =
  | 'authority'
  | 'count'
  | 'unexpected_request'
  | 'duplicate_request'
  | 'route'
  | 'components'
  | 'read_has_body'
  | 'content_type'
  | 'content_digest'
  | 'idempotency_key'
  | 'body';

export type VenueSigningPolicyResult =
  | { ok: true; requests: VenueRequest[] }
  | { ok: false; rule: VenueSigningPolicyRule };

/** The phone refused to sign. Nothing was signed. */
export class VenueSigningPolicyError extends Error {
  readonly rule: VenueSigningPolicyRule;

  constructor(rule: VenueSigningPolicyRule) {
    super(`Venue request was not signed: ${rule}.`);
    this.name = 'VenueSigningPolicyError';
    this.rule = rule;
  }
}

const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

/**
 * The body must be one JSON object, serialized canonically (no whitespace,
 * no duplicate keys), with exactly the bound fields as strings equal to the
 * intent. Key order is predict-api's choice.
 */
const bodyMatches = (
  body: string,
  rule: Extract<VenueOperationRule, { class: 'mutation' }>,
  inputs: Readonly<Record<string, string>>,
): boolean => {
  if (rule.body === 'empty') {
    return body === '';
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    JSON.stringify(parsed) !== body
  ) {
    return false;
  }
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).length !== rule.body.length) {
    return false;
  }
  return rule.body.every(({ field, input }) => {
    const expected = inputs[input];
    return (
      Object.prototype.hasOwnProperty.call(record, field) &&
      typeof expected === 'string' &&
      record[field] === expected
    );
  });
};

const checkInstruction = (
  profile: VenueSigningProfile,
  intent: VenueSigningIntent,
  instruction: SigningInstruction,
  rule: VenueOperationRule,
): VenueSigningPolicyRule | undefined => {
  if (
    instruction.method !== rule.method ||
    instruction.path !== rule.path ||
    instruction.query !== ''
  ) {
    return 'route';
  }
  if (
    !sameList(
      instruction.components,
      coveredComponents(profile, instruction.method),
    )
  ) {
    return 'components';
  }
  if (rule.class === 'read') {
    return instruction.body !== undefined ||
      instruction.idempotencyKey !== undefined ||
      instruction.contentDigest !== undefined ||
      instruction.contentType !== undefined
      ? 'read_has_body'
      : undefined;
  }
  if (instruction.contentType !== 'application/json') {
    return 'content_type';
  }
  if (
    intent.idempotencyKey === undefined ||
    instruction.idempotencyKey !== intent.idempotencyKey
  ) {
    return 'idempotency_key';
  }
  const body = instruction.body ?? '';
  if (instruction.contentDigest !== contentDigest(body)) {
    return 'content_digest';
  }
  return bodyMatches(body, rule, intent.inputs ?? {}) ? undefined : 'body';
};

/**
 * L1 and L2 checks of ADR-0003 on a 428. Accepts it only when every request
 * is an operation this call allows, on the pinned route, with a body that
 * carries exactly the user's inputs. On success it returns the requests to
 * sign. Authority, lifetime and covered components still come from the
 * profile when signing.
 */
export const checkVenueSigningRequest = (
  profile: VenueSigningProfile,
  intent: VenueSigningIntent,
  required: SignatureRequired,
): VenueSigningPolicyResult => {
  if (required.authority !== profile.authority) {
    return { ok: false, rule: 'authority' };
  }
  if (
    required.requests.length === 0 ||
    required.requests.length > intent.operations.length
  ) {
    return { ok: false, rule: 'count' };
  }

  const seen = new Set<string>();
  const requests: VenueRequest[] = [];
  for (const instruction of required.requests) {
    const rule = Object.prototype.hasOwnProperty.call(
      profile.operations,
      instruction.ref,
    )
      ? profile.operations[instruction.ref]
      : undefined;
    if (!rule || !intent.operations.includes(instruction.ref)) {
      return { ok: false, rule: 'unexpected_request' };
    }
    if (seen.has(instruction.ref)) {
      return { ok: false, rule: 'duplicate_request' };
    }
    const failed = checkInstruction(profile, intent, instruction, rule);
    if (failed) {
      return { ok: false, rule: failed };
    }
    seen.add(instruction.ref);
    requests.push({
      ref: instruction.ref,
      method: instruction.method,
      path: instruction.path,
      query: instruction.query,
      ...(rule.class === 'mutation'
        ? {
            body: instruction.body ?? '',
            idempotencyKey: instruction.idempotencyKey,
          }
        : {}),
    });
  }

  return { ok: true, requests };
};
