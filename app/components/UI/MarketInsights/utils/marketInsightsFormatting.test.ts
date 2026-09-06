import {
  formatInsightRefreshLabel,
  formatRelativeTime,
  getFaviconUrl,
  isXSourceUrl,
} from './marketInsightsFormatting';
import { strings } from '../../../../../locales/i18n';

describe('formatRelativeTime', () => {
  const ANCHOR = new Date('2026-05-07T12:00:00.000Z');

  const minutesBeforeAnchor = (n: number) =>
    new Date(ANCHOR.getTime() - n * 60 * 1000).toISOString();

  beforeEach(() => {
    jest.useFakeTimers({ now: ANCHOR });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns empty string for an invalid date string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('');
  });

  it('returns nowLabel when diff is under 1 minute', () => {
    expect(
      formatRelativeTime(minutesBeforeAnchor(0), { nowLabel: 'now' }),
    ).toBe('now');
  });

  it('returns Xm ago for diffs under 1 hour', () => {
    expect(formatRelativeTime(minutesBeforeAnchor(5))).toBe('5m ago');
  });

  it('returns Xh ago for diffs under 1 day', () => {
    expect(formatRelativeTime(minutesBeforeAnchor(3 * 60))).toBe('3h ago');
  });

  it('returns Xd ago for diffs of 1 day or more', () => {
    expect(formatRelativeTime(minutesBeforeAnchor(4 * 24 * 60))).toBe('4d ago');
  });
});

describe('formatInsightRefreshLabel', () => {
  const ANCHOR = new Date('2026-05-07T12:00:00.000Z');

  const minutesBeforeAnchor = (n: number) =>
    new Date(ANCHOR.getTime() - n * 60 * 1000).toISOString();

  beforeEach(() => {
    jest.useFakeTimers({ now: ANCHOR });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns empty string for an invalid date string', () => {
    expect(formatInsightRefreshLabel('not-a-date')).toBe('');
  });

  it('returns relative time when generated at most 6 hours ago', () => {
    expect(formatInsightRefreshLabel(minutesBeforeAnchor(6 * 60))).toBe(
      '6h ago',
    );
  });

  it('returns Today when generated more than 6 hours and less than 24 hours ago', () => {
    expect(formatInsightRefreshLabel(minutesBeforeAnchor(6 * 60 + 1))).toBe(
      strings('market_insights.refresh_today'),
    );
    expect(formatInsightRefreshLabel(minutesBeforeAnchor(23 * 60))).toBe(
      strings('market_insights.refresh_today'),
    );
  });

  it('returns Yesterday when generated at least 24 hours and less than 48 hours ago', () => {
    expect(formatInsightRefreshLabel(minutesBeforeAnchor(24 * 60))).toBe(
      strings('market_insights.refresh_yesterday'),
    );
    expect(formatInsightRefreshLabel(minutesBeforeAnchor(47 * 60))).toBe(
      strings('market_insights.refresh_yesterday'),
    );
  });

  it('returns empty string when generated 48 hours ago or more', () => {
    expect(formatInsightRefreshLabel(minutesBeforeAnchor(48 * 60))).toBe('');
  });
});

describe('getFaviconUrl', () => {
  it('uses hostname when source is a full URL', () => {
    expect(getFaviconUrl('https://www.coindesk.com/markets/')).toBe(
      'https://www.google.com/s2/favicons?domain=www.coindesk.com&sz=32',
    );
  });

  it('handles bare domains consistently', () => {
    expect(getFaviconUrl('coindesk.com')).toBe(
      'https://www.google.com/s2/favicons?domain=coindesk.com&sz=32',
    );
  });
});

describe('isXSourceUrl', () => {
  it('matches bare x and twitter strings', () => {
    expect(isXSourceUrl('x')).toBe(true);
    expect(isXSourceUrl('twitter')).toBe(true);
    expect(isXSourceUrl('X')).toBe(true);
    expect(isXSourceUrl('Twitter')).toBe(true);
  });

  it('matches x.com and twitter.com URLs', () => {
    expect(isXSourceUrl('https://x.com/user/status/123')).toBe(true);
    expect(isXSourceUrl('https://twitter.com/user/status/123')).toBe(true);
    expect(isXSourceUrl('https://www.x.com/user')).toBe(true);
    expect(isXSourceUrl('x.com')).toBe(true);
  });

  it('does not match domains that contain x.com as a substring', () => {
    expect(isXSourceUrl('https://box.com')).toBe(false);
    expect(isXSourceUrl('https://max.com')).toBe(false);
    expect(isXSourceUrl('https://coindesk.com/article-about-x.com')).toBe(
      false,
    );
  });

  it('does not match unrelated domains', () => {
    expect(isXSourceUrl('https://coindesk.com')).toBe(false);
    expect(isXSourceUrl('https://theblock.co')).toBe(false);
  });
});
