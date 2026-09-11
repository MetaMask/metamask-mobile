import React from 'react';
import { act, render } from '@testing-library/react-native';
import type { WebViewMessageEvent } from '@metamask/react-native-webview/src/WebViewTypes';

import {
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

jest.mock('./wasm-wrapper.standalone.html', () => ({
  __esModule: true,
  default: '<html />',
}));

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
});
