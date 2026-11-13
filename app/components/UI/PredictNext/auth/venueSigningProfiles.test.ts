import {
  loadVenueProfile,
  readAllowed,
  type SigningProfile,
} from './venueSigningProfiles';

let profile: SigningProfile;

beforeAll(async () => {
  const bundled = await loadVenueProfile();
  if (!bundled) {
    throw new Error('Bundled signing profile unavailable');
  }
  profile = {
    ...bundled,
    reads: {
      ...bundled.reads,
      allow: [
        { method: 'GET', path: '/trade-api/v2/portfolio/orders/{orderId}' },
      ],
    },
  };
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
