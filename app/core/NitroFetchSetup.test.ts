import {
  fetch as nitroFetch,
  prefetchOnAppStart,
  Headers as NitroHeaders,
  Request as NitroRequest,
  Response as NitroResponse,
} from 'react-native-nitro-fetch';
import {
  C2_DOMAIN_BLOCKLIST_URL,
  METAMASK_STALELIST_URL,
} from '@metamask/phishing-controller';

jest.mock('react-native-nitro-fetch', () => ({
  fetch: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
  prefetchOnAppStart: jest.fn().mockResolvedValue(undefined),
  Headers: globalThis.Headers,
  Request: globalThis.Request,
  Response: globalThis.Response,
}));

jest.mock('@metamask/phishing-controller', () => ({
  C2_DOMAIN_BLOCKLIST_URL: 'https://phishing.example.com/c2-blocklist',
  METAMASK_STALELIST_URL: 'https://phishing.example.com/stalelist',
}));

jest.mock('@metamask/remote-feature-flag-controller', () => ({
  ClientType: { Mobile: 'mobile' },
}));

jest.mock('./Engine/controllers/remote-feature-flag-controller/utils', () => ({
  getFeatureFlagAppDistribution: jest.fn(() => 'main'),
  getFeatureFlagAppEnvironment: jest.fn(() => 'production'),
}));

import './NitroFetchSetup';

const mockNitroFetch = jest.mocked(nitroFetch);
const mockPrefetchOnAppStart = jest.mocked(prefetchOnAppStart);

const FEATURE_FLAGS_PREFIX =
  'https://client-config.api.cx.metamask.io/v1/flags';

describe('NitroFetchSetup', () => {
  describe('startup prefetch registration', () => {
    it('registers all three startup prefetch endpoints on module load', () => {
      expect(mockPrefetchOnAppStart).toHaveBeenCalledTimes(3);
      expect(mockPrefetchOnAppStart).toHaveBeenCalledWith(
        expect.stringContaining(FEATURE_FLAGS_PREFIX),
        { prefetchKey: 'feature-flags' },
      );
      expect(mockPrefetchOnAppStart).toHaveBeenCalledWith(
        METAMASK_STALELIST_URL,
        {
          prefetchKey: 'phishing-stalelist',
        },
      );
      expect(mockPrefetchOnAppStart).toHaveBeenCalledWith(
        C2_DOMAIN_BLOCKLIST_URL,
        {
          prefetchKey: 'phishing-c2-blocklist',
        },
      );
    });

    it('registers feature-flags URL with correct client, distribution, and environment values', () => {
      expect(mockPrefetchOnAppStart).toHaveBeenCalledWith(
        `${FEATURE_FLAGS_PREFIX}?client=mobile&distribution=main&environment=production`,
        { prefetchKey: 'feature-flags' },
      );
    });
  });

  describe('hasTestOverrides guard', () => {
    it('skips prefetchOnAppStart registration when hasTestOverrides is true', async () => {
      let localPrefetch: jest.Mock = jest.fn();

      await jest.isolateModulesAsync(async () => {
        localPrefetch = jest.fn();

        jest.doMock('react-native-nitro-fetch', () => ({
          fetch: jest.fn().mockResolvedValue({ ok: true, status: 200 }),
          prefetchOnAppStart: localPrefetch,
          Headers: global.Headers,
          Request: global.Request,
          Response: global.Response,
        }));
        jest.doMock('../util/test/utils', () => ({
          hasTestOverrides: true,
        }));

        await import('./NitroFetchSetup');
      });

      expect(localPrefetch).not.toHaveBeenCalled();
    });
  });

  describe('installFetchGlobals — WHATWG constructor globals', () => {
    it('installs Headers, Request, and Response onto the global object', () => {
      // NitroFetchSetup is imported at the top of this file, so the constructor
      // globals must already be present as functional constructors.
      expect(global.Headers).toBe(NitroHeaders);
      expect(global.Request).toBe(NitroRequest);
      expect(global.Response).toBe(NitroResponse);
      expect(typeof global.Headers).toBe('function');
    });
  });

  describe('global.fetch', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('replaces global.fetch with a nitro-fetch wrapper', async () => {
      await global.fetch('https://example.com');

      expect(mockNitroFetch).toHaveBeenCalledWith(
        'https://example.com',
        undefined,
      );
    });

    it('returns the response resolved by nitroFetch', async () => {
      const mockResponse = { ok: true, status: 200 } as unknown as Response;
      mockNitroFetch.mockResolvedValueOnce(mockResponse);

      const result = await global.fetch('https://example.com');

      expect(result).toBe(mockResponse);
    });

    it('rejects with the error thrown by nitroFetch', async () => {
      const networkError = new Error('Network request failed');
      mockNitroFetch.mockRejectedValueOnce(networkError);

      await expect(global.fetch('https://example.com')).rejects.toThrow(
        'Network request failed',
      );
    });

    describe('withPrefetchKey — header injection', () => {
      it('injects prefetchKey for feature-flags URL with dynamic query params', async () => {
        const url = `${FEATURE_FLAGS_PREFIX}?client=mobile&distribution=main&environment=production`;

        await global.fetch(url);

        const [, init] = mockNitroFetch.mock.calls[0];
        expect((init?.headers as Headers).get('prefetchKey')).toBe(
          'feature-flags',
        );
      });

      it('injects prefetchKey for phishing stalelist URL', async () => {
        await global.fetch(METAMASK_STALELIST_URL);

        const [, init] = mockNitroFetch.mock.calls[0];
        expect((init?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-stalelist',
        );
      });

      it('injects prefetchKey for C2 domain blocklist URL', async () => {
        await global.fetch(C2_DOMAIN_BLOCKLIST_URL);

        const [, init] = mockNitroFetch.mock.calls[0];
        expect((init?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-c2-blocklist',
        );
      });

      it('preserves existing init options alongside injected prefetchKey', async () => {
        const init = { method: 'GET' as const };

        await global.fetch(METAMASK_STALELIST_URL, init);

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(passedInit).toMatchObject({ method: 'GET' });
        expect((passedInit?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-stalelist',
        );
      });

      it('does not overwrite an existing prefetchKey (idempotent)', async () => {
        const init = { headers: { prefetchKey: 'custom-key' } };

        await global.fetch(METAMASK_STALELIST_URL, init);

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect((passedInit?.headers as Headers).get('prefetchKey')).toBe(
          'custom-key',
        );
      });

      it('passes init through unchanged for non-prefetch URLs', async () => {
        const init = {
          method: 'POST' as const,
          headers: { 'Content-Type': 'application/json' },
        };

        await global.fetch('https://example.com/api', init);

        expect(mockNitroFetch).toHaveBeenCalledWith(
          'https://example.com/api',
          init,
        );
      });

      it('passes undefined init through unchanged for non-prefetch URLs', async () => {
        await global.fetch('https://example.com');

        expect(mockNitroFetch).toHaveBeenCalledWith(
          'https://example.com',
          undefined,
        );
      });

      it('merges injected prefetchKey into an existing Headers instance without overwriting other headers', async () => {
        const existingHeaders = new Headers({ Authorization: 'Bearer token' });

        await global.fetch(METAMASK_STALELIST_URL, {
          headers: existingHeaders,
        });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        const headers = passedInit?.headers as Headers;
        expect(headers.get('prefetchKey')).toBe('phishing-stalelist');
        expect(headers.get('Authorization')).toBe('Bearer token');
      });

      it('preserves request body and method when injecting prefetchKey', async () => {
        const init: RequestInit = {
          method: 'POST',
          body: JSON.stringify({ data: 'value' }),
        };

        await global.fetch(METAMASK_STALELIST_URL, init);

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(passedInit?.method).toBe('POST');
        expect(passedInit?.body).toBe(JSON.stringify({ data: 'value' }));
      });
    });

    describe('getUrl — input type normalization', () => {
      it('extracts URL from a URL object for prefix matching', async () => {
        const url = new URL(METAMASK_STALELIST_URL);

        await global.fetch(url);

        const [, init] = mockNitroFetch.mock.calls[0];
        expect((init?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-stalelist',
        );
      });

      it('extracts URL from a Request-like object for prefix matching', async () => {
        const request = { url: METAMASK_STALELIST_URL } as Request;

        await global.fetch(request);

        const [, init] = mockNitroFetch.mock.calls[0];
        expect((init?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-stalelist',
        );
      });

      it('passes non-matching URL object through without injecting headers', async () => {
        const url = new URL('https://example.com');

        await global.fetch(url);

        expect(mockNitroFetch).toHaveBeenCalledWith(url, undefined);
      });

      it('treats plain string input as the URL for prefix matching', async () => {
        await global.fetch(METAMASK_STALELIST_URL);

        const [, init] = mockNitroFetch.mock.calls[0];
        expect((init?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-stalelist',
        );
      });
    });
  });
});
