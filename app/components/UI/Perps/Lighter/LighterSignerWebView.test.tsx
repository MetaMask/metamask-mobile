import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import React from 'react';
import SecureKeychain from '../../../../core/SecureKeychain';
import Logger from '../../../../util/Logger';
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
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean;
  setSupportMultipleWindows?: boolean;
  allowFileAccess?: boolean;
  allowUniversalAccessFromFileURLs?: boolean;
}

let mockWebViewProps: MockWebViewProps = {};
let mockWebViewRenderCount = 0;
let mockAttachWebViewRef = true;
const mockPostMessage = jest.fn();
const mockWebViewUnmount = jest.fn();

jest.mock('react-redux', () => ({ useSelector: jest.fn(() => true) }));

jest.mock('@metamask/react-native-webview', () => {
  const react = jest.requireActual('react') as typeof import('react');
  return {
    WebView: react.forwardRef(
      (props: MockWebViewProps, ref: React.ForwardedRef<unknown>) => {
        mockWebViewProps = props;
        mockWebViewRenderCount += 1;
        react.useEffect(() => () => mockWebViewUnmount(), []);
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

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

jest.mock('./wasm-wrapper.standalone.html', () => ({
  __esModule: true,
  default: '<html />',
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: { KeyringController: { isUnlocked: jest.fn(() => true) } },
    controllerMessenger: { subscribe: jest.fn(), tryUnsubscribe: jest.fn() },
  },
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
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(true);
    jest.mocked(useSelector).mockReturnValue(true);
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

  const emitWalletEvent = (
    name: 'KeyringController:lock' | 'KeyringController:unlock',
  ) => {
    const subscription = jest
      .mocked(Engine.controllerMessenger.subscribe)
      .mock.calls.find(([event]) => event === name);
    expect(subscription).toBeDefined();
    (subscription?.[1] as () => void)();
  };

  it('does not mount the native signer while the wallet is locked', () => {
    jest.mocked(useSelector).mockReturnValue(false);

    render(<LighterSignerWebView />);

    expect(mockWebViewRenderCount).toBe(0);
  });

  it('retires pending signing and destroys the native page immediately on lock', async () => {
    render(<LighterSignerWebView />);
    act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));
    const pending = lighterSignerBridge
      .execute({ function: '_createAuthToken', params: [28, 7] })
      .catch((error: Error) => error);
    await act(async () => undefined);
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const previousPage = mockWebViewProps;

    act(() => {
      jest
        .mocked(Engine.context.KeyringController.isUnlocked)
        .mockReturnValue(false);
      emitWalletEvent('KeyringController:lock');
    });

    await expect(pending).resolves.toEqual(
      new Error('Lighter signer wallet is locked'),
    );
    expect(mockWebViewUnmount).toHaveBeenCalledTimes(1);
    act(() => previousPage.onMessage?.(messageEvent({ type: 'ready' })));
    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).rejects.toThrow('wallet is locked');
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
  });

  it('does not replace a live page for a repeated unlock notification', () => {
    render(<LighterSignerWebView />);

    act(() => emitWalletEvent('KeyringController:unlock'));

    expect(mockWebViewRenderCount).toBe(1);
    expect(mockWebViewUnmount).not.toHaveBeenCalled();
  });

  it('uses a fresh native page after a lock and unlock in one render batch', async () => {
    render(<LighterSignerWebView />);
    act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));

    const retiredPage = mockWebViewProps;
    act(() => {
      jest
        .mocked(Engine.context.KeyringController.isUnlocked)
        .mockReturnValue(false);
      emitWalletEvent('KeyringController:lock');
      jest
        .mocked(Engine.context.KeyringController.isUnlocked)
        .mockReturnValue(true);
      emitWalletEvent('KeyringController:unlock');
      retiredPage.onMessage?.(messageEvent({ type: 'ready' }));
    });

    expect(mockWebViewUnmount).toHaveBeenCalledTimes(1);
    expect(mockWebViewRenderCount).toBe(2);
    const pending = lighterSignerBridge
      .execute({ function: '_createAuthToken', params: [28, 7] })
      .catch((error: Error) => error);
    await act(async () => undefined);
    expect(mockPostMessage).not.toHaveBeenCalled();
    act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));
    await act(async () => undefined);
    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const { executeId } = JSON.parse(mockPostMessage.mock.calls[0][0]);
    act(() =>
      mockWebViewProps.onMessage?.(
        messageEvent({
          type: 'executeResult',
          executeId,
          result: { token: 'fresh', deadline: 123 },
        }),
      ),
    );
    await expect(pending).resolves.toEqual({ token: 'fresh', deadline: 123 });
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

  it('rejects setup when the host unmounts during keychain retrieval', async () => {
    jest.useFakeTimers();
    let finishRead!: (
      value: Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>,
    ) => void;
    jest.mocked(SecureKeychain.getSecureItem).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );
    const { unmount } = render(<LighterSignerWebView />);
    const rejected = jest.fn();
    const pending = lighterSignerBridge
      .createClient({
        chainId: 300,
        accountIndex: 28,
        nonce: 9,
        apiKeyIndex: 7,
      })
      .catch(rejected);

    unmount();
    await jest.advanceTimersByTimeAsync(0);

    expect(rejected).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('reloaded') }),
    );
    finishRead(null);
    await pending;
    await jest.advanceTimersByTimeAsync(0);
    expect(mockPostMessage).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
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

  it('blocks external and new-window navigation', () => {
    render(<LighterSignerWebView />);

    expect(mockWebViewProps.setSupportMultipleWindows).toBe(false);
    expect(mockWebViewProps.allowFileAccess).toBe(false);
    expect(mockWebViewProps.allowUniversalAccessFromFileURLs).toBe(false);
    expect(
      mockWebViewProps.onShouldStartLoadWithRequest?.({
        url: 'https://attacker.example',
      }),
    ).toBe(false);
    expect(
      mockWebViewProps.onShouldStartLoadWithRequest?.({
        url: 'https://localhost/',
      }),
    ).toBe(true);
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

  it('retries WASM initialization failures until the reload limit is reached', async () => {
    jest.useFakeTimers();
    const { toJSON } = render(<LighterSignerWebView />);
    const failInitialization = () => {
      mockWebViewProps.onMessage?.(
        messageEvent({ type: 'initError', message: 'Allocation failed' }),
      );
    };

    for (
      let attempt = 0;
      attempt < MAX_LIGHTER_SIGNER_RELOAD_ATTEMPTS;
      attempt++
    ) {
      act(failInitialization);
      await act(async () => {
        await jest.advanceTimersByTimeAsync(
          LIGHTER_SIGNER_RELOAD_BASE_DELAY_MS * 2 ** attempt,
        );
      });
      expect(mockWebViewRenderCount).toBe(attempt + 2);
    }
    act(failInitialization);

    expect(toJSON()).toBeNull();
    expect(Logger.error).toHaveBeenCalledTimes(1);
    expect(Logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { feature: 'perps' } }),
    );
    expect(jest.getTimerCount()).toBe(0);
    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).rejects.toThrow('unavailable after repeated WebView load failures');
  });
});
