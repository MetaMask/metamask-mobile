import type {
  HttpRfc9421Payload,
  SigningProfile,
  Source,
} from './signing/profileSchema';
import {
  SUPPORTED_DSL,
  VENUE_PROFILE_ID,
  type VenueIntentName,
} from './venueProfileContract';

const VENUE_ID = 'kalshi';
const API_PREFIX = '/trade-api/';
const ORDER_INVARIANT = 'binary-limit-order-v1';
const KNOWN_INTENTS: readonly VenueIntentName[] = [
  'order.place',
  'account.activate',
  'funding.deposit',
];

const INTENT_PATHS: Readonly<Record<VenueIntentName, string>> = {
  'order.place': '/trade-api/v2/portfolio/events/orders',
  'account.activate': '/trade-api/v2/isv/wallet/register',
  'funding.deposit': '/trade-api/v2/isv/deposit/crypto-addresses',
};
const ORDER_FIELDS = [
  'ticker',
  'client_order_id',
  'side',
  'count',
  'price',
  'time_in_force',
  'self_trade_prevention_type',
  'reduce_only',
];
const ORDER_PARAMS = {
  pricing: 'yes-leg',
  amountInput: 'amountCents',
  contractsInput: 'contracts',
  priceField: 'price',
  countField: 'count',
  reduceOnlyField: 'reduce_only',
  actionInput: 'action',
  outcomeInput: 'outcome',
  minOutcomePriceInput: 'minOutcomePrice',
};

export type VenueProfileCeilingReason =
  | 'wrong_id'
  | 'wrong_venue'
  | 'unsupported_dsl'
  | 'unknown_intent'
  | 'foreign_path'
  | 'missing_order_invariant'
  | 'invalid_payload_contract'
  | 'invalid_body_contract'
  | 'invalid_order_invariant_params'
  | 'invalid_sign_limit'
  | 'invalid_implementation_params';

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

const hasExactKeys = (value: object, keys: readonly string[]): boolean => {
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
};

const matchesRecord = (
  value: unknown,
  expected: Readonly<Record<string, unknown>>,
): boolean =>
  typeof value === 'object' &&
  value !== null &&
  hasExactKeys(value, Object.keys(expected)) &&
  Object.entries(value).every(([key, entry]) => expected[key] === entry);

const isSafeIntegerWithin = (value: number, min: number, max: number): boolean =>
  Number.isSafeInteger(value) && value >= min && value <= max;

const matchesMap = (
  source: Source,
  inputs: readonly string[],
  table: Readonly<Record<string, string | boolean>>,
): boolean => {
  if (!hasExactKeys(source, ['map'])) {
    return false;
  }
  if (!('map' in source)) {
    return false;
  }
  const { map } = source;
  return (
    hasExactKeys(map, ['inputs', 'table']) &&
    map.inputs.length === inputs.length &&
    inputs.every((input, index) => map.inputs[index] === input) &&
    matchesRecord(map.table, table)
  );
};

const hasCanonicalBody = (payload: HttpRfc9421Payload, intent: string): boolean => {
  const fields = payload.body?.json;
  const keys = intent === 'order.place'
    ? ORDER_FIELDS
    : intent === 'account.activate'
      ? ['wallet_address', 'network']
      : ['amount_cents', 'networks'];
  if (!fields || fields.length !== keys.length ||
      !keys.every((key) => fields.some((field) => field.key === key))) {
    return false;
  }
  if (intent !== 'order.place') {
    return fields.every((field) => !('const' in field.value));
  }
  return fields.every(({ key, value }) => {
    if (key === 'time_in_force') {
      return matchesRecord(value, { const: 'immediate_or_cancel' });
    }
    if (key === 'self_trade_prevention_type') {
      return matchesRecord(value, { const: 'taker_at_cross' });
    }
    if ('const' in value) {
      return false;
    }
    if (key === 'side') {
      return matchesMap(value, ['action', 'outcome'], {
        'buy:yes': 'bid', 'buy:no': 'ask', 'sell:yes': 'ask', 'sell:no': 'bid',
      });
    }
    if (key === 'reduce_only') {
      return matchesMap(value, ['action'], { buy: false, sell: true });
    }
    if (key === 'price' || key === 'count') {
      return hasExactKeys(value, ['value', 'shape']) && 'value' in value && value.value === key;
    }
    return true;
  });
};

const hasCanonicalImplementation = (profile: SigningProfile): boolean => {
  const { id, params } = profile.implementation;
  return (
    id === 'device-p256-rfc9421-v1' &&
    hasExactKeys(params, [
      'authority', 'label', 'tag', 'lifetimeSec', 'tokenScheme', 'headers', 'maxSignatures',
    ]) &&
    params.authority === 'demo-api.kalshi.co' &&
    params.label === 'kalshi' &&
    params.tag === 'kalshi-device-request-v1' &&
    params.tokenScheme === 'Kalshi-A2T' &&
    isSafeIntegerWithin(params.lifetimeSec, 1, 60) &&
    isSafeIntegerWithin(params.maxSignatures, 1, 1) &&
    matchesRecord(params.headers, {
      requestId: 'kalshi-device-request-id',
      key: 'kalshi-device-key',
      salt: 'kalshi-device-key-salt',
    })
  );
};

/**
 * Per-venue build ceiling. Unsigned registry profiles may only use the
 * request contracts and signing limits this binary renders and confirms.
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
  for (const intent of profile.intents) {
    const payload = profile.payloads[intent.payloads[0]];
    if (
      intent.payloads.length !== 1 ||
      !isHttpPayload(payload) ||
      payload.method !== 'POST' ||
      payload.path !== INTENT_PATHS[intent.id as VenueIntentName]
    ) {
      return { ok: false, reason: 'invalid_payload_contract' };
    }
    if (!isSafeIntegerWithin(intent.confirm.signLimit, 1, 3)) {
      return { ok: false, reason: 'invalid_sign_limit' };
    }
    if (!hasCanonicalBody(payload, intent.id)) {
      return { ok: false, reason: 'invalid_body_contract' };
    }
    if (intent.id === 'order.place') {
      const invariant = payload.invariants?.[0];
      if (intent.invariant !== ORDER_INVARIANT ||
          invariant?.implementation !== ORDER_INVARIANT) {
        return { ok: false, reason: 'missing_order_invariant' };
      }
      const params = invariant.params;
      if (!params || payload.invariants?.length !== 1 ||
          !hasExactKeys(params, [...Object.keys(ORDER_PARAMS), 'feeCeilingCentsPerContract']) ||
          !Object.entries(ORDER_PARAMS).every(([key, value]) => params[key] === value) ||
          typeof params.feeCeilingCentsPerContract !== 'number' ||
          !isSafeIntegerWithin(params.feeCeilingCentsPerContract, 2, Number.MAX_SAFE_INTEGER)) {
        return { ok: false, reason: 'invalid_order_invariant_params' };
      }
    }
  }
  if (!hasCanonicalImplementation(profile)) {
    return { ok: false, reason: 'invalid_implementation_params' };
  }
  return { ok: true };
};
