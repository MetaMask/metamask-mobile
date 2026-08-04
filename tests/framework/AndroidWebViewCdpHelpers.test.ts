import AndroidWebViewCdpHelpers, {
  isAndroidWebViewCdpScrollEnabled,
  pickMetaMaskWebViewDebuggerUrl,
  urlsReferToSameDapp,
  type RawAppiumWebViewContext,
} from './AndroidWebViewCdpHelpers';
import { getDriver } from './PlaywrightUtilities';

jest.mock('./PlaywrightUtilities', () => ({
  getDriver: jest.fn(),
}));

jest.mock('ws', () => {
  class MockWebSocket {
    static OPEN = 1;
    readyState = MockWebSocket.OPEN;
    private readonly handlers = new Map<
      string,
      ((...args: unknown[]) => void)[]
    >();
    private opened = false;

    constructor(public readonly mockUrl: string) {
      queueMicrotask(() => {
        this.opened = true;
        this.emit('open');
      });
    }

    on(event: string, handler: (...args: unknown[]) => void): void {
      const list = this.handlers.get(event) ?? [];
      list.push(handler);
      this.handlers.set(event, list);
      if (event === 'open' && this.opened) {
        queueMicrotask(() => handler());
      }
    }

    once(event: string, handler: (...args: unknown[]) => void): void {
      const wrap = (...args: unknown[]) => {
        this.off(event, wrap);
        handler(...args);
      };
      this.on(event, wrap);
    }

    off(event: string, handler: (...args: unknown[]) => void): void {
      const list = this.handlers.get(event) ?? [];
      this.handlers.set(
        event,
        list.filter((h) => h !== handler),
      );
    }

    send(raw: string): void {
      const msg = JSON.parse(raw) as {
        id: number;
        method: string;
        params?: { expression?: string };
      };
      let value: unknown = false;
      if (msg.method === 'Runtime.evaluate') {
        const expression = msg.params?.expression ?? '';
        value =
          expression.includes('getElementById') &&
          !expression.includes('"missing-id"');
      }
      const payload = JSON.stringify({
        id: msg.id,
        result: { result: { value, type: 'boolean' } },
      });
      setImmediate(() => {
        this.emit('message', payload);
      });
    }

    close(): void {
      // no-op
    }

    private emit(event: string, ...args: unknown[]): void {
      for (const handler of [...(this.handlers.get(event) ?? [])]) {
        handler(...args);
      }
    }
  }

  return { WebSocket: MockWebSocket };
});

/** Dynamic key — babel inlines static `process.env.ANDROID_WEBVIEW_CDP_SCROLL` / deletes. */
const CDP_SCROLL_ENV_KEY = 'ANDROID_WEBVIEW_CDP_SCROLL';

function clearCdpScrollEnv(): void {
  delete process.env[CDP_SCROLL_ENV_KEY];
}

function setCdpScrollEnv(value: string): void {
  process.env[CDP_SCROLL_ENV_KEY] = value;
}

describe('isAndroidWebViewCdpScrollEnabled', () => {
  afterEach(() => {
    clearCdpScrollEnv();
  });

  it('returns true when env is unset', () => {
    clearCdpScrollEnv();

    expect(isAndroidWebViewCdpScrollEnabled()).toBe(true);
  });

  it('returns false when env is 0', () => {
    setCdpScrollEnv('0');

    expect(isAndroidWebViewCdpScrollEnabled()).toBe(false);
  });

  it('returns false when env is false', () => {
    setCdpScrollEnv('false');

    expect(isAndroidWebViewCdpScrollEnabled()).toBe(false);
  });
});

describe('urlsReferToSameDapp', () => {
  it('matches identical https URLs', () => {
    const url = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

    expect(urlsReferToSameDapp(url, url)).toBe(true);
  });

  it('matches trailing-slash variants', () => {
    expect(
      urlsReferToSameDapp(
        'https://metamask.github.io/snaps/test-snaps/3.5.2',
        'https://metamask.github.io/snaps/test-snaps/3.5.2/',
      ),
    ).toBe(true);
  });

  it('rejects about:blank', () => {
    expect(
      urlsReferToSameDapp(
        'about:blank',
        'https://metamask.github.io/snaps/test-snaps/3.5.2/',
      ),
    ).toBe(false);
  });

  it('rejects different paths', () => {
    expect(
      urlsReferToSameDapp(
        'https://metamask.github.io/other/',
        'https://metamask.github.io/snaps/test-snaps/3.5.2/',
      ),
    ).toBe(false);
  });
});

describe('pickMetaMaskWebViewDebuggerUrl', () => {
  const packageId = 'io.metamask';

  it('prefers MetaMask package WebView over WEBVIEW_chrome', () => {
    const contexts: RawAppiumWebViewContext[] = [
      {
        webviewName: 'WEBVIEW_chrome',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/chrome',
        },
      },
      {
        webviewName: 'WEBVIEW_io.metamask',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/mm',
        },
      },
    ];

    expect(pickMetaMaskWebViewDebuggerUrl(contexts, packageId)).toBe(
      'ws://127.0.0.1:9223/devtools/page/mm',
    );
  });

  it('matches packageName field when webviewName is generic', () => {
    const contexts: RawAppiumWebViewContext[] = [
      {
        webview: 'WEBVIEW_1',
        packageName: 'io.metamask',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/mm',
        },
      },
    ];

    expect(pickMetaMaskWebViewDebuggerUrl(contexts, packageId)).toBe(
      'ws://127.0.0.1:9223/devtools/page/mm',
    );
  });

  it('returns undefined when only Chrome contexts exist', () => {
    const contexts: RawAppiumWebViewContext[] = [
      {
        webviewName: 'WEBVIEW_chrome',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/chrome',
        },
      },
    ];

    expect(pickMetaMaskWebViewDebuggerUrl(contexts, packageId)).toBeUndefined();
  });
});

describe('AndroidWebViewCdpHelpers.scrollElementByIdIntoView', () => {
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';
  const originalFetch = global.fetch;
  let execFileSyncSpy: jest.SpyInstance | undefined;

  beforeEach(() => {
    clearCdpScrollEnv();
    (getDriver as jest.Mock).mockReturnValue({
      execute: jest.fn().mockResolvedValue([
        {
          webviewName: 'WEBVIEW_io.metamask',
          info: {
            webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/mm',
          },
        },
      ]),
    });

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/json/version')) {
        return { ok: true } as Response;
      }
      if (url.endsWith('/json/list')) {
        return {
          ok: true,
          json: async () => [
            {
              type: 'page',
              url: pageUrl,
              webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/mm',
            },
          ],
        } as Response;
      }
      return { ok: false } as Response;
    }) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    execFileSyncSpy?.mockRestore();
    execFileSyncSpy = undefined;
    clearCdpScrollEnv();
    jest.clearAllMocks();
  });

  it('returns true when CDP evaluate scrolls an existing element', async () => {
    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'connectbip32',
      { pageUrl },
    );

    expect(result).toBe(true);
  });

  it('returns false when element id is missing in the page', async () => {
    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'missing-id',
      { pageUrl },
    );

    expect(result).toBe(false);
  });

  it('returns false when ANDROID_WEBVIEW_CDP_SCROLL is disabled', async () => {
    setCdpScrollEnv('0');

    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'connectbip32',
      { pageUrl },
    );

    expect(result).toBe(false);
    expect(getDriver).not.toHaveBeenCalled();
  });

  it('returns false when Appium contexts have no MetaMask debugger URL', async () => {
    (getDriver as jest.Mock).mockReturnValue({
      execute: jest.fn().mockResolvedValue([
        {
          webviewName: 'WEBVIEW_chrome',
          info: {
            webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/chrome',
          },
        },
      ]),
    });
    // Avoid hanging on adb forward fallback in unit tests.
    execFileSyncSpy = jest
      .spyOn(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('child_process'),
        'execFileSync',
      )
      .mockImplementation(() => {
        throw new Error('adb unavailable in unit test');
      });

    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'connectbip32',
      { pageUrl },
    );

    expect(result).toBe(false);
  });
});
