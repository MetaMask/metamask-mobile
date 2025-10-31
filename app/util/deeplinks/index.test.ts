import { isInternalDeepLink } from './index';
import AppConstants from '../../core/AppConstants';

describe('deeplinks utils', () => {
  describe('isInternalDeepLink', () => {
    it('should identify MetaMask custom scheme deeplinks', () => {
      expect(isInternalDeepLink('metamask://connect')).toBe(true);
      expect(isInternalDeepLink('metamask://wc?uri=...')).toBe(true);
      expect(isInternalDeepLink('metamask://dapp/uniswap.org')).toBe(true);
    });

    it('should identify Ethereum scheme deeplinks', () => {
      expect(isInternalDeepLink('ethereum://pay-0x1234')).toBe(true);
      expect(isInternalDeepLink('ethereum://0x1234?value=1e18')).toBe(true);
    });

    it('should identify dapp scheme deeplinks', () => {
      expect(isInternalDeepLink('dapp://app.uniswap.org')).toBe(true);
      expect(isInternalDeepLink('dapp://portfolio.metamask.io')).toBe(true);
    });

    it('should identify MetaMask universal links', () => {
      expect(isInternalDeepLink('https://link.metamask.io/swap')).toBe(true);
      expect(isInternalDeepLink('https://link.metamask.io/buy-crypto')).toBe(
        true,
      );
      expect(
        isInternalDeepLink('https://link.metamask.io/dapp/uniswap.org'),
      ).toBe(true);
    });

    it('should identify MetaMask test universal links', () => {
      expect(isInternalDeepLink('https://link-test.metamask.io/swap')).toBe(
        true,
      );
      expect(isInternalDeepLink('https://link-test.metamask.io/send')).toBe(
        true,
      );
    });

    it('should identify MetaMask branch links', () => {
      expect(isInternalDeepLink('https://metamask.app.link/swap')).toBe(true);
      expect(isInternalDeepLink('https://metamask.test-app.link/home')).toBe(
        true,
      );
      expect(
        isInternalDeepLink('https://metamask-alternate.app.link/buy'),
      ).toBe(true);
    });

    it('should NOT identify external URLs as internal', () => {
      expect(isInternalDeepLink('https://google.com')).toBe(false);
      expect(isInternalDeepLink('https://uniswap.org')).toBe(false);
      expect(isInternalDeepLink('https://portfolio.metamask.io')).toBe(false);
      expect(isInternalDeepLink('http://example.com')).toBe(false);
    });

    it('should NOT identify other protocols as internal', () => {
      expect(isInternalDeepLink('mailto:test@example.com')).toBe(false);
      expect(isInternalDeepLink('tel:+1234567890')).toBe(false);
      expect(isInternalDeepLink('wc://session')).toBe(false);
      expect(isInternalDeepLink('https://wc.example.com')).toBe(false);
    });

    it('handles edge cases gracefully', () => {
      expect(isInternalDeepLink('')).toBe(false);
      expect(isInternalDeepLink(null)).toBe(false);
      expect(isInternalDeepLink(undefined)).toBe(false);
      expect(isInternalDeepLink('not-a-valid-url')).toBe(false);
      expect(isInternalDeepLink('metamask://')).toBe(true); // Still a valid MetaMask scheme
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(
        isInternalDeepLink(
          'https://link.metamask.io/swap?chainId=1&token=0x...',
        ),
      ).toBe(true);
      expect(
        isInternalDeepLink('metamask://connect?channelId=123#fragment'),
      ).toBe(true);
      expect(isInternalDeepLink('https://google.com?metamask=true')).toBe(
        false,
      );
    });

    it('should respect AppConstants configuration', () => {
      // Test with custom constants if they're defined
      const customHost = AppConstants.MM_UNIVERSAL_LINK_HOST;
      if (customHost) {
        expect(isInternalDeepLink(`https://${customHost}/action`)).toBe(true);
      }
    });
  });
});
