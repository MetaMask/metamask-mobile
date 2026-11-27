import {
  TEST_VENUE_PROFILE_RAW,
  TEST_VENUE_REVOKED_RAW,
} from '../../../../../tests/fixtures/predict/venueProfiles';
import {
  readAllowed,
  validateSigningProfile,
  venueProfileSha256,
  type SigningProfile,
} from './venueSigningProfiles';

const fixture = validateSigningProfile(JSON.parse(TEST_VENUE_PROFILE_RAW));
if (!fixture) {
  throw new Error('Signing profile fixture is invalid');
}
const profile: SigningProfile = {
  ...fixture,
  reads: {
    ...fixture.reads,
    allow: [
      { method: 'GET', path: '/trade-api/v2/portfolio/orders/{orderId}' },
    ],
  },
};

describe('profile fixture bytes', () => {
  it('hashes the exact profile and revocation bytes', () => {
    expect(venueProfileSha256(TEST_VENUE_PROFILE_RAW)).toBe(
      'aCy-mcVXsZiOK5q4dei4zgDi3j3asmeGF206uKL6D9A',
    );
    expect(venueProfileSha256(TEST_VENUE_REVOKED_RAW)).toBe(
      '4EweD2YzjdLeiNZKXkRRvUiMNdkJZNVzQFRdBEiQHrs',
    );
  });
});

describe('validateSigningProfile', () => {
  const document = () => JSON.parse(TEST_VENUE_PROFILE_RAW);

  it('accepts the profile fixture', () => {
    expect(validateSigningProfile(document())).toBeDefined();
  });

  it.each([
    ['unknown shape', { kind: 'unknown' }],
    ['opaque without positive length', { kind: 'opaque', maxLength: 0 }],
    ['decimal without positive scale', { kind: 'decimal', scale: 0 }],
    ['int with non-numeric minimum', { kind: 'int', min: '1' }],
    ['oneOf with object value', { kind: 'oneOf', values: [{}] }],
    [
      'time with unknown unit',
      { kind: 'time', unit: 'days', maxAgeSec: 1, maxAheadSec: 1 },
    ],
    [
      'array with malformed nested shape',
      { kind: 'array', of: { kind: 'opaque', maxLength: 0 }, maxItems: 1 },
    ],
  ])('rejects %s', (_name, shape) => {
    const value = document();
    value.payloads.create_order.body.json[0].value.shape = shape;
    expect(validateSigningProfile(value)).toBeUndefined();
  });

  it.each([
    ['empty input', { input: '' }],
    ['unknown transform', { input: 'marketId', transform: 'unknown' }],
    ['object constant', { const: {} }],
    ['empty map inputs', { map: { inputs: [], table: {} } }],
    [
      'non-scalar map entry',
      { map: { inputs: ['action'], table: { buy: {} } } },
    ],
    ['empty value reference', { value: '' }],
  ])('rejects source with %s', (_name, source) => {
    const value = document();
    value.payloads.create_order.body.json[0].value = source;
    expect(validateSigningProfile(value)).toBeUndefined();
  });

  it.each([
    ['unknown method', { method: 'DELETE' }],
    ['unsafe path', { path: '/trade-api/v2/orders?bad=1' }],
    ['malformed path parameter', { pathParams: { order: { input: '' } } }],
    ['malformed query source', { query: [{ key: 'cursor', value: {} }] }],
    ['empty body fields', { body: { json: [], maxBytes: 100 } }],
    ['invalid idempotency key', { idempotencyKey: {} }],
    ['unknown invariant', { invariants: [{ implementation: 'unknown' }] }],
    [
      'malformed invariant parameters',
      { invariants: [{ implementation: 'binary-limit-order-v1', params: [] }] },
    ],
  ])('rejects payload with %s', (_name, patch) => {
    const value = document();
    Object.assign(value.payloads.create_order, patch);
    expect(validateSigningProfile(value)).toBeUndefined();
  });

  it('rejects an unknown intent invariant', () => {
    const value = document();
    value.intents[0].invariant = 'unknown';
    expect(validateSigningProfile(value)).toBeUndefined();
  });
});

describe('readAllowed path normalization', () => {
  it.each([
    '.',
    '..',
    '%2e',
    '%2E%2e',
    '.%2e',
    '%2e.',
    'order%2fother',
    'order%5Cother',
    '%252e%252e',
    'order%252fother',
    'order%3fother',
    'order%23other',
    'order%0aother',
    'order%ZZ',
  ])('rejects a segment that can change path interpretation: %s', (segment) => {
    const proposed = {
      method: 'GET',
      path: `/trade-api/v2/portfolio/orders/${segment}`,
      query: '',
    };

    const allowed = readAllowed(profile, proposed);

    expect(allowed).toBe(false);
  });

  it.each(['order-1', 'order%2D1', 'order%2E1'])(
    'allows an ordinary identifier: %s',
    (segment) => {
      const proposed = {
        method: 'GET',
        path: `/trade-api/v2/portfolio/orders/${segment}`,
        query: 'cursor=next%2Fpage',
      };

      const allowed = readAllowed(profile, proposed);

      expect(allowed).toBe(true);
    },
  );
});
