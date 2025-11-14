import {
  isTLD,
  getAlertMessage,
  protocolAllowList,
  trustedProtocolToDeeplink,
  prefixUrlWithProtocol,
  getUrlObj,
  getHost,
  appendURLParams,
  buildPortfolioUrl,
  processUrlForBrowser,
} from '.';
import { strings } from '../../../locales/i18n';

describe('Browser utils :: prefixUrlWithProtocol', () => {
  it('should prefix url with https: protocol', () => {
    const url = prefixUrlWithProtocol('test.com');
    expect(url).toBe('https://test.com');
  });

  it('should respect the original protocol ', () => {
    const url = prefixUrlWithProtocol('http://test.com');
    expect(url).toBe('http://test.com');
  });

  it('should respect the default protocol ', () => {
    const url = prefixUrlWithProtocol('test.com', 'http://');
    expect(url).toBe('http://test.com');
  });
});

describe('Browser utils :: safeDecodeUrl', () => {
  it('should handle URLs with URL-encoded characters', () => {
    const input =
      'https://portfolio.metamask.io/explore?MetaMaskEntry=mobile%2F&metricsEnabled=true';
    const url = processUrlForBrowser(input, 'Google');
    expect(url).toBe(input);
  });

  it('should handle URLs with encoded path segments', () => {
    const input = 'https://example.com/path%2Fto%2Fresource';
    const url = processUrlForBrowser(input, 'Google');
    expect(url).toBe(input);
  });

  it('should gracefully handle invalid URL encoding', () => {
    const input = 'https://example.com/path%GG';
    const url = processUrlForBrowser(input, 'Google');
    // Should fall back to treating it as a search query since invalid encoding
    expect(url).toBe(
      'https://www.google.com/search?q=' + encodeURIComponent(input),
    );
  });
});

describe('Browser utils :: onUrlSubmit', () => {
  it('should prefix url with https: protocol', () => {
    const url = processUrlForBrowser('test.com');
    expect(url).toBe('https://test.com');
  });

  it('should respect the default protocol', () => {
    const url = processUrlForBrowser('test.com', 'Google');
    expect(url).toBe('https://test.com');
  });

  it('should generate a seach engine link if it we pass non url', () => {
    const keyword = 'test';
    const url = processUrlForBrowser(keyword, 'Google');
    const expectedUrl =
      'https://www.google.com/search?q=' + encodeURIComponent(keyword);
    expect(url).toBe(expectedUrl);
  });

  it('should choose the search engine based on the params', () => {
    const keyword = 'test';
    const url = processUrlForBrowser(keyword, 'DuckDuckGo');
    const expectedUrl =
      'https://duckduckgo.com/?q=' + encodeURIComponent(keyword);
    expect(url).toBe(expectedUrl);
  });

  it('should detect keywords with several words', () => {
    const keyword = 'what is a test';
    const url = processUrlForBrowser(keyword, 'DuckDuckGo');
    const expectedUrl =
      'https://duckduckgo.com/?q=' + encodeURIComponent(keyword);
    expect(url).toBe(expectedUrl);
  });

  it('should detect urls without path', () => {
    const input = 'https://metamask.io';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should detect urls with empty path', () => {
    const input = 'https://metamask.io/';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should detect urls with path', () => {
    const input = 'https://metamask.io/about';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should detect urls with path and slash at the end', () => {
    const input = 'https://metamask.io/about';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should detect urls with path and querystring', () => {
    const input = 'https://metamask.io/about?utm_content=tests';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should detect urls with path and querystring with multiple params', () => {
    const input = 'https://metamask.io/about?utm_content=tests&utm_source=jest';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should detect urls with querystring params with escape characters', () => {
    const input = 'https://some.com/search?q=what+is+going&a=i+dont+know';
    const url = processUrlForBrowser(input, 'DuckDuckGo');
    expect(url).toBe(input);
  });

  it('should treat domains containing RTL chars as search queries', () => {
    // Given text with RTL characters that looks like a domain
    const rtlDomain = 'سwallet.metamask.io';

    // When processing without protocol
    const url = processUrlForBrowser(rtlDomain);

    // Then it should prefix with https (treat as URL, not search)
    expect(url).toBe(
      `https://www.google.com/search?q=${encodeURIComponent(rtlDomain)}`,
    );
  });
});

describe('Browser utils :: isTLD', () => {
  it('should return true if it ends on .xyz', () => {
    const hostname = 'evan.xyz';
    const error = '';
    expect(isTLD(hostname, error)).toBeTruthy();
  });

  it('should return true if it ends on .test', () => {
    const hostname = 'evan.test';
    const error = '';
    expect(isTLD(hostname, error)).toBeTruthy();
  });

  it('should return true if the error contains is not standard', () => {
    const hostname = 'ebisusbay.xyz';
    const error = 'is not standard';
    expect(isTLD(hostname, error)).toBeTruthy();
  });

  it('should return false if it ends on .eth', () => {
    const hostname = 'evan.eth';
    const error = '';
    expect(isTLD(hostname, error)).toBeFalsy();
  });
});

describe('Browser utils :: getUrlObj', () => {
  it('should return an URL object', () => {
    const url = 'http://metamask.io';
    const { hostname, protocol } = getUrlObj(url);
    expect(hostname).toBe('metamask.io');
    expect(protocol).toBe('http:');
  });
});

describe('Browser utils :: getHost', () => {
  it('should return hostname', () => {
    const url = 'http://metamask.io';
    const hostname = getHost(url);
    expect(hostname).toBe('metamask.io');
  });
  it('should return the complete url', () => {
    const url = 'about:blank';
    const hostname = getHost(url);
    expect(hostname).toBe('about:blank');
  });
  it('should return the malformed url', () => {
    const url = 'metamask';
    const hostname = getHost(url);
    expect(hostname).toBe('metamask');
  });
});

describe('Browser utils :: getAlertMessage', () => {
  it('should mailto alert message', () => {
    const { protocol } = new URL('mailto:testtmail');
    const matchingMessage =
      getAlertMessage(protocol, strings) ===
      strings('browser.protocol_alerts.mailto');

    expect(matchingMessage).toBeTruthy();
  });
  it('should return tel alert message', () => {
    const { protocol } = new URL('tel:1111');

    expect(getAlertMessage(protocol, strings)).toBe(
      strings('browser.protocol_alerts.tel'),
    );
  });
  it('should return generic alert message', () => {
    const { protocol } = new URL('dapp://testdapp');

    expect(getAlertMessage(protocol, strings)).toBe(
      strings('browser.protocol_alerts.generic'),
    );
  });
});

describe('Browser utils :: protocolWhitelist', () => {
  it('about:', () => {
    const { protocol } = new URL('about:config');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('http:', () => {
    const { protocol } = new URL('http://meta.io');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('https:', () => {
    const { protocol } = new URL('https://meta.io');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('file:', () => {
    const { protocol } = new URL('file://meta.io');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('wc:', () => {
    const { protocol } = new URL('wc:f82jdjfjakjskdfj');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('metamask:', () => {
    const { protocol } = new URL('metamask://dapp/portfolio.metamask.io');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('ethereum:', () => {
    const { protocol } = new URL('ethereum://tx');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('dapp:', () => {
    const { protocol } = new URL('dapp://portfolio.metamask.io');

    expect(protocolAllowList.includes(protocol)).toBeTruthy();
  });
  it('No javascript:', () => {
    // eslint-disable-next-line no-script-url
    const { protocol } = new URL('javascript://metamask.io');

    expect(protocolAllowList.includes(protocol)).toBeFalsy();
  });
});

describe('Browser utils :: trustedProtocolToDeeplink', () => {
  it('market:', () => {
    const { protocol } = new URL('market://portfolio.metamask.io');

    expect(trustedProtocolToDeeplink.includes(protocol)).toBeTruthy();
  });
  it('itms-apps:', () => {
    const { protocol } = new URL('itms-apps://portfolio.metamask.io');

    expect(trustedProtocolToDeeplink.includes(protocol)).toBeTruthy();
  });
  it('No eth:', () => {
    const { protocol } = new URL('eth://portfolio.metamask.io');

    expect(trustedProtocolToDeeplink.includes(protocol)).toBeFalsy();
  });
  it('No tel:', () => {
    const { protocol } = new URL('tel://portfolio.metamask.io');

    expect(trustedProtocolToDeeplink.includes(protocol)).toBeFalsy();
  });
  it('No mailto:', () => {
    const { protocol } = new URL('mailto://portfolio.metamask.io');

    expect(trustedProtocolToDeeplink.includes(protocol)).toBeFalsy();
  });
  it('No ldap:', () => {
    const { protocol } = new URL('ldap://portfolio.metamask.io');

    expect(trustedProtocolToDeeplink.includes(protocol)).toBeFalsy();
  });
});

describe('Browser utils :: appendURLParams', () => {
  it('should append search parameters to a URL string', () => {
    const baseUrl = 'https://metamask.io';
    const params = {
      utm_source: 'test',
      utm_medium: 'unit',
      active: true,
      count: 42,
    };

    const result = appendURLParams(baseUrl, params);

    expect(result.toString()).toBe(
      'https://metamask.io/?utm_source=test&utm_medium=unit&active=true&count=42',
    );
  });

  it('should append parameters to a URL with existing params', () => {
    const baseUrl = 'https://metamask.io/?existing=param';
    const params = {
      new: 'parameter',
    };

    const result = appendURLParams(baseUrl, params);

    expect(result.toString()).toBe(
      'https://metamask.io/?existing=param&new=parameter',
    );
  });

  it('should work with URL object input', () => {
    const baseUrl = new URL('https://metamask.io');
    const params = {
      test: 'value',
    };

    const result = appendURLParams(baseUrl, params);

    expect(result.toString()).toBe('https://metamask.io/?test=value');
  });

  it('should handle empty params object', () => {
    const baseUrl = 'https://metamask.io';
    const params = {};

    const result = appendURLParams(baseUrl, params);

    expect(result.toString()).toBe('https://metamask.io/');
  });
});

describe('Browser utils :: buildPortfolioUrl', () => {
  it('should include userAcceptedTracking=true when user accepted basic usage data tracking', () => {
    const baseUrl = 'https://portfolio.metamask.io';
    const userAcceptedTracking = true;

    const result = buildPortfolioUrl(baseUrl, userAcceptedTracking);

    expect(result.toString()).toBe(
      'https://portfolio.metamask.io/?metamaskEntry=mobile&userAcceptedTracking=true',
    );
  });

  it('should include userAcceptedTracking=false when user declined basic usage data tracking', () => {
    const baseUrl = 'https://portfolio.metamask.io';
    const userAcceptedTracking = false;

    const result = buildPortfolioUrl(baseUrl, userAcceptedTracking);

    expect(result.toString()).toBe(
      'https://portfolio.metamask.io/?metamaskEntry=mobile&userAcceptedTracking=false',
    );
  });

  it('should NOT include userAcceptedTracking parameter when user has not set tracking preference', () => {
    const baseUrl = 'https://portfolio.metamask.io';
    const userAcceptedTracking = null;

    const result = buildPortfolioUrl(baseUrl, userAcceptedTracking);

    expect(result.toString()).toBe(
      'https://portfolio.metamask.io/?metamaskEntry=mobile',
    );
    expect(result.toString()).not.toContain('userAcceptedTracking');
  });

  it('should include additional parameters alongside userAcceptedTracking', () => {
    const baseUrl = 'https://portfolio.metamask.io';
    const userAcceptedTracking = true;
    const additionalParams = {
      metricsEnabled: true,
      srcChain: 1,
    };

    const result = buildPortfolioUrl(
      baseUrl,
      userAcceptedTracking,
      additionalParams,
    );

    expect(result.toString()).toBe(
      'https://portfolio.metamask.io/?metamaskEntry=mobile&metricsEnabled=true&srcChain=1&userAcceptedTracking=true',
    );
  });

  it('should work with bridge URL', () => {
    const baseUrl = 'https://portfolio.metamask.io/bridge';
    const userAcceptedTracking = true;
    const additionalParams = {
      srcChain: 1,
      token: '0x123',
    };

    const result = buildPortfolioUrl(
      baseUrl,
      userAcceptedTracking,
      additionalParams,
    );

    expect(result.toString()).toContain('srcChain=1');
    expect(result.toString()).toContain('token=0x123');
    expect(result.toString()).toContain('userAcceptedTracking=true');
  });

  it('should work with stake URL', () => {
    const baseUrl = 'https://portfolio.metamask.io/stake';
    const userAcceptedTracking = false;

    const result = buildPortfolioUrl(baseUrl, userAcceptedTracking);

    expect(result.toString()).toBe(
      'https://portfolio.metamask.io/stake?metamaskEntry=mobile&userAcceptedTracking=false',
    );
  });

  it('should handle URL with existing query parameters', () => {
    const baseUrl = 'https://portfolio.metamask.io?existing=param';
    const userAcceptedTracking = true;

    const result = buildPortfolioUrl(baseUrl, userAcceptedTracking);

    expect(result.toString()).toContain('existing=param');
    expect(result.toString()).toContain('metamaskEntry=mobile');
    expect(result.toString()).toContain('userAcceptedTracking=true');
  });
});
