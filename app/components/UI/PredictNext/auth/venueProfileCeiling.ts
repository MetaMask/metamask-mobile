import type {
  HttpRfc9421Payload,
  SigningProfile,
} from './signing/profileSchema';
import {
  SUPPORTED_DSL,
  VENUE_PROFILE_ID,
  type VenueIntentName,
} from './venueProfileContract';

const VENUE_ID = 'kalshi';
const API_PREFIX = '/trade-api/v2/';
const ORDER_INVARIANT = 'binary-limit-order-v1';
const KNOWN_INTENTS: readonly VenueIntentName[] = [
  'order.place',
  'account.activate',
  'funding.deposit',
];

export type VenueProfileCeilingReason =
  | 'wrong_id'
  | 'wrong_venue'
  | 'unsupported_dsl'
  | 'unknown_intent'
  | 'foreign_path'
  | 'missing_order_invariant';

/** A profile is usable only if every rule of this build's ceiling passes. */
export type VenueProfileCeilingResult =
  | { ok: true }
  | { ok: false; reason: VenueProfileCeilingReason };

const isHttpPayload = (payload: unknown): payload is HttpRfc9421Payload =>
  typeof payload === 'object' &&
  payload !== null &&
  (payload as { kind?: unknown }).kind === 'http-rfc9421';

const isWithinApi = (path: string): boolean => path.startsWith(API_PREFIX);

const hasOnlyApiPaths = (profile: SigningProfile): boolean => {
  const payloadPaths = Object.values(profile.payloads)
    .filter(isHttpPayload)
    .map((payload) => payload.path);
  const readPaths = profile.reads.allow.map((read) => read.path);
  return [...payloadPaths, ...readPaths].every(isWithinApi);
};

const carriesOrderInvariant = (profile: SigningProfile): boolean => {
  const order = profile.intents.find((intent) => intent.id === 'order.place');
  if (!order) {
    return true;
  }
  const orderPayloads = order.payloads
    .map((name) => profile.payloads[name])
    .filter(isHttpPayload);
  return (
    orderPayloads.length > 0 &&
    orderPayloads.every((payload) =>
      (payload.invariants ?? []).some(
        (invariant) => invariant.implementation === ORDER_INVARIANT,
      ),
    )
  );
};

/**
 * Per-venue build ceiling. The registry may publish a profile that this
 * binary cannot honor — a newer DSL, an intent it does not implement, a path
 * outside the Kalshi API, or an order payload without the invariant the
 * confirmation sheet depends on. Such a copy is refused, not rendered.
 */
export const applyVenueProfileCeiling = (
  profile: SigningProfile,
): VenueProfileCeilingResult => {
  if (profile.id !== VENUE_PROFILE_ID) {
    return { ok: false, reason: 'wrong_id' };
  }
  if (profile.venue !== VENUE_ID) {
    return { ok: false, reason: 'wrong_venue' };
  }
  if (!(SUPPORTED_DSL as readonly string[]).includes(profile.minDsl)) {
    return { ok: false, reason: 'unsupported_dsl' };
  }
  if (
    profile.intents.some(
      (intent) => !(KNOWN_INTENTS as readonly string[]).includes(intent.id),
    )
  ) {
    return { ok: false, reason: 'unknown_intent' };
  }
  if (!hasOnlyApiPaths(profile)) {
    return { ok: false, reason: 'foreign_path' };
  }
  if (!carriesOrderInvariant(profile)) {
    return { ok: false, reason: 'missing_order_invariant' };
  }
  return { ok: true };
};
