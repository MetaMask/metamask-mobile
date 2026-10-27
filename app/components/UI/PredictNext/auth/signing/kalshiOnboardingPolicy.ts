import {
  coveredComponents,
  kalshiContentDigest,
  type SignatureRequired,
  type SigningInstruction,
  type VenueRequest,
} from './venueRequest';

export type OnboardingPolicyRule =
  | 'authority'
  | 'count'
  | 'unexpected_request'
  | 'duplicate_request'
  | 'components'
  | 'read_has_body'
  | 'content_type'
  | 'content_digest';

export type OnboardingPolicyResult =
  | { ok: true; requests: VenueRequest[] }
  | { ok: false; rule: OnboardingPolicyRule };

const sameList = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

const matchesExpected = (
  instruction: SigningInstruction,
  expected: VenueRequest,
): boolean =>
  instruction.ref === expected.ref &&
  instruction.method === expected.method &&
  instruction.path === expected.path &&
  instruction.query === expected.query &&
  instruction.body === expected.body &&
  instruction.idempotencyKey === expected.idempotencyKey;

const checkInstructionShape = (
  instruction: SigningInstruction,
  expected: VenueRequest,
): OnboardingPolicyRule | undefined => {
  if (!sameList(instruction.components, coveredComponents(expected))) {
    return 'components';
  }
  if (expected.method === 'GET') {
    return instruction.contentDigest !== undefined ||
      instruction.contentType !== undefined
      ? 'read_has_body'
      : undefined;
  }
  if (instruction.contentType !== 'application/json') {
    return 'content_type';
  }
  if (instruction.contentDigest !== kalshiContentDigest(expected.body ?? '')) {
    return 'content_digest';
  }
  return undefined;
};

/**
 * Accepts a 428 only when every requested call equals one the phone built
 * itself from what the user typed or confirmed. On success it returns the
 * phone's own requests, so the signer never reads server-supplied bytes.
 */
export const checkOnboardingSigningRequest = (
  required: SignatureRequired,
  expected: readonly VenueRequest[],
  authority: string,
): OnboardingPolicyResult => {
  if (required.authority !== authority) {
    return { ok: false, rule: 'authority' };
  }
  if (
    required.requests.length === 0 ||
    required.requests.length > expected.length
  ) {
    return { ok: false, rule: 'count' };
  }

  const matched = new Set<VenueRequest>();
  for (const instruction of required.requests) {
    const candidate = expected.find((request) =>
      matchesExpected(instruction, request),
    );
    if (!candidate) {
      return { ok: false, rule: 'unexpected_request' };
    }
    if (matched.has(candidate)) {
      return { ok: false, rule: 'duplicate_request' };
    }
    const rule = checkInstructionShape(instruction, candidate);
    if (rule) {
      return { ok: false, rule };
    }
    matched.add(candidate);
  }

  return { ok: true, requests: [...matched] };
};
