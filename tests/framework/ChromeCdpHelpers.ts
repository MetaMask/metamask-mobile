// eslint-disable-next-line import-x/no-nodejs-modules
import { execFileSync } from 'child_process';
import { WebSocket as WsClient } from 'ws';
import type { Context } from '@wdio/protocols';
import type { AndroidDetailedContext } from 'webdriverio/build/types';
import { APP_PACKAGE_IDS } from './Constants.ts';
import { getDriver, executeMobileDeepLink } from './PlaywrightUtilities';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('ChromeCdpHelpers');

/** Host port for `adb forward` to Chrome's `@chrome_devtools_remote` socket. */
const CDP_FORWARD_PORT = 9222;
const CDP_READY_TIMEOUT_MS = 20_000;
const DAPP_PAGE_TIMEOUT_MS = 30_000;
/** SDK opens metamask:// only after transport `session_request` (can take several seconds). */
const DEEPLINK_CAPTURE_TIMEOUT_MS = 30_000;
const POLL_MS = 500;

interface ChromeContextInfo {
  webSocketDebuggerUrl?: string;
}

interface AndroidContextWithInfo extends AndroidDetailedContext {
  info?: ChromeContextInfo;
}

interface CdpTarget {
  id?: string;
  type?: string;
  url?: string;
  title?: string;
  webSocketDebuggerUrl?: string;
}

interface RawAppiumContext {
  webviewName?: string;
  webview?: string;
  info?: ChromeContextInfo;
}

interface CdpEvaluateResult {
  result?: { value?: unknown; type?: string };
  exceptionDetails?: { text?: string; exception?: { description?: string } };
}

type CdpEventHandler = (params: Record<string, unknown>) => void;

class CdpSession {
  private readonly ws: WsClient;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private readonly eventHandlers = new Map<string, Set<CdpEventHandler>>();

  private constructor(ws: WsClient) {
    this.ws = ws;
    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data)) as {
          id?: number;
          method?: string;
          params?: Record<string, unknown>;
          result?: unknown;
          error?: { message?: string };
        };
        if (msg.method) {
          const handlers = this.eventHandlers.get(msg.method);
          if (handlers) {
            for (const handler of handlers) {
              handler(msg.params ?? {});
            }
          }
          return;
        }
        if (msg.id == null) return;
        const waiter = this.pending.get(msg.id);
        if (!waiter) return;
        this.pending.delete(msg.id);
        if (msg.error) {
          waiter.reject(new Error(msg.error.message ?? 'CDP error'));
        } else {
          waiter.resolve(msg.result);
        }
      } catch {
        // Ignore malformed CDP frames
      }
    });
  }

  static connect(wsUrl: string): Promise<CdpSession> {
    return new Promise((resolve, reject) => {
      const ws = new WsClient(wsUrl);
      const session = new CdpSession(ws);
      ws.once('open', () => resolve(session));
      ws.once('error', (err) => reject(err));
    });
  }

  on(method: string, handler: CdpEventHandler): void {
    let handlers = this.eventHandlers.get(method);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(method, handlers);
    }
    handlers.add(handler);
  }

  async send(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out for id=${id}`));
      }, 15_000);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate<T>(
    expression: string,
    options: { userGesture?: boolean } = {},
  ): Promise<T> {
    const result = (await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: options.userGesture ?? false,
    })) as CdpEvaluateResult;

    if (result.exceptionDetails) {
      const detail =
        result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        'Runtime.evaluate failed';
      throw new Error(detail);
    }

    return result.result?.value as T;
  }

  close(): void {
    for (const [, waiter] of this.pending) {
      waiter.reject(new Error('CDP session closed'));
    }
    this.pending.clear();
    this.eventHandlers.clear();
    this.ws.close();
  }
}

/**
 * Drive Android Chrome dapp pages via CDP, bypassing Appium Chromedriver.
 *
 * Emulator Chrome 113 + Appium `switchContext('WEBVIEW_chrome')` hangs during
 * Chromedriver session creation even when `getContexts` already exposes a
 * working `webSocketDebuggerUrl`. CDP uses that debugger channel directly.
 */
export default class ChromeCdpHelpers {
  /**
   * Forward host → device Chrome DevTools abstract socket.
   */
  static ensureAdbForward(port = CDP_FORWARD_PORT): void {
    try {
      execFileSync('adb', ['forward', '--remove', `tcp:${port}`], {
        stdio: 'pipe',
      });
    } catch {
      // No existing forward is fine.
    }
    execFileSync(
      'adb',
      ['forward', `tcp:${port}`, 'localabstract:chrome_devtools_remote'],
      { stdio: 'pipe' },
    );
    logger.debug(`ADB forwarded tcp:${port} → chrome_devtools_remote`);
  }

  /**
   * Wait until `[data-testid]` is visible in the Chrome tab for `dappUrl`.
   */
  static async waitForTestId(
    dappUrl: string,
    testId: string,
    timeoutMs = 15_000,
  ): Promise<void> {
    await this.withCdpSession(dappUrl, async (session) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const visible = await session.evaluate<boolean>(
          `(() => {
            const el = document.querySelector('[data-testid=${JSON.stringify(testId)}]');
            if (!el) return false;
            const style = window.getComputedStyle(el);
            return style.visibility !== 'hidden' && style.display !== 'none';
          })()`,
        );
        if (visible) {
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      throw new Error(
        `CDP: [data-testid="${testId}"] not visible within ${timeoutMs}ms on ${dappUrl}`,
      );
    });
  }

  /**
   * Click `[data-testid]` in the Chrome tab for `dappUrl` using a real CDP
   * mouse input (trusted user activation). Synthetic JS clicks are not enough
   * for MM Connect: the SDK opens `metamask://` inside `setTimeout(…, 10)`.
   */
  static async clickTestId(dappUrl: string, testId: string): Promise<void> {
    await this.withCdpSession(dappUrl, async (session) => {
      await this.dispatchTrustedClick(session, testId);
    });
  }

  /**
   * Wait for visibility then click.
   */
  static async waitAndClickTestId(
    dappUrl: string,
    testId: string,
    timeoutMs = 15_000,
  ): Promise<void> {
    await this.waitForTestId(dappUrl, testId, timeoutMs);
    await this.clickTestId(dappUrl, testId);
  }

  /**
   * Click a connect control that should open MetaMask via deeplink.
   *
   * The Multichain SDK emits `display_uri` / builds `metamask://connect/mwp?…`
   * only after transport `session_request` — not synchronously on click. Chrome
   * often seals `Location.prototype`, so we capture via:
   * - CDP Page navigation events
   * - reconstructing the URL when the SDK JSON.stringifies the session request
   * then open it with Appium `mobile: deepLink`.
   */
  static async waitAndClickTestIdOpeningMetaMask(
    dappUrl: string,
    testId: string,
    timeoutMs = 15_000,
  ): Promise<void> {
    await this.waitForTestId(dappUrl, testId, timeoutMs);
    await this.withCdpSession(dappUrl, async (session) => {
      const captured: string[] = [];
      const remember = (url: unknown) => {
        if (url == null) return;
        const value = String(url);
        if (!value || value === 'about:blank') return;
        if (!captured.includes(value)) {
          captured.push(value);
        }
      };

      await session.send('Page.enable');
      session.on('Page.frameRequestedNavigation', (params) => {
        remember(params.url);
      });
      session.on('Page.windowOpen', (params) => {
        remember(params.url);
      });
      session.on('Page.navigatedWithinDocument', (params) => {
        remember(params.url);
      });

      await this.installDeeplinkCapture(session);
      await this.dispatchTrustedClick(session, testId);

      const deeplink = await this.waitForCapturedDeeplink(session, captured);
      logger.debug(
        `Opening captured MM Connect deeplink via Appium: ${deeplink}`,
      );
      await executeMobileDeepLink(deeplink, {
        package: APP_PACKAGE_IDS.ANDROID,
      });
    });
  }

  private static async installDeeplinkCapture(
    session: CdpSession,
  ): Promise<void> {
    // Capture URL when the SDK builds it (createConnectionDeeplink), which
    // happens on session_request — before (and even if) location.href is blocked.
    await session.evaluate(`(() => {
      const w = window;
      w.__mmCdpDeeplinks = [];
      const push = (url) => {
        if (url == null) return;
        const value = String(url);
        if (!value || value === 'about:blank') return;
        if (!w.__mmCdpDeeplinks.includes(value)) {
          w.__mmCdpDeeplinks.push(value);
        }
      };

      const toMwpUrl = (scheme, payloadJson) => {
        const bytes = new TextEncoder().encode(payloadJson);
        let binary = '';
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        const b64 = btoa(binary);
        return scheme + '/mwp?p=' + encodeURIComponent(b64) + '&c=1';
      };

      const origStringify = JSON.stringify.bind(JSON);
      JSON.stringify = (value, ...args) => {
        const out = origStringify(value, ...args);
        try {
          if (
            value &&
            typeof value === 'object' &&
            value.sessionRequest &&
            value.metadata &&
            value.metadata.dapp
          ) {
            push(toMwpUrl('metamask://connect', out));
            push(toMwpUrl('https://metamask.app.link/connect', out));
          }
        } catch (_) {}
        return out;
      };

      try {
        const desc = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
        if (desc && desc.set && desc.get) {
          Object.defineProperty(Location.prototype, 'href', {
            configurable: true,
            enumerable: desc.enumerable,
            get() { return desc.get.call(this); },
            set(v) {
              push(v);
              return desc.set.call(this, v);
            },
          });
        }
      } catch (_) {}

      try {
        const origOpen = window.open.bind(window);
        window.open = (url, ...args) => {
          push(url);
          return origOpen(url, ...args);
        };
      } catch (_) {}

      try {
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (...args) {
          push(this.href);
          return origClick.apply(this, args);
        };
      } catch (_) {}

      return true;
    })()`);
  }

  private static async waitForCapturedDeeplink(
    session: CdpSession,
    cdpCaptured: string[],
  ): Promise<string> {
    const deadline = Date.now() + DEEPLINK_CAPTURE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const pageUrls = await session.evaluate<string[]>(
        `Array.isArray(window.__mmCdpDeeplinks) ? window.__mmCdpDeeplinks.slice() : []`,
      );
      const all = [...cdpCaptured, ...pageUrls];
      // Prefer native scheme for Appium deepLink package scoping.
      const native = all.find((url) => url.startsWith('metamask://'));
      if (native) {
        return native;
      }
      const match = all.find((url) => this.isMetaMaskConnectUrl(url));
      if (match) {
        return match;
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }

    const pageUrls = await session.evaluate<string[]>(
      `Array.isArray(window.__mmCdpDeeplinks) ? window.__mmCdpDeeplinks.slice() : []`,
    );
    throw new Error(
      `CDP: MetaMask connect deeplink was not captured within ${DEEPLINK_CAPTURE_TIMEOUT_MS}ms` +
        ` (cdp=${JSON.stringify(cdpCaptured)}; page=${JSON.stringify(pageUrls)})`,
    );
  }

  private static isMetaMaskConnectUrl(url: string): boolean {
    try {
      if (url.startsWith('metamask://')) {
        return true;
      }
      const parsed = new URL(url);
      return (
        parsed.hostname === 'metamask.app.link' ||
        parsed.hostname.endsWith('.metamask.app.link')
      );
    } catch {
      return /metamask:\/\//i.test(url) || /metamask\.app\.link/i.test(url);
    }
  }

  private static async dispatchTrustedClick(
    session: CdpSession,
    testId: string,
  ): Promise<void> {
    // Single activation only — a second click while CONNECTING fails the dapp.
    // userGesture:true matches the path that previously reached CONNECTING in CI.
    const clicked = await session.evaluate<boolean>(
      `(() => {
        const el = document.querySelector('[data-testid=${JSON.stringify(testId)}]');
        if (!el || typeof el.click !== 'function') return false;
        el.scrollIntoView({ block: 'center', inline: 'center' });
        el.click();
        return true;
      })()`,
      { userGesture: true },
    );
    if (!clicked) {
      throw new Error(`CDP: could not click [data-testid="${testId}"]`);
    }
  }

  private static async withCdpSession<T>(
    dappUrl: string,
    actionFn: (session: CdpSession) => Promise<T>,
  ): Promise<T> {
    const endpoint = await this.resolveCdpHttpEndpoint();
    const target = await this.waitForCdpTarget(endpoint, dappUrl);
    if (!target.webSocketDebuggerUrl) {
      throw new Error(
        `Chrome CDP target for ${dappUrl} has no webSocketDebuggerUrl`,
      );
    }
    logger.debug(
      `CDP attached to ${target.url ?? target.title ?? target.id} via ${endpoint}`,
    );
    const session = await CdpSession.connect(target.webSocketDebuggerUrl);
    try {
      return await actionFn(session);
    } finally {
      session.close();
    }
  }

  private static async resolveCdpHttpEndpoint(): Promise<string> {
    const fromContexts = await this.tryEndpointFromAppiumContexts();
    if (fromContexts) {
      return fromContexts;
    }

    this.ensureAdbForward();
    const endpoint = `http://127.0.0.1:${CDP_FORWARD_PORT}`;
    await this.waitForCdpEndpoint(endpoint);
    return endpoint;
  }

  private static async tryEndpointFromAppiumContexts(): Promise<
    string | undefined
  > {
    try {
      // Raw mobile:getContexts includes Chrome `info.webSocketDebuggerUrl`
      // (WDIO getContexts may omit the nested info object).
      const rawContexts = (await getDriver().execute(
        'mobile: getContexts',
      )) as RawAppiumContext[];
      for (const ctx of rawContexts) {
        const name = ctx.webviewName ?? ctx.webview ?? '';
        const wsUrl = ctx.info?.webSocketDebuggerUrl;
        if (!wsUrl || !/chrome/i.test(name)) continue;
        const http = this.httpEndpointFromWebSocketUrl(wsUrl);
        if (http) {
          await this.waitForCdpEndpoint(http);
          logger.debug(`Using Appium-forwarded Chrome CDP at ${http}`);
          return http;
        }
      }

      const contexts = (await getDriver().getContexts({
        returnDetailedContexts: true,
      })) as (Context | AndroidContextWithInfo)[];
      for (const ctx of contexts) {
        if (typeof ctx === 'string') continue;
        const detailed = ctx as AndroidContextWithInfo;
        const wsUrl = detailed.info?.webSocketDebuggerUrl;
        if (!wsUrl || !/chrome/i.test(detailed.id)) continue;
        const http = this.httpEndpointFromWebSocketUrl(wsUrl);
        if (http) {
          await this.waitForCdpEndpoint(http);
          return http;
        }
      }
    } catch (error) {
      logger.debug(
        'Could not resolve CDP endpoint from Appium contexts:',
        error instanceof Error ? error.message : String(error),
      );
    }
    return undefined;
  }

  private static httpEndpointFromWebSocketUrl(
    wsUrl: string,
  ): string | undefined {
    try {
      const parsed = new URL(wsUrl);
      const protocol = parsed.protocol === 'wss:' ? 'https:' : 'http:';
      return `${protocol}//${parsed.host}`;
    } catch {
      return undefined;
    }
  }

  private static async waitForCdpEndpoint(endpoint: string): Promise<void> {
    const deadline = Date.now() + CDP_READY_TIMEOUT_MS;
    let lastError = '';
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${endpoint}/json/version`);
        if (response.ok) {
          return;
        }
        lastError = `HTTP ${response.status}`;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error(
      `Chrome CDP endpoint ${endpoint} not ready within ${CDP_READY_TIMEOUT_MS}ms: ${lastError}`,
    );
  }

  private static async waitForCdpTarget(
    endpoint: string,
    dappUrl: string,
  ): Promise<CdpTarget> {
    const deadline = Date.now() + DAPP_PAGE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${endpoint}/json/list`);
        if (response.ok) {
          const targets = (await response.json()) as CdpTarget[];
          const match = targets.find(
            (t) =>
              (t.type === 'page' || !t.type) &&
              this.targetMatchesDapp(t, dappUrl),
          );
          if (match?.webSocketDebuggerUrl) {
            return match;
          }
        }
      } catch {
        // Keep polling
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error(
      `No Chrome CDP target matched ${dappUrl} within ${DAPP_PAGE_TIMEOUT_MS}ms`,
    );
  }

  private static targetMatchesDapp(
    target: CdpTarget,
    dappUrl: string,
  ): boolean {
    if (target.url && this.urlsReferToSameDapp(target.url, dappUrl)) {
      return true;
    }
    return (
      Boolean(target.title) &&
      /multichain api test dapp/i.test(target.title ?? '') &&
      /:8090\b/.test(dappUrl)
    );
  }

  private static urlsReferToSameDapp(
    candidateUrl: string,
    dappUrl: string,
  ): boolean {
    if (!candidateUrl || candidateUrl === 'about:blank') {
      return false;
    }
    if (candidateUrl.includes(dappUrl)) {
      return true;
    }
    try {
      const target = new URL(dappUrl);
      const candidate = new URL(candidateUrl);
      const hostAliases = new Set([
        '10.0.2.2',
        'localhost',
        '127.0.0.1',
        target.hostname,
        candidate.hostname,
      ]);
      const sameHostFamily =
        hostAliases.has(target.hostname) && hostAliases.has(candidate.hostname);
      const samePort =
        (candidate.port || defaultPort(candidate.protocol)) ===
        (target.port || defaultPort(target.protocol));
      const samePath =
        candidate.pathname.replace(/\/$/, '') ===
        target.pathname.replace(/\/$/, '');
      return sameHostFamily && samePort && samePath;
    } catch {
      const port = dappUrl.match(/:(\d+)/)?.[1];
      return Boolean(port && candidateUrl.includes(`:${port}`));
    }

    function defaultPort(protocol: string): string {
      return protocol === 'https:' ? '443' : '80';
    }
  }
}
