import type { SocialV1FeedAuthor } from '../types';
import { buildTraderStatLabels } from './traderStats';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) =>
    `${key}:${JSON.stringify(params ?? {})}`,
}));

const author = (
  overrides: Partial<SocialV1FeedAuthor> = {},
): SocialV1FeedAuthor => ({
  id: 'trader-1',
  username: 'Doji',
  address: '0xabc',
  avatarUri: null,
  winRatePercent: 92,
  pnl30d: 50_000,
  followerCount: 17_200,
  tradeCount30d: 141,
  ...overrides,
});

describe('buildTraderStatLabels', () => {
  it('orders P&L, followers, then win rate', () => {
    const labels = buildTraderStatLabels(author());

    expect(labels).toHaveLength(3);
    expect(labels[0]).toContain('pnl_30d');
    expect(labels[1]).toContain('followers');
    expect(labels[2]).toContain('win_rate');
  });

  // "P&L" already names the value, so a gain needs no plus.
  it('drops the plus on a winning P&L but keeps the minus on a loss', () => {
    expect(buildTraderStatLabels(author({ pnl30d: 50_000 }))[0]).toContain(
      '$50K',
    );
    expect(buildTraderStatLabels(author({ pnl30d: 50_000 }))[0]).not.toContain(
      '+',
    );
    expect(buildTraderStatLabels(author({ pnl30d: -8_200 }))[0]).toContain(
      '-$8.2K',
    );
  });

  it('skips stats the API did not report', () => {
    const labels = buildTraderStatLabels(
      author({ pnl30d: null, followerCount: null }),
    );

    expect(labels).toHaveLength(1);
    expect(labels[0]).toContain('win_rate');
  });

  // A trader nobody follows should not advertise "0 followers".
  it('skips a zero follower count', () => {
    const labels = buildTraderStatLabels(author({ followerCount: 0 }));

    expect(labels.some((label) => label.includes('followers'))).toBe(false);
  });

  it('has nothing to rotate for a trader with no stats', () => {
    expect(
      buildTraderStatLabels(
        author({ pnl30d: null, followerCount: null, winRatePercent: null }),
      ),
    ).toStrictEqual([]);
  });
});
