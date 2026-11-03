import fixture from '../../contracts/v1/fixtures/kalshi-signing-v1.json';
import {
  coveredComponents,
  KALSHI_DEMO_SIGNING_PROFILE,
} from '../venueSigningProfiles';
import {
  contentDigest,
  type SigningInstruction,
  type VenueRequest,
} from './venueRequest';
import {
  checkVenueSigningRequest,
  type VenueSigningIntent,
} from './venueSigningPolicy';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';
const AUTHORITY = KALSHI_DEMO_SIGNING_PROFILE.authority;

/** What predict-api's `signingInstruction` sends for one request. */
const instructionFor = (request: VenueRequest): SigningInstruction =>
  request.method === 'GET'
    ? {
        ref: request.ref,
        method: request.method,
        path: request.path,
        query: request.query,
        components: [
          ...coveredComponents(KALSHI_DEMO_SIGNING_PROFILE, request.method),
        ],
      }
    : {
        ref: request.ref,
        method: request.method,
        path: request.path,
        query: request.query,
        body: request.body ?? '',
        idempotencyKey: request.idempotencyKey,
        components: [
          ...coveredComponents(KALSHI_DEMO_SIGNING_PROFILE, request.method),
        ],
        contentDigest: contentDigest(request.body ?? ''),
        contentType: 'application/json',
      };

const fixtureRequest = (name: string): VenueRequest => {
  const entry = fixture.requests.find((row) => row.name === name);
  if (!entry) {
    throw new Error(`no fixture row ${name}`);
  }
  return entry.request as VenueRequest;
};

const check = (intent: VenueSigningIntent, requests: SigningInstruction[]) =>
  checkVenueSigningRequest(KALSHI_DEMO_SIGNING_PROFILE, intent, {
    authority: AUTHORITY,
    requests,
  });

/** The intent the phone holds for each predict-api golden request. */
const FIXTURE_INTENTS: Record<string, VenueSigningIntent> = {
  balance: { operations: ['balance'] },
  'enrollment current': { operations: ['enrollment_current'] },
  'enrollment intent': {
    operations: ['enrollment_intent'],
    idempotencyKey: KEY,
  },
  link: {
    operations: ['link'],
    inputs: { email: 'User+Tag@Example.com' },
    idempotencyKey: KEY,
  },
  'link verify': {
    operations: ['link_verify'],
    inputs: { code: '888888' },
    idempotencyKey: KEY,
  },
  'wallet register': {
    operations: ['wallet_register'],
    inputs: {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'base',
    },
    idempotencyKey: KEY,
  },
};

const link = fixtureRequest('link');
const linkIntent = FIXTURE_INTENTS.link;
const wallet = fixtureRequest('wallet register');
const walletIntent = FIXTURE_INTENTS['wallet register'];

describe('checkVenueSigningRequest', () => {
  it.each(Object.entries(FIXTURE_INTENTS))(
    'accepts predict-api golden request "%s" under the bundled profile',
    (name, intent) => {
      const request = fixtureRequest(name);

      const result = check(intent, [instructionFor(request)]);

      expect(result).toStrictEqual({ ok: true, requests: [request] });
    },
  );

  it('accepts the two status reads in either order', () => {
    const balance = fixtureRequest('balance');
    const current = fixtureRequest('enrollment current');

    const result = check({ operations: ['balance', 'enrollment_current'] }, [
      instructionFor(current),
      instructionFor(balance),
    ]);

    expect(result).toStrictEqual({ ok: true, requests: [current, balance] });
  });

  it('accepts a body whose keys predict-api reordered', () => {
    const body =
      '{"network":"base","wallet_address":"0x1234567890abcdef1234567890abcdef12345678"}';

    const result = check(walletIntent, [instructionFor({ ...wallet, body })]);

    expect(result.ok).toBe(true);
  });

  it.each<[string, Partial<SigningInstruction>, string]>([
    ['another email', { body: '{"email":"other@example.com"}' }, 'body'],
    [
      'an extra field',
      { body: '{"email":"User+Tag@Example.com","x":"1"}' },
      'body',
    ],
    ['a missing field', { body: '{}' }, 'body'],
    ['whitespace', { body: '{"email": "User+Tag@Example.com"}' }, 'body'],
    [
      'a duplicate key',
      { body: '{"email":"other@example.com","email":"User+Tag@Example.com"}' },
      'body',
    ],
    ['a number value', { body: '{"email":1}' }, 'body'],
    ['an array body', { body: '["User+Tag@Example.com"]' }, 'body'],
    ['another path', { path: '/trade-api/v2/isv/users/unlink' }, 'route'],
    ['a GET', { method: 'GET' }, 'route'],
    ['a query', { query: 'x=1' }, 'route'],
    ['another idempotency key', { idempotencyKey: 'other' }, 'idempotency_key'],
    ['a stale digest', { contentDigest: 'sha-256=:AAAA:' }, 'content_digest'],
    ['another content type', { contentType: 'text/plain' }, 'content_type'],
    ['fewer components', { components: ['@method'] }, 'components'],
    ['another ref', { ref: 'wallet_register' }, 'unexpected_request'],
    ['an unknown ref', { ref: 'withdrawal' }, 'unexpected_request'],
    ['an inherited ref', { ref: 'toString' }, 'unexpected_request'],
  ])('refuses %s', (_name, change, rule) => {
    const body = change.body ?? link.body ?? '';
    const instruction: SigningInstruction = {
      ...instructionFor(link),
      contentDigest: contentDigest(body),
      ...change,
    };

    const result = check(linkIntent, [instruction]);

    expect(result).toStrictEqual({ ok: false, rule });
  });

  it('refuses a payout wallet the user did not confirm', () => {
    const body = JSON.stringify({
      wallet_address: '0x000000000000000000000000000000000000dEaD',
      network: 'base',
    });

    const result = check(walletIntent, [instructionFor({ ...wallet, body })]);

    expect(result).toStrictEqual({ ok: false, rule: 'body' });
  });

  it('refuses a body on a read', () => {
    const balance = fixtureRequest('balance');

    const result = check({ operations: ['balance'] }, [
      { ...instructionFor(balance), body: '' },
    ]);

    expect(result).toStrictEqual({ ok: false, rule: 'read_has_body' });
  });

  it('refuses a mutation when the phone chose no idempotency key', () => {
    const result = check({ ...linkIntent, idempotencyKey: undefined }, [
      instructionFor(link),
    ]);

    expect(result).toStrictEqual({ ok: false, rule: 'idempotency_key' });
  });

  it('refuses another authority', () => {
    const result = checkVenueSigningRequest(
      KALSHI_DEMO_SIGNING_PROFILE,
      linkIntent,
      {
        authority: 'external-api.demo.kalshi.co',
        requests: [instructionFor(link)],
      },
    );

    expect(result).toStrictEqual({ ok: false, rule: 'authority' });
  });

  it('refuses more requests than the call allows', () => {
    const result = check(linkIntent, [
      instructionFor(link),
      instructionFor(link),
    ]);

    expect(result).toStrictEqual({ ok: false, rule: 'count' });
  });

  it('refuses the same operation twice', () => {
    const balance = fixtureRequest('balance');

    const result = check({ operations: ['balance', 'enrollment_current'] }, [
      instructionFor(balance),
      instructionFor(balance),
    ]);

    expect(result).toStrictEqual({ ok: false, rule: 'duplicate_request' });
  });

  it('refuses an empty request list', () => {
    expect(check(linkIntent, [])).toStrictEqual({ ok: false, rule: 'count' });
  });

  it('refuses a fixture request the profile does not define', () => {
    const withdrawal = fixtureRequest('withdrawal');

    const result = check(
      { operations: ['order'], idempotencyKey: withdrawal.idempotencyKey },
      [instructionFor(withdrawal)],
    );

    expect(result).toStrictEqual({ ok: false, rule: 'unexpected_request' });
  });
});
