import { KALSHI_DEMO_AUTHORITY } from '../kalshiAuthority';
import { checkOnboardingSigningRequest } from './kalshiOnboardingPolicy';
import {
  balanceRequest,
  enrollmentCurrentRequest,
  linkRequest,
  walletRegisterRequest,
} from './kalshiOnboardingTemplates';
import {
  coveredComponents,
  kalshiContentDigest,
  type SigningInstruction,
  type VenueRequest,
} from './venueRequest';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';

/** The instruction predict-api sends for a request (its `signingInstruction`). */
const instructionFor = (request: VenueRequest): SigningInstruction =>
  request.method === 'GET'
    ? {
        ref: request.ref,
        method: request.method,
        path: request.path,
        query: request.query,
        components: [...coveredComponents(request)],
      }
    : {
        ref: request.ref,
        method: request.method,
        path: request.path,
        query: request.query,
        body: request.body ?? '',
        idempotencyKey: request.idempotencyKey,
        components: [...coveredComponents(request)],
        contentDigest: kalshiContentDigest(request.body ?? ''),
        contentType: 'application/json',
      };

const link = linkRequest('user@example.com', KEY);
const wallet = walletRegisterRequest({
  walletAddress: '0x1234567890AbcdEF1234567890aBcdef12345678',
  network: 'base',
  idempotencyKey: KEY,
});

describe('checkOnboardingSigningRequest', () => {
  it('accepts the exact call and returns the phone-built request', () => {
    const result = checkOnboardingSigningRequest(
      { authority: KALSHI_DEMO_AUTHORITY, requests: [instructionFor(link)] },
      [link],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: true, requests: [link] });
  });

  it('accepts the two status reads in either order', () => {
    const expected = [balanceRequest(), enrollmentCurrentRequest()];

    const result = checkOnboardingSigningRequest(
      {
        authority: KALSHI_DEMO_AUTHORITY,
        requests: [...expected].reverse().map(instructionFor),
      },
      expected,
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result.ok).toBe(true);
  });

  it.each<[string, Partial<SigningInstruction>, string]>([
    [
      'another email',
      { body: '{"email":"other@example.com"}' },
      'unexpected_request',
    ],
    [
      'a reordered body',
      { body: '{"network":"base","wallet_address":"0x"}' },
      'unexpected_request',
    ],
    [
      'whitespace in the body',
      { body: '{"email": "user@example.com"}' },
      'unexpected_request',
    ],
    [
      'another idempotency key',
      { idempotencyKey: 'b1b2c3d4-1111-4222-8333-444455556666' },
      'unexpected_request',
    ],
    [
      'another path',
      { path: '/trade-api/v2/portfolio/withdrawals' },
      'unexpected_request',
    ],
    ['a query', { query: 'x=1' }, 'unexpected_request'],
    ['another ref', { ref: 'link_verify' }, 'unexpected_request'],
    [
      'reordered components',
      { components: [...coveredComponents(link)].reverse() },
      'components',
    ],
    [
      'a read component list',
      { components: [...coveredComponents(balanceRequest())] },
      'components',
    ],
    ['another content type', { contentType: 'text/plain' }, 'content_type'],
    [
      'another digest',
      { contentDigest: kalshiContentDigest('{}') },
      'content_digest',
    ],
  ])('refuses %s', (_name, change, rule) => {
    const result = checkOnboardingSigningRequest(
      {
        authority: KALSHI_DEMO_AUTHORITY,
        requests: [{ ...instructionFor(link), ...change }],
      },
      [link],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule });
  });

  it('refuses another wallet', () => {
    const other = walletRegisterRequest({
      walletAddress: '0x0000000000000000000000000000000000000001',
      network: 'base',
      idempotencyKey: KEY,
    });

    const result = checkOnboardingSigningRequest(
      { authority: KALSHI_DEMO_AUTHORITY, requests: [instructionFor(other)] },
      [wallet],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule: 'unexpected_request' });
  });

  it('refuses another authority', () => {
    const result = checkOnboardingSigningRequest(
      {
        authority: 'external-api.demo.kalshi.co',
        requests: [instructionFor(link)],
      },
      [link],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule: 'authority' });
  });

  it('refuses more calls than the phone built', () => {
    const result = checkOnboardingSigningRequest(
      {
        authority: KALSHI_DEMO_AUTHORITY,
        requests: [instructionFor(link), instructionFor(link)],
      },
      [link],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule: 'count' });
  });

  it('refuses the same call twice', () => {
    const expected = [balanceRequest(), enrollmentCurrentRequest()];

    const result = checkOnboardingSigningRequest(
      {
        authority: KALSHI_DEMO_AUTHORITY,
        requests: [
          instructionFor(balanceRequest()),
          instructionFor(balanceRequest()),
        ],
      },
      expected,
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule: 'duplicate_request' });
  });

  it('refuses a read that carries a digest', () => {
    const result = checkOnboardingSigningRequest(
      {
        authority: KALSHI_DEMO_AUTHORITY,
        requests: [
          {
            ...instructionFor(balanceRequest()),
            contentDigest: kalshiContentDigest(''),
          },
        ],
      },
      [balanceRequest()],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule: 'read_has_body' });
  });

  it('refuses an empty request list', () => {
    const result = checkOnboardingSigningRequest(
      { authority: KALSHI_DEMO_AUTHORITY, requests: [] },
      [link],
      KALSHI_DEMO_AUTHORITY,
    );

    expect(result).toStrictEqual({ ok: false, rule: 'count' });
  });
});
