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
    logger.info('switchToNativeContext');
    await getDriver().switchContext(NATIVE_APP);
  }

  static async switchToWebViewContext(dappUrl: string): Promise<void> {
    logger.info(`switchToWebViewContext: ${dappUrl}`);
    // Strategy B: Try WebdriverIO's built-in URL matching first.
    // Falls back to manual polling on any failure (LavaMoat scuttling,
    // stale URL metadata on BrowserStack, platform quirks, etc.).
    try {
      await withTimeout(
        getDriver().switchContext({
          url: new RegExp(dappUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
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
      logger.info(
        `switchToWebViewContext: WebdriverIO url match failed, polling contexts — ${this.getErrorMessage(err).slice(0, 300)}`,
      );
    }

    await this.switchToWebViewWithRetry(dappUrl);
  }

  private static async switchToWebViewWithRetry(
    dappUrl: string,
  ): Promise<void> {
    const deadline = Date.now() + this.WEBVIEW_TIMEOUT_MS;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    let pollCount = 0;

    while (Date.now() < deadline) {
      pollCount += 1;
      const webviews = await this.getDetailedWebviews();
      const selected = await this.selectBestWebview(webviews, dappUrl);

      if (pollCount === 1 || pollCount % 5 === 0) {
        logger.info(
          `switchToWebViewWithRetry poll ${pollCount}: contexts=${JSON.stringify(
            webviews.map((ctx) => ({ id: ctx.id, url: ctx.url })),
          )}`,
        );
      }

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

    const webviews = await this.getDetailedWebviews();
    logger.error(
      `switchToWebViewWithRetry: timeout after ${this.WEBVIEW_TIMEOUT_MS}ms for ${dappUrl}; contexts=${JSON.stringify(
        webviews.map((ctx) => ({ id: ctx.id, url: ctx.url })),
      )}`,
    );

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
      const urlMatch = webviews.find((ctx) => {
        if (!ctx.url?.includes(dappUrl)) {
          return false;
        }
        return targetsLocalhost || !/localhost/i.test(ctx.url ?? '');
      });
      if (urlMatch) return urlMatch;
    }

    const filtered = webviews.filter((ctx) => {
      const shouldAvoid =
        /devtools/i.test(ctx.id) ||
        (ctx.url && /chrome|devtools/i.test(ctx.url)) ||
        (!targetsLocalhost && ctx.url && /localhost/i.test(ctx.url));
      return !shouldAvoid;
    });

    const packageId = (await PlatformDetector.isAndroid())
      ? APP_PACKAGE_IDS.ANDROID
      : APP_PACKAGE_IDS.IOS;

    return (
      filtered.find((ctx) => ctx.id.includes(packageId)) ??
      filtered[filtered.length - 1]
    );
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
    const match = webviews.find((ctx) => ctx.url?.includes(dappUrl));
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
