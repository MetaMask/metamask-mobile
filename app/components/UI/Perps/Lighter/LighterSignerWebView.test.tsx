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
  clearLighterSignerRequest,
  isLighterSignerRequested,
  lighterSignerBridge,
  requestLighterSigner,
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
    controllerMessenger: {
      subscribe: jest.fn(),
      tryUnsubscribe: jest.fn(),
      call: jest.fn((action: string) => {
        const account = {
          address: `0x${'1'.repeat(40)}`,
          type: 'eip155:eoa',
        };
        if (action === 'AccountsController:getSelectedAccount') {
          return account;
        }
        if (
          action === 'AccountTreeController:getAccountsFromSelectedAccountGroup'
        ) {
          return [account];
        }
        return undefined;
      }),
    },
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
    // Most cases exercise a mounted page; lazy mounting has its own block below.
    requestLighterSigner();
  });

  afterEach(() => {
    act(() => clearLighterSignerRequest());
    reviveLighterBridge();
    resetLighterBridge();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  // Both the host and the page subscribe, so notify every live handler.
  const emitWalletEvent = (
    name: 'KeyringController:lock' | 'KeyringController:unlock',
  ) => {
    const unsubscribed = new Set(
      jest
        .mocked(Engine.controllerMessenger.tryUnsubscribe)
        .mock.calls.filter(([event]) => event === name)
        .map(([, handler]) => handler),
    );
    const handlers = jest
      .mocked(Engine.controllerMessenger.subscribe)
      .mock.calls.filter(
        ([event, handler]) => event === name && !unsubscribed.has(handler),
      )
      .map(([, handler]) => handler as () => void);
    expect(handlers.length).toBeGreaterThan(0);
    handlers.forEach((handler) => handler());
  };

  const lockWallet = () => {
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(false);
    emitWalletEvent('KeyringController:lock');
  };

  const unlockWallet = () => {
    jest
      .mocked(Engine.context.KeyringController.isUnlocked)
      .mockReturnValue(true);
    emitWalletEvent('KeyringController:unlock');
  };

  const deferKeychainRead = () => {
    let finishRead!: (
      value: Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>,
    ) => void;
    jest.mocked(SecureKeychain.getSecureItem).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishRead = resolve;
        }),
    );
    return (value: Awaited<ReturnType<typeof SecureKeychain.getSecureItem>>) =>
      finishRead(value);
  };

  describe('lazy mounting', () => {
    beforeEach(() => {
      clearLighterSignerRequest();
    });

    it('does not load the signer page at unlock until a call needs it', () => {
      render(<LighterSignerWebView />);

      expect(mockWebViewRenderCount).toBe(0);
    });

    it('mounts the page on the first signer call, which waits for ready', async () => {
      render(<LighterSignerWebView />);
      expect(mockWebViewRenderCount).toBe(0);

      let settled = false;
      let pending!: Promise<unknown>;
      act(() => {
        pending = lighterSignerBridge
          .execute({ function: '_createAuthToken', params: [28, 7] })
          .finally(() => {
            settled = true;
          });
      });
      await act(async () => undefined);

      expect(mockWebViewRenderCount).toBe(1);
      expect(mockPostMessage).not.toHaveBeenCalled();
      expect(settled).toBe(false);

      act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));
      await act(async () => undefined);
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const { executeId } = JSON.parse(mockPostMessage.mock.calls[0][0]);
      act(() =>
        mockWebViewProps.onMessage?.(
          messageEvent({
            type: 'executeResult',
            executeId,
            result: { token: 'token', deadline: 1 },
          }),
        ),
      );

      await expect(pending).resolves.toEqual({ token: 'token', deadline: 1 });
    });

    it('starts loading the page as soon as client setup begins', async () => {
      render(<LighterSignerWebView />);

      let setup!: Promise<unknown>;
      act(() => {
        setup = lighterSignerBridge
          .createClient({
            chainId: 304,
            accountIndex: 7,
            nonce: 1,
            apiKeyIndex: 3,
          })
          .catch((error: Error) => error);
      });
      await act(async () => undefined);

      expect(mockWebViewRenderCount).toBeGreaterThan(0);
      act(() => {
        jest
          .mocked(Engine.context.KeyringController.isUnlocked)
          .mockReturnValue(false);
        emitWalletEvent('KeyringController:lock');
      });
      await setup;
    });

    it('key discovery does not load the page', async () => {
      render(<LighterSignerWebView />);

      await act(async () => {
        await lighterSignerBridge.getStoredKeyIndices?.({
          chainId: 304,
          accountIndex: 7,
          apiKeyIndices: [3],
        });
      });

      expect(mockWebViewRenderCount).toBe(0);
      expect(isLighterSignerRequested()).toBe(false);
    });

    it('forgets the request on lock, so the next unlock waits for a new call', () => {
      const { rerender } = render(<LighterSignerWebView />);
      act(() => requestLighterSigner());
      expect(mockWebViewRenderCount).toBe(1);

      act(lockWallet);
      jest.mocked(useSelector).mockReturnValue(false);
      rerender(<LighterSignerWebView />);
      expect(isLighterSignerRequested()).toBe(false);
      expect(mockWebViewUnmount).toHaveBeenCalledTimes(1);

      act(unlockWallet);
      jest.mocked(useSelector).mockReturnValue(true);
      rerender(<LighterSignerWebView />);
      expect(mockWebViewRenderCount).toBe(1);
    });

    it('loads a fresh page for the first call after a lock and unlock', async () => {
      const { rerender } = render(<LighterSignerWebView />);
      act(() => requestLighterSigner());
      act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));

      // The keyring publishes lock before Redux unmounts the page.
      act(lockWallet);
      jest.mocked(useSelector).mockReturnValue(false);
      rerender(<LighterSignerWebView />);

      act(unlockWallet);
      jest.mocked(useSelector).mockReturnValue(true);
      rerender(<LighterSignerWebView />);
      expect(mockWebViewRenderCount).toBe(1);

      let pending!: Promise<unknown>;
      act(() => {
        pending = lighterSignerBridge.execute({
          function: '_createAuthToken',
          params: [28, 7],
        });
      });
      await act(async () => undefined);
      expect(mockWebViewRenderCount).toBe(2);

      act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));
      await act(async () => undefined);
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      const { executeId } = JSON.parse(mockPostMessage.mock.calls[0][0]);
      act(() =>
        mockWebViewProps.onMessage?.(
          messageEvent({
            type: 'executeResult',
            executeId,
            result: { token: 'fresh', deadline: 1 },
          }),
        ),
      );

      await expect(pending).resolves.toEqual({ token: 'fresh', deadline: 1 });
    });

    it('retires key discovery on lock while no page is mounted', async () => {
      render(<LighterSignerWebView />);
      const finishRead = deferKeychainRead();
      const rejected = jest.fn();
      let discovery!: Promise<unknown>;
      act(() => {
        discovery = lighterSignerBridge
          .getStoredKeyIndices?.({
            chainId: 304,
            accountIndex: 7,
            apiKeyIndices: [3],
          })
          .catch(rejected) as Promise<unknown>;
      });
      await act(async () => undefined);

      act(lockWallet);
      await act(async () => undefined);

      expect(rejected).toHaveBeenCalledWith(
        new Error('Lighter signer wallet is locked'),
      );
      expect(mockWebViewRenderCount).toBe(0);
      finishRead(null);
      await discovery;
    });

    it('does not let discovery from before a lock complete after the unlock', async () => {
      render(<LighterSignerWebView />);
      const finishRead = deferKeychainRead();
      const discovery = lighterSignerBridge
        .getStoredKeyIndices?.({
          chainId: 304,
          accountIndex: 7,
          apiKeyIndices: [3],
        })
        .catch((error: Error) => error);
      await act(async () => undefined);

      act(lockWallet);
      act(unlockWallet);
      finishRead({ value: 'a'.repeat(64) } as Awaited<
        ReturnType<typeof SecureKeychain.getSecureItem>
      >);

      await expect(discovery).resolves.toEqual(
        new Error('Lighter signer wallet is locked'),
      );
      jest
        .mocked(SecureKeychain.getSecureItem)
        .mockResolvedValueOnce({ value: 'a'.repeat(64) } as Awaited<
          ReturnType<typeof SecureKeychain.getSecureItem>
        >);
      await expect(
        lighterSignerBridge.getStoredKeyIndices?.({
          chainId: 304,
          accountIndex: 7,
          apiKeyIndices: [3],
        }),
      ).resolves.toEqual([3]);
      expect(mockWebViewRenderCount).toBe(0);
    });

    it('retires client setup that requested the page before it mounted', async () => {
      // Redux still reports locked while the keyring already allows calls.
      jest.mocked(useSelector).mockReturnValue(false);
      render(<LighterSignerWebView />);
      const finishRead = deferKeychainRead();
      const setup = lighterSignerBridge
        .createClient({
          chainId: 304,
          accountIndex: 7,
          nonce: 1,
          apiKeyIndex: 3,
        })
        .catch((error: Error) => error);
      await act(async () => undefined);
      expect(isLighterSignerRequested()).toBe(true);
      expect(mockWebViewRenderCount).toBe(0);

      act(lockWallet);

      await expect(setup).resolves.toEqual(
        new Error('Lighter signer wallet is locked'),
      );
      expect(isLighterSignerRequested()).toBe(false);
      // Release the keychain slot, which outlives bridge resets.
      await act(async () => finishRead(null));
    });

    it('keeps the bridge usable after a batched lock and unlock with no page', async () => {
      render(<LighterSignerWebView />);

      act(() => {
        lockWallet();
        unlockWallet();
      });
      expect(mockWebViewRenderCount).toBe(0);

      const pending = lighterSignerBridge
        .execute({ function: '_createAuthToken', params: [28, 7] })
        .catch((error: Error) => error);
      await act(async () => undefined);
      expect(mockWebViewRenderCount).toBe(1);
      act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));
      await act(async () => undefined);
      const { executeId } = JSON.parse(mockPostMessage.mock.calls[0][0]);
      act(() =>
        mockWebViewProps.onMessage?.(
          messageEvent({
            type: 'executeResult',
            executeId,
            result: { token: 'after-batch', deadline: 1 },
          }),
        ),
      );

      await expect(pending).resolves.toEqual({
        token: 'after-batch',
        deadline: 1,
      });
    });
  });

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

  it('waits for a new call before loading a page after a lock and unlock in one render batch', async () => {
    render(<LighterSignerWebView />);
    act(() => mockWebViewProps.onMessage?.(messageEvent({ type: 'ready' })));

    const retiredPage = mockWebViewProps;
    act(() => {
      lockWallet();
      unlockWallet();
      retiredPage.onMessage?.(messageEvent({ type: 'ready' }));
    });

    expect(mockWebViewUnmount).toHaveBeenCalledTimes(1);
    expect(mockWebViewRenderCount).toBe(1);
    expect(isLighterSignerRequested()).toBe(false);
    const pending = lighterSignerBridge
      .execute({ function: '_createAuthToken', params: [28, 7] })
      .catch((error: Error) => error);
    await act(async () => undefined);
    expect(mockWebViewRenderCount).toBe(2);
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

  it('keeps failing fast after the reload limit when unlock repeats without a lock', async () => {
    jest.useFakeTimers();
    render(<LighterSignerWebView />);
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
    }
    act(failInitialization);

    act(() => emitWalletEvent('KeyringController:unlock'));

    await expect(
      lighterSignerBridge.execute({
        function: '_createAuthToken',
        params: [28, 7],
      }),
    ).rejects.toThrow('unavailable after repeated WebView load failures');
    expect(jest.getTimerCount()).toBe(0);
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
