import { isAllowedBrazeDeeplink } from './isAllowedBrazeDeeplink';

// ---------------------------------------------------------------------------
// Mock: AppConstants — provide predictable MM host values for every test
// ---------------------------------------------------------------------------
jest.mock('../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
    MM_UNIVERSAL_LINK_HOST_ALTERNATE: 'metamask-alternate.app.link',
    MM_UNIVERSAL_LINK_TEST_APP_HOST: 'metamask.test-app.link',
    MM_UNIVERSAL_LINK_TEST_APP_HOST_ALTERNATE:
      'metamask-alternate.test-app.link',
    MM_IO_UNIVERSAL_LINK_HOST: 'link.metamask.io',
    MM_IO_UNIVERSAL_LINK_TEST_HOST: 'link-test.metamask.io',
  },
}));

describe('isAllowedBrazeDeeplink', () => {
  // -------------------------------------------------------------------------
  // Non-string / empty inputs
  // -------------------------------------------------------------------------
  describe('non-string inputs', () => {
    it('returns false for null', () => {
      expect(isAllowedBrazeDeeplink(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isAllowedBrazeDeeplink(undefined)).toBe(false);
    });

    it('returns false for a number', () => {
      expect(isAllowedBrazeDeeplink(42)).toBe(false);
    });

    it('returns false for an empty string', () => {
      expect(isAllowedBrazeDeeplink('')).toBe(false);
    });

    it('returns false for a malformed string that is not a valid URL', () => {
      expect(isAllowedBrazeDeeplink('not a url')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // MWP fast-path rejection
  // -------------------------------------------------------------------------
  describe('MWP deeplinks', () => {
    it('rejects the bare MWP prefix', () => {
      expect(isAllowedBrazeDeeplink('metamask://connect/mwp')).toBe(false);
    });

    it('rejects an MWP connect URL with a payload parameter', () => {
      expect(
        isAllowedBrazeDeeplink('metamask://connect/mwp?p=base64encoded'),
      ).toBe(false);
    });

    it('rejects an MWP URL with a connection ID path segment', () => {
      expect(isAllowedBrazeDeeplink('metamask://connect/mwp/abc-123-def')).toBe(
        false,
      );
    });
  });

  // -------------------------------------------------------------------------
  // metamask:// scheme — allowed (except MWP)
  // -------------------------------------------------------------------------
  describe('metamask:// scheme', () => {
    it('allows metamask://home', () => {
      expect(isAllowedBrazeDeeplink('metamask://home')).toBe(true);
    });

    it('allows metamask://portfolio (handled by central pipeline)', () => {
      expect(isAllowedBrazeDeeplink('metamask://portfolio')).toBe(true);
    });

    it('allows metamask://buy with query params', () => {
      expect(isAllowedBrazeDeeplink('metamask://buy?chainId=1')).toBe(true);
    });

    it('allows metamask://swap', () => {
      expect(isAllowedBrazeDeeplink('metamask://swap')).toBe(true);
    });

    it('allows metamask://connect (non-MWP connect path)', () => {
      // A bare metamask://connect without the /mwp suffix is not MWP
      expect(isAllowedBrazeDeeplink('metamask://connect')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // https:// on MetaMask-owned hosts — allowed
  // -------------------------------------------------------------------------
  describe('https:// on MetaMask-owned hosts', () => {
    it('allows link.metamask.io', () => {
      expect(isAllowedBrazeDeeplink('https://link.metamask.io/home')).toBe(
        true,
      );
    });

    it('allows link-test.metamask.io', () => {
      expect(isAllowedBrazeDeeplink('https://link-test.metamask.io/home')).toBe(
        true,
      );
    });

    it('allows metamask.app.link', () => {
      expect(isAllowedBrazeDeeplink('https://metamask.app.link/home')).toBe(
        true,
      );
    });

    it('allows metamask-alternate.app.link', () => {
      expect(
        isAllowedBrazeDeeplink('https://metamask-alternate.app.link/home'),
      ).toBe(true);
    });

    it('allows metamask.test-app.link', () => {
      expect(isAllowedBrazeDeeplink('https://metamask.test-app.link/buy')).toBe(
        true,
      );
    });

    it('allows metamask-alternate.test-app.link', () => {
      expect(
        isAllowedBrazeDeeplink('https://metamask-alternate.test-app.link/swap'),
      ).toBe(true);
    });

    it('allows MetaMask host with query params', () => {
      expect(
        isAllowedBrazeDeeplink(
          'https://link.metamask.io/buy?chainId=1&token=ETH',
        ),
      ).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // https:// on third-party hosts — rejected
  // -------------------------------------------------------------------------
  describe('https:// on third-party hosts', () => {
    it('rejects a generic third-party domain', () => {
      expect(isAllowedBrazeDeeplink('https://evil.com/payload')).toBe(false);
    });

    it('rejects a domain that looks similar to MetaMask', () => {
      expect(isAllowedBrazeDeeplink('https://link.metamask.io.evil.com/')).toBe(
        false,
      );
    });

    it('rejects a subdomain of metamask.io that is not an allowed host', () => {
      expect(isAllowedBrazeDeeplink('https://phishing.metamask.io/')).toBe(
        false,
      );
    });

    it('rejects an http:// (non-https) MetaMask host', () => {
      expect(isAllowedBrazeDeeplink('http://link.metamask.io/home')).toBe(
        false,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Dangerous schemes — rejected
  // -------------------------------------------------------------------------
  describe('dangerous schemes', () => {
    it('rejects javascript:', () => {
      expect(isAllowedBrazeDeeplink('javascript:alert(1)')).toBe(false);
    });

    it('rejects file://', () => {
      expect(isAllowedBrazeDeeplink('file:///etc/passwd')).toBe(false);
    });

    it('rejects data: URIs', () => {
      expect(isAllowedBrazeDeeplink('data:text/html,<h1>hi</h1>')).toBe(false);
    });

    it('rejects intent:// (Android)', () => {
      expect(
        isAllowedBrazeDeeplink('intent://com.example#Intent;scheme=https;end'),
      ).toBe(false);
    });

    it('rejects wc: scheme', () => {
      expect(isAllowedBrazeDeeplink('wc:abc123@2?relay-protocol=irn')).toBe(
        false,
      );
    });

    it('rejects about:blank', () => {
      expect(isAllowedBrazeDeeplink('about:blank')).toBe(false);
    });
  });
});
