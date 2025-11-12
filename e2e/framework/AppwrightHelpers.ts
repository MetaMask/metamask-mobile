import { Device } from 'appwright';

interface ContextInfo {
  id: string;
  url?: string;
}

export default class AppwrightHelpers {
  private static readonly WEBVIEW_TIMEOUT_MS = 30_000;
  private static readonly POLL_INTERVAL_MS = 1_000;
  private static readonly APP_PACKAGE = 'io.metamask';

  static async switchToNativeContext(deviceInstance: Device): Promise<void> {
    return await this.switchContext(deviceInstance, 'NATIVE_APP');
  }

  static async switchToWebViewContext(
    deviceInstance: Device,
    dappUrl: string,
  ): Promise<void> {
    return await this.switchContext(deviceInstance, 'WEBVIEW', dappUrl);
  }

  private static async switchContext(
    deviceInstance: Device,
    context: 'NATIVE_APP' | 'WEBVIEW',
    dappUrl?: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webDriverClient = (deviceInstance as any).webDriverClient;

    if (context === 'NATIVE_APP') {
      await this.switchToNative(webDriverClient);
      return;
    }

    await this.switchToWebView(webDriverClient, dappUrl);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static async switchToNative(webDriverClient: any): Promise<void> {
    const contexts = await webDriverClient.getContexts();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeContext = contexts.find((ctx: any) =>
      typeof ctx === 'string' ? ctx === 'NATIVE_APP' : ctx.id === 'NATIVE_APP',
    );

    if (!nativeContext) {
      console.log('Native context not found in available contexts', contexts);
      return;
    }

    const nativeId =
      typeof nativeContext === 'string' ? nativeContext : nativeContext.id;
    await webDriverClient.switchContext(nativeId);
  }

  private static async switchToWebView(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webDriverClient: any,
    dappUrl?: string,
  ): Promise<void> {
    const deadline = Date.now() + this.WEBVIEW_TIMEOUT_MS;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    while (Date.now() < deadline) {
      const webviews = await this.getAvailableWebviews(webDriverClient);
      const selectedWebview = this.selectBestWebview(webviews, dappUrl);

      if (!selectedWebview?.id) {
        await sleep(this.POLL_INTERVAL_MS);
        continue;
      }

      const switched = await this.attemptContextSwitch(
        webDriverClient,
        selectedWebview.id,
      );

      if (switched) {
        return;
      }

      await sleep(this.POLL_INTERVAL_MS);
    }

    console.log('No suitable webview context found within timeout');
  }

  private static async getAvailableWebviews(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webDriverClient: any,
  ): Promise<ContextInfo[]> {
    // Try detailed contexts first (includes URL info)
    const detailedContexts = await this.getDetailedContexts(webDriverClient);
    if (detailedContexts) {
      return detailedContexts;
    }

    // Fallback to basic contexts
    const contexts = await webDriverClient.getContexts();
    return this.filterWebviewContexts(contexts);
  }

  private static async getDetailedContexts(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webDriverClient: any,
  ): Promise<ContextInfo[] | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contexts = await webDriverClient.executeScript(
        'mobile: getContexts',
        [],
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return contexts.map((ctx: any) => this.normalizeContext(ctx));
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static normalizeContext(ctx: any): ContextInfo {
    const id = String(ctx?.webviewName ?? ctx?.id ?? '');
    const pages: { url?: string }[] = Array.isArray(ctx?.pages)
      ? ctx.pages
      : [];

    // Find first non-localhost page or use first page
    const page =
      pages.find((p) => p?.url && !/localhost/i.test(p.url)) || pages[0];
    const url = String(page?.url ?? ctx?.info?.url ?? '');

    return { id, url };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static filterWebviewContexts(contexts: any[]): ContextInfo[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return contexts.filter((ctx: any) => {
      if (typeof ctx === 'string') {
        return ctx.includes('WEBVIEW');
      }
      if (ctx && typeof ctx === 'object') {
        const id = String(ctx.id ?? '');
        return id.includes('WEBVIEW') || Boolean(ctx.url);
      }
      return false;
    });
  }

  private static selectBestWebview(
    webviews: ContextInfo[],
    dappUrl?: string,
  ): ContextInfo | undefined {
    // Priority 1: Match by dapp URL (not localhost)
    if (dappUrl) {
      const urlMatch = webviews.find(
        (ctx) =>
          ctx.url && ctx.url.includes(dappUrl) && !/localhost/i.test(ctx.url),
      );
      if (urlMatch) {
        return urlMatch;
      }
    }

    // Priority 2: Filter out devtools/chrome, prefer app package
    const filtered = webviews.filter((ctx) => {
      const shouldAvoid =
        /chrome|devtools/i.test(ctx.id) ||
        (ctx.url && /chrome|devtools|localhost/i.test(ctx.url));

      return !shouldAvoid;
    });

    // Prefer app package webviews
    const appWebview = filtered.find((ctx) =>
      ctx.id.includes(this.APP_PACKAGE),
    );
    if (appWebview) {
      return appWebview;
    }

    // Return last available webview
    return filtered[filtered.length - 1];
  }

  private static async attemptContextSwitch(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webDriverClient: any,
    contextId: string,
  ): Promise<boolean> {
    try {
      console.log(`Switching to context ID: ${contextId}`);
      await webDriverClient.switchContext(contextId);
      console.log('Successfully switched to webview context');
      return true;
    } catch (err) {
      const message = this.getErrorMessage(err);

      // LavaMoat scuttling is expected, caller will retry
      if (/LavaMoat|ShadowRoot|scuttling/i.test(message)) {
        console.log('Encountered LavaMoat scuttling, retrying...');
        return false;
      }

      // Other errors are unexpected
      console.log('Error switching to webview context:', message);
      return false;
    }
  }

  private static getErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === 'string') {
      return err;
    }
    return JSON.stringify(err);
  }

  static async withWebAction(
    deviceInstance: Device,
    actionFn: () => Promise<void>,
    dappUrl: string,
  ): Promise<void> {
    await this.switchToWebViewContext(deviceInstance, dappUrl);
    await actionFn();
  }

  static async withNativeAction(
    deviceInstance: Device,
    actionFn: () => Promise<void>,
  ): Promise<void> {
    await this.switchToNativeContext(deviceInstance);
    await actionFn();
  }
}
