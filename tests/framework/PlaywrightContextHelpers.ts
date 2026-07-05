import type { Context } from '@wdio/protocols';
import type {
  AndroidDetailedContext,
  IosDetailedContext,
} from 'webdriverio/build/types';
import { APP_PACKAGE_IDS } from './Constants';
import { PlatformDetector } from './PlatformLocator';
import { getDriver } from './PlaywrightUtilities';
import { createPlaywrightLogger } from './playwrightLogger.ts';

const logger = createPlaywrightLogger('PlaywrightContextHelpers');

type DetailedContext = IosDetailedContext | AndroidDetailedContext;

const NATIVE_APP = 'NATIVE_APP';
const LAVAMOAT_PATTERN = /LavaMoat|ShadowRoot|scuttling/i;
const LOCALHOST_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|10\.0\.2\.2|bs-local\.com)$/i;
const CONTEXT_SWITCH_TIMEOUT_MS = 15_000;
const WEB_ACTION_LAVAMOAT_RETRY_ATTEMPTS = 3;
const WEB_ACTION_RETRY_DELAY_MS = 500;

type AndroidContextWithPages = AndroidDetailedContext & {
  webviewName?: string;
  webview?: string;
  pages?: { url?: string }[];
};

export default class PlaywrightContextHelpers {
  private static readonly WEBVIEW_TIMEOUT_MS = 30_000;
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
      await getDriver().switchContext({
        url: new RegExp(dappUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        androidWebviewConnectTimeout: this.WEBVIEW_TIMEOUT_MS,
      });
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

  private static async switchToWebViewWithRetry(
    dappUrl: string,
  ): Promise<void> {
    const deadline = Date.now() + this.WEBVIEW_TIMEOUT_MS;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (Date.now() < deadline) {
      const webviews = await this.getDetailedWebviews();
      const selected = await this.selectBestWebview(webviews, dappUrl);

      if (selected?.id) {
        const switched = await this.attemptContextSwitch(selected.id);
        if (switched) {
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

    return contexts
      .filter((ctx): ctx is DetailedContext => {
        if (typeof ctx === 'string') return false;
        return ctx.id !== NATIVE_APP;
      })
      .map((ctx) => this.normalizeContext(ctx));
  }

  /** Android Chromedriver often omits top-level url; resolve from pages[].url. */
  private static normalizeContext(ctx: DetailedContext): DetailedContext {
    const android = ctx as AndroidContextWithPages;
    const id = ctx.id ?? android.webviewName ?? android.webview ?? ctx.id;
    if (ctx.url) {
      return id && id !== ctx.id ? { ...ctx, id } : ctx;
    }

    const pageUrl = android.pages
      ?.map((page) => page.url)
      .find((url) => url && !/^about:blank/i.test(url));

    if (!pageUrl && !id) {
      return ctx;
    }

    return { ...ctx, id: id ?? ctx.id, url: pageUrl ?? ctx.url };
  }

  private static isLocalhostHost(host: string): boolean {
    return LOCALHOST_HOST_PATTERN.test(host);
  }

  private static isLocalhostDappUrl(dappUrl: string): boolean {
    try {
      return this.isLocalhostHost(new URL(dappUrl).hostname);
    } catch {
      return /localhost|127\.0\.0\.1|10\.0\.2\.2|bs-local\.com/i.test(dappUrl);
    }
  }

  /** Match dapp tabs when Chromedriver reports localhost vs 127.0.0.1, etc. */
  private static urlsReferToSameDapp(
    ctxUrl: string | undefined,
    dappUrl: string,
  ): boolean {
    if (!ctxUrl) return false;
    if (ctxUrl.includes(dappUrl)) return true;

    try {
      const ctx = new URL(ctxUrl);
      const dapp = new URL(dappUrl);
      if (ctx.port !== dapp.port) return false;
      const sameHost =
        ctx.hostname === dapp.hostname ||
        (this.isLocalhostHost(ctx.hostname) &&
          this.isLocalhostHost(dapp.hostname));
      return sameHost;
    } catch {
      return false;
    }
  }

  private static shouldAvoidWebview(
    ctx: DetailedContext,
    dappIsLocalhost: boolean,
  ): boolean {
    if (/devtools/i.test(ctx.id)) return true;
    if (ctx.url && /chrome|devtools/i.test(ctx.url)) return true;
    // Local dapp servers (adb reverse / BrowserStack Local) live on localhost tabs.
    if (
      !dappIsLocalhost &&
      ctx.url &&
      /localhost|127\.0\.0\.1|10\.0\.2\.2/i.test(ctx.url)
    ) {
      return true;
    }
    return false;
  }

  private static async selectBestWebview(
    webviews: DetailedContext[],
    dappUrl?: string,
  ): Promise<DetailedContext | undefined> {
    const dappIsLocalhost = dappUrl ? this.isLocalhostDappUrl(dappUrl) : false;

    if (dappUrl) {
      const urlMatch = webviews.find((ctx) =>
        this.urlsReferToSameDapp(ctx.url, dappUrl),
      );
      if (urlMatch) return urlMatch;
    }

    const filtered = webviews.filter(
      (ctx) => !this.shouldAvoidWebview(ctx, dappIsLocalhost),
    );

    const packageId = (await PlatformDetector.isAndroid())
      ? APP_PACKAGE_IDS.ANDROID
      : APP_PACKAGE_IDS.IOS;

    return (
      filtered.find((ctx) => ctx.id.includes(packageId)) ??
      filtered[filtered.length - 1]
    );
  }

  private static async attemptContextSwitch(
    contextId: string,
  ): Promise<boolean> {
    let switchTimeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const switchContextPromise = getDriver().switchContext(contextId);
      const timeoutPromise = new Promise<never>((_, reject) => {
        switchTimeoutId = setTimeout(
          () =>
            reject(
              new Error(
                `switchContext("${contextId}") timed out after ${CONTEXT_SWITCH_TIMEOUT_MS}ms`,
              ),
            ),
          CONTEXT_SWITCH_TIMEOUT_MS,
        );
      });

      try {
        await Promise.race([switchContextPromise, timeoutPromise]);
      } finally {
        if (switchTimeoutId !== undefined) {
          clearTimeout(switchTimeoutId);
        }
      }

      return true;
    } catch (err) {
      const message = this.getErrorMessage(err);

      if (this.isLavaMoatError(err)) {
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

  private static isLavaMoatError(err: unknown): boolean {
    return LAVAMOAT_PATTERN.test(this.getErrorMessage(err));
  }

  static async withWebAction(
    actionFn: () => Promise<void>,
    dappUrl: string,
  ): Promise<void> {
    for (
      let attempt = 1;
      attempt <= WEB_ACTION_LAVAMOAT_RETRY_ATTEMPTS;
      attempt++
    ) {
      try {
        await this.switchToWebViewContext(dappUrl);
        await actionFn();
        return;
      } catch (err) {
        const isLastAttempt = attempt === WEB_ACTION_LAVAMOAT_RETRY_ATTEMPTS;
        if (!this.isLavaMoatError(err) || isLastAttempt) {
          throw err;
        }

        logger.debug(
          `Encountered LavaMoat scuttling during web action (attempt ${attempt}/${WEB_ACTION_LAVAMOAT_RETRY_ATTEMPTS}), retrying`,
        );

        try {
          await this.switchToNativeContext();
        } catch (nativeErr) {
          logger.debug(
            'Failed to switch to native context before LavaMoat retry:',
            this.getErrorMessage(nativeErr).slice(0, 300),
          );
        }

        await new Promise((resolve) =>
          setTimeout(resolve, WEB_ACTION_RETRY_DELAY_MS),
        );
      }
    }
  }

  static async withNativeAction(actionFn: () => Promise<void>): Promise<void> {
    await this.switchToNativeContext();
    await actionFn();
  }

  /** Scroll the active dapp WebView to the top (e.g. after navigation lands mid-page). */
  static async scrollWebViewToTop(dappUrl: string): Promise<void> {
    await this.withWebAction(async () => {
      await getDriver().execute(() => {
        window.scrollTo(0, 0);
      });
    }, dappUrl);
    await this.switchToNativeContext();
  }

  /**
   * Tap a dapp element by HTML id inside the WebView. Uses in-page JS instead of
   * Chromedriver XPath (avoids LavaMoat scuttling) and scrolls into view first.
   */
  static async tapDappElementById(
    elementId: string,
    dappUrl: string,
  ): Promise<void> {
    await this.withWebAction(async () => {
      await getDriver().execute((id: string) => {
        const el = document.getElementById(id);
        if (!el) {
          throw new Error(`Dapp element #${id} not found`);
        }
        el.scrollIntoView({ block: 'center', inline: 'nearest' });
        (el as HTMLElement).click();
      }, elementId);
    }, dappUrl);
  }

  /** Tap a network row in the test-dapp network picker modal. */
  static async tapDappNetworkByName(
    networkName: string,
    dappUrl: string,
  ): Promise<void> {
    await this.withWebAction(async () => {
      const clicked = await getDriver().execute((name: string) => {
        const items = document.querySelectorAll('.network-modal-item-name');
        for (const item of items) {
          if (item.textContent?.includes(name)) {
            item.scrollIntoView({ block: 'center', inline: 'nearest' });
            (item as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, networkName);
      if (!clicked) {
        throw new Error(
          `Could not find network "${networkName}" in dapp network picker`,
        );
      }
    }, dappUrl);
  }
}
