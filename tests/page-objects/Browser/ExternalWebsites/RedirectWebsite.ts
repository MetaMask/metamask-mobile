import ChromeCdpHelpers from '../../../framework/ChromeCdpHelpers';
import AppiumContextHelpers from '../../../framework/AppiumContextHelpers';

class RedirectWebsite {
  /**
   * Runs `window.location.href = targetUrl` in the page at `pageUrl`.
   * The fixture server's serve-handler cleanUrls rewrites `/redirect.html?…`
   * to `/redirect` and drops the query, so the target cannot come from the
   * page — the test passes it in.
   *
   * @param pageUrl - URL used to select the WebView/CDP target (no query).
   * @param targetUrl - Cross-origin URL to assign to `location.href`.
   */
  async redirectToTarget(pageUrl: string, targetUrl: string): Promise<void> {
    const result = await ChromeCdpHelpers.evaluateInWebView<string>(
      pageUrl,
      `(() => {
        window.location.href = ${JSON.stringify(targetUrl)};
        return 'ok';
      })()`,
    );

    if (result !== 'ok') {
      throw new Error(
        `RedirectWebsite.redirectToTarget failed (${result ?? 'null'}) from ${pageUrl} to ${targetUrl}`,
      );
    }

    await AppiumContextHelpers.switchToNativeContext();
  }
}

export default new RedirectWebsite();
