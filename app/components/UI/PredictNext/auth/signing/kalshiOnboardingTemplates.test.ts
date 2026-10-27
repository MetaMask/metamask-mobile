import fixture from '../../contracts/v1/fixtures/kalshi-signing-v1.json';
import {
  balanceRequest,
  enrollmentCurrentRequest,
  enrollmentIntentRequest,
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
