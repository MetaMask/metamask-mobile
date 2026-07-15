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

  static async switchToNativeContext(): Promise<void> {
    logger.debug('Switching to native app context');
    await getDriver().switchContext(NATIVE_APP);
  }

  static async switchToWebViewContext(dappUrl: string): Promise<void> {
    logger.debug(`Switching to webview context for URL: ${dappUrl}`);
    // Strategy B: Try WebdriverIO's built-in URL matching first.
    // Falls back to manual polling on any failure (LavaMoat scuttling,
    // stale URL metadata on BrowserStack, platform quirks, etc.).
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
      await this.switchToMatchingWebviewWindow(dappUrl);
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
    const contexts: (Context | DetailedContext)[] =
      await getDriver().getContexts({ returnDetailedContexts: true });

    return contexts.filter((ctx): ctx is DetailedContext => {
      if (typeof ctx === 'string') return false;
      return ctx.id !== NATIVE_APP;
    });
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
