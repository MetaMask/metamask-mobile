import { isPortfolioUrl, isBridgeUrl } from './index';
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
});
