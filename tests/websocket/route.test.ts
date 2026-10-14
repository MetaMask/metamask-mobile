import { WS_SERVICES } from './constants.ts';
import { resolveWebSocketTarget, type WebSocketRoutes } from './route.ts';

describe('resolveWebSocketTarget', () => {
  // Route table the way shim.js builds it from WS_SERVICES.
  const wsRoutes: WebSocketRoutes = {
    [WS_SERVICES[0].url]: 'ws://localhost:8089',
  };
  const mockServerPort = 5000;

  describe('WS_SERVICES exact-prefix routes', () => {
    it('rewrites a matching production prefix to the per-service local mock URL', () => {
      const url = 'wss://gateway.api.cx.metamask.io/User-Wallet';

      const result = resolveWebSocketTarget(url, wsRoutes, mockServerPort);

      expect(result).toBe('ws://localhost:8089');
    });

    it('gives exact-prefix routes precedence over the generic /proxy-ws fallback', () => {
      const url = `${WS_SERVICES[0].url}?should-not-be-proxied`;

      const result = resolveWebSocketTarget(url, wsRoutes, mockServerPort);

      expect(result).toBe('ws://localhost:8089');
    });
  });

  describe('generic /proxy-ws fallback', () => {
    it('rewrites an unmatched wss:// URL to the central mock server', () => {
      const url = 'wss://polygon-mumbai.g.alchemy.com/v2/key';

      const result = resolveWebSocketTarget(url, wsRoutes, mockServerPort);

      expect(result).toBe(
        `ws://localhost:${mockServerPort}/proxy-ws?url=${encodeURIComponent(url)}`,
      );
    });

    it('rewrites an unmatched plaintext ws:// URL as well', () => {
      const url = 'ws://example.live-data.host/socket';

      const result = resolveWebSocketTarget(url, wsRoutes, mockServerPort);

      expect(result).toBe(
        `ws://localhost:${mockServerPort}/proxy-ws?url=${encodeURIComponent(url)}`,
      );
    });

    it('uses the mockServerPort argument, not a hardcoded port', () => {
      const result = resolveWebSocketTarget(
        'wss://example.com/ws',
        wsRoutes,
        65123,
      );

      expect(result).toBe(
        `ws://localhost:65123/proxy-ws?url=${encodeURIComponent(
          'wss://example.com/ws',
        )}`,
      );
    });

    it('uses the mockServerHost argument for the fallback rewrite', () => {
      const url = 'wss://example.com/ws';

      const result = resolveWebSocketTarget(
        url,
        wsRoutes,
        mockServerPort,
        undefined,
        '10.0.2.2',
      );

      expect(result).toBe(
        `ws://10.0.2.2:${mockServerPort}/proxy-ws?url=${encodeURIComponent(url)}`,
      );
    });
  });

  describe('exemptions (pass through untouched)', () => {
    it.each([
      'ws://localhost:8545',
      'ws://127.0.0.1:8545',
      'ws://10.0.2.2:8545',
      'wss://localhost:8545/socket',
    ])('does not rewrite local URL %s', (url) => {
      expect(resolveWebSocketTarget(url, wsRoutes, mockServerPort)).toBe(url);
    });

    it('does not rewrite URLs already pointing at the mock server', () => {
      const url = `ws://localhost:${mockServerPort}/proxy-ws?url=${encodeURIComponent(
        'wss://example.com/ws',
      )}`;

      expect(resolveWebSocketTarget(url, wsRoutes, mockServerPort)).toBe(url);
    });

    it('does not rewrite URLs pointing at the mock server via the mockServerHost argument', () => {
      const url = `ws://10.0.2.2:${mockServerPort}/proxy-ws?url=${encodeURIComponent(
        'wss://example.com/ws',
      )}`;

      expect(
        resolveWebSocketTarget(
          url,
          wsRoutes,
          mockServerPort,
          undefined,
          '10.0.2.2',
        ),
      ).toBe(url);
    });

    it('does not rewrite URLs containing /proxy', () => {
      const url = 'wss://example.com/proxy/socket';

      expect(resolveWebSocketTarget(url, wsRoutes, mockServerPort)).toBe(url);
    });

    it('does not rewrite a URL matching the shouldBypassProxy predicate', () => {
      const url = 'wss://auth-service.uat-api.cx.metamask.io/socket';
      const shouldBypassProxy = (targetUrl: string) =>
        targetUrl.includes('auth-service.uat-api.cx.metamask.io');

      const result = resolveWebSocketTarget(
        url,
        wsRoutes,
        mockServerPort,
        shouldBypassProxy,
      );

      expect(result).toBe(url);
    });

    it('does not rewrite non-ws schemes (handled by the fetch/XHR patches)', () => {
      const url = 'https://api.cx.metamask.io/graphql';

      expect(resolveWebSocketTarget(url, wsRoutes, mockServerPort)).toBe(url);
    });
  });

  describe('non-string URLs', () => {
    it('passes a URL object through by reference', () => {
      const url = new URL('wss://example.com/ws');

      const result = resolveWebSocketTarget(url, wsRoutes, mockServerPort);

      expect(result).toBe(url);
    });

    it.each([undefined, null, 42])(
      'passes through %p untouched',
      (url: unknown) => {
        expect(resolveWebSocketTarget(url, wsRoutes, mockServerPort)).toBe(url);
      },
    );
  });
});
