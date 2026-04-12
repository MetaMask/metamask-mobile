import { getIframeProperties } from './getIframeProperties';

describe('getIframeProperties', () => {
  it('returns all false/null when not an iframe', () => {
    const result = getIframeProperties({
      isIframe: false,
      origin: 'https://example.com',
    });

    expect(result).toStrictEqual({
      is_iframe: false,
      is_cross_origin_iframe: false,
      iframe_origin: null,
      top_level_origin: null,
    });
  });

  it('returns all false/null when not an iframe even with topLevelOrigin', () => {
    const result = getIframeProperties({
      isIframe: false,
      origin: 'https://example.com',
      topLevelOrigin: 'https://parent.com',
    });

    expect(result).toStrictEqual({
      is_iframe: false,
      is_cross_origin_iframe: false,
      iframe_origin: null,
      top_level_origin: null,
    });
  });

  it('returns is_iframe true but not cross-origin when origins match', () => {
    const result = getIframeProperties({
      isIframe: true,
      origin: 'https://example.com',
      topLevelOrigin: 'https://example.com',
    });

    expect(result).toStrictEqual({
      is_iframe: true,
      is_cross_origin_iframe: false,
      iframe_origin: null,
      top_level_origin: null,
    });
  });

  it('returns is_iframe true but not cross-origin when topLevelOrigin is undefined', () => {
    const result = getIframeProperties({
      isIframe: true,
      origin: 'https://example.com',
    });

    expect(result).toStrictEqual({
      is_iframe: true,
      is_cross_origin_iframe: false,
      iframe_origin: null,
      top_level_origin: null,
    });
  });

  it('returns cross-origin iframe properties when origins differ', () => {
    const result = getIframeProperties({
      isIframe: true,
      origin: 'https://malicious.com',
      topLevelOrigin: 'https://legitimate.com',
    });

    expect(result).toStrictEqual({
      is_iframe: true,
      is_cross_origin_iframe: true,
      iframe_origin: 'https://malicious.com',
      top_level_origin: 'https://legitimate.com',
    });
  });

  it('handles subdomain differences as cross-origin', () => {
    const result = getIframeProperties({
      isIframe: true,
      origin: 'https://sub.example.com',
      topLevelOrigin: 'https://example.com',
    });

    expect(result).toStrictEqual({
      is_iframe: true,
      is_cross_origin_iframe: true,
      iframe_origin: 'https://sub.example.com',
      top_level_origin: 'https://example.com',
    });
  });

  it('handles protocol differences as cross-origin', () => {
    const result = getIframeProperties({
      isIframe: true,
      origin: 'http://example.com',
      topLevelOrigin: 'https://example.com',
    });

    expect(result).toStrictEqual({
      is_iframe: true,
      is_cross_origin_iframe: true,
      iframe_origin: 'http://example.com',
      top_level_origin: 'https://example.com',
    });
  });
});
