/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import { WebSocket as WsClient } from 'ws';
import { APP_PACKAGE_IDS } from './Constants.ts';
import { getDriver } from './PlaywrightUtilities';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('AndroidWebViewCdp');

/** Host port for `adb forward` to MetaMask `@webview_devtools_remote_<pid>`. */
const WEBVIEW_CDP_FORWARD_PORT = 9223;
const CDP_READY_TIMEOUT_MS = 15_000;
const PAGE_TIMEOUT_MS = 15_000;
/** Cap stuck WebSocket handshakes so native scroll fallback can start. */
const CDP_CONNECT_TIMEOUT_MS = 5_000;
const POLL_MS = 400;

export interface RawAppiumWebViewContext {
  webviewName?: string;
  webview?: string;
  packageName?: string;
  info?: { webSocketDebuggerUrl?: string };
}

interface CdpTarget {
  id?: string;
  type?: string;
  url?: string;
  title?: string;
  webSocketDebuggerUrl?: string;
}

interface CdpEvaluateResult {
  result?: { value?: unknown; type?: string };
  exceptionDetails?: { text?: string; exception?: { description?: string } };
}

class CdpSession {
  private readonly ws: WsClient;
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();

  private constructor(ws: WsClient) {
    this.ws = ws;
    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data)) as {
          id?: number;
          result?: unknown;
          error?: { message?: string };
        };
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
      let settled = false;
      const timerRef: { id?: ReturnType<typeof setTimeout> } = {};

      const settle = (fn: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        if (timerRef.id !== undefined) {
          clearTimeout(timerRef.id);
        }
        fn();
      };

      timerRef.id = setTimeout(() => {
        settle(() => {
          try {
            ws.terminate();
          } catch {
            ws.close();
          }
          reject(
            new Error(
              `CDP WebSocket connect timed out after ${CDP_CONNECT_TIMEOUT_MS}ms`,
            ),
          );
        });
      }, CDP_CONNECT_TIMEOUT_MS);

      ws.once('open', () => {
        settle(() => resolve(session));
      });
      ws.once('error', (err) => {
        settle(() => reject(err));
      });
    });
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

  async evaluate<T>(expression: string): Promise<T> {
    const result = (await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
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
    this.ws.close();
  }
}

/**
 * Kill switch for Android WebView CDP actions. Default on; set
 * `ANDROID_WEBVIEW_CDP=0` (or `false` / `off` / `no`) to force native-only.
 *
 * Dynamic env key — babel `transform-inline-environment-variables` must not
 * bake this at transform time so local/CI can disable CDP at runtime.
 */
export function isAndroidWebViewCdpEnabled(): boolean {
  const envKey = 'ANDROID_WEBVIEW_CDP';
  const raw = process.env[envKey]?.trim().toLowerCase();
  if (!raw) {
    return true;
  }
  return raw !== '0' && raw !== 'false' && raw !== 'off' && raw !== 'no';
}

export function urlsReferToSameDapp(
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
    const loopbackAliases = new Set(['10.0.2.2', 'localhost', '127.0.0.1']);
    const sameHostFamily =
      target.hostname === candidate.hostname ||
      (loopbackAliases.has(target.hostname) &&
        loopbackAliases.has(candidate.hostname));
    const samePort =
      (candidate.port || defaultPort(candidate.protocol)) ===
      (target.port || defaultPort(target.protocol));
    const samePath =
      candidate.pathname.replace(/\/$/, '') ===
      target.pathname.replace(/\/$/, '');
    return sameHostFamily && samePort && samePath;
  } catch {
    return false;
  }

  function defaultPort(protocol: string): string {
    return protocol === 'https:' ? '443' : '80';
  }
}

function contextName(ctx: RawAppiumWebViewContext): string {
  return ctx.webviewName ?? ctx.webview ?? '';
}

function isChromeWebViewContext(ctx: RawAppiumWebViewContext): boolean {
  const name = contextName(ctx);
  return (
    /chrome/i.test(name) ||
    ctx.packageName === 'com.android.chrome' ||
    /chrome/i.test(ctx.packageName ?? '')
  );
}

function isMetaMaskWebViewContext(
  ctx: RawAppiumWebViewContext,
  packageId: string,
): boolean {
  if (isChromeWebViewContext(ctx)) {
    return false;
  }
  const name = contextName(ctx);
  return (
    name.includes(packageId) ||
    ctx.packageName === packageId ||
    Boolean(ctx.packageName?.startsWith(`${packageId}.`))
  );
}

/**
 * Prefer MetaMask in-app WebView debugger URL; never return Chrome's.
 */
export function pickMetaMaskWebViewDebuggerUrl(
  rawContexts: RawAppiumWebViewContext[],
  packageId: string,
): string | undefined {
  for (const ctx of rawContexts) {
    const wsUrl = ctx.info?.webSocketDebuggerUrl;
    if (!wsUrl) continue;
    if (isMetaMaskWebViewContext(ctx, packageId)) {
      return wsUrl;
    }
  }
  return undefined;
}

export function httpEndpointFromWebSocketUrl(
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

/**
 * Drive MetaMask in-app WebView actions via CDP (bypasses Chromedriver).
 */
export default class AndroidWebViewCdpHelpers {
  private static async withEvaluate<T>(
    pageUrl: string,
    expression: string,
  ): Promise<T | undefined> {
    if (!isAndroidWebViewCdpEnabled()) {
      return undefined;
    }
    if (!pageUrl?.trim()) {
      return undefined;
    }

    try {
      const endpoint = await this.resolveCdpHttpEndpoint();
      const target = await this.waitForCdpTarget(endpoint, pageUrl);
      if (!target.webSocketDebuggerUrl) {
        return undefined;
      }

      const session = await CdpSession.connect(target.webSocketDebuggerUrl);
      try {
        return await session.evaluate<T>(expression);
      } finally {
        session.close();
      }
    } catch (error) {
      logger.debug(
        `CDP evaluate failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    }
  }

  /**
   * Scroll `#webId` into view via CDP. Returns true when evaluate reports the
   * element existed and scroll ran; false on any discovery/connect/evaluate miss
   * so callers can fall back to native UiScrollable.
   */
  static async scrollElementByIdIntoView(
    webId: string,
    options: { pageUrl: string },
  ): Promise<boolean> {
    if (!webId.trim()) {
      return false;
    }

    const scrolled = await this.withEvaluate<boolean>(
      options.pageUrl,
      `(() => {
      const el = document.getElementById(${JSON.stringify(webId)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      return true;
    })()`,
    );
    if (scrolled) {
      logger.debug(`CDP scrolled #${webId} into view on ${options.pageUrl}`);
    }
    return Boolean(scrolled);
  }

  static async tapElementById(
    webId: string,
    options: { pageUrl: string },
  ): Promise<boolean> {
    if (!webId.trim()) {
      return false;
    }

    const clicked = await this.withEvaluate<boolean>(
      options.pageUrl,
      `(() => {
      const el = document.getElementById(${JSON.stringify(webId)});
      if (!el || typeof el.click !== 'function') return false;
      const disabled =
        ('disabled' in el && Boolean(el.disabled)) ||
        el.getAttribute('aria-disabled') === 'true' ||
        (typeof el.matches === 'function' && el.matches(':disabled'));
      if (disabled) return false;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      el.click();
      return true;
    })()`,
    );
    return Boolean(clicked);
  }

  static async fillElementById(
    webId: string,
    value: string,
    options: { pageUrl: string },
  ): Promise<boolean> {
    if (!webId.trim()) {
      return false;
    }

    const filled = await this.withEvaluate<boolean>(
      options.pageUrl,
      `(() => {
      const el = document.getElementById(${JSON.stringify(webId)});
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      el.focus?.();
      if ('value' in el) {
        el.value = '';
        el.value = ${JSON.stringify(value)};
      } else {
        el.textContent = ${JSON.stringify(value)};
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
    );
    return Boolean(filled);
  }

  static async readElementTextById(
    webId: string,
    options: { pageUrl: string },
  ): Promise<string | undefined> {
    if (!webId.trim()) {
      return undefined;
    }

    const text = await this.withEvaluate<string | null>(
      options.pageUrl,
      `(() => {
      const el = document.getElementById(${JSON.stringify(webId)});
      if (!el) return null;
      if ('value' in el && typeof el.value === 'string' && el.value.length > 0) {
        return el.value;
      }
      const text = (el.innerText ?? el.textContent ?? '').trim();
      return text.length > 0 ? text : (el.value ?? null);
    })()`,
    );
    return text == null ? undefined : text;
  }

  static async selectOptionById(
    webId: string,
    optionText: string,
    options: { pageUrl: string },
  ): Promise<boolean> {
    if (!webId.trim() || !optionText.trim()) {
      return false;
    }

    const selected = await this.withEvaluate<boolean>(
      options.pageUrl,
      `(() => {
      const el = document.getElementById(${JSON.stringify(webId)});
      if (!el || !('options' in el) || !el.options) return false;
      const option = Array.from(el.options).find((opt) =>
        opt.text.includes(${JSON.stringify(optionText)}),
      );
      if (!option) return false;
      el.value = option.value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
    );
    return Boolean(selected);
  }

  static async blurActiveElement(pageUrl: string): Promise<boolean> {
    const blurred = await this.withEvaluate<boolean>(
      pageUrl,
      `(() => {
      const active = document.activeElement;
      if (active && typeof active.blur === 'function') {
        active.blur();
        return true;
      }
      return false;
    })()`,
    );
    return Boolean(blurred);
  }

  private static async resolveCdpHttpEndpoint(): Promise<string> {
    const fromContexts = await this.tryEndpointFromAppiumContexts();
    if (fromContexts) {
      return fromContexts;
    }

    this.ensureAdbForwardToWebView();
    const endpoint = `http://127.0.0.1:${WEBVIEW_CDP_FORWARD_PORT}`;
    await this.waitForCdpEndpoint(endpoint);
    return endpoint;
  }

  private static async tryEndpointFromAppiumContexts(): Promise<
    string | undefined
  > {
    try {
      const packageId = APP_PACKAGE_IDS.ANDROID;
      const rawContexts = (await getDriver().execute(
        'mobile: getContexts',
      )) as RawAppiumWebViewContext[];
      const wsUrl = pickMetaMaskWebViewDebuggerUrl(rawContexts, packageId);
      if (!wsUrl) {
        return undefined;
      }
      const http = httpEndpointFromWebSocketUrl(wsUrl);
      if (!http) {
        return undefined;
      }
      await this.waitForCdpEndpoint(http);
      logger.debug(`Using Appium-forwarded MetaMask WebView CDP at ${http}`);
      return http;
    } catch (error) {
      logger.debug(
        'Could not resolve WebView CDP from Appium contexts:',
        error instanceof Error ? error.message : String(error),
      );
      return undefined;
    }
  }

  private static ensureAdbForwardToWebView(): void {
    const packageId = APP_PACKAGE_IDS.ANDROID;
    const pid = execFileSync('adb', ['shell', 'pidof', packageId], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .trim()
      .split(/\s+/)[0];
    if (!pid) {
      throw new Error(`adb pidof ${packageId} returned empty`);
    }

    const port = String(WEBVIEW_CDP_FORWARD_PORT);
    try {
      execFileSync('adb', ['forward', '--remove', `tcp:${port}`], {
        stdio: 'pipe',
      });
    } catch {
      // No existing forward is fine.
    }
    execFileSync(
      'adb',
      [
        'forward',
        `tcp:${port}`,
        `localabstract:webview_devtools_remote_${pid}`,
      ],
      { stdio: 'pipe' },
    );
    logger.debug(`ADB forwarded tcp:${port} → webview_devtools_remote_${pid}`);
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
      `WebView CDP endpoint ${endpoint} not ready within ${CDP_READY_TIMEOUT_MS}ms: ${lastError}`,
    );
  }

  private static async waitForCdpTarget(
    endpoint: string,
    pageUrl: string,
  ): Promise<CdpTarget> {
    const deadline = Date.now() + PAGE_TIMEOUT_MS;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${endpoint}/json/list`);
        if (response.ok) {
          const targets = (await response.json()) as CdpTarget[];
          const match = targets.find(
            (t) =>
              (t.type === 'page' || !t.type) &&
              t.webSocketDebuggerUrl &&
              urlsReferToSameDapp(t.url ?? '', pageUrl),
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
      `No MetaMask WebView CDP target matched ${pageUrl} within ${PAGE_TIMEOUT_MS}ms`,
    );
  }
}
