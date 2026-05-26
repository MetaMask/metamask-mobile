import {
  isTradingViewExternalHostname,
  isTradingViewExternalHref,
} from './tvDomHacks';

describe('isTradingViewExternalHostname', () => {
  it('returns true for tradingview.com', () => {
    expect(isTradingViewExternalHostname('tradingview.com')).toBe(true);
    expect(isTradingViewExternalHostname('www.tradingview.com')).toBe(true);
  });

  it('returns true for subdomains', () => {
    expect(isTradingViewExternalHostname('docs.tradingview.com')).toBe(true);
  });

  it('returns false for other domains', () => {
    expect(isTradingViewExternalHostname('metamask.io')).toBe(false);
    expect(isTradingViewExternalHostname('example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTradingViewExternalHostname('')).toBe(false);
  });
});

describe('isTradingViewExternalHref', () => {
  it('returns true for tradingview URLs', () => {
    expect(isTradingViewExternalHref('https://www.tradingview.com/about')).toBe(
      true,
    );
  });

  it('returns false for other URLs', () => {
    expect(isTradingViewExternalHref('https://example.com')).toBe(false);
  });

  it('returns false for empty/falsy', () => {
    expect(isTradingViewExternalHref('')).toBe(false);
  });
});
