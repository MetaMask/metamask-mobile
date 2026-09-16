import React from 'react';
import { act, render } from '@testing-library/react-native';
import type { WebViewMessageEvent } from '@metamask/react-native-webview/src/WebViewTypes';

import {
  denyLighterSignerNavigation,
  isValidLighterSignerResult,
  LIGHTER_SIGNER_RELOAD_BASE_DELAY_MS,
  LighterSignerWebView,
  MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS,
  parseLighterPageMessage,
} from './LighterSignerWebView';
import {
  lighterSignerBridge,
  resetLighterBridge,
  reviveLighterBridge,
} from './lighterSignerBridge';

interface MockWebViewProps {
  onMessage?: (event: WebViewMessageEvent) => void;
  onError?: (event: never) => void;
  onContentProcessDidTerminate?: () => void;
  originWhitelist?: string[];
  onShouldStartLoadWithRequest?: () => boolean;
}

let mockWebViewProps: MockWebViewProps = {};
let mockWebViewRenderCount = 0;
let mockAttachWebViewRef = true;
const mockPostMessage = jest.fn();

jest.mock('@metamask/react-native-webview', () => {
  const react = jest.requireActual('react') as typeof import('react');
  return {
    WebView: react.forwardRef(
      (props: MockWebViewProps, ref: React.ForwardedRef<unknown>) => {
        mockWebViewProps = props;
        mockWebViewRenderCount += 1;
        react.useImperativeHandle(
          ref,
          () =>
            mockAttachWebViewRef ? { postMessage: mockPostMessage } : null,
          [],
        );
        return null;
      },
    ),
  };
});

// The component imports this page as an inlined string (babel-plugin-inline-import).
// The mock keeps the 10 MB payload out of the component tests, while
// `readSignerPageSource` reads the real artifact for the boundary assertions —
// the CSP only matters on the page that actually ships.
jest.mock('./wasm-wrapper.standalone.html', () => ({
  __esModule: true,
  default: '<html />',
}));

function readSignerPageSource(): string {
  // Resolved through jest.requireActual rather than a static import: `fs` and
  // `path` imports are banned in app code by import-x/no-nodejs-modules, and
  // this only ever runs inside the Jest (Node) environment.
  const { readFileSync } = jest.requireActual<typeof import('fs')>('fs');
  const { join } = jest.requireActual<typeof import('path')>('path');
  return readFileSync(join(__dirname, 'wasm-wrapper.standalone.html'), 'utf8');
}

jest.mock('react-native-quick-crypto', () => ({
  __esModule: true,
  default: { randomBytes: jest.fn(() => Buffer.alloc(32, 0xab)) },
}));

jest.mock('../../../../core/SecureKeychain', () => ({
  __esModule: true,
  default: {
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only' },
    getSecureItem: jest.fn().mockResolvedValue(null),
    setSecureItem: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../../../util/test/utils', () => ({
  isTestEnvironment: false,
}));

function messageEvent(message: unknown): WebViewMessageEvent {
  return {
    nativeEvent: { data: JSON.stringify(message) },
  } as WebViewMessageEvent;
}

describe('LighterSignerWebView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebViewProps = {};
    mockWebViewRenderCount = 0;
    mockAttachWebViewRef = true;
  });

  afterEach(() => {
    reviveLighterBridge();
    resetLighterBridge();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('parses only supported message discriminants and field types', () => {
    const ready = parseLighterPageMessage('{"type":"ready"}');
    const malformed = parseLighterPageMessage(
      '{"type":"executeError","executeId":4,"message":[]}',
    );

    expect(ready).toStrictEqual({ type: 'ready' });
    expect(malformed).toBeNull();
    expect(parseLighterPageMessage('not-json')).toBeNull();
  });

  it('parses console forwarding messages only when the payload is string-shaped', () => {
    // The page forwards console output as either a single string or an array
    // of strings; anything else is a malformed frame and must be dropped.
    expect(
      parseLighterPageMessage('{"type":"log","message":"hello"}'),
    ).toStrictEqual({
      type: 'log',
      message: 'hello',
    });
    expect(
      parseLighterPageMessage('{"type":"warn","message":["a","b"]}'),
    ).toStrictEqual({ type: 'warn', message: ['a', 'b'] });
    expect(
      parseLighterPageMessage('{"type":"error","message":"boom"}'),
    ).toStrictEqual({ type: 'error', message: 'boom' });
    expect(
      parseLighterPageMessage('{"type":"log","message":[1,2]}'),
    ).toBeNull();
    expect(parseLighterPageMessage('{"type":"log","message":{}}')).toBeNull();
  });

  it('drops messages with an unknown or non-string discriminant', () => {
    expect(parseLighterPageMessage('{"type":"unsupported"}')).toBeNull();
    expect(parseLighterPageMessage('{"type":7}')).toBeNull();
    expect(parseLighterPageMessage('[]')).toBeNull();
  });

  it('validates function-specific signer result shapes', () => {
    expect(
      isValidLighterSignerResult('_createClient', {
        success: true,
        pk: 'public-key',
        pubKeySuccess: true,
        body: 'body',
      }),
    ).toBe(true);
    expect(
      isValidLighterSignerResult('_createAuthToken', {
        token: 'token',
        deadline: 'tomorrow',
      }),
    ).toBe(false);
    expect(
      isValidLighterSignerResult('_signCreateOrder', { txInfo: 'signed' }),
    ).toBe(true);
  });

  it('rejects immediately when the ready executor has no mounted WebView', async () => {
    mockAttachWebViewRef = false;
    render(<LighterSignerWebView />);
    act(() => {
      mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
    });

    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });

    await expect(pending).rejects.toThrow(
      'Lighter signer WebView is not mounted',
    );
  });

  it('rejects pending execution when the signer unmounts', async () => {
    const { unmount } = render(<LighterSignerWebView />);
    act(() => {
      mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
    });
    const pending = lighterSignerBridge
      .execute({ function: '_createAuthToken', params: [28, 7] })
      .catch((error: Error) => error);
    await act(async () => undefined);

    unmount();

    await expect(pending).resolves.toEqual(
      new Error('Lighter signer WebView unmounted'),
    );
  });

  it('rejects a response whose result does not match the requested function', async () => {
    render(<LighterSignerWebView />);
    act(() => {
      mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
    });
    const pending = lighterSignerBridge
      .execute({ function: '_createAuthToken', params: [28, 7] })
      .catch((error: Error) => error);
    await act(async () => undefined);
    const posted = JSON.parse(mockPostMessage.mock.calls[0][0]) as {
      executeId: string;
    };

    act(() => {
      mockWebViewProps.onMessage?.(
        messageEvent({
          type: 'executeResult',
          executeId: posted.executeId,
          result: { token: 'missing-deadline' },
        }),
      );
    });

    await expect(pending).resolves.toEqual(
      new Error('Invalid Lighter signer result for _createAuthToken'),
    );
  });

  it.each([
    [{ error: 'MarketIndex is not valid' }, 'MarketIndex is not valid'],
    [
      { error: 'MarketIndex is not valid', txInfo: 'unused' },
      'MarketIndex is not valid',
    ],
    [{ error: '' }, 'Invalid Lighter signer result for _signCreateOrder'],
    [{ error: ' ' }, 'Invalid Lighter signer result for _signCreateOrder'],
    [{ error: 42 }, 'Invalid Lighter signer result for _signCreateOrder'],
  ])(
    'rejects signer failure %j without accepting a success payload',
    async (result, expected) => {
      render(<LighterSignerWebView />);
      act(() => {
        mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
      });
      const pending = lighterSignerBridge
        .execute({
          function: '_signCreateOrder',
          params: [59, 4096, 123456, '13', '808550', 0, 1, 0, 0, '0', 0, 2],
        })
        .catch((error: Error) => error);
      await act(async () => undefined);
      const posted = JSON.parse(mockPostMessage.mock.calls[0][0]) as {
        executeId: string;
      };

      act(() => {
        mockWebViewProps.onMessage?.(
          messageEvent({
            type: 'executeResult',
            executeId: posted.executeId,
            result,
          }),
        );
      });

      await expect(pending).resolves.toEqual(new Error(expected));
    },
  );

  it('records dev readiness without creating a throwaway WASM client', () => {
    render(<LighterSignerWebView />);

    act(() => {
      mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
    });

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('does not exhaust reload attempts when each failure recovers', async () => {
    // Regression: reloadAttemptsRef climbed for the whole WebView lifetime and
    // was never cleared on a successful `ready`, so transient content-process
    // deaths spread across a long session accumulated and tripped terminal
    // unavailability even though the signer recovered every time.
    jest.useFakeTimers();
    render(<LighterSignerWebView />);

    // Hoisted out of the loop: closing over `mockWebViewProps` inside a loop
    // body trips `no-loop-func`.
    const terminateRenderer = () => {
      mockWebViewProps.onContentProcessDidTerminate?.();
    };
    const signalReady = () => {
      mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
    };

    // Twice the threshold, each failure followed by a successful ready.
    for (
      let attempt = 0;
      attempt < MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS * 2;
      attempt++
    ) {
      act(terminateRenderer);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          LIGHTER_SIGNER_RELOAD_BASE_DELAY_MS * 2,
        );
      });
      act(signalReady);
    }

    // Still alive: the executor answers instead of a terminal rejection.
    mockPostMessage.mockClear();
    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });
    await act(async () => undefined);
    const posted = JSON.parse(mockPostMessage.mock.calls[0][0]) as {
      executeId: string;
    };

    act(() => {
      mockWebViewProps.onMessage?.(
        messageEvent({
          type: 'executeResult',
          executeId: posted.executeId,
          result: { token: 'ok', deadline: 1 },
        }),
      );
    });
    await expect(pending).resolves.toStrictEqual({ token: 'ok', deadline: 1 });
  });

  it('keeps the signer unavailable after a same-tick terminal ready event', async () => {
    jest.useFakeTimers();
    render(<LighterSignerWebView />);
    const terminateRenderer = () => {
      mockWebViewProps.onContentProcessDidTerminate?.();
    };

    for (
      let attempt = 0;
      attempt < MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS;
      attempt++
    ) {
      act(terminateRenderer);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          LIGHTER_SIGNER_RELOAD_BASE_DELAY_MS * 2 ** attempt,
        );
      });
    }
    act(() => {
      mockWebViewProps.onContentProcessDidTerminate?.();
      mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' }));
    });

    expect(mockWebViewRenderCount).toBe(MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS + 1);
    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).rejects.toThrow('unavailable after repeated WebView load failures');
  });

  describe('outbound-network boundary', () => {
    // The signer receives a SecureKeychain-backed private key, so a
    // compromised WASM artifact must have no way to send it anywhere.
    // Navigation and fetch/XHR/WebSocket are separate surfaces and are
    // asserted separately below.

    it('denies every navigation the signer page attempts', () => {
      render(<LighterSignerWebView />);

      expect(mockWebViewProps.onShouldStartLoadWithRequest).toBe(
        denyLighterSignerNavigation,
      );
      expect(denyLighterSignerNavigation()).toBe(false);
    });

    it('routes every request through the deny guard instead of escalating it to the OS', () => {
      // A URL that fails originWhitelist is not blocked — react-native-webview
      // forwards it to Linking.openURL. Keeping the whitelist permissive means
      // the guard above sees every request and denies it in-process.
      render(<LighterSignerWebView />);

      expect(mockWebViewProps.originWhitelist).toStrictEqual(['*']);
      expect(mockWebViewProps.onShouldStartLoadWithRequest?.()).toBe(false);
    });

    it('serves a page whose CSP blocks fetch, XHR, WebSocket and every subresource', () => {
      // Reads the real asset, not the mocked HTML: the CSP is the only control
      // that stops requests originWhitelist cannot gate, so it must be
      // asserted against the artifact that actually ships.
      const html = readSignerPageSource();
      const csp =
        /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/u.exec(
          html,
        )?.[1];

      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'none'");
      expect(csp).toContain("connect-src 'none'");
      expect(csp).toContain("form-action 'none'");
      expect(csp).toContain("base-uri 'none'");
    });

    it('ships a signer page that makes no outbound request of its own', () => {
      const html = readSignerPageSource();
      // The WASM payload is inlined as base64 and instantiated from memory,
      // so the page has no legitimate reason to reach the network. If this
      // ever fails, the deny-all CSP above would break the signer — which is
      // the point: the boundary is enforced, not assumed.
      const scriptBody = html.slice(html.indexOf('<body>'));

      expect(scriptBody).not.toMatch(/\bfetch\s*\(/u);
      expect(scriptBody).not.toMatch(/\bXMLHttpRequest\b/u);
      expect(scriptBody).not.toMatch(/\bnew\s+WebSocket\b/u);
      expect(scriptBody).not.toMatch(/\bnavigator\.sendBeacon\b/u);
      expect(scriptBody).not.toMatch(/\bimportScripts\s*\(/u);
      expect(scriptBody).not.toMatch(/WebAssembly\.instantiateStreaming/u);
    });
  });
});
