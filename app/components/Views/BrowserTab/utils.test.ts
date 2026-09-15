import {
  isValidUrl,
  isENSUrl,
  getMaskedUrl,
  isDisallowedExplicitPort,
  resolveCommittedDocumentUrl,
} from './utils';
import URLParse from 'url-parse';
import AppConstants from '../../../core/AppConstants';
import { SessionENSNames } from './types';

describe('BrowserTab utils', () => {
  describe('isValidUrl', () => {
    const testCases = [
      { url: 'https://google.com', expected: true },
      { url: 'http://localhost:3000', expected: true },
      { url: 'http://example.com:8080', expected: false },
      { url: 'https://sub.domain.com', expected: true },
      { url: 'invalid-url', expected: false },
      { url: 'ftp://invalid-protocol.com', expected: false },
    ];

    testCases.forEach(({ url, expected }) => {
      it(`should return ${expected} for ${url}`, () => {
        const parsedUrl = new URLParse(url);
        expect(isValidUrl(parsedUrl)).toBe(expected);
      });
    });
  });

  describe('resolveCommittedDocumentUrl', () => {
    it('returns the page-reported URL when origin matches the native WebView URL', () => {
      const nativeUrl = 'https://example.org/page';
      const pageReportedUrl = 'https://example.org/app';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBe(pageReportedUrl);
    });

    it('returns the native WebView URL when the page reports a different origin', () => {
      const nativeUrl = 'https://example.org/page';
      const pageReportedUrl = 'https://example.com/page';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBe(nativeUrl);
    });

    it('returns the native WebView URL when the page reports a URL with a disallowed explicit port', () => {
      const nativeUrl = 'https://example.org/page';
      const pageReportedUrl = 'https://example.com:8080/page';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBe(nativeUrl);
    });

    it('returns the native WebView URL when the page-reported URL cannot be parsed', () => {
      const nativeUrl = 'https://example.org/page';
      const pageReportedUrl = 'not-a-url';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBe(nativeUrl);
      consoleWarnSpy.mockRestore();
    });

    it('returns the page-reported URL when origins match except for a default HTTPS port', () => {
      const nativeUrl = 'https://example.org/page';
      const pageReportedUrl = 'https://example.org:443/app';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBe(pageReportedUrl);
    });

    it('returns the native WebView URL when the page-reported URL includes userinfo', () => {
      const nativeUrl = 'https://example.org/page';
      const pageReportedUrl = 'https://user@example.com/';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBe(nativeUrl);
    });

    it('returns null when the native WebView URL has a disallowed explicit port', () => {
      const nativeUrl = 'https://example.com:8080';
      const pageReportedUrl = 'https://example.com:8080';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBeNull();
    });

    it('returns null when origin mismatches and the native WebView URL has a disallowed explicit port', () => {
      const nativeUrl = 'https://example.com:8080';
      const pageReportedUrl = 'https://example.org/page';

      const result = resolveCommittedDocumentUrl(nativeUrl, pageReportedUrl);

      expect(result).toBeNull();
    });
  });

  describe('isDisallowedExplicitPort', () => {
    const testCases = [
      { url: 'https://example.com:83/page', expected: true },
      { url: 'https://example.com/page', expected: false },
      { url: 'http://example.com:8080', expected: true },
      { url: 'http://localhost:3000', expected: false },
      { url: 'https://127.0.0.1:8443', expected: false },
      { url: 'https://google.com:443', expected: false },
    ];

    testCases.forEach(({ url, expected }) => {
      it(`should return ${expected} for ${url}`, () => {
        expect(isDisallowedExplicitPort(url)).toBe(expected);
      });
    });
  });

  describe('isENSUrl', () => {
    const ensIgnoreList = ['ignored.eth'];

    const testCases = [
      { url: 'https://example.eth', expected: true },
      { url: 'https://test.xyz', expected: true },
      { url: 'https://domain.test', expected: true },
      { url: 'https://ignored.eth', expected: false },
      { url: 'https://example.com', expected: false },
    ];

    testCases.forEach(({ url, expected }) => {
      it(`should return ${expected} for ${url}`, () => {
        expect(isENSUrl(url, ensIgnoreList)).toBe(expected);
      });
    });
  });

  describe('getMaskedUrl', () => {
    const sessionENSNames: SessionENSNames = {
      // For IPFS: gateway + hash
      [`${AppConstants.IPFS_DEFAULT_GATEWAY_URL}Qm123`]: {
        hash: 'Qm123',
        hostname: 'example.eth',
        type: 'ipfs',
      },
      // For IPNS: gateway + hostname
      [`${AppConstants.IPNS_DEFAULT_GATEWAY_URL}test.eth`]: {
        hash: 'Qm456',
        hostname: 'test.eth',
        type: 'ipns',
      },
      // For Swarm: gateway + hash
      [`${AppConstants.SWARM_DEFAULT_GATEWAY_URL}Qm789`]: {
        hash: 'Qm789',
        hostname: 'swarm.eth',
        type: 'swarm',
      },
    };

    const testCases = [
      {
        input: `${AppConstants.IPFS_DEFAULT_GATEWAY_URL}Qm123/path`,
        expected: 'https://example.eth/path',
      },
      {
        input: `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}test.eth/path`,
        expected: 'https://test.eth/path',
      },
      {
        input: `${AppConstants.SWARM_DEFAULT_GATEWAY_URL}Qm789/path`,
        expected: 'https://swarm.eth/path',
      },
      {
        input: 'https://regular-url.com',
        expected: 'https://regular-url.com',
      },
      {
        input: '',
        expected: '',
      },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should correctly mask ${input}`, () => {
        expect(getMaskedUrl(input, sessionENSNames)).toBe(expected);
      });
    });
  });
});
