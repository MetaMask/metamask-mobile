/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import AndroidWebViewCdpHelpers, {
  isAndroidWebViewCdpEnabled,
  pickMetaMaskWebViewDebuggerUrl,
  pickPageTargetFromContexts,
  urlsReferToSameDapp,
  type RawAppiumWebViewContext,
} from './AndroidWebViewCdpHelpers';
import { getDriver } from './PlaywrightUtilities';

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as unknown as jest.Mock;

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
    readonly mockUrl: string;
    terminated = false;

    constructor(mockUrl: string) {
      this.mockUrl = mockUrl;
      // Simulate a WebSocket that never opens so connect timeout can fire.
      if (mockUrl.includes('/hang')) {
        return;
      }
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
        if (expression.includes('"missing-id"')) {
          value =
            expression.includes('textContent') ||
            expression.includes('innerText')
              ? null
              : false;
        } else if (expression.includes('activeElement')) {
          value = true;
        } else if (
          expression.includes('el.click') ||
          expression.includes('.click(')
        ) {
          // Disabled controls return false → native wait-until-enabled.
          value =
            expression.includes('getElementById') &&
            !expression.includes('"disabled-id"');
        } else if (
          expression.includes('_valueTracker') &&
          (expression.includes("dispatchEvent(new Event('input'") ||
            expression.includes('dispatchEvent(new Event("input"'))
        ) {
          // Require `_valueTracker` path (do not match on `options` alone).
          value = expression.includes('getElementById');
        } else if (
          expression.includes('innerText') ||
          expression.includes('textContent')
        ) {
          value = expression.includes('getElementById')
            ? 'hello-from-cdp'
            : null;
        } else if (expression.includes('scrollIntoView')) {
          value = expression.includes('getElementById');
        } else if (
          expression === 'location.href' ||
          expression.includes('location.href')
        ) {
          value = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';
        } else {
          value = false;
        }
      }
      const payload = JSON.stringify({
        id: msg.id,
        result: {
          result: {
            value,
            type: typeof value === 'string' ? 'string' : 'boolean',
          },
        },
      });
      setImmediate(() => {
        this.emit('message', payload);
      });
    }

    close(): void {
      // no-op
    }

    terminate(): void {
      this.terminated = true;
    }

    private emit(event: string, ...args: unknown[]): void {
      for (const handler of [...(this.handlers.get(event) ?? [])]) {
        handler(...args);
      }
    }
  }

  return { WebSocket: MockWebSocket };
});

/** Dynamic key — babel inlines static `process.env.ANDROID_WEBVIEW_CDP` / deletes. */
const CDP_ENV_KEY = 'ANDROID_WEBVIEW_CDP';

function clearCdpEnv(): void {
  delete process.env[CDP_ENV_KEY];
}

function setCdpEnv(value: string): void {
  process.env[CDP_ENV_KEY] = value;
}

describe('isAndroidWebViewCdpEnabled', () => {
  afterEach(() => {
    clearCdpEnv();
  });

  it('returns true when env is unset', () => {
    clearCdpEnv();
    expect(isAndroidWebViewCdpEnabled()).toBe(true);
  });

  it('returns false when env is 0', () => {
    setCdpEnv('0');
    expect(isAndroidWebViewCdpEnabled()).toBe(false);
  });

  it('returns false when env is false', () => {
    setCdpEnv('false');
    expect(isAndroidWebViewCdpEnabled()).toBe(false);
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

  it('treats index.html as the same path', () => {
    expect(
      urlsReferToSameDapp(
        'https://metamask.github.io/snaps/test-snaps/3.5.2/index.html',
        'https://metamask.github.io/snaps/test-snaps/3.5.2/',
      ),
    ).toBe(true);
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

describe('pickPageTargetFromContexts', () => {
  const packageId = 'io.metamask';
  const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';

  it('returns the matching page from Appium pages[]', () => {
    const page = {
      type: 'page',
      url: pageUrl,
      webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/snaps',
    };
    const contexts: RawAppiumWebViewContext[] = [
      {
        webviewName: 'WEBVIEW_io.metamask',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/browser/b',
        },
        pages: [page],
      },
    ];

    expect(pickPageTargetFromContexts(contexts, packageId, pageUrl)).toEqual(
      page,
    );
  });

  it('returns undefined when pages do not match pageUrl', () => {
    const contexts: RawAppiumWebViewContext[] = [
      {
        webviewName: 'WEBVIEW_io.metamask',
        pages: [
          {
            url: 'https://other.example/',
            webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/other',
          },
        ],
      },
    ];

    expect(
      pickPageTargetFromContexts(contexts, packageId, pageUrl),
    ).toBeUndefined();
  });
});

const pageUrl = 'https://metamask.github.io/snaps/test-snaps/3.5.2/';
const originalFetch = global.fetch;

describe('AndroidWebViewCdpHelpers.primePage', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('caches a verified page WebSocket when location matches', async () => {
    await expect(AndroidWebViewCdpHelpers.primePage(pageUrl)).resolves.toBe(
      true,
    );

    const execute = (getDriver as jest.Mock)().execute as jest.Mock;
    execute.mockClear();

    await AndroidWebViewCdpHelpers.tapElementById('connectbip32', { pageUrl });
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns false when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');
    await expect(AndroidWebViewCdpHelpers.primePage(pageUrl)).resolves.toBe(
      false,
    );
  });
});

function installCdpHappyPathMocks(): void {
  clearCdpEnv();
  AndroidWebViewCdpHelpers.resetCache();
  execFileSyncMock.mockReset();
  (getDriver as jest.Mock).mockReturnValue({
    execute: jest.fn().mockResolvedValue([
      {
        webviewName: 'WEBVIEW_io.metamask',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/browser/b',
        },
        pages: [
          {
            type: 'page',
            url: pageUrl,
            webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/mm',
          },
        ],
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
}

function restoreCdpMocks(): void {
  global.fetch = originalFetch;
  clearCdpEnv();
  AndroidWebViewCdpHelpers.resetCache();
  jest.clearAllMocks();
}

describe('AndroidWebViewCdpHelpers.scrollElementByIdIntoView', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('returns true when CDP evaluate scrolls an existing element', async () => {
    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'connectbip32',
      { pageUrl },
    );

    expect(result).toBe(true);
  });

  it('uses Appium pages[] and can skip waiting on empty /json/list', async () => {
    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'connectbip32',
      { pageUrl },
    );

    expect(result).toBe(true);
  });

  it('reuses a cached page WebSocket on the next action', async () => {
    const execute = jest.fn().mockResolvedValue([
      {
        webviewName: 'WEBVIEW_io.metamask',
        info: {
          webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/browser/b',
        },
        pages: [
          {
            type: 'page',
            url: pageUrl,
            webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/mm',
          },
        ],
      },
    ]);
    (getDriver as jest.Mock).mockReturnValue({ execute });

    await AndroidWebViewCdpHelpers.scrollElementByIdIntoView('connectbip32', {
      pageUrl,
    });
    await AndroidWebViewCdpHelpers.tapElementById('connectbip32', { pageUrl });

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('returns false when element id is missing in the page', async () => {
    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'missing-id',
      { pageUrl },
    );

    expect(result).toBe(false);
  });

  it('returns false when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');

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
    execFileSyncMock.mockImplementation(() => {
      throw new Error('adb unavailable in unit test');
    });

    const result = await AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
      'connectbip32',
      { pageUrl },
    );

    expect(result).toBe(false);
  });

  it('returns false when CDP WebSocket connect never opens', async () => {
    jest.useFakeTimers();
    try {
      // No pages[] → fall through to /json/list hang URL.
      (getDriver as jest.Mock).mockReturnValue({
        execute: jest.fn().mockResolvedValue([
          {
            webviewName: 'WEBVIEW_io.metamask',
            info: {
              webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/browser/b',
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
                webSocketDebuggerUrl: 'ws://127.0.0.1:9223/devtools/page/hang',
              },
            ],
          } as Response;
        }
        return { ok: false } as Response;
      }) as typeof fetch;

      const resultPromise = AndroidWebViewCdpHelpers.scrollElementByIdIntoView(
        'connectbip32',
        { pageUrl },
      );
      await jest.advanceTimersByTimeAsync(5_000);
      const result = await resultPromise;

      expect(result).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('AndroidWebViewCdpHelpers.tapElementById', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('returns true when CDP click succeeds', async () => {
    const result = await AndroidWebViewCdpHelpers.tapElementById(
      'connectbip32',
      { pageUrl },
    );
    expect(result).toBe(true);
  });

  it('returns false when element is missing', async () => {
    const result = await AndroidWebViewCdpHelpers.tapElementById('missing-id', {
      pageUrl,
    });
    expect(result).toBe(false);
  });

  it('returns false when element is disabled so native can wait', async () => {
    const result = await AndroidWebViewCdpHelpers.tapElementById(
      'disabled-id',
      { pageUrl },
    );
    expect(result).toBe(false);
  });

  it('returns false when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');
    const result = await AndroidWebViewCdpHelpers.tapElementById(
      'connectbip32',
      { pageUrl },
    );
    expect(result).toBe(false);
    expect(getDriver).not.toHaveBeenCalled();
  });
});

describe('AndroidWebViewCdpHelpers.fillElementById', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('returns true when CDP fill succeeds', async () => {
    const result = await AndroidWebViewCdpHelpers.fillElementById(
      'message',
      'hi',
      { pageUrl },
    );
    expect(result).toBe(true);
  });

  it('returns false when element is missing', async () => {
    const result = await AndroidWebViewCdpHelpers.fillElementById(
      'missing-id',
      'hi',
      { pageUrl },
    );
    expect(result).toBe(false);
  });

  it('returns false when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');
    const result = await AndroidWebViewCdpHelpers.fillElementById(
      'message',
      'hi',
      { pageUrl },
    );
    expect(result).toBe(false);
  });
});

describe('AndroidWebViewCdpHelpers.readElementTextById', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('returns text when CDP read succeeds', async () => {
    const result = await AndroidWebViewCdpHelpers.readElementTextById(
      'status',
      { pageUrl },
    );
    expect(result).toBe('hello-from-cdp');
  });

  it('returns undefined when element is missing', async () => {
    const result = await AndroidWebViewCdpHelpers.readElementTextById(
      'missing-id',
      { pageUrl },
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');
    const result = await AndroidWebViewCdpHelpers.readElementTextById(
      'status',
      { pageUrl },
    );
    expect(result).toBeUndefined();
  });
});

describe('AndroidWebViewCdpHelpers.selectOptionById', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('returns true when option is selected', async () => {
    const result = await AndroidWebViewCdpHelpers.selectOptionById(
      'chain',
      'Ethereum',
      { pageUrl },
    );
    expect(result).toBe(true);
  });

  it('returns false when select is missing', async () => {
    const result = await AndroidWebViewCdpHelpers.selectOptionById(
      'missing-id',
      'Ethereum',
      { pageUrl },
    );
    expect(result).toBe(false);
  });

  it('returns false when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');
    const result = await AndroidWebViewCdpHelpers.selectOptionById(
      'chain',
      'Ethereum',
      { pageUrl },
    );
    expect(result).toBe(false);
  });
});

describe('AndroidWebViewCdpHelpers.blurActiveElement', () => {
  beforeEach(installCdpHappyPathMocks);
  afterEach(restoreCdpMocks);

  it('returns true when blur evaluate succeeds', async () => {
    const result = await AndroidWebViewCdpHelpers.blurActiveElement(pageUrl);
    expect(result).toBe(true);
  });

  it('returns false when ANDROID_WEBVIEW_CDP is disabled', async () => {
    setCdpEnv('0');
    const result = await AndroidWebViewCdpHelpers.blurActiveElement(pageUrl);
    expect(result).toBe(false);
  });
});
