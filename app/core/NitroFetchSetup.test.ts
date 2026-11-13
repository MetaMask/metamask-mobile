import {
  fetch as nitroFetch,
  prefetchOnAppStart,
} from 'react-native-nitro-fetch';
import {
  C2_DOMAIN_BLOCKLIST_URL,
  METAMASK_STALELIST_URL,
} from '@metamask/phishing-controller';
import {
  addEventListener as addNetInfoEventListener,
  type NetInfoState,
} from '@react-native-community/netinfo';

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
}));

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

const mockRecordFetchSample = jest.fn();

jest.mock('../util/deviceCapability/latencyStore', () => {
  const actual = jest.requireActual<
    typeof import('../util/deviceCapability/latencyStore')
  >('../util/deviceCapability/latencyStore');
  return {
    ...actual,
    recordFetchSample: (
      durationMs: Parameters<typeof actual.recordFetchSample>[0],
      epochAtStart: Parameters<typeof actual.recordFetchSample>[1],
    ) => {
      mockRecordFetchSample(durationMs);
      actual.recordFetchSample(durationMs, epochAtStart);
    },
  };
});

import './NitroFetchSetup';
import {
  clearLatencySamples,
  getLatencySnapshot,
  getLatencyThresholds,
} from '../util/deviceCapability/latencyStore';

// Captured at module load: the store registers its NetInfo listener when
// './NitroFetchSetup' installs, and the `clearAllMocks` in the outer
// beforeEach wipes the mock call history before the latency tests run.
const netInfoListener = jest.mocked(addNetInfoEventListener).mock
  .calls[0]?.[0] as unknown as ((state: NetInfoState) => void) | undefined;

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

    describe('normalizeBodyForNitroFetch — Uint8Array/ArrayBuffer body coercion', () => {
      // nitro-fetch's buildNitroRequest hardcodes `bodyBytes: undefined`,
      // silently dropping binary bodies. These tests verify the shim converts
      // them to strings so the payload reaches the server intact.

      it('converts a Uint8Array body to a UTF-8 string before calling nitroFetch', async () => {
        const json =
          '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}';
        const body = new TextEncoder().encode(json);

        await global.fetch('https://linea-mainnet.infura.io/v3/key', {
          method: 'POST',
          body,
        });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(typeof passedInit?.body).toBe('string');
        expect(passedInit?.body).toBe(json);
      });

      it('converts an ArrayBuffer body to a UTF-8 string before calling nitroFetch', async () => {
        const json =
          '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":2}';
        const body = new TextEncoder().encode(json).buffer as ArrayBuffer;

        await global.fetch('https://mainnet.infura.io/v3/key', {
          method: 'POST',
          body,
        });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(typeof passedInit?.body).toBe('string');
        expect(passedInit?.body).toBe(json);
      });

      it('passes a string body through unchanged', async () => {
        const json =
          '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":3}';

        await global.fetch('https://mainnet.infura.io/v3/key', {
          method: 'POST',
          body: json,
        });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(passedInit?.body).toBe(json);
      });

      it('passes null/undefined body through unchanged', async () => {
        await global.fetch('https://example.com', { method: 'GET' });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(passedInit?.body).toBeUndefined();
      });

      it('preserves all other init properties when converting a Uint8Array body', async () => {
        const body = new TextEncoder().encode('{}');

        await global.fetch('https://example.com', {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
        });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(passedInit?.method).toBe('POST');
        expect(
          (passedInit?.headers as Record<string, string>)?.['Content-Type'],
        ).toBe('application/json');
      });

      it('applies body normalisation before prefetchKey injection (both transforms compose)', async () => {
        const json = '{"data":true}';
        const body = new TextEncoder().encode(json);

        await global.fetch(METAMASK_STALELIST_URL, { method: 'POST', body });

        const [, passedInit] = mockNitroFetch.mock.calls[0];
        expect(typeof passedInit?.body).toBe('string');
        expect(passedInit?.body).toBe(json);
        expect((passedInit?.headers as Headers).get('prefetchKey')).toBe(
          'phishing-stalelist',
        );
      });
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

    describe('latency sampling', () => {
      beforeAll(() => {
        // The store drops samples until the first NetInfo event; emit one so
        // the transport gate opens (it never fires by itself under jest).
        netInfoListener?.({
          type: 'wifi',
          isInternetReachable: true,
          details: {},
        } as NetInfoState);
      });

      beforeEach(() => {
        clearLatencySamples();
        mockRecordFetchSample.mockClear();
      });

      const settleHungFetches = async (duringFlight?: () => void) => {
        const hungMs = getLatencyThresholds().hungMs;
        const originalDateNow = Date.now;
        let now = 0;
        let started = 0;
        let release: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        Date.now = () => now;
        mockNitroFetch.mockImplementation(async () => {
          started += 1;
          if (started === 2) {
            duringFlight?.();
            now = hungMs;
            release();
          }
          await gate;
          return new Response(null, { status: 200 });
        });

        try {
          await Promise.all([
            global.fetch('https://example.com/a'),
            global.fetch('https://example.com/b'),
          ]);
        } finally {
          Date.now = originalDateNow;
          mockNitroFetch.mockResolvedValue(new Response(null, { status: 200 }));
        }
      };

      it('drops fetches that were in flight across a latency clear', async () => {
        await settleHungFetches(() => {
          clearLatencySamples();
        });

        expect(mockRecordFetchSample).toHaveBeenCalledTimes(2);
        expect(getLatencySnapshot()).toBe('UNKNOWN');
      });

      it('records hung fetches that settle without a latency clear', async () => {
        await settleHungFetches();

        expect(getLatencySnapshot()).toBe('SLOW');
      });

      it('records one sample for an HTTP response', async () => {
        mockNitroFetch.mockResolvedValueOnce(
          new Response(null, { status: 500 }),
        );

        await global.fetch('https://example.com/api?secret=1');

        expect(mockRecordFetchSample).toHaveBeenCalledTimes(1);
        expect(mockRecordFetchSample).toHaveBeenCalledWith(expect.any(Number));
      });

      it('rethrows a fast connection failure without a sample', async () => {
        const failure = new Error(
          'Cronet failed: net::ERR_CONNECTION_TIMED_OUT',
        );
        mockNitroFetch.mockRejectedValueOnce(failure);

        await expect(global.fetch('https://example.com')).rejects.toBe(failure);

        expect(mockRecordFetchSample).not.toHaveBeenCalled();
      });

      it('skips a short AbortError and rethrows it', async () => {
        const abort = new Error('Aborted');
        abort.name = 'AbortError';
        mockNitroFetch.mockRejectedValueOnce(abort);

        await expect(global.fetch('https://example.com')).rejects.toBe(abort);

        expect(mockRecordFetchSample).not.toHaveBeenCalled();
      });

      it('skips a nitroPrefetched response', async () => {
        mockNitroFetch.mockResolvedValueOnce(
          new Response(null, { headers: { nitroPrefetched: 'true' } }),
        );

        await global.fetch(METAMASK_STALELIST_URL);

        expect(mockRecordFetchSample).not.toHaveBeenCalled();
      });

      it('passes a stream fetch through without a sample', async () => {
        const init = { stream: true } as RequestInit;

        await global.fetch('https://example.com/stream', init);

        expect(mockNitroFetch).toHaveBeenCalledWith(
          'https://example.com/stream',
          init,
        );
        expect(mockRecordFetchSample).not.toHaveBeenCalled();
      });

      it.each(['data:application/json;base64,e30=', 'file:///tmp/token.json'])(
        'passes a %s fetch through without a sample',
        async (url) => {
          await global.fetch(url);

          expect(mockNitroFetch).toHaveBeenCalledWith(url, undefined);
          expect(mockRecordFetchSample).not.toHaveBeenCalled();
        },
      );
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
