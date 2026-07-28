import type { Context } from '@wdio/protocols';
import type {
  AndroidDetailedContext,
  IosDetailedContext,
} from 'webdriverio/build/types';
import { APP_PACKAGE_IDS } from './Constants';
import { PlatformDetector } from './PlatformLocator';
import { getDriver, withTimeout } from './PlaywrightUtilities';
import { createPlaywrightLogger } from './playwrightLogger.ts';
// eslint-disable-next-line import-x/no-nodejs-modules -- adb host commands for webview page-lock
import { exec } from 'child_process';
// eslint-disable-next-line import-x/no-nodejs-modules -- adb host commands for webview page-lock
import { promisify } from 'util';

const execAsync = promisify(exec);

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
   * Resolve the dapp's DevTools page id by querying the Android WebView
   * DevTools /json/list endpoint directly (via adb forward + fetch), bypassing
   * chromedriver. Used to lock chromedriver onto the real dapp page instead of
   * one of the Snaps about:blank pages. Returns undefined on any failure.
   */
  private static async findDappPageId(
    dappUrl: string,
  ): Promise<string | undefined> {
    if (!(await PlatformDetector.isAndroid())) {
      return undefined;
    }
    const serial = process.env.ANDROID_SERIAL;
    const deviceFlag = serial ? `-s ${serial}` : '';
    const HOST_PROBE_PORT = 19222;
    try {
      // Discover the io.metamask WebView devtools abstract socket on device.
      const { stdout: sockets } = await execAsync(
        `adb ${deviceFlag} shell cat /proc/net/unix`,
      ).catch((e) => ({ stdout: `cat /proc/net/unix failed: ${e?.message}` }));
      const abstractSocket = sockets
        .split('\n')
        .map((l) => l.match(/@(webview_devtools_remote_\d+)/))
        .find(Boolean)?.[1];
      if (!abstractSocket) {
        return undefined;
      }

      // Forward host:19222 -> device webview devtools socket, then fetch
      // /json/list to enumerate every page target and match the dapp URL.
      await execAsync(
        `adb ${deviceFlag} forward tcp:${HOST_PROBE_PORT} localabstract:${abstractSocket}`,
      );
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10_000);
        const res = await fetch(
          `http://127.0.0.1:${HOST_PROBE_PORT}/json/list`,
          {
            signal: controller.signal,
          },
        );
        clearTimeout(t);
        const targets = (await res.json()) as {
          type?: string;
          url?: string;
          webSocketDebuggerUrl?: string;
        }[];
        const dappTarget = targets.find(
          (tgt) => tgt.type === 'page' && tgt.url?.includes(dappUrl),
        );
        return dappTarget?.webSocketDebuggerUrl
          ?.split('/devtools/page/')[1]
          ?.trim();
      } finally {
        await execAsync(
          `adb ${deviceFlag} forward --remove tcp:${HOST_PROBE_PORT}`,
        ).catch(() => undefined);
      }
    } catch (err) {
      logger.debug(
        `devtools target enumeration failed: ${this.getErrorMessage(err).slice(0, 200)}`,
      );
    }
    return undefined;
  }

  static async switchToWebViewContext(dappUrl: string): Promise<void> {
    logger.debug(`Switching to webview context for URL: ${dappUrl}`);
    const dappPageId = await this.findDappPageId(dappUrl);
    // Try WebdriverIO's built-in URL matching first; fall back to manual
    // polling on any failure (LavaMoat scuttling, stale URL metadata, etc.).
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
      // Lock onto the dapp page. The io.metamask WebView owns several pages
      // (the dapp + Snaps about:blank pages); chromedriver can park on a Snaps
      // page and wedge subsequent CDP commands. switchToWindow pins the correct
      // page without calling getContexts (which deadlocks while attached).
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
