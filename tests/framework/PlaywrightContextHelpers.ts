import type { Context } from '@wdio/protocols';
import type {
  AndroidDetailedContext,
  IosDetailedContext,
} from 'webdriverio/build/types';
import { APP_PACKAGE_IDS } from './Constants';
import { PlatformDetector } from './PlatformLocator';
import { getDriver } from './PlaywrightUtilities';

type DetailedContext = IosDetailedContext | AndroidDetailedContext;

const NATIVE_APP = 'NATIVE_APP';
const LAVAMOAT_PATTERN = /LavaMoat|ShadowRoot|scuttling/i;

export default class PlaywrightContextHelpers {
  private static readonly WEBVIEW_TIMEOUT_MS = 30_000;
  private static readonly POLL_INTERVAL_MS = 1_000;
  private static driverInstance: WebdriverIO.Browser;

  private static getDriver(): WebdriverIO.Browser {
    if (!this.driverInstance) {
      this.driverInstance = getDriver();
    }
    return this.driverInstance;
  }

  static async switchToNativeContext(): Promise<void> {
    await this.getDriver().switchContext(NATIVE_APP);
  }

  static async switchToWebViewContext(dappUrl: string): Promise<void> {
    // Strategy B: Try WebdriverIO's built-in URL matching first.
    // Falls back to manual polling only on LavaMoat scuttling errors.
    try {
      await this.getDriver().switchContext({
        url: new RegExp(dappUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        androidWebviewConnectTimeout: this.WEBVIEW_TIMEOUT_MS,
      });
      return;
    } catch (err) {
      if (!LAVAMOAT_PATTERN.test(this.getErrorMessage(err))) {
        throw err;
      }
      console.log(
        'WebdriverIO switchContext hit LavaMoat scuttling, falling back to manual polling',
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
        if (switched) return;
      }

      await sleep(this.POLL_INTERVAL_MS);
    }

    throw new Error(
      `No suitable webview context found within ${this.WEBVIEW_TIMEOUT_MS}ms for URL: ${dappUrl}`,
    );
  }

  private static async getDetailedWebviews(): Promise<DetailedContext[]> {
    const contexts: (Context | DetailedContext)[] =
      await this.getDriver().getContexts({ returnDetailedContexts: true });

    return contexts.filter((ctx): ctx is DetailedContext => {
      if (typeof ctx === 'string') return false;
      return ctx.id !== NATIVE_APP;
    });
  }

  private static async selectBestWebview(
    webviews: DetailedContext[],
    dappUrl?: string,
  ): Promise<DetailedContext | undefined> {
    if (dappUrl) {
      const urlMatch = webviews.find(
        (ctx) => ctx.url?.includes(dappUrl) && !/localhost/i.test(ctx.url),
      );
      if (urlMatch) return urlMatch;
    }

    const filtered = webviews.filter((ctx) => {
      const shouldAvoid =
        /chrome|devtools/i.test(ctx.id) ||
        (ctx.url && /chrome|devtools|localhost/i.test(ctx.url));
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

  private static async attemptContextSwitch(
    contextId: string,
  ): Promise<boolean> {
    try {
      await this.getDriver().switchContext(contextId);
      return true;
    } catch (err) {
      const message = this.getErrorMessage(err);

      if (LAVAMOAT_PATTERN.test(message)) {
        console.log('Encountered LavaMoat scuttling, retrying...');
        return false;
      }

      console.log('Error switching to webview context:', message);
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
