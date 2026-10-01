import { DEFAULT_REWARDS_MOCKS } from './rewards.ts';

const REWARDS_HOSTS = [
  'https://rewards.api.cx.metamask.io',
  'https://rewards.dev-api.cx.metamask.io',
  'https://rewards.uat-api.cx.metamask.io',
];

const MOCKED_PATHS = [
  '/auth/mobile-login',
  '/public/rewards/ois',
  '/public/seasons/status',
  '/public/seasons/abc-123/metadata',
];

describe('DEFAULT_REWARDS_MOCKS', () => {
  const patterns = [
    ...(DEFAULT_REWARDS_MOCKS.GET ?? []),
    ...(DEFAULT_REWARDS_MOCKS.POST ?? []),
  ]
    .map((mock) => mock.urlEndpoint)
    .filter(
      (urlEndpoint): urlEndpoint is RegExp => urlEndpoint instanceof RegExp,
    );

  it('matches production, dev, and UAT rewards hosts', () => {
    for (const host of REWARDS_HOSTS) {
      for (const path of MOCKED_PATHS) {
        const url = `${host}${path}`;
        expect(patterns.some((pattern) => pattern.test(url))).toBe(true);
      }
    }
  });

  it('matches the production opt-in status request that main-e2e sends', () => {
    const url = 'https://rewards.api.cx.metamask.io/public/rewards/ois';
    expect(patterns.some((pattern) => pattern.test(url))).toBe(true);
  });

  it('does not match unrelated hosts', () => {
    const url = 'https://example.com/public/rewards/ois';
    expect(patterns.some((pattern) => pattern.test(url))).toBe(false);
  });
});
