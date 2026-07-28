import type { Context } from '@wdio/protocols';
import type {
  AndroidDetailedContext,
  IosDetailedContext,
} from 'webdriverio/build/types';
import { APP_PACKAGE_IDS } from './Constants';
import { PlatformDetector } from './PlatformLocator';
import { getDriver, withTimeout } from './PlaywrightUtilities';
import { createPlaywrightLogger } from './playwrightLogger.ts';
const logger = createPlaywrightLogger('PlaywrightContextHelpers');

type DetailedContext = IosDetailedContext | AndroidDetailedContext;

type AndroidContextWithPage = AndroidDetailedContext & {
  webviewPageId?: string;
};

const NATIVE_APP = 'NATIVE_APP';
const LAVAMOAT_PATTERN = /LavaMoat|ShadowRoot|scuttling/i;

export default class PlaywrightContextHelpers {
  private static readonly WEBVIEW_TIMEOUT_MS = 30_000;
  private static readonly WEBVIEW_SWITCH_TIMEOUT_MS = 45_000;
  private static readonly WEBVIEW_WARMUP_TIMEOUT_MS = 15_000;
  private static readonly POLL_INTERVAL_MS = 1_000;
  private static readonly NATIVE_READY_TIMEOUT_MS = 5_000;
  private static readonly NATIVE_READY_POLL_INTERVAL_MS = 200;

  static async switchToNativeContext(): Promise<void> {
    logger.debug('Switching to native app context');
    const drv = getDriver();
    await drv.switchContext(NATIVE_APP);
    // switchContext resolves before UiAutomator2 re-attaches; gate on native
    // readiness so the first post-switch find does not race the switch.
    // Android-only — iOS/WDA does not exhibit this.
    if (!(await PlatformDetector.isAndroid())) {
      return;
    }
    const deadline = Date.now() + this.NATIVE_READY_TIMEOUT_MS;
    let lastErr: unknown;
    while (Date.now() < deadline) {
      try {
        const ctx = (await drv.getContext()) as string | undefined;
        if (ctx === NATIVE_APP) {
          await drv.getPageSource();
          return;
        }
      } catch (err) {
        lastErr = err;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, this.NATIVE_READY_POLL_INTERVAL_MS),
      );
    }
    logger.debug(
      `Native context not confirmed ready in ${this.NATIVE_READY_TIMEOUT_MS}ms: ${this.getErrorMessage(
        lastErr,
      ).slice(0, 200)}`,
    );
  }

  /**
   * Resolve the dapp's DevTools page id (webviewPageId) using WDIO's native
   * getContexts(detailed) enumeration, issued safely from the NATIVE context.
   * Used to pin chromedriver onto the real dapp page instead of one of the
   * Snaps about:blank pages. Returns undefined when it cannot be resolved.
   *
   * Deliberately avoids adb/procfs/loopback-fetch: those are unreliable in
   * containerized CI runners, silently returned undefined there, and left the
   * page-lock inert (the root cause of the CI webview-attach hang).
   */
  private static async findDappPageId(
    dappUrl: string,
  ): Promise<string | undefined> {
    if (!(await PlatformDetector.isAndroid())) {
      return undefined;
    }
    try {
      const webviews = await this.getDetailedWebviews();
      const match = webviews.find((ctx) =>
        this.contextMatchesDappUrl(ctx, dappUrl),
      );
      const pageId = (match as AndroidContextWithPage | undefined)
        ?.webviewPageId;
      logger.info(
        `[webview] resolved ${webviews.length} webview page(s); dapp pageId for ${dappUrl}: ${pageId ?? '(none)'}`,
      );
      return pageId;
    } catch (err) {
      logger.info(
        `[webview] page id resolution failed: ${this.getErrorMessage(err).slice(0, 200)}`,
      );
      return undefined;
    }
  }

  static async switchToWebViewContext(dappUrl: string): Promise<void> {
    logger.debug(`Switching to webview context for URL: ${dappUrl}`);
    const dappPageId = await this.findDappPageId(dappUrl);

    // Android happy path: pin the dapp page WITHOUT a url-matched switch.
    // switchContext({ url }) forces chromedriver to Runtime.evaluate every
    // page to read its URL; the LavaMoat-scuttled Snaps about:blank realms
    // block that evaluate and wedge the whole chromedriver session. A plain
    // context switch + switchToWindow(pageId) attaches to the one correct
    // page without probing the others.
    if ((await PlatformDetector.isAndroid()) && dappPageId) {
      try {
        const webviewContextId = `WEBVIEW_${APP_PACKAGE_IDS.ANDROID}`;
        await withTimeout(
          getDriver().switchContext(webviewContextId),
          this.WEBVIEW_SWITCH_TIMEOUT_MS,
          `switchContext(${webviewContextId})`,
        );
        await withTimeout(
          getDriver().switchToWindow(dappPageId),
          this.WEBVIEW_SWITCH_TIMEOUT_MS,
          `switchToWindow(${dappPageId})`,
        );
        await this.warmWebViewContext();
        logger.debug(`Pinned dapp page ${dappPageId} for ${dappUrl}`);
        return;
      } catch (lockErr) {
        logger.info(
          `[webview] page-lock path failed, falling back: ${this.getErrorMessage(lockErr).slice(0, 200)}`,
        );
      }
    }

    // Fallback (iOS, or Android pageId unresolved): WebdriverIO's built-in URL
    // matching, then manual polling on any failure.
    try {
      await withTimeout(
        getDriver().switchContext({
          // Match host aliases used by emulator networking + adb reverse.
          url: this.buildDappUrlPattern(dappUrl),
          androidWebviewConnectTimeout: this.WEBVIEW_TIMEOUT_MS,
        }),
        this.WEBVIEW_SWITCH_TIMEOUT_MS,
        `switchContext for ${dappUrl}`,
      );
      await this.warmWebViewContext();
      if (dappPageId) {
        try {
          await withTimeout(
            getDriver().switchToWindow(dappPageId),
            this.WEBVIEW_SWITCH_TIMEOUT_MS,
            `switchToWindow(${dappPageId})`,
          );
        } catch (lockErr) {
          logger.debug(
            `switchToWindow(dapp page) failed (non-fatal): ${this.getErrorMessage(lockErr).slice(0, 200)}`,
          );
        }
      }
      logger.debug(`Switched to webview context for URL: ${dappUrl}`);
      return;
    } catch (err) {
      logger.debug(
        'WebdriverIO switchContext failed, falling back to manual polling:',
        this.getErrorMessage(err).slice(0, 300),
      );
    }

    await this.switchToWebViewWithRetry(dappUrl);
  }

  /**
   * Build a URL matcher that accepts 10.0.2.2 / localhost / 127.0.0.1 aliases.
   */
  private static buildDappUrlPattern(dappUrl: string): RegExp {
    try {
      const parsed = new URL(dappUrl);
      const port = parsed.port ? `:${parsed.port}` : '';
      const path =
        parsed.pathname === '/'
          ? '/?'
          : parsed.pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (['10.0.2.2', 'localhost', '127.0.0.1'].includes(parsed.hostname)) {
        return new RegExp(
          `https?://(?:10\\.0\\.2\\.2|localhost|127\\.0\\.0\\.1)${port}${path}`,
        );
      }
    } catch {
      // Fall through to exact escape
    }
    return new RegExp(dappUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  }

  private static async switchToWebViewWithRetry(
    dappUrl: string,
  ): Promise<void> {
    const deadline = Date.now() + this.WEBVIEW_TIMEOUT_MS;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (Date.now() < deadline) {
      const webviews = await this.getDetailedWebviews();
      const selected = await this.selectBestWebview(webviews, dappUrl);

      if (selected?.id) {
        const switched = await withTimeout(
          this.attemptContextSwitch(selected.id),
          this.WEBVIEW_SWITCH_TIMEOUT_MS,
          `switchContext to ${selected.id}`,
        ).catch(() => false);
        if (switched) {
          await this.warmWebViewContext();
          await this.switchToMatchingWebviewWindow(dappUrl);
          logger.debug(`Switched to webview context: ${selected.id}`);
          return;
        }
      }

      await sleep(this.POLL_INTERVAL_MS);
    }

    throw new Error(
      `No suitable webview context found within ${this.WEBVIEW_TIMEOUT_MS}ms for URL: ${dappUrl}`,
    );
  }

  private static async getDetailedWebviews(): Promise<DetailedContext[]> {
    // `mobile: getContexts` must be issued from the NATIVE_APP context. When
    // called while attached to a WebView context, Android UiAutomator2 +
    // chromedriver deadlocks until connectionRetryTimeout (~45s abort). Save
    // the current context, enumerate from native, then restore.
    const wdioDriver = getDriver();
    let previousContext: string | undefined;
    try {
      previousContext = (await wdioDriver.getContext()) as string | undefined;
    } catch {
      // getContext unavailable/failed — proceed without restore.
    }

    const isAlreadyNative = !previousContext || previousContext === NATIVE_APP;
    if (!isAlreadyNative) {
      await wdioDriver.switchContext(NATIVE_APP);
    }

    try {
      const contexts: (Context | DetailedContext)[] = await withTimeout(
        wdioDriver.getContexts({ returnDetailedContexts: true }),
        this.WEBVIEW_TIMEOUT_MS,
        'getContexts (detailed)',
      );

      return contexts.filter((ctx): ctx is DetailedContext => {
        if (typeof ctx === 'string') return false;
        return ctx.id !== NATIVE_APP;
      });
    } finally {
      if (!isAlreadyNative && previousContext) {
        try {
          await wdioDriver.switchContext(previousContext);
        } catch (error) {
          logger.debug(
            'Failed to restore WebView context after getContexts (non-fatal):',
            this.getErrorMessage(error).slice(0, 200),
          );
        }
      }
    }
  }

  private static async selectBestWebview(
    webviews: DetailedContext[],
    dappUrl?: string,
  ): Promise<DetailedContext | undefined> {
    const targetsLocalhost = Boolean(dappUrl?.includes('localhost'));

    if (dappUrl) {
      const urlMatch = webviews.find((ctx) =>
        this.contextMatchesDappUrl(ctx, dappUrl),
      );
      if (urlMatch) return urlMatch;
    }

    const filtered = webviews.filter((ctx) => {
      const isLocalhostAlias =
        Boolean(dappUrl) &&
        Boolean(ctx.url) &&
        this.urlsReferToSameDapp(ctx.url as string, dappUrl as string);
      const shouldAvoid =
        /devtools/i.test(ctx.id) ||
        (ctx.url && /chrome:\/\/|devtools/i.test(ctx.url)) ||
        (!targetsLocalhost &&
          !isLocalhostAlias &&
          ctx.url &&
          /localhost/i.test(ctx.url));
      return !shouldAvoid;
    });

    // When Chrome is foregrounded (MMConnect native browser), prefer
    // WEBVIEW_chrome over the MetaMask in-app webview if URL metadata is stale.
    if (await PlatformDetector.isAndroid()) {
      try {
        const currentPackage = (await getDriver().execute(
          'mobile: getCurrentPackage',
        )) as string;
        if (/chrome/i.test(currentPackage ?? '')) {
          const chromeWebview = filtered.find((ctx) =>
            this.isChromeWebview(ctx),
          );
          if (chromeWebview) {
            return chromeWebview;
          }
        }
      } catch {
        // Ignore package probe failures and fall through.
      }
    }

    const packageId = (await PlatformDetector.isAndroid())
      ? APP_PACKAGE_IDS.ANDROID
      : APP_PACKAGE_IDS.IOS;

    return (
      filtered.find((ctx) => ctx.id.includes(packageId)) ??
      filtered[filtered.length - 1]
    );
  }

  private static isChromeWebview(ctx: DetailedContext): boolean {
    const androidCtx = ctx as AndroidDetailedContext;
    return (
      /chrome/i.test(ctx.id) ||
      androidCtx.packageName === 'com.android.chrome' ||
      /chrome/i.test(androidCtx.packageName ?? '')
    );
  }

  private static contextMatchesDappUrl(
    ctx: DetailedContext,
    dappUrl: string,
  ): boolean {
    if (ctx.url && this.urlsReferToSameDapp(ctx.url, dappUrl)) {
      return true;
    }
    const title = ctx.title ?? '';
    // Playground title is stable when Chrome URL metadata is empty on CI.
    if (/multichain api test dapp/i.test(title) && /:8090\b/.test(dappUrl)) {
      return true;
    }
    return false;
  }

  private static urlsReferToSameDapp(
    candidateUrl: string,
    dappUrl: string,
  ): boolean {
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
      const port = dappUrl.match(/:(\d+)/)?.[1];
      return Boolean(
        port &&
          candidateUrl.includes(`:${port}`) &&
          !/chrome:\/\//i.test(candidateUrl),
      );
    }

    function defaultPort(protocol: string): string {
      return protocol === 'https:' ? '443' : '80';
    }
  }

  private static async warmWebViewContext(): Promise<void> {
    if (!(await PlatformDetector.isAndroid())) {
      return;
    }

    try {
      await withTimeout(
        getDriver().getTitle(),
        this.WEBVIEW_WARMUP_TIMEOUT_MS,
        'WebView getTitle warm-up',
      );
    } catch (error) {
      logger.debug(
        'WebView warm-up failed (non-fatal):',
        this.getErrorMessage(error).slice(0, 200),
      );
    }
  }

  private static async switchToMatchingWebviewWindow(
    dappUrl: string,
  ): Promise<void> {
    if (!(await PlatformDetector.isAndroid())) {
      return;
    }

    const webviews = await this.getDetailedWebviews();
    const match = webviews.find((ctx) =>
      this.contextMatchesDappUrl(ctx, dappUrl),
    );
    const pageId = (match as AndroidContextWithPage | undefined)?.webviewPageId;

    if (!pageId) {
      return;
    }

    try {
      await withTimeout(
        getDriver().switchToWindow(pageId),
        this.WEBVIEW_SWITCH_TIMEOUT_MS,
        `switchToWindow(${pageId})`,
      );
      logger.debug(`Switched to WebView window ${pageId} for ${dappUrl}`);
    } catch (error) {
      logger.debug(
        'WebView window switch failed (non-fatal):',
        this.getErrorMessage(error).slice(0, 200),
      );
    }
  }

  private static async attemptContextSwitch(
    contextId: string,
  ): Promise<boolean> {
    try {
      await getDriver().switchContext(contextId);
      return true;
    } catch (err) {
      const message = this.getErrorMessage(err);

      if (LAVAMOAT_PATTERN.test(message)) {
        logger.debug('Encountered LavaMoat scuttling, retrying context switch');
        return false;
      }

      logger.debug('Error switching to webview context:', message);
      return false;
    }
  }

  private static getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return JSON.stringify(err);
  }

  static async withWebAction(
    actionFn: () => Promise<void>,
    dappUrl: string,
  ): Promise<void> {
    await this.switchToWebViewContext(dappUrl);
    await actionFn();
  }

  static async withNativeAction(actionFn: () => Promise<void>): Promise<void> {
    await this.switchToNativeContext();
    await actionFn();
  }
}
