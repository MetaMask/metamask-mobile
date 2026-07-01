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

    return contexts.filter((ctx): ctx is DetailedContext => {
      if (typeof ctx === 'string') return false;
      return ctx.id !== NATIVE_APP;
    });
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

  /** Scroll the active dapp WebView to the top (e.g. after navigation lands mid-page). */
  static async scrollWebViewToTop(dappUrl: string): Promise<void> {
    await this.withWebAction(async () => {
      await getDriver().execute(() => {
        window.scrollTo(0, 0);
      });
    }, dappUrl);
    await this.switchToNativeContext();
  }
}
