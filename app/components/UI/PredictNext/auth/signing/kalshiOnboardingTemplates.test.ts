import fixture from '../../contracts/v1/fixtures/kalshi-signing-v1.json';
import {
  balanceRequest,
  enrollmentCurrentRequest,
  enrollmentIntentRequest,
  isKalshiOnboardingTemplateRequest,
  linkRequest,
  linkVerifyRequest,
  walletRegisterRequest,
} from './kalshiOnboardingTemplates';
import { kalshiContentDigest, type VenueRequest } from './venueRequest';

const KEY = 'a1b2c3d4-1111-4222-8333-444455556666';

const golden = (name: string) => {
  const entry = fixture.requests.find((request) => request.name === name);
  if (!entry) {
    throw new Error(`missing fixture ${name}`);
  }
  return entry;
};

describe('Kalshi onboarding templates', () => {
  it.each<[string, VenueRequest]>([
    ['balance', balanceRequest()],
    ['enrollment current', enrollmentCurrentRequest()],
    ['enrollment intent', enrollmentIntentRequest(KEY)],
    ['link', linkRequest('User+Tag@Example.com', KEY)],
    ['link verify', linkVerifyRequest('888888', KEY)],
    [
      'wallet register',
      walletRegisterRequest({
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        network: 'base',
        idempotencyKey: KEY,
      }),
    ],
  ])('builds the %s golden request', (name, request) => {
    const entry = golden(name);

    expect(request).toStrictEqual(entry.request);
    if (entry.digest) {
      expect(kalshiContentDigest(request.body ?? '')).toBe(entry.digest);
    }
  });

  it('keeps the email exactly as given', () => {
    expect(linkRequest('User+Tag@Example.com', KEY).body).toBe(
      '{"email":"User+Tag@Example.com"}',
    );
  });
});

describe('isKalshiOnboardingTemplateRequest', () => {
  it('accepts every request the templates build', () => {
    const requests: VenueRequest[] = [
      balanceRequest(),
      enrollmentCurrentRequest(),
      enrollmentIntentRequest(KEY),
      linkRequest('user@example.com', KEY),
      linkVerifyRequest('123456', KEY),
      walletRegisterRequest({
        walletAddress: '0x0000000000000000000000000000000000000001',
        network: 'base',
        idempotencyKey: KEY,
      }),
    ];

    expect(requests.every(isKalshiOnboardingTemplateRequest)).toBe(true);
  });

  it('rejects a route the templates do not define', () => {
    expect(
      isKalshiOnboardingTemplateRequest({
        ...balanceRequest(),
        path: '/trade-api/v2/portfolio/orders',
      }),
    ).toBe(false);
  });

  it('rejects a method that does not match the ref', () => {
    expect(
      isKalshiOnboardingTemplateRequest({
        ...balanceRequest(),
        method: 'POST',
        body: '',
        idempotencyKey: KEY,
      }),
    ).toBe(false);
  });

  it('rejects a query string on a template route', () => {
    expect(
      isKalshiOnboardingTemplateRequest({
        ...balanceRequest(),
        query: 'limit=1',
      }),
    ).toBe(false);
  });

  it('rejects a mutation without an idempotency key', () => {
    expect(
      isKalshiOnboardingTemplateRequest({
        ...linkRequest('user@example.com', KEY),
        idempotencyKey: '',
      }),
    ).toBe(false);
  });
});
