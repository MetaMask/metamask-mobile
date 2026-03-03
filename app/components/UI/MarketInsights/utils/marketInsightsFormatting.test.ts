import { getFaviconUrl, isXSourceUrl } from './marketInsightsFormatting';

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
