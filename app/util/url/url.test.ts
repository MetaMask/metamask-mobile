import {
  isPortfolioUrl,
  isBridgeUrl,
  isCardUrl,
  isCardTravelUrl,
  isCardTosUrl,
  isValidASCIIURL,
  toPunycodeURL,
  isSameOrigin,
} from './index';
import AppConstants from '../../core/AppConstants';

describe('URL Check Functions', () => {
  describe('isPortfolioUrl', () => {
    it('returns true for portfolio URLs', () => {
      const url = AppConstants.PORTFOLIO.URL;
      expect(isPortfolioUrl(url)).toBe(true);
    });

    it('returns false for URLs that were false positive with previous regex implementation', () => {
      const url = 'https://portfolioxmetamask.io';
      expect(isPortfolioUrl(url)).toBe(false);
    });

    it('returns true for portfolio URLs with additional params', () => {
      const url = `${AppConstants.PORTFOLIO.URL}/bridge?foo=bar`;
      expect(isBridgeUrl(url)).toBe(true);
    });

    it('returns false for non-portfolio URLs', () => {
      const url = 'http://www.example.com';
      expect(isPortfolioUrl(url)).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      const url = 'invalid url';
      expect(isPortfolioUrl(url)).toBe(false);
    });
  });

  describe('isBridgeUrl', () => {
    it('returns true for bridge URLs', () => {
      const url = AppConstants.BRIDGE.URL;
      expect(isBridgeUrl(url)).toBe(true);
    });

    it('returns false for URLs that were false positive with previous regex implementation', () => {
      const url = 'https://portfolioxmetamask.io/bridge';
      expect(isPortfolioUrl(url)).toBe(false);
    });

    it('returns true for bridge URLs with additional params', () => {
      const url = `${AppConstants.BRIDGE.URL}?foo=bar`;
      expect(isBridgeUrl(url)).toBe(true);
    });

    it('returns true for bridge URLs with trailing slash', () => {
      const url = `${AppConstants.BRIDGE.URL}/`;
      expect(isBridgeUrl(url)).toBe(true);
    });

    it('returns false for non-bridge URLs', () => {
      const url = 'http://www.example.com';
      expect(isBridgeUrl(url)).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      const url = 'invalid url';
      expect(isBridgeUrl(url)).toBe(false);
    });
  });

  describe('isCardUrl', () => {
    it.each([
      [AppConstants.CARD.URL, true],
      [`${AppConstants.CARD.URL}/path`, true],
      ['https://example.com', false],
      ['invalid url', false],
    ])('returns expected result for %s', (url, expected) => {
      expect(isCardUrl(url)).toBe(expected);
    });
  });

  describe('isCardTravelUrl', () => {
    it.each([
      [AppConstants.CARD.TRAVEL_URL, true],
      [`${AppConstants.CARD.TRAVEL_URL}/booking`, true],
      ['https://example.com', false],
      ['invalid url', false],
    ])('returns expected result for %s', (url, expected) => {
      expect(isCardTravelUrl(url)).toBe(expected);
    });
  });

  describe('isCardTosUrl', () => {
    const tosOrigin = new URL(AppConstants.CARD.CARD_TOS_URL).origin;

    it.each([
      [AppConstants.CARD.CARD_TOS_URL, true],
      [`${tosOrigin}/other-doc.pdf`, true],
      ['https://example.com', false],
      ['invalid url', false],
    ])('returns expected result for %s', (url, expected) => {
      expect(isCardTosUrl(url)).toBe(expected);
    });
  });

  describe('isValidASCIIURL', () => {
    it('returns true for URL containing only ASCII characters in its hostname', () => {
      expect(isValidASCIIURL('https://www.google.com')).toEqual(true);
    });

    it('returns true for URL with both its hostname and path containing ASCII characters', () => {
      expect(
        isValidASCIIURL('https://infura.io/gnosis?x=xn--ifura-dig.io'),
      ).toStrictEqual(true);
    });

    it('returns true for URL with its hostname containing ASCII characters and its path containing non-ASCII characters', () => {
      expect(
        isValidASCIIURL('https://infura.io/gnosis?x=iոfura.io'),
      ).toStrictEqual(true);
      expect(
        isValidASCIIURL('infura.io:7777/gnosis?x=iոfura.io'),
      ).toStrictEqual(true);
    });

    it('returns false for URL with its hostname containing non-ASCII characters', () => {
      expect(isValidASCIIURL('https://iոfura.io/gnosis')).toStrictEqual(false);
      expect(isValidASCIIURL('iոfura.io:7777/gnosis?x=test')).toStrictEqual(
        false,
      );
    });

    it('returns false for empty string', () => {
      expect(isValidASCIIURL('')).toStrictEqual(false);
    });
  });

  describe('toPunycodeURL', () => {
    it('returns punycode version of URL', () => {
      expect(toPunycodeURL('https://iոfura.io/gnosis')).toStrictEqual(
        'https://xn--ifura-dig.io/gnosis',
      );
      expect(toPunycodeURL('https://iոfura.io')).toStrictEqual(
        'https://xn--ifura-dig.io',
      );
      expect(toPunycodeURL('https://iոfura.io/')).toStrictEqual(
        'https://xn--ifura-dig.io/',
      );
      expect(
        toPunycodeURL('https://iոfura.io/gnosis:5050?test=iոfura&foo=bar'),
      ).toStrictEqual(
        'https://xn--ifura-dig.io/gnosis:5050?test=i%D5%B8fura&foo=bar',
      );

      expect(toPunycodeURL('https://www.google.com')).toStrictEqual(
        'https://www.google.com',
      );
      expect(
        toPunycodeURL('https://opensea.io/language=français'),
      ).toStrictEqual('https://opensea.io/language=fran%C3%A7ais');
    });
  });

  describe('isSameOrigin', () => {
    it('return true for urls with the same origin', () => {
      expect(
        isSameOrigin(
          'https://metamask.io/page.html',
          'https://metamask.io/page2.html',
        ),
      ).toBeTruthy();
      expect(
        isSameOrigin(
          'https://metamask.io/other.html',
          'https://usr:pw@metamask.io/',
        ),
      ).toBeTruthy();
      expect(
        isSameOrigin('https://metamask.io:80/page', 'https://metamask.io:80/'),
      ).toBeTruthy();
      expect(
        isSameOrigin('https://metamask.io:81/', 'https://metamask.io:80'),
      ).toBeFalsy();
      expect(
        isSameOrigin(
          'https://en.metamask.io/page.html',
          'https://metamask.io/',
        ),
      ).toBeFalsy();
      expect(isSameOrigin('invalid url', 'https://metamask.io/')).toBeFalsy();
    });
  });
});
